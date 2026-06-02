import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const doctors = await query(
      `SELECT id, doctor_name FROM doctors WHERE is_active = true ORDER BY id ASC`
    )
    return NextResponse.json({ data: doctors })
  } catch (err) {
    console.error('GET doctors error:', err)
    return NextResponse.json({ error: 'Failed to fetch doctors' }, { status: 500 })
  }
}
