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

  try {
    const [stats] = await query<Record<string, number>>(
      `SELECT
        (SELECT COUNT(*) FROM patient_master_data)::int as total_patients,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE)::int as todays_appointments,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date >= date_trunc('week', CURRENT_DATE) AND appointment_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::int as this_week_appointments,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date >= date_trunc('month', CURRENT_DATE) AND appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::int as this_month_appointments,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status = 'completed')::int as completed_today,
        (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status = 'booked')::int as pending_today,
        (SELECT COUNT(*) FROM patient_master_data)::int as new_patients_this_month`
    )

    const todaysSchedule = await query(
      `SELECT a.appointment_id as id, a.appointment_time::text, a.description as reason, a.status,
              a.doctor_name, p.full_name as patient_name, p.whatsapp_no as patient_phone
       FROM appointments a
       LEFT JOIN patient_master_data p ON p.patient_uhid = a.patient_uhid
       WHERE a.appointment_date = CURRENT_DATE
       ORDER BY a.appointment_time ASC LIMIT 10`
    )

    return NextResponse.json({ data: { stats, todaysSchedule } })
  } catch (err) {
    console.error('Dashboard stats error:', err)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
