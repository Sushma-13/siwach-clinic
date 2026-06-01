import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import type { Patient, Visit } from '@/types'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// GET /api/patients/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Next.js 16: params is a Promise, must be awaited
  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const patient = await queryOne<Patient>('SELECT * FROM patients WHERE id = $1', [id])
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    const visits = await query<Visit & { doctor_name: string }>(
      `SELECT v.*, u.name as doctor_name FROM visits v
       LEFT JOIN users u ON u.id = v.doctor_id
       WHERE v.patient_id = $1 ORDER BY v.visit_date DESC`,
      [id]
    )

    const appointments = await query(
      `SELECT a.*, u.name as doctor_name FROM appointments a
       LEFT JOIN users u ON u.id = a.doctor_id
       WHERE a.patient_id = $1 ORDER BY a.appointment_date DESC, a.appointment_time DESC`,
      [id]
    )

    return NextResponse.json({ data: { patient, visits, appointments } })
  } catch (err) {
    console.error('GET patient error:', err)
    return NextResponse.json({ error: 'Failed to fetch patient' }, { status: 500 })
  }
}

// PUT /api/patients/[id]
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const body = await req.json()
    const { first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, emergency_contact_name, emergency_contact_phone } = body

    const patient = await queryOne<Patient>(
      `UPDATE patients SET
        first_name = COALESCE($1, first_name),
        last_name = COALESCE($2, last_name),
        date_of_birth = COALESCE($3, date_of_birth),
        gender = COALESCE($4, gender),
        phone = COALESCE($5, phone),
        email = COALESCE($6, email),
        address = COALESCE($7, address),
        blood_group = COALESCE($8, blood_group),
        emergency_contact_name = COALESCE($9, emergency_contact_name),
        emergency_contact_phone = COALESCE($10, emergency_contact_phone),
        updated_at = NOW()
       WHERE id = $11 RETURNING *`,
      [first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, emergency_contact_name, emergency_contact_phone, id]
    )

    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ data: patient, message: 'Patient updated successfully' })
  } catch (err) {
    console.error('PUT patient error:', err)
    return NextResponse.json({ error: 'Failed to update patient' }, { status: 500 })
  }
}

// DELETE /api/patients/[id]
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const { id: idStr } = await params
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const result = await queryOne<{ id: number }>('DELETE FROM patients WHERE id = $1 RETURNING id', [id])
    if (!result) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ message: 'Patient deleted successfully' })
  } catch (err) {
    console.error('DELETE patient error:', err)
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 })
  }
}
