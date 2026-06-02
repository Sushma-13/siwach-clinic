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
  const date = searchParams.get('date')
  const status = searchParams.get('status')
  const start = searchParams.get('start')
  const end = searchParams.get('end')

  // Return counts grouped by date for a range (used by week picker)
  if (start && end) {
    try {
      const counts = await query<{ date: string; count: number }>(
        `SELECT TO_CHAR(appointment_date, 'YYYY-MM-DD') as date, COUNT(*)::int as count
         FROM appointments
         WHERE appointment_date >= $1::date AND appointment_date <= $2::date
         GROUP BY appointment_date`,
        [start, end]
      )
      return NextResponse.json({ data: counts })
    } catch (err) {
      console.error('GET appointment counts error:', err)
      return NextResponse.json({ error: 'Failed to fetch counts' }, { status: 500 })
    }
  }

  try {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (date) {
      params.push(date)
      conditions.push(`a.appointment_date = $${params.length}::date`)
    }
    if (status) {
      params.push(status)
      conditions.push(`a.status = $${params.length}`)
    }

    const appointments = await query(
      `SELECT a.appointment_id, TO_CHAR(a.appointment_date, 'YYYY-MM-DD') as appointment_date,
              a.appointment_time::text, a.doctor_name, a.description, a.status,
              a.patient_uhid, p.full_name as patient_name, p.whatsapp_no as patient_phone
       FROM appointments a
       LEFT JOIN patient_master_data p ON p.patient_uhid = a.patient_uhid
       WHERE ${conditions.join(' AND ')}
       ORDER BY a.appointment_date ASC, a.appointment_time ASC`,
      params
    )

    return NextResponse.json({ data: appointments })
  } catch (err) {
    console.error('GET appointments error:', err)
    return NextResponse.json({ error: 'Failed to fetch appointments' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { patient_uhid, appointment_date, appointment_time, doctor_name, description } = body

    if (!patient_uhid || !appointment_date || !appointment_time || !doctor_name) {
      return NextResponse.json({ error: 'Patient, date, time and doctor are required' }, { status: 400 })
    }

    const appointment = await queryOne(
      `INSERT INTO appointments (patient_uhid, appointment_date, appointment_time, doctor_name, description, status)
       VALUES ($1, $2::date, $3, $4, $5, 'booked') RETURNING *`,
      [patient_uhid, appointment_date, appointment_time, doctor_name, description || null]
    )

    return NextResponse.json({ data: appointment, message: 'Appointment created' }, { status: 201 })
  } catch (err) {
    console.error('POST appointment error:', err)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
