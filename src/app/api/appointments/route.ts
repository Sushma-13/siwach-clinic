import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// GET /api/appointments
export async function GET(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const date = searchParams.get('date')
  const status = searchParams.get('status')

  try {
    const conditions: string[] = ['1=1']
    const params: unknown[] = []

    if (date) {
      params.push(date)
      conditions.push(`a.appointment_date = $${params.length}`)
    }
    if (status) {
      params.push(status)
      conditions.push(`a.status = $${params.length}`)
    }

    const appointments = await query(
      `SELECT a.*, p.first_name || ' ' || p.last_name as patient_name,
              p.phone as patient_phone, u.name as doctor_name
       FROM appointments a
       JOIN patients p ON p.id = a.patient_id
       LEFT JOIN users u ON u.id = a.doctor_id
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

// POST /api/appointments
export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { patient_id, doctor_id, appointment_date, appointment_time, reason, notes } = body

    if (!patient_id || !appointment_date || !appointment_time) {
      return NextResponse.json({ error: 'Patient, date and time are required' }, { status: 400 })
    }

    const appointment = await queryOne(
      `INSERT INTO appointments (patient_id, doctor_id, appointment_date, appointment_time, reason, notes)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [patient_id, doctor_id || user.userId, appointment_date, appointment_time, reason || null, notes || null]
    )

    return NextResponse.json({ data: appointment, message: 'Appointment created' }, { status: 201 })
  } catch (err) {
    console.error('POST appointment error:', err)
    return NextResponse.json({ error: 'Failed to create appointment' }, { status: 500 })
  }
}
