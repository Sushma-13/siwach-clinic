'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Search, Users, Phone, ChevronRight, ChevronLeft, Loader2, X } from 'lucide-react';

interface Patient {
  patient_uhid: number;
  full_name: string;
  age_dob: string | null;
  gender: string | null;
  whatsapp_no: string | null;
  phone_no: string | null;
  email: string | null;
  blood_group: string | null;
  address: string | null;
  relation: string | null;
}

const avatarColors = [
  ['#e8f0eb', '#3a673a'], ['#fef4e8', '#9a5f1a'],
  ['#f0edf9', '#5a3f9a'], ['#e8f5f8', '#1a6d80'],
  ['#fdf0ee', '#9a2a1a'],
];

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
}

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const LIMIT = 10;

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      params.set('page', String(page));
      params.set('limit', String(LIMIT));
      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();
      setPatients(data.data || []);
      setTotal(data.meta?.total || 0);
      setPages(data.meta?.pages || 1);
    } catch {
      console.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  // Reset to page 1 when search changes
  useEffect(() => { setPage(1); }, [search]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Patients
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {total} total patients registered
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--color-text-light)' }} />
        <input
          type="text"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, phone, or email..."
          className="input-field pl-11 pr-11"
        />
        {search && (
          <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg"
            style={{ color: 'var(--color-text-light)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      {/* Patient list */}
      <div className="card p-0 overflow-hidden">
        {/* Pagination bar */}
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3"
            style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {(page - 1) * LIMIT + 1}–{Math.min(page * LIMIT, total)} of {total} patients
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>
                {page} / {pages}
              </span>
              <button
                onClick={() => setPage(p => Math.min(pages, p + 1))}
                disabled={page === pages}
                className="btn-secondary px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-16">
            <Users size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>
              {search ? 'No patients found' : 'No patients yet'}
            </p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              {search ? 'Try a different search term' : 'No records in the database'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-5">PATIENT</div>
              <div className="col-span-3 hidden sm:block">CONTACT</div>
              <div className="col-span-3 hidden md:block">UHID</div>
              <div className="col-span-1" />
            </div>

            {patients.map((patient, i) => {
              const [bg, fg] = avatarColors[i % avatarColors.length];
              const contact = patient.whatsapp_no || patient.phone_no;

              return (
                <Link
                  key={patient.patient_uhid}
                  href={`/patients/${patient.patient_uhid}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-[#f8f6f1]"
                >
                  {/* Patient name */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ background: bg, color: fg }}>
                      {getInitials(patient.full_name)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {patient.full_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {[patient.age_dob, patient.gender, patient.blood_group].filter(Boolean).join(' · ') || '—'}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="col-span-3 hidden sm:flex items-center gap-1.5">
                    <Phone size={12} style={{ color: 'var(--color-text-light)' }} />
                    <span className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {contact || '—'}
                    </span>
                  </div>

                  {/* UHID */}
                  <div className="col-span-3 hidden md:block">
                    <span className="badge badge-neutral">
                      #{patient.patient_uhid}
                    </span>
                  </div>

                  <div className="col-span-1 flex justify-end">
                    <ChevronRight size={15} style={{ color: 'var(--color-text-light)' }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
