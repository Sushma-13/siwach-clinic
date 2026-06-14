import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

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
    const patient = await queryOne('SELECT * FROM patient_master_data WHERE patient_uhid = $1', [id])
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })

    return NextResponse.json({ data: { patient } })
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
    const {
      full_name,
      age_dob,
      gender,
      whatsapp_no,
      relation,
      phone_no: body_phone_no,
      phone,
      email,
      blood_group,
      marital_status,
      preferred_language,
      address,
      feedback_type,
    } = body

    const phone_no = body_phone_no ?? phone ?? null
    const validFeedbackTypes = new Set(['','GREVIEW', 'GFORM'])
    if (feedback_type !== undefined && feedback_type !== null && !validFeedbackTypes.has(feedback_type)) {
      return NextResponse.json({ error: 'Invalid feedback type' }, { status: 400 })
    }

    const patient = await queryOne(
      `UPDATE patient_master_data SET
        full_name = COALESCE($1, full_name),
        age_dob = COALESCE($2, age_dob),
        gender = COALESCE($3, gender),
        whatsapp_no = COALESCE($4, whatsapp_no),
        relation = COALESCE($5, relation),
        phone_no = COALESCE($6, phone_no),
        email = COALESCE($7, email),
        blood_group = COALESCE($8, blood_group),
        marital_status = COALESCE($9, marital_status),
        preferred_language = COALESCE($10, preferred_language),
        address = COALESCE($11, address),
        feedback_type = COALESCE($12, feedback_type),
        updated_at = NOW()
       WHERE patient_uhid = $13
       RETURNING *`,
      [
        full_name,
        age_dob,
        gender,
        whatsapp_no,
        relation,
        phone_no,
        email,
        blood_group,
        marital_status,
        preferred_language,
        address,
        feedback_type,
        id,
      ]
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
    const result = await queryOne<{ id: number }>('DELETE FROM patient_master_data WHERE patient_uhid = $1 RETURNING patient_uhid', [id])
    if (!result) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    return NextResponse.json({ message: 'Patient deleted successfully' })
  } catch (err) {
    console.error('DELETE patient error:', err)
    return NextResponse.json({ error: 'Failed to delete patient' }, { status: 500 })
  }
}
