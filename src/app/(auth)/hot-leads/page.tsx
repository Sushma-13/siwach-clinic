'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Plus, Flame, Loader2, Search, X, Trash2, Edit3, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

interface HotLead {
  lead_id: number;
  patient_id: number;
  patient_name: string | null;
  patient_phone: string | null;
  concern: string | null;
  booked_against: string | null;
  hot_lead: boolean;
  manually_added: boolean;
  start_day: string;
  end_day: string | null;
  appointment_time: string | null;
  created_at: string;
  updated_at: string;
}

interface PatientResult {
  patient_uhid: number;
  full_name: string;
  whatsapp_no: string | null;
}

interface Doctor {
  id: number;
  doctor_name: string;
}

const times = [
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00',
  '17:00', '17:30', '18:00', '18:30', '19:00',
];

function formatTime(time: string | null) {
  if (!time) return '—';
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

function getInitials(name: string) {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join('') || 'NA'
}

export default function HotLeadsPage() {
  const [leads, setLeads] = useState<HotLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const limit = 10;
  const [pages, setPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [editingLeadId, setEditingLeadId] = useState<number | null>(null);
  const patientSearchRef = useRef<HTMLDivElement>(null);

  const [form, setForm] = useState({
    patient_id: '',
    patient_label: '',
    start_day: '',
    end_day: '',
    appointment_time: '',
    concern: '',
    booked_against: '',
    manually_added: true,
  });

  const fetchLeads = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(limit),
      });
      if (searchQuery.trim()) {
        params.set('search', searchQuery.trim());
      }
      const res = await fetch(`/api/hot-leads?${params.toString()}`);
      const data = await res.json();
      setLeads(data.data || []);
      setTotalCount(data.meta?.total || 0);
      setPages(data.meta?.pages || 1);
    } catch (err) {
      console.error('Fetch hot leads failed', err);
    } finally {
      setLoading(false);
    }
  }, [page, limit, searchQuery]);

  useEffect(() => {
    const timer = setTimeout(fetchLeads, 250);
    return () => clearTimeout(timer);
  }, [fetchLeads]);

  useEffect(() => {
    if (!patientSearch.trim()) {
      setPatientResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
        const data = await res.json();
        setPatientResults(data.data || []);
        setShowPatientDropdown(true);
      } catch (err) {
        console.error('Patient search failed', err);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [patientSearch]);

  useEffect(() => {
    async function loadDoctors() {
      try {
        const res = await fetch('/api/doctors');
        const data = await res.json();
        setDoctors(data.data || []);
      } catch (err) {
        console.error('Failed to load doctors', err);
      }
    }

    loadDoctors();
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [searchQuery]);

  function selectPatient(patient: PatientResult) {
    setForm((form) => ({
      ...form,
      patient_id: String(patient.patient_uhid),
      patient_label: patient.full_name,
    }));
    setPatientSearch(patient.full_name);
    setShowPatientDropdown(false);
  }

  function resetForm() {
    setEditingLeadId(null);
    setForm({
      patient_id: '',
      patient_label: '',
      start_day: '',
      end_day: '',
      appointment_time: '',
      concern: '',
      booked_against: '',
      manually_added: true,
    });
    setFormError('');
  }

  function openForm() {
    resetForm();
    setShowForm(true);
  }

  function beginEdit(lead: HotLead) {
    setEditingLeadId(lead.lead_id);
    setForm({
      patient_id: String(lead.patient_id),
      patient_label: lead.patient_name || '',
      start_day: lead.start_day,
      end_day: lead.end_day || '',
      appointment_time: lead.appointment_time || '11:00',
      concern: lead.concern || '',
      booked_against: lead.booked_against || '',
      manually_added: lead.manually_added,
    });
    setPatientSearch(lead.patient_name || '');
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setFormError('');

    const missingFields: string[] = [];
    if (!form.patient_id) missingFields.push('patient');
    if (!form.start_day) missingFields.push('start date');
    if (!form.end_day) missingFields.push('end date');
    if (!form.concern) missingFields.push('concern');

    if (missingFields.length > 0) {
      setFormError(
        `${missingFields
          .map((field) => field.charAt(0).toUpperCase() + field.slice(1))
          .join(', ')} ${missingFields.length === 1 ? 'is' : 'are'} required.`
      );
      return;
    }

    if (form.end_day < form.start_day) {
      setFormError('End date cannot be before start date.');
      return;
    }
    setSubmitting(true);

    try {
      const method = editingLeadId ? 'PUT' : 'POST';
      const url = editingLeadId ? `/api/hot-leads/${editingLeadId}` : '/api/hot-leads';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_id: parseInt(form.patient_id, 10),
          start_day: form.start_day,
          end_day: form.end_day || null,
          appointment_time: form.appointment_time || null,
          concern: form.concern,
          booked_against: form.booked_against || null,
          hot_lead: true,
          manually_added: form.manually_added,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save hot lead');
        return;
      }

      setShowForm(false);
      resetForm();
      setPage(1);
      fetchLeads();
    } catch (err) {
      console.error('Save hot lead failed', err);
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm('Delete this hot lead?')) return;
    try {
      const res = await fetch(`/api/hot-leads/${id}`, { method: 'DELETE' });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || 'Failed to delete hot lead');
        return;
      }
      fetchLeads();
    } catch (err) {
      console.error('Delete hot lead failed', err);
      alert('Unable to delete hot lead.');
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>Hot Leads</h1>
          <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
            Showing {Math.min((page - 1) * limit + 1, totalCount || 1)}–{Math.min(page * limit, totalCount)} of {totalCount} hot lead{totalCount !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={openForm} className="btn-primary inline-flex items-center gap-2">
          <Plus size={16} /> Add Hot Lead
        </button>
      </div>

      <div className="relative">
        <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2" style={{ color: 'var(--color-text-light)' }} />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by patient, concern, or booked against..."
          className="input-field pl-11 pr-11"
        />
        {searchQuery && (
          <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg" style={{ color: 'var(--color-text-light)' }}>
            <X size={14} />
          </button>
        )}
      </div>

      <div className="card p-0 overflow-hidden">
        {pages > 1 && (
          <div className="flex items-center justify-between px-6 py-3" style={{ borderBottom: '1px solid var(--color-border)', background: 'var(--color-surface)' }}>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {(page - 1) * limit + 1}–{Math.min(page * limit, totalCount)} of {totalCount} hot leads
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="btn-secondary px-2 py-1.5 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft size={14} />
              </button>
              <span className="text-xs font-medium" style={{ color: 'var(--color-text)' }}>{page} / {pages}</span>
              <button
                onClick={() => setPage((p) => Math.min(pages, p + 1))}
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
        ) : leads.length === 0 ? (
          <div className="text-center py-16">
            <Flame size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>{searchQuery ? 'No hot leads found' : 'No hot leads yet'}</p>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{searchQuery ? 'Try a different search term' : 'Create a hot lead to get started'}</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium" style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-5">PATIENT</div>
              <div className="col-span-2 hidden sm:block">LEAD</div>
              <div className="col-span-2 hidden md:block">CONTACT</div>
              <div className="col-span-1 hidden lg:block">DATE</div>
              <div className="col-span-1 hidden lg:block">TIME</div>
              <div className="col-span-1 hidden xl:block">BOOKED</div>
              <div className="col-span-1" />
            </div>

            {leads.map((lead) => (
              <div key={lead.lead_id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-[#f8f6f1]">
                <div className="col-span-5 flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold uppercase" style={{ background: '#e8f0eb', color: '#3a673a' }}>
                    {getInitials(lead.patient_name || 'Unknown')}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{lead.patient_name || 'Unknown'}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{lead.patient_phone || 'No phone'}</p>
                    <div className="mt-1 flex flex-wrap gap-2">
                      <span className="badge badge-primary">Hot Lead</span>
                      {lead.manually_added && <span className="badge badge-neutral">Manual</span>}
                    </div>
                  </div>
                </div>

                <div className="col-span-2 hidden sm:block">
                  <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>#{lead.lead_id}</p>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{format(new Date(lead.created_at), 'd MMM yyyy')}</p>
                </div>

                <div className="col-span-2 hidden md:block">
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{lead.patient_phone || '—'}</p>
                </div>

                <div className="col-span-1 hidden lg:block">
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{format(new Date(lead.start_day), 'd MMM')}</p>
                </div>

                <div className="col-span-1 hidden lg:block">
                  <p className="text-sm" style={{ color: 'var(--color-text)' }}>{formatTime(lead.appointment_time)}</p>
                </div>

                <div className="col-span-1 hidden xl:block text-sm" style={{ color: 'var(--color-text)' }}>
                  {lead.booked_against || '—'}
                </div>

                <div className="col-span-1 flex justify-end gap-2">
                  <button onClick={() => beginEdit(lead)} className="btn-ghost" title="Edit">
                    <Edit3 size={16} />
                  </button>
                  <button onClick={() => handleDelete(lead.lead_id)} className="btn-ghost text-danger" title="Delete">
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="w-full max-w-3xl max-h-[90vh] rounded-3xl bg-white shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-border)' }}>
              <div>
                <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                  {editingLeadId ? 'Edit Hot Lead' : 'New Hot Lead'}
                </h2>
                <p className="text-sm mt-1" style={{ color: 'var(--color-text-muted)' }}>
                  Capture patient interest and schedule follow-ups.
                </p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-full hover:bg-[#f4f4f4]">
                <X size={18} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="flex h-full flex-col px-6 py-5">
              <div className="space-y-3 overflow-y-auto pr-1" style={{ maxHeight: 'calc(90vh - 220px)' }}>
                {formError && (
                  <div className="rounded-2xl border border-danger/20 bg-danger/5 px-4 py-3 text-sm" style={{ color: '#b91c1c' }}>
                    {formError}
                  </div>
                )}
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="relative" ref={patientSearchRef}>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Patient</label>
                    <input
                      type="text"
                      value={patientSearch}
                      onChange={(e) => {
                        setPatientSearch(e.target.value);
                        setForm((f) => ({ ...f, patient_id: '', patient_label: '' }));
                      }}
                      placeholder="Search patient name"
                      className="input-field mt-2 w-full"
                    />
                    {showPatientDropdown && patientResults.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full rounded-2xl border bg-white shadow-lg" style={{ borderColor: 'var(--color-border)' }}>
                        {patientResults.map((patient) => (
                          <button
                            key={patient.patient_uhid}
                            type="button"
                            className="w-full text-left px-4 py-3 hover:bg-slate-50"
                            onClick={() => selectPatient(patient)}
                          >
                            <div className="font-medium" style={{ color: 'var(--color-text)' }}>{patient.full_name}</div>
                            <div className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{patient.whatsapp_no || 'No phone'}</div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Start Day</label>
                    <input
                      type="date"
                      value={form.start_day}
                      onChange={(e) => setForm((f) => ({ ...f, start_day: e.target.value, end_day: '' }))}
                      className="input-field mt-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>End Day</label>
                    <input
                      type="date"
                      value={form.end_day}
                      min={form.start_day}
                      onChange={(e) => setForm((f) => ({ ...f, end_day: e.target.value }))}
                      className="input-field mt-2 w-full"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Appointment Time</label>
                    <select
                      value={form.appointment_time}
                      onChange={(e) => setForm((f) => ({ ...f, appointment_time: e.target.value }))}
                      className="input-field mt-2 w-full"
                    >
                      <option value="">No time</option>
                      {times.map((time) => (
                        <option key={time} value={time}>{formatTime(time)}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Concern</label>
                    <textarea
                      value={form.concern}
                      onChange={(e) => setForm((f) => ({ ...f, concern: e.target.value }))}
                      className="input-field mt-2 h-24 w-full resize-none"
                      placeholder="Describe patient concern"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>Booked Against</label>
                    <select
                      value={form.booked_against}
                      onChange={(e) => setForm((f) => ({ ...f, booked_against: e.target.value }))}
                      className="input-field mt-2 w-full"
                    >
                      <option value="">Select doctor</option>
                      {doctors.map((doctor) => (
                        <option key={doctor.id} value={doctor.doctor_name}>
                          {doctor.doctor_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4 mt-4 flex flex-col gap-3 bg-white sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                  className="btn-ghost w-full sm:w-auto"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn-primary w-full sm:w-auto inline-flex items-center justify-center gap-2"
                >
                  {submitting ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
                  {editingLeadId ? 'Save Changes' : 'Create Hot Lead'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
