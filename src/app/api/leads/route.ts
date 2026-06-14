import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  try {
    // Week counts mode — grouped by start_day
    if (start && end) {
      const counts = await query<{ date: string; count: number; hot_count: number }>(`
        SELECT
          TO_CHAR(start_day, 'YYYY-MM-DD') AS date,
          COUNT(*)::int AS count,
          COUNT(*) FILTER (WHERE hot_lead = true)::int AS hot_count
        FROM patient_leads
        WHERE start_day >= $1::date AND start_day <= $2::date
        GROUP BY start_day
      `, [start, end])
      return NextResponse.json({ data: counts })
    }

    // List mode — filter by start_day
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (date) {
      params.push(date)
      conditions.push(`l.start_day = $${params.length}::date`)
    }

    const leads = await query(`
      SELECT l.lead_id, l.patient_id, l.concern, l.booked_against, l.hot_lead,
             l.forwarded_to, l.forwarded_time, l.status, l.summary,
             l.start_day, l.end_day, l.appointment_time,
             l.created_at, l.updated_at, l.reengagement_count,
             p.full_name AS patient_name, p.whatsapp_no
      FROM patient_leads l
      LEFT JOIN patient_master_data p ON p.patient_uhid = l.patient_id::integer
      WHERE ${conditions.join(' AND ')}
      ORDER BY l.updated_at DESC
    `, params)

    return NextResponse.json({ data: leads })
  } catch (err) {
    console.error('GET leads error:', err)
    return NextResponse.json({ error: 'Failed to fetch leads' }, { status: 500 })
  }
}
