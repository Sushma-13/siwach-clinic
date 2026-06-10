import { NextRequest, NextResponse } from 'next/server'
import { query, queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid hot lead ID' }, { status: 400 })

  try {
    const lead = await queryOne(
      `SELECT l.lead_id, l.patient_id, l.start_day, l.end_day, l.appointment_time,
              l.concern, l.booked_against, l.hot_lead, l.forwarded_to, l.forwarded_time,
              l.summary, l.status, l.last_reengaged_at, l.reengagement_count,
              l.manually_added, l.created_at, l.updated_at,
              p.full_name AS patient_name, p.whatsapp_no AS patient_phone
       FROM hot_leads l
       LEFT JOIN patient_master_data p ON p.patient_uhid = l.patient_id::integer
       WHERE l.lead_id = $1 AND l.hot_lead = true`,
      [id]
    )

    if (!lead) return NextResponse.json({ error: 'Hot lead not found' }, { status: 404 })
    return NextResponse.json({ data: lead })
  } catch (err) {
    console.error('GET hot lead error:', err)
    return NextResponse.json({ error: 'Failed to fetch hot lead' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid hot lead ID' }, { status: 400 })

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

    if (
      patient_id === undefined &&
      start_day === undefined &&
      end_day === undefined &&
      appointment_time === undefined &&
      concern === undefined &&
      booked_against === undefined &&
      hot_lead === undefined &&
      forwarded_to === undefined &&
      forwarded_time === undefined &&
      summary === undefined &&
      status === undefined &&
      last_reengaged_at === undefined &&
      reengagement_count === undefined &&
      manually_added === undefined
    ) {
      return NextResponse.json({ error: 'At least one field is required to update' }, { status: 400 })
    }

    const updatedLead = await queryOne(
      `UPDATE hot_leads SET
         patient_id = COALESCE($1, patient_id),
         start_day = COALESCE($2::date, start_day),
         end_day = COALESCE($3::date, end_day),
         appointment_time = COALESCE($4, appointment_time),
         concern = COALESCE($5, concern),
         booked_against = COALESCE($6, booked_against),
         hot_lead = COALESCE($7, hot_lead),
         forwarded_to = COALESCE($8, forwarded_to),
         forwarded_time = COALESCE($9, forwarded_time),
         summary = COALESCE($10, summary),
         status = COALESCE($11, status),
         last_reengaged_at = COALESCE($12::timestamp, last_reengaged_at),
         reengagement_count = COALESCE($13, reengagement_count),
         manually_added = COALESCE($14, manually_added),
         updated_at = NOW()
       WHERE lead_id = $15
       RETURNING *`,
      [
        patient_id ?? null,
        start_day ?? null,
        end_day ?? null,
        appointment_time ?? null,
        concern ?? null,
        booked_against ?? null,
        hot_lead ?? null,
        forwarded_to ?? null,
        forwarded_time ?? null,
        summary ?? null,
        status ?? null,
        last_reengaged_at ?? null,
        reengagement_count ?? null,
        manually_added ?? null,
        id,
      ]
    )

    if (!updatedLead) return NextResponse.json({ error: 'Hot lead not found' }, { status: 404 })
    return NextResponse.json({ data: updatedLead, message: 'Hot lead updated successfully' })
  } catch (err) {
    console.error('PUT hot lead error:', err)
    return NextResponse.json({ error: 'Failed to update hot lead' }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (user.role !== 'admin') return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })

  const { id: idStr } = await params
  const id = parseInt(idStr, 10)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid hot lead ID' }, { status: 400 })

  try {
    const deleted = await queryOne<{ lead_id: number }>(
      'DELETE FROM hot_leads WHERE lead_id = $1 RETURNING lead_id',
      [id]
    )

    if (!deleted) return NextResponse.json({ error: 'Hot lead not found' }, { status: 404 })
    return NextResponse.json({ message: 'Hot lead deleted successfully' })
  } catch (err) {
    console.error('DELETE hot lead error:', err)
    return NextResponse.json({ error: 'Failed to delete hot lead' }, { status: 500 })
  }
}
