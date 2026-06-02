import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token || !verifyToken(token)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const [kpi, chartRows, doctorDist] = await Promise.all([
      // KPI cards
      query<Record<string, number>>(`
        SELECT
          (SELECT COUNT(*) FROM patient_master_data)::int                                            AS total_patients,
          (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE)::int             AS todays_appointments,
          (SELECT COUNT(*) FROM patient_leads
            WHERE created_at >= date_trunc('month', NOW()))::int                                     AS new_leads_mtd,
          (SELECT COUNT(*) FROM (
            SELECT patient_uhid FROM appointments GROUP BY patient_uhid HAVING COUNT(*) > 1
          ) sub)::int                                                                                AS return_patients,
          (SELECT COUNT(*) FROM patient_leads WHERE hot_lead = true
            AND created_at >= date_trunc('month', NOW()))::int                                       AS hot_leads_mtd
      `),

      // Last 6 months — appointments + new patients, zero-filled with generate_series
      query<{ month: string; appointments: number; leads: number }>(`
        WITH months AS (
          SELECT generate_series(
            date_trunc('month', NOW() - INTERVAL '5 months'),
            date_trunc('month', NOW()),
            '1 month'
          ) AS month_date
        ),
        appts AS (
          SELECT DATE_TRUNC('month', appointment_date) AS month_date, COUNT(*)::int AS cnt
          FROM appointments GROUP BY 1
        ),
        pts AS (
          SELECT DATE_TRUNC('month', created_at) AS month_date,
                 COUNT(*)::int AS cnt
          FROM patient_master_data
          WHERE created_at > '2026-06-03'
          GROUP BY 1
        )
        SELECT TO_CHAR(m.month_date, 'Mon YY') AS month,
               COALESCE(a.cnt, 0)              AS appointments,
               COALESCE(p.cnt, 0)              AS leads
        FROM months m
        LEFT JOIN appts a ON a.month_date = m.month_date
        LEFT JOIN pts   p ON p.month_date = m.month_date
        ORDER BY m.month_date ASC
      `),

      // Doctor distribution for pie chart
      query<{ name: string; value: number }>(`
        SELECT doctor_name AS name, COUNT(*)::int AS value
        FROM appointments
        WHERE doctor_name IS NOT NULL
        GROUP BY doctor_name
        ORDER BY value DESC
      `),
    ])

    const chartData = chartRows

    return NextResponse.json({
      data: { kpi: kpi[0], chartData, doctorDist },
    })
  } catch (err) {
    console.error('Dashboard error:', err)
    return NextResponse.json({ error: 'Failed to fetch dashboard data' }, { status: 500 })
  }
}
