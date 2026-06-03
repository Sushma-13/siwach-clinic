'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, Phone, Mail, MapPin, Heart, AlertCircle, Loader2, User, MessageCircle
} from 'lucide-react';

interface Patient { /* trimmed */ }
interface ChatRow { id: number; message: { type: 'human' | 'ai'; content: string }; }

function getInitials(name: string) { const parts = name.trim().split(' ').filter(Boolean); if (parts.length === 1) return parts[0].charAt(0).toUpperCase(); return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase(); }

function renderMarkdown(text: string) { const html = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/\*(.+?)\*/g, '<em>$1</em>').replace(/\n/g, '<br />'); return html; }

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [patient, setPatient] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [chats, setChats] = useState<ChatRow[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    async function fetchPatient() {
      try {
        const res = await fetch(`/api/patients/${id}`);
        const data = await res.json();
        if (res.ok) setPatient(data.data.patient);
      } catch { console.error('Failed to fetch patient'); }
      finally { setLoading(false); }
    }
    fetchPatient();
  }, [id]);

  useEffect(() => {
    async function fetchChats() {
      try {
        const res = await fetch(`/api/patients/${id}/chats`);
        const data = await res.json();
        if (res.ok) setChats(data.data || []);
      } catch { console.error('Failed to fetch chats'); }
      finally { setChatsLoading(false); }
    }
    fetchChats();
  }, [id]);

  useEffect(() => { if (!chatsLoading) { chatEndRef.current?.scrollIntoView({ behavior: 'instant' }); } }, [chatsLoading]);

  if (loading) return (<div className="flex items-center justify-center py-24"><Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} /></div>);
  if (!patient) return (<div className="text-center py-16"><AlertCircle size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} /><p style={{ color: 'var(--color-text-muted)' }}>Patient not found</p><Link href="/patients" className="btn-secondary mt-4 inline-flex">Back to patients</Link></div>);

  return (
    <div className="space-y-6">
      <Link href="/patients" className="inline-flex items-center gap-2 text-sm transition-colors" style={{ color: 'var(--color-text-muted)' }}><ArrowLeft size={15} />Back to Patients</Link>
      <div className="card">{/* header & details trimmed for brevity */}</div>
      <div className="card p-0 overflow-hidden">{/* chat trimmed */}</div>
    </div>
  );
}
