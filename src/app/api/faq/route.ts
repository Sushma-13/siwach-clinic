import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const category = searchParams.get('category')
  const search = searchParams.get('search')

  try {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (category && category !== 'all') {
      params.push(category)
      conditions.push(`category = $${params.length}`)
    }

    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(question ILIKE $${params.length} OR answer ILIKE $${params.length - 0})`)
    }

    const faqs = await query(
      `SELECT id, question, answer, category, created_at, updated_at
       FROM faqs
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    )

    return NextResponse.json({ data: faqs })
  } catch (err) {
    console.error('GET faq error:', err)
    return NextResponse.json({ error: 'Failed to fetch FAQ' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { question, answer, category } = body

    if (!question || !answer) {
      return NextResponse.json({ error: 'Question and answer are required' }, { status: 400 })
    }

    const newFaq = await queryOne(
      `INSERT INTO faqs (question, answer, category, created_at, updated_at)
       VALUES ($1, $2, $3, NOW(), NOW())
       RETURNING *`,
      [question, answer, category || null]
    )

    return NextResponse.json({ data: newFaq, message: 'FAQ created' }, { status: 201 })
  } catch (err) {
    console.error('POST faq error:', err)
    return NextResponse.json({ error: 'Failed to create FAQ' }, { status: 500 })
  }
}
