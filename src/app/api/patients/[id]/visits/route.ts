import { NextRequest, NextResponse } from 'next/server'
import { queryOne } from '@/lib/db'
import { verifyToken, COOKIE_NAME } from '@/lib/auth'
import type { Visit } from '@/types'

function getUser(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value
  if (!token) return null
  return verifyToken(token)
}

// POST /api/patients/[id]/visits
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = getUser(req)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Next.js 16: params must be awaited
  const { id: idStr } = await params
  const patientId = parseInt(idStr)
  if (isNaN(patientId)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const body = await req.json()
    const { chief_complaint, diagnosis, treatment, notes, follow_up_date, status } = body

    if (!chief_complaint) {
      return NextResponse.json({ error: 'Chief complaint is required' }, { status: 400 })
    }

    const visit = await queryOne<Visit>(
      `INSERT INTO visits (patient_id, doctor_id, chief_complaint, diagnosis, treatment, notes, follow_up_date, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [patientId, user.userId, chief_complaint, diagnosis || null, treatment || null, notes || null, follow_up_date || null, status || 'completed']
    )

    return NextResponse.json({ data: visit, message: 'Visit recorded successfully' }, { status: 201 })
  } catch (err) {
    console.error('POST visit error:', err)
    return NextResponse.json({ error: 'Failed to record visit' }, { status: 500 })
  }
}
