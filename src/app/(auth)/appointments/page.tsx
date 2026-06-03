'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Calendar, Clock, Plus, Loader2, X, CheckCircle2, Phone, Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { format, addDays, startOfWeek, parseISO, isToday, isTomorrow } from 'date-fns';

interface Appointment {
  appointment_id: number;
  appointment_date: string;
  appointment_time: string;
  doctor_name: string;
  description?: string;
  status: string;
  patient_uhid: number;
  patient_name: string;
  patient_phone?: string;
}

interface Doctor { id: number; doctor_name: string; }
interface PatientResult { patient_uhid: number; full_name: string; whatsapp_no: string | null; phone_no: string | null; }

const statusConfig: Record<string, { label: string; cls: string }> = {
  booked:    { label: 'Booked',     cls: 'badge-primary' },
  completed: { label: 'Completed',  cls: 'badge-success' },
  cancelled: { label: 'Cancelled',  cls: 'badge-danger' },
  'no-show': { label: 'No Show',    cls: 'badge-warning' },
};

function formatTime(time: string) {
  const [h, m] = time.split(':').map(Number);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 || 12;
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function AppointmentsPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [showNewAppt, setShowNewAppt] = useState(false);
  const [weekCounts, setWeekCounts] = useState<Record<string, number>>({});

  // Form state
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [form, setForm] = useState({
    patient_uhid: '',
    patient_label: '',
    appointment_date: format(new Date(), 'yyyy-MM-dd'),
    appointment_time: '11:00',
    doctor_name: '',
    description: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  // Patient search
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState<PatientResult[]>([]);
  const [patientSearching, setPatientSearching] = useState(false);
  const [showPatientDropdown, setShowPatientDropdown] = useState(false);
  const patientSearchRef = useRef<HTMLDivElement>(null);

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
    fetch('/api/doctors').then(r => r.json()).then(d => {
      setDoctors(d.data || []);
      if (d.data?.length) setForm(f => ({ ...f, doctor_name: d.data[0].doctor_name }));
    });
  }, []);

  // Debounced patient search
  useEffect(() => {
    if (!patientSearch.trim()) { setPatientResults([]); return; }
    const timer = setTimeout(async () => {
      setPatientSearching(true);
      try {
        const res = await fetch(`/api/patients?search=${encodeURIComponent(patientSearch)}&limit=8`);
        const data = await res.json();
        setPatientResults(data.data || []);
        setShowPatientDropdown(true);
      } catch { } finally { setPatientSearching(false); }
    }, 300);
    return () => clearTimeout(timer);
  }, [patientSearch]);

  // Close patient dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (patientSearchRef.current && !patientSearchRef.current.contains(e.target as Node)) {
        setShowPatientDropdown(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function selectPatient(p: PatientResult) {
    setForm(f => ({ ...f, patient_uhid: String(p.patient_uhid), patient_label: p.full_name }));
    setPatientSearch(p.full_name);
    setShowPatientDropdown(false);
  }

  async function handleCreateAppt(e: React.FormEvent) {
    e.preventDefault();
    if (!form.patient_uhid) { setFormError('Please select a patient'); return; }
    setSubmitting(true);
    setFormError('');
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_uhid: parseInt(form.patient_uhid),
          appointment_date: form.appointment_date,
          appointment_time: form.appointment_time,
          doctor_name: form.doctor_name,
          description: form.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) { setFormError(data.error || 'Failed to create appointment'); return; }
      setShowNewAppt(false);
      setForm({ patient_uhid: '', patient_label: '', appointment_date: selectedDate, appointment_time: '11:00', doctor_name: doctors[0]?.doctor_name || '', description: '' });
      setPatientSearch('');
      fetchAppointments();
    } catch { setFormError('Network error. Please try again.'); }
    finally { setSubmitting(false); }
  }

  const [weekBase, setWeekBase] = useState<Date>(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekBase, i));

  function prevWeek() {
    const nb = addDays(weekBase, -7);
    setWeekBase(nb);
    setSelectedDate(format(nb, 'yyyy-MM-dd'));
  }
  function nextWeek() {
    const nb = addDays(weekBase, 7);
    setWeekBase(nb);
    setSelectedDate(format(nb, 'yyyy-MM-dd'));
  }

  useEffect(() => {
    const start = format(weekDates[0], 'yyyy-MM-dd');
    const end = format(weekDates[6], 'yyyy-MM-dd');
    fetch(`/api/appointments?start=${start}&end=${end}`)
      .then(r => r.json())
      .then(d => {
        const map: Record<string, number> = {};
        (d.data || []).forEach((row: { date: string; count: number }) => { map[row.date] = row.count; });
        setWeekCounts(map);
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [weekBase]);

  const getLabelForDate = (dateStr: string) => {
    const d = parseISO(dateStr);
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    return format(d, 'EEEE, d MMM');
  };

  const times = [
    '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
    '12:00', '12:30', '13:00', '13:30', '14:00',
    '17:00', '17:30', '18:00', '18:30', '19:00',
  ];

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
        <div className="flex items-center gap-2">
          <button onClick={prevWeek}
            className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-[#f0ece6]"
            style={{ color: 'var(--color-text-muted)' }}>
            <ChevronLeft size={16} />
          </button>
          <div className="flex gap-1.5 overflow-x-auto flex-1">
            {weekDates.map(date => {
              const dateStr = format(date, 'yyyy-MM-dd');
              const isSelected = dateStr === selectedDate;
              const todayDate = isToday(date);
              return (
                <button key={dateStr} onClick={() => setSelectedDate(dateStr)}
                  className="flex flex-col items-center px-3 py-2.5 rounded-xl min-w-[60px] flex-1 transition-all duration-150"
                  style={{
                    background: isSelected ? 'var(--color-primary)' : todayDate ? 'var(--color-primary-light)' : 'transparent',
                    color: isSelected ? 'white' : todayDate ? 'var(--color-primary-dark)' : 'var(--color-text-muted)',
                  }}>
                  <span className="text-xs uppercase font-medium">{format(date, 'EEE')}</span>
                  <span className="text-lg font-display font-semibold">{format(date, 'd')}</span>
                  {weekCounts[dateStr] ? (
                    <span className="text-[10px] font-semibold mt-0.5 px-1.5 py-0.5 rounded-full"
                      style={{
                        background: isSelected ? 'rgba(255,255,255,0.3)' : 'var(--color-primary)',
                        color: 'white', lineHeight: '1',
                      }}>
                      {weekCounts[dateStr]}
                    </span>
                  ) : (
                    <span className="mt-0.5 h-[16px]" />
                  )}
                </button>
              );
            })}
          </div>
          <button onClick={nextWeek}
            className="flex-shrink-0 p-2 rounded-lg transition-colors hover:bg-[#f0ece6]"
            style={{ color: 'var(--color-text-muted)' }}>
            <ChevronRight size={16} />
          </button>
        </div>
        <div className="mt-2 px-2 flex items-center gap-3">
          <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {format(weekDates[0], 'd MMM')} – {format(weekDates[6], 'd MMM yyyy')}
          </span>
          <input type="date" value={selectedDate} onChange={e => setSelectedDate(e.target.value)}
            className="input-field text-xs py-1.5" style={{ maxWidth: '150px' }} />
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
              <div className="col-span-3 hidden sm:block">DESCRIPTION</div>
              <div className="col-span-2 hidden md:block">DOCTOR</div>
              <div className="col-span-1">STATUS</div>
            </div>

            {appointments.map(appt => {
              const sc = statusConfig[appt.status] || statusConfig.booked;
              return (
                <div key={appt.appointment_id} className="grid grid-cols-12 gap-4 px-6 py-4 items-center">
                  <div className="col-span-2">
                    <div className="flex items-center gap-1.5">
                      <Clock size={13} style={{ color: 'var(--color-primary)' }} />
                      <span className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>
                        {formatTime(appt.appointment_time)}
                      </span>
                    </div>
                  </div>
                  <div className="col-span-4 flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold flex-shrink-0"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                      {appt.patient_name?.charAt(0) || '?'}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                        {appt.patient_name || `UHID #${appt.patient_uhid}`}
                      </p>
                      {appt.patient_phone && (
                        <p className="text-xs flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                          <Phone size={11} />{appt.patient_phone}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="col-span-3 hidden sm:block text-sm text-muted">{appt.description}</div>
                  <div className="col-span-2 hidden md:block">{appt.doctor_name}</div>
                  <div className="col-span-1"><span className={`badge ${sc.cls}`}>{sc.label}</span></div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
