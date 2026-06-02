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
  const id = parseInt(idStr)
  if (isNaN(id)) return NextResponse.json({ error: 'Invalid patient ID' }, { status: 400 })

  try {
    const patient = await queryOne<{ whatsapp_no: string | null }>(
      'SELECT whatsapp_no FROM patient_master_data WHERE patient_uhid = $1', [id]
    )
    if (!patient) return NextResponse.json({ error: 'Patient not found' }, { status: 404 })
    if (!patient.whatsapp_no) return NextResponse.json({ data: [] })

    // Only show human and ai messages; skip tool messages and ai tool-call invocation rows
    const chats = await query<{ id: number; message: { type: string; content: string } }>(
      `SELECT id, message FROM n8n_chat_histories
       WHERE session_id = $1
         AND (
           (message->>'type' = 'human')
           OR
           (message->>'type' = 'ai' AND message->'tool_calls' = '[]'::jsonb)
         )
       ORDER BY id ASC`,
      [patient.whatsapp_no]
    )

    return NextResponse.json({ data: chats })
  } catch (err) {
    console.error('GET chats error:', err)
    return NextResponse.json({ error: 'Failed to fetch chats' }, { status: 500 })
  }
}
