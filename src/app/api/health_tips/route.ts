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
  const active = searchParams.get('is_active')

  try {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (category) {
      params.push(category)
      conditions.push(`category = $${params.length}`)
    }
    if (active !== null) {
      const isActive = active.toLowerCase() === 'true'
      params.push(isActive)
      conditions.push(`is_active = $${params.length}`)
    }

    const tips = await query(
      `SELECT id, tip_text, category, is_active, created_at
       FROM health_tips
       WHERE ${conditions.join(' AND ')}
       ORDER BY created_at DESC`,
      params
    )

    return NextResponse.json({ data: tips })
  } catch (err) {
    console.error('GET health tips error:', err)
    return NextResponse.json({ error: 'Failed to fetch health tips' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { tip_text, category, is_active } = body

    if (!tip_text || typeof tip_text !== 'string') {
      return NextResponse.json({ error: 'tip_text is required' }, { status: 400 })
    }

    const activeValue = typeof is_active === 'boolean' ? is_active : true

    const tip = await queryOne(
      `INSERT INTO health_tips (tip_text, category, is_active, created_at)
       VALUES ($1, $2, $3, NOW())
       RETURNING id, tip_text, category, is_active, created_at`,
      [tip_text, category || null, activeValue]
    )

    return NextResponse.json({ data: tip, message: 'Health tip created' }, { status: 201 })
  } catch (err) {
    console.error('POST health tip error:', err)
    return NextResponse.json({ error: 'Failed to create health tip' }, { status: 500 })
  }
}
