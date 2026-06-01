'use client';

import { useState, useEffect, useCallback } from 'react';
import { Calendar, Clock, Plus, Loader2, X, CheckCircle2, User, Phone } from 'lucide-react';
import { format, addDays, startOfWeek, parseISO, isToday, isTomorrow } from 'date-fns';

interface Appointment {
  id: number; appointment_date: string; appointment_time: string;
  reason?: string; status: string; notes?: string;
  patient_name: string; patient_phone: string; doctor_name?: string; patient_id: number;
}

interface Patient { id: number; first_name: string; last_name: string; phone: string; }

const statusConfig: Record<string, { label: string; cls: string }> = {
  scheduled: { label: 'Scheduled', cls: 'badge-primary' },
  completed: { label: 'Completed', cls: 'badge-success' },
  cancelled: { label: 'Cancelled', cls: 'badge-danger' },
  'no-show': { label: 'No Show', cls: 'badge-warning' },
};

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [form, setForm] = useState({ patient_id: '', appointment_date: format(new Date(), 'yyyy-MM-dd'), appointment_time: '09:00', reason: '', notes: '' });
  const [submitting, setSubmitting] = useState(false);

  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/appointments?date=${selectedDate}`);
      const data = await res.json();
      setAppointments(data.data || []);
    } catch { } finally { setLoading(false); }
  }, [selectedDate]);

  useEffect(() => { fetchAppointments(); }, [fetchAppointments]);

  useEffect(() => {
    fetch('/api/patients?limit=100').then(r => r.json()).then(d => setPatients(d.data || []));
  }, []);

  async function handleCreateAppt(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowNewAppt(false);
        setForm({ patient_id: '', appointment_date: selectedDate, appointment_time: '09:00', reason: '', notes: '' });
        fetchAppointments();
      }
    } catch { } finally { setSubmitting(false); }
  }

  // Generate week dates
  const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getLabelForDate = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEEE, d MMM');
  };

  const times = Array.from({ length: 18 }, (_, i) => {
    const h = Math.floor(i / 2) + 9;
    const m = i % 2 === 0 ? '00' : '30';
    return `${h.toString().padStart(2, '0')}:${m}`;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold" style={{ color: 'var(--color-text)' }}>
            Appointments
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--color-text-muted)' }}>
            {getLabelForDate(selectedDate)} · {appointments.length} appointment{appointments.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={() => setShowNewAppt(true)} className="btn-primary">
          <Plus size={16} />
          Schedule
        </button>
      </div>

      {/* Week picker */}
      <div className="card p-3">
        <div className="flex gap-1.5 overflow-x-auto">
          {weekDates.map(date => {
            const dateStr = format(date, 'yyyy-MM-dd');
            const isSelected = dateStr === selectedDate;
            const todayDate = isToday(date);
            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(dateStr)}
                className="flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[60px] transition-all duration-150"
                style={{
                  background: isSelected ? 'var(--color-primary)' : todayDate ? 'var(--color-primary-light)' : 'transparent',
                  color: isSelected ? 'white' : todayDate ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                }}
              >
                <span className="text-xs uppercase font-medium">{format(date, 'EEE')}</span>
                <span className="text-lg font-display font-semibold">{format(date, 'd')}</span>
              </button>
            );
          })}
        </div>
        <div className="mt-2 px-2">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="input-field text-xs py-1.5"
            style={{ maxWidth: '160px' }}
          />
        </div>
      </div>

      {/* Appointments list */}
      <div className="card p-0 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-14">
            <Loader2 size={22} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-14">
            <Calendar size={38} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p className="font-medium mb-1" style={{ color: 'var(--color-text)' }}>No appointments</p>
            <p className="text-sm mb-4" style={{ color: 'var(--color-text-muted)' }}>
              No appointments for {getLabelForDate(selectedDate)}
            </p>
            <button onClick={() => setShowNewAppt(true)} className="btn-primary mx-auto">
              <Plus size={15} /> Schedule Appointment
            </button>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--color-border)' }}>
            <div className="grid grid-cols-12 gap-4 px-6 py-3 text-xs font-medium"
              style={{ color: 'var(--color-text-muted)', background: 'var(--color-surface-2)' }}>
              <div className="col-span-2">TIME</div>
              <div className="col-span-4">PATIENT</div>
              <div className="col-span-3 hidden sm:block">REASON</div>
              <div className="col-span-2 hidden md:block">DOCTOR</div>
              <div className="col-span-1">STATUS</div>
            </div>

            {appointments.map(appt => {
              const sc = statusConfig[appt.status] || statusConfig.scheduled;
              const timeStr = appt.appointment_time?.slice(0, 5) || '';
              return (
                <div key={appt.id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} style={{ color: 'var(--color-primary)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {timeStr}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                      {appt.patient_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {appt.patient_name}
                      </p>
                      <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                        <Phone size={10} />
                        {appt.patient_phone}
                      </p>
                    </div>
                  </div>
                  <div className="col-span-3 hidden sm:block">
                    <p className="text-sm truncate" style={{ color: 'var(--color-text-muted)' }}>
                      {appt.reason || 'General consultation'}
                    </p>
                  </div>
                  <div className="col-span-2 hidden md:block">
                    <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      {appt.doctor_name || '—'}
                    </p>
                  </div>
                  <div className="col-span-1">
                    <span className={`badge ${sc.cls}`}>{sc.label}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* New Appointment Modal */}
      {showNewAppt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setShowNewAppt(false)} />
          <div className="relative card w-full max-w-md animate-slide-up">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-display text-xl font-semibold" style={{ color: 'var(--color-text)' }}>
                Schedule Appointment
              </h2>
              <button onClick={() => setShowNewAppt(false)} className="p-2 rounded-lg"
                style={{ color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAppt} className="space-y-4">
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Patient *
                </label>
                <select value={form.patient_id}
                  onChange={e => setForm({ ...form, patient_id: e.target.value })}
                  className="input-field" required>
                  <option value="">Select patient...</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.first_name} {p.last_name} — {p.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Date *
                  </label>
                  <input type="date" value={form.appointment_date}
                    onChange={e => setForm({ ...form, appointment_date: e.target.value })}
                    className="input-field" required />
                </div>
                <div>
                  <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                    Time *
                  </label>
                  <select value={form.appointment_time}
                    onChange={e => setForm({ ...form, appointment_time: e.target.value })}
                    className="input-field">
                    {times.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Reason for Visit
                </label>
                <input value={form.reason} onChange={e => setForm({ ...form, reason: e.target.value })}
                  className="input-field" placeholder="e.g. Follow-up, knee pain review..." />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Notes
                </label>
                <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                  className="input-field resize-none" rows={2} placeholder="Any special instructions..." />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowNewAppt(false)} className="btn-secondary flex-1 justify-center">
                  Cancel
                </button>
                <button type="submit" disabled={submitting} className="btn-primary flex-1 justify-center">
                  {submitting ? <Loader2 size={15} className="animate-spin" /> : <CheckCircle2 size={15} />}
                  {submitting ? 'Scheduling...' : 'Schedule'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
