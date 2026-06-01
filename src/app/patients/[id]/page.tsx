'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, User, Phone, Mail, MapPin, Heart, AlertCircle,
  Calendar, ClipboardList, Plus, Loader2, ChevronDown, ChevronUp,
  Stethoscope, Clock, X, CheckCircle2
} from 'lucide-react';
import { format, formatDistanceToNow, parseISO } from 'date-fns';

interface Patient {
  id: number; first_name: string; last_name: string;
  date_of_birth: string; gender: string; phone: string;
  email?: string; address?: string; blood_group?: string;
  emergency_contact_name?: string; emergency_contact_phone?: string;
  created_at: string;
}

interface Visit {
  id: number; visit_date: string; chief_complaint: string;
  diagnosis?: string; treatment?: string; notes?: string;
  follow_up_date?: string; status: string; doctor_name?: string;
}

const statusConfig: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Completed', cls: 'badge-success' },
  scheduled: { label: 'Scheduled', cls: 'badge-primary' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
  'no-show': { label: 'No Show', cls: 'badge-warning' },
};

export default function PatientDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [patient, setPatient] = useState<Patient | null>(null);
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedVisit, setExpandedVisit] = useState<number | null>(null);
  const [showAddVisit, setShowAddVisit] = useState(false);
  const [visitForm, setVisitForm] = useState({
    chief_complaint: '', diagnosis: '', treatment: '', notes: '',
    follow_up_date: '', status: 'completed',
  });
  const [submitting, setSubmitting] = useState(false);

  async function fetchPatient() {
    try {
      const res = await fetch(`/api/patients/${id}`);
      const data = await res.json();
      if (res.ok) {
        setPatient(data.data.patient);
        setVisits(data.data.visits);
      }
    } catch { console.error('Failed to fetch patient'); }
    finally { setLoading(false); }
  }

  useEffect(() => { fetchPatient(); }, [id]);

  async function handleAddVisit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch(`/api/patients/${id}/visits`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(visitForm),
      });
      if (res.ok) {
        setShowAddVisit(false);
        setVisitForm({ chief_complaint: '', diagnosis: '', treatment: '', notes: '', follow_up_date: '', status: 'completed' });
        fetchPatient();
      }
    } catch { } finally { setSubmitting(false); }
  }

  const getAge = (dob: string) => {
    if (!dob) return null;
    return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 24 * 60 * 60 * 1000));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 size={28} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="text-center py-16">
        <AlertCircle size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
        <p style={{ color: 'var(--color-text-muted)' }}>Patient not found</p>
        <Link href="/patients" className="btn-secondary mt-4 inline-flex">Back to patients</Link>
      </div>
    );
  }

  const age = getAge(patient.date_of_birth);

  return (
    <div className="space-y-6">
      {/* Back */}
      <Link href="/patients" className="inline-flex items-center gap-2 text-sm transition-colors"
        style={{ color: 'var(--color-text-muted)' }}>
        <ArrowLeft size={15} />
        Back to Patients
      </Link>

      {/* Patient header card */}
      <div className="card">
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-semibold flex-shrink-0"
              style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
              {patient.first_name.charAt(0)}{patient.last_name.charAt(0)}
            </div>
            <div>
              <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
                {patient.first_name} {patient.last_name}
              </h1>
              <div className="flex items-center gap-3 mt-1 flex-wrap">
                {age && (
                  <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    {age} years old
                  </span>
                )}
                {patient.gender && (
                  <span className="badge badge-neutral capitalize">{patient.gender}</span>
                )}
                {patient.blood_group && (
                  <span className="badge" style={{ background: '#fee2e2', color: '#991b1b' }}>
                    <Heart size={10} className="mr-1" />
                    {patient.blood_group}
                  </span>
                )}
              </div>
              <p className="text-xs mt-1.5" style={{ color: 'var(--color-text-light)' }}>
                Patient since {format(parseISO(patient.created_at), 'MMM yyyy')}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-center px-4 py-2 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
              <p className="text-2xl font-display font-semibold" style={{ color: 'var(--color-primary)' }}>
                {visits.length}
              </p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Total Visits</p>
            </div>
            <button onClick={() => setShowAddVisit(true)} className="btn-primary">
              <Plus size={15} />
              Add Visit
            </button>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6"
          style={{ borderTop: '1px solid var(--color-border)' }}>
          {patient.phone && (
            <div className="flex items-start gap-2">
              <Phone size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Phone</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.phone}</p>
              </div>
            </div>
          )}
          {patient.email && (
            <div className="flex items-start gap-2">
              <Mail size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Email</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.email}</p>
              </div>
            </div>
          )}
          {patient.date_of_birth && (
            <div className="flex items-start gap-2">
              <Calendar size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Date of Birth</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {format(parseISO(patient.date_of_birth), 'dd MMM yyyy')}
                </p>
              </div>
            </div>
          )}
          {patient.address && (
            <div className="flex items-start gap-2 md:col-span-2">
              <MapPin size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Address</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{patient.address}</p>
              </div>
            </div>
          )}
          {patient.emergency_contact_name && (
            <div className="flex items-start gap-2">
              <AlertCircle size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-accent)' }} />
              <div>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Emergency Contact</p>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                  {patient.emergency_contact_name}
                  {patient.emergency_contact_phone && ` · ${patient.emergency_contact_phone}`}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Visit History */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2" style={{ color: 'var(--color-text)' }}>
            <ClipboardList size={18} style={{ color: 'var(--color-primary)' }} />
            Visit History
          </h2>
          {visits.length > 0 && (
            <span className="badge badge-primary">{visits.length} records</span>
          )}
        </div>

        {visits.length === 0 ? (
          <div className="card text-center py-12">
            <Stethoscope size={36} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>No visit records yet</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              Record the first visit to start the medical history
            </p>
            <button onClick={() => setShowAddVisit(true)} className="btn-primary mx-auto">
              <Plus size={15} /> Record First Visit
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {visits.map((visit, i) => {
              const sc = statusConfig[visit.status] || statusConfig.completed;
              const isExpanded = expandedVisit === visit.id;
              const visitDate = parseISO(visit.visit_date);

              return (
                <div key={visit.id} className="card p-0 overflow-hidden animate-slide-up"
                  style={{ animationDelay: `${i * 50}ms` }}>
                  <button
                    className="w-full flex items-start gap-4 p-5 text-left transition-colors"
                    onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}
                  >
                    {/* Date column */}
                    <div className="w-14 flex-shrink-0 text-center">
                      <p className="text-xl font-display font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {format(visitDate, 'dd')}
                      </p>
                      <p className="text-xs uppercase" style={{ color: 'var(--color-text-muted)' }}>
                        {format(visitDate, 'MMM')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-light)' }}>
                        {format(visitDate, 'yyyy')}
                      </p>
                    </div>

                    <div className="w-px self-stretch flex-shrink-0" style={{ background: 'var(--color-border)' }} />

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                          {visit.chief_complaint}
                        </p>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <span className={`badge ${sc.cls}`}>{sc.label}</span>
                          {isExpanded ? <ChevronUp size={14} style={{ color: 'var(--color-text-light)' }} />
                            : <ChevronDown size={14} style={{ color: 'var(--color-text-light)' }} />}
                        </div>
                      </div>
                      {visit.diagnosis && (
                        <p className="text-xs mb-1" style={{ color: 'var(--color-text-muted)' }}>
                          <span style={{ color: 'var(--color-text-light)' }}>Diagnosis:</span> {visit.diagnosis}
                        </p>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {visit.doctor_name && (
                          <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-light)' }}>
                            <User size={10} />
                            {visit.doctor_name}
                          </span>
                        )}
                        <span className="flex items-center gap-1 text-xs" style={{ color: 'var(--color-text-light)' }}>
                          <Clock size={10} />
                          {formatDistanceToNow(visitDate, { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-0 border-t animate-slide-up" style={{ borderColor: 'var(--color-border)' }}>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                        {visit.treatment && (
                          <div className="p-3 rounded-xl" style={{ background: 'var(--color-primary-light)' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-primary-dark)' }}>
                              Treatment Plan
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{visit.treatment}</p>
                          </div>
                        )}
                        {visit.notes && (
                          <div className="p-3 rounded-xl" style={{ background: 'var(--color-surface-2)' }}>
                            <p className="text-xs font-medium mb-1" style={{ color: 'var(--color-text-muted)' }}>
                              Clinical Notes
                            </p>
                            <p className="text-sm" style={{ color: 'var(--color-text)' }}>{visit.notes}</p>
                          </div>
                        )}
                        {visit.follow_up_date && (
                          <div className="flex items-center gap-2 p-3 rounded-xl" style={{ background: 'var(--color-accent-light)' }}>
                            <Calendar size={14} style={{ color: 'var(--color-accent)' }} />
                            <div>
                              <p className="text-xs font-medium" style={{ color: 'var(--color-accent)' }}>
                                Follow-up
                              </p>
                              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                                {format(parseISO(visit.follow_up_date), 'dd MMM yyyy')}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Visit Modal */}
      {showAddVisit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowAddVisit(false)} />
          <div className="relative card w-full max-w-xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                Record Visit
              </h2>
              <button onClick={() => setShowAddVisit(false)} className="p-2 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <p className="text-sm mb-5 font-medium" style={{ color: 'var(--color-primary)' }}>
              Patient: {patient.first_name} {patient.last_name}
            </p>

            <form onSubmit={handleAddVisit} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Chief Complaint *
                </label>
                <input value={visitForm.chief_complaint}
                  onChange={e => setVisitForm({ ...visitForm, chief_complaint: e.target.value })}
                  className="input-field" placeholder="Primary reason for visit" required />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Diagnosis
                </label>
                <input value={visitForm.diagnosis}
                  onChange={e => setVisitForm({ ...visitForm, diagnosis: e.target.value })}
                  className="input-field" placeholder="Clinical diagnosis" />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Treatment Plan
                </label>
                <textarea value={visitForm.treatment}
                  onChange={e => setVisitForm({ ...visitForm, treatment: e.target.value })}
                  className="input-field resize-none" rows={3} placeholder="Prescribed treatment, medications, therapy..." />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Clinical Notes
                </label>
                <textarea value={visitForm.notes}
                  onChange={e => setVisitForm({ ...visitForm, notes: e.target.value })}
                  className="input-field resize-none" rows={2} placeholder="Additional observations..." />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Follow-up Date
                  </label>
                  <input type="date" value={visitForm.follow_up_date}
                    onChange={e => setVisitForm({ ...visitForm, follow_up_date: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Status
                  </label>
                  <select value={visitForm.status}
                    onChange={e => setVisitForm({ ...visitForm, status: e.target.value })}
                    className="input-field">
                    <option value="completed">Completed</option>
                    <option value="scheduled">Scheduled</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="no-show">No Show</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowAddVisit(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {submitting ? 'Saving...' : 'Save Visit'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
