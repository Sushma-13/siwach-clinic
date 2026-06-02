import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
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
  const search = searchParams.get('search') || ''
  const page = parseInt(searchParams.get('page') || '1')
  const limit = parseInt(searchParams.get('limit') || '20')
  const offset = (page - 1) * limit

  try {
    const searchCondition = search
      ? `AND (full_name ILIKE $3 OR whatsapp_no ILIKE $3 OR phone_no ILIKE $3 OR email ILIKE $3)`
      : ''
    const params: unknown[] = [limit, offset]
    if (search) params.push(`%${search}%`)

    const patients = await query(
      `SELECT * FROM patient_master_data
       WHERE 1=1 ${searchCondition}
       ORDER BY patient_uhid DESC
       LIMIT $1 OFFSET $2`,
      params
    )

    const countParams = search ? [`%${search}%`] : []
    const countCondition = search
      ? `WHERE (full_name ILIKE $1 OR whatsapp_no ILIKE $1 OR phone_no ILIKE $1 OR email ILIKE $1)`
      : ''
    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM patient_master_data ${countCondition}`,
      countParams
    )

    return NextResponse.json({
      data: patients,
      meta: { total: parseInt(count), page, limit, pages: Math.ceil(parseInt(count) / limit) },
    })
  } catch (err) {
    console.error('GET patients error:', err)
    return NextResponse.json({ error: 'Failed to fetch patients' }, { status: 500 })
  }
}
