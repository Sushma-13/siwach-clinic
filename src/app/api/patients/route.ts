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

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      patient_uhid, full_name, age_dob, gender, whatsapp_no, phone_no,
      email, blood_group, address, relation, marital_status, preferred_language,
    } = body

    if (!full_name?.trim()) {
      return NextResponse.json({ error: 'Full name is required' }, { status: 400 })
    }

    let patient
    if (patient_uhid) {
      patient = await queryOne(
        `INSERT INTO patient_master_data
          (patient_uhid, full_name, age_dob, gender, whatsapp_no, phone_no, email, blood_group, address, relation, marital_status, preferred_language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          parseInt(patient_uhid, 10),
          full_name.trim(), age_dob || null, gender || null,
          whatsapp_no || null, phone_no || null, email || null,
          blood_group || null, address || null, relation || null,
          marital_status || null, preferred_language || null,
        ]
      )
    } else {
      patient = await queryOne(
        `INSERT INTO patient_master_data
          (full_name, age_dob, gender, whatsapp_no, phone_no, email, blood_group, address, relation, marital_status, preferred_language)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
         RETURNING *`,
        [
          full_name.trim(), age_dob || null, gender || null,
          whatsapp_no || null, phone_no || null, email || null,
          blood_group || null, address || null, relation || null,
          marital_status || null, preferred_language || null,
        ]
      )
    }

    return NextResponse.json({ data: patient, message: 'Patient created successfully' }, { status: 201 })
  } catch (err: unknown) {
    console.error('POST patient error:', err)
    if ((err as { code?: string }).code === '23505') {
      return NextResponse.json({ error: 'A patient with this UHID already exists' }, { status: 409 })
    }
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
  }
}
