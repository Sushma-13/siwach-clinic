'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Search, Plus, Users, Phone, Calendar,
  ChevronRight, Clock, UserCheck, Loader2, X
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';

interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender: string;
  phone: string;
  email?: string;
  blood_group?: string;
  created_at: string;
  last_visit?: string;
  total_visits: number;
}

interface NewPatientForm {
  first_name: string; last_name: string; date_of_birth: string;
  gender: string; phone: string; email: string; address: string;
  blood_group: string; emergency_contact_name: string; emergency_contact_phone: string;
}

const emptyForm: NewPatientForm = {
  first_name: '', last_name: '', date_of_birth: '', gender: '',
  phone: '', email: '', address: '', blood_group: '',
  emergency_contact_name: '', emergency_contact_phone: '',
};

export default function PatientsPage() {
  const [patients, setPatients] = useState<Patient[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showNewPatient, setShowNewPatient] = useState(false);
  const [form, setForm] = useState<NewPatientForm>(emptyForm);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchPatients = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      const res = await fetch(`/api/patients?${params}`);
      const data = await res.json();
      setPatients(data.data || []);
      setTotal(data.meta?.total || 0);
    } catch {
      console.error('Failed to fetch patients');
    } finally {
      setLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(fetchPatients, 300);
    return () => clearTimeout(timer);
  }, [fetchPatients]);

  async function handleCreatePatient(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/patients', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to create patient'); return; }
      setShowNewPatient(false);
      setForm(emptyForm);
      fetchPatients();
    } catch {
      setFormError('Network error. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const getInitials = (p: Patient) =>
    `${p.first_name.charAt(0)}${p.last_name.charAt(0)}`.toUpperCase();

  const getAge = (dob: string) => {
    if (!dob) return null;
    const diff = Date.now() - new Date(dob).getTime();
    return Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000));
  };

  const avatarColors = [
    ['#e8f0eb', '#3a673a'], ['#fef4e8', '#9a5f1a'],
    ['#f0edf9', '#5a3f9a'], ['#e8f5f8', '#1a6d80'],
    ['#fdf0ee', '#9a2a1a'],
  ];

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
        <button onClick={() => setShowNewPatient(true)} className="btn-primary">
          <Plus size={16} />
          New Patient
        </button>
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
              {search ? 'Try a different search term' : 'Add your first patient to get started'}
            </p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            {/* Table header */}
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-5">PATIENT</div>
              <div className="col-span-2 hidden sm:block">CONTACT</div>
              <div className="col-span-2 hidden md:block">LAST VISIT</div>
              <div className="col-span-2 hidden md:block">VISITS</div>
              <div className="col-span-1" />
            </div>

            {patients.map((patient, i) => {
              const [bg, fg] = avatarColors[i % avatarColors.length];
              const age = getAge(patient.date_of_birth);

              return (
                <Link
                  key={patient.id}
                  href={`/patients/${patient.id}`}
                  className="grid grid-cols-12 gap-4 px-6 py-4 items-center transition-colors hover:bg-[#f8f6f1]"
                >
                  {/* Patient name */}
                  <div className="col-span-5 flex items-center gap-3 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ background: bg, color: fg }}>
                      {getInitials(patient)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {patient.first_name} {patient.last_name}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                        {age ? `${age} yrs` : '—'}
                        {patient.gender && ` · ${patient.gender}`}
                        {patient.blood_group && ` · ${patient.blood_group}`}
                      </p>
                    </div>
                  </div>

                  {/* Contact */}
                  <div className="col-span-2 hidden sm:flex items-center gap-1.5">
                    <Phone size={12} style={{ color: 'var(--color-text-light)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {patient.phone}
                    </span>
                  </div>

                  {/* Last visit */}
                  <div className="col-span-2 hidden md:flex items-center gap-1.5">
                    <Clock size={12} style={{ color: 'var(--color-text-light)' }} />
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {patient.last_visit
                        ? formatDistanceToNow(new Date(patient.last_visit), { addSuffix: true })
                        : 'Never'}
                    </span>
                  </div>

                  {/* Total visits */}
                  <div className="col-span-2 hidden md:block">
                    <span className={`badge ${patient.total_visits > 0 ? 'badge-success' : 'badge-neutral'}`}>
                      {patient.total_visits} visit{patient.total_visits !== 1 ? 's' : ''}
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

      {/* New Patient Modal */}
      {showNewPatient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNewPatient(false)} />
          <div className="relative card w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                Register New Patient
              </h2>
              <button onClick={() => setShowNewPatient(false)} className="p-2 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreatePatient} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    First Name *
                  </label>
                  <input value={form.first_name} onChange={e => setForm({ ...form, first_name: e.target.value })}
                    className="input-field" placeholder="Amit" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Last Name *
                  </label>
                  <input value={form.last_name} onChange={e => setForm({ ...form, last_name: e.target.value })}
                    className="input-field" placeholder="Kumar" required />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Date of Birth
                  </label>
                  <input type="date" value={form.date_of_birth}
                    onChange={e => setForm({ ...form, date_of_birth: e.target.value })}
                    className="input-field" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Gender
                  </label>
                  <select value={form.gender} onChange={e => setForm({ ...form, gender: e.target.value })}
                    className="input-field">
                    <option value="">Select</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Blood Group
                  </label>
                  <select value={form.blood_group} onChange={e => setForm({ ...form, blood_group: e.target.value })}
                    className="input-field">
                    <option value="">Unknown</option>
                    {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
                      <option key={bg} value={bg}>{bg}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Phone *
                  </label>
                  <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                    className="input-field" placeholder="+91-9876543210" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Email
                  </label>
                  <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })}
                    className="input-field" placeholder="patient@email.com" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Address
                </label>
                <textarea value={form.address} onChange={e => setForm({ ...form, address: e.target.value })}
                  className="input-field resize-none" rows={2} placeholder="Full address..." />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Emergency Contact Name
                  </label>
                  <input value={form.emergency_contact_name}
                    onChange={e => setForm({ ...form, emergency_contact_name: e.target.value })}
                    className="input-field" placeholder="Contact person" />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Emergency Contact Phone
                  </label>
                  <input value={form.emergency_contact_phone}
                    onChange={e => setForm({ ...form, emergency_contact_phone: e.target.value })}
                    className="input-field" placeholder="+91-9876543210" />
                </div>
              </div>

              {formError && (
                <div className="px-4 py-3 rounded-xl text-sm" style={{ background: 'var(--color-danger-light)', color: 'var(--color-danger)' }}>
                  {formError}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewPatient(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <UserCheck size={15} />}
                  {submitting ? 'Registering...' : 'Register Patient'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
