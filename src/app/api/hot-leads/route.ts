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
  const hotOnly = searchParams.get('hot') === 'true'
  const page = parseInt(searchParams.get('page') ?? '1', 10)
  const limit = parseInt(searchParams.get('limit') ?? '10', 10)
  const offset = (page - 1) * limit

  try {
    const params: unknown[] = [limit, offset]
    const conditions: string[] = []
    if (hotOnly) conditions.push('l.hot_lead = true')
    if (search) {
      params.push(`%${search}%`)
      conditions.push(`(p.full_name ILIKE $${params.length} OR p.whatsapp_no ILIKE $${params.length} OR p.patient_uhid::text ILIKE $${params.length})`)
    }
    const searchWhere = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

    const leads = await query(
      `SELECT l.lead_id, l.patient_id, l.start_day, l.end_day, l.appointment_time,
              l.concern, l.booked_against, l.hot_lead, l.forwarded_to,
              l.forwarded_time, l.summary, l.status, l.last_reengaged_at,
              l.reengagement_count, l.manually_added, l.created_at, l.updated_at,
              p.full_name AS patient_name, p.whatsapp_no AS patient_phone
       FROM patient_leads l
       LEFT JOIN patient_master_data p ON p.patient_uhid = l.patient_id::integer
       ${searchWhere}
       ORDER BY l.updated_at DESC
       LIMIT $1 OFFSET $2`,
      params
    )

    const countParams: unknown[] = []
    const countConditions: string[] = []
    if (hotOnly) countConditions.push('l.hot_lead = true')
    if (search) {
      countParams.push(`%${search}%`)
      countConditions.push(`(p.full_name ILIKE $${countParams.length} OR p.whatsapp_no ILIKE $${countParams.length} OR p.patient_uhid::text ILIKE $${countParams.length})`)
    }
    const countWhere = countConditions.length ? `WHERE ${countConditions.join(' AND ')}` : ''

    const [{ count }] = await query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM patient_leads l
       LEFT JOIN patient_master_data p ON p.patient_uhid = l.patient_id::integer
       ${countWhere}`,
      countParams
    )

    return NextResponse.json({
      data: leads,
      meta: { total: parseInt(count), page, limit, pages: Math.max(1, Math.ceil(parseInt(count) / limit)) },
    })
  } catch (err) {
    console.error('GET hot leads error:', err)
    return NextResponse.json({ error: 'Failed to fetch hot leads' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await req.json()
    const {
      patient_id,
      start_day,
      end_day,
      appointment_time,
      concern,
      booked_against,
      hot_lead,
      forwarded_to,
      forwarded_time,
      summary,
      status,
      last_reengaged_at,
      reengagement_count,
      manually_added,
    } = body

    if (!patient_id || !start_day || !concern) {
      return NextResponse.json({ error: 'Patient ID, start day, and concern are required' }, { status: 400 })
    }

    const newLead = await queryOne(
      `INSERT INTO patient_leads (
         patient_id, start_day, end_day, appointment_time, concern,
         booked_against, hot_lead, forwarded_to, forwarded_time,
         summary, status, last_reengaged_at, reengagement_count,
         manually_added, created_at, updated_at
       ) VALUES ($1, $2::date, $3::date, $4::timestamp, $5, $6, $7, $8, $9, $10, $11, $12::timestamp, $13, true, NOW(), NOW())
       RETURNING *`,
      [
        patient_id,
        start_day,
        end_day || null,
        appointment_time || null,
        concern,
        booked_against || null,
        hot_lead === false ? false : true,
        forwarded_to || null,
        forwarded_time || null,
        summary || null,
        status || null,
        last_reengaged_at || null,
        reengagement_count ?? 0,
      ]
    )

    return NextResponse.json({ data: newLead, message: 'Hot lead created' }, { status: 201 })
  } catch (err) {
    console.error('POST hot leads error:', err)
    return NextResponse.json({ error: 'Failed to create hot lead' }, { status: 500 })
  }
}
