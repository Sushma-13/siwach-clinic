import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import type { Patient } from '@/types'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// GET /api/patients
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
      ? `AND (p.first_name ILIKE $3 OR p.last_name ILIKE $3 OR p.phone ILIKE $3 OR p.email ILIKE $3)`
      : ''
    const params: unknown[] = [limit, offset]
    if (search) params.push(`%${search}%`)

    const patients = await query<Patient & { last_visit: string; total_visits: number }>(
      `SELECT p.*, MAX(v.visit_date) as last_visit, COUNT(v.id)::int as total_visits
       FROM patients p
       LEFT JOIN visits v ON v.patient_id = p.id
       WHERE 1=1 ${searchCondition}
       GROUP BY p.id
       ORDER BY MAX(v.visit_date) DESC NULLS LAST, p.created_at DESC
       LIMIT $1 OFFSET $2`,
      params
    )

    const countParams = search ? [`%${search}%`] : []
    const countCondition = search
      ? `WHERE (first_name ILIKE $1 OR last_name ILIKE $1 OR phone ILIKE $1 OR email ILIKE $1)`
      : ''
    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*)::text as count FROM patients ${countCondition}`,
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

// POST /api/patients
export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const { first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, emergency_contact_name, emergency_contact_phone } = body

    if (!first_name || !last_name || !phone) {
      return NextResponse.json({ error: 'First name, last name, and phone are required' }, { status: 400 })
    }

    const patient = await queryOne<Patient>(
      `INSERT INTO patients (first_name, last_name, date_of_birth, gender, phone, email, address, blood_group, emergency_contact_name, emergency_contact_phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) RETURNING *`,
      [first_name, last_name, date_of_birth || null, gender || null, phone, email || null, address || null, blood_group || null, emergency_contact_name || null, emergency_contact_phone || null]
    )

    return NextResponse.json({ data: patient, message: 'Patient created successfully' }, { status: 201 })
  } catch (err) {
    console.error('POST patient error:', err)
    return NextResponse.json({ error: 'Failed to create patient' }, { status: 500 })
  }
}
