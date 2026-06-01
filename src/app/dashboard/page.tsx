import { Users, Calendar, CalendarCheck, TrendingUp, Clock, CheckCircle2, UserPlus, Activity } from 'lucide-react'
import { query } from '@/lib/db'
import { format } from 'date-fns'

async function getDashboardData() {
  const [stats] = await query<Record<string, number>>(
    `SELECT
      (SELECT COUNT(*) FROM patients)::int as total_patients,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE)::int as todays_appointments,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date >= date_trunc('week', CURRENT_DATE) AND appointment_date < date_trunc('week', CURRENT_DATE) + INTERVAL '7 days')::int as this_week_appointments,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date >= date_trunc('month', CURRENT_DATE) AND appointment_date < date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')::int as this_month_appointments,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status = 'completed')::int as completed_today,
      (SELECT COUNT(*) FROM appointments WHERE appointment_date = CURRENT_DATE AND status = 'scheduled')::int as pending_today,
      (SELECT COUNT(*) FROM patients WHERE created_at >= date_trunc('month', CURRENT_DATE))::int as new_patients_this_month`
  )

  const todaysSchedule = await query<{
    id: number; appointment_time: string; reason: string; status: string
    patient_name: string; patient_phone: string; doctor_name: string
  }>(
    `SELECT a.id, a.appointment_time::text, a.reason, a.status,
            p.first_name || ' ' || p.last_name as patient_name,
            p.phone as patient_phone, u.name as doctor_name
     FROM appointments a
     JOIN patients p ON p.id = a.patient_id
     LEFT JOIN users u ON u.id = a.doctor_id
     WHERE a.appointment_date = CURRENT_DATE
     ORDER BY a.appointment_time ASC`
  )

  return { stats, todaysSchedule }
}

const statusConfig: Record<string, { label: string; class: string }> = {
  scheduled: { label: 'Scheduled', class: 'badge-primary' },
  completed: { label: 'Completed', class: 'badge-success' },
  cancelled: { label: 'Cancelled', class: 'badge-danger' },
  'no-show': { label: 'No Show', class: 'badge-warning' },
}

export default async function DashboardPage() {
  const { stats, todaysSchedule } = await getDashboardData()
  const todayFormatted = format(new Date(), 'EEEE, d MMMM yyyy')

  const statCards = [
    { label: 'Total Patients', value: stats?.total_patients ?? 0, icon: Users, color: 'var(--color-primary)', bg: 'var(--color-primary-light)', suffix: '' },
    { label: "Today's Appointments", value: stats?.todays_appointments ?? 0, icon: Calendar, color: 'var(--color-accent)', bg: 'var(--color-accent-light)', suffix: '' },
    { label: 'This Week', value: stats?.this_week_appointments ?? 0, icon: CalendarCheck, color: '#7c6ab5', bg: '#f0edf9', suffix: ' appts' },
    { label: 'New Patients', value: stats?.new_patients_this_month ?? 0, icon: UserPlus, color: '#2d7d94', bg: '#e8f5f8', suffix: ' this month' },
  ]

  const completionRate = stats?.todays_appointments
    ? Math.round(((stats.completed_today ?? 0) / stats.todays_appointments) * 100)
    : 0

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
            Good morning 👋
          </h1>
          <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{todayFormatted}</p>
        </div>
        <div className="card px-4 py-3 hidden sm:flex items-center gap-3">
          <Activity size={16} style={{ color: 'var(--color-primary)' }} />
          <div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Today&apos;s Progress</p>
            <p className="font-semibold text-sm" style={{ color: 'var(--color-text)' }}>
              {stats?.completed_today ?? 0}/{stats?.todays_appointments ?? 0} completed
            </p>
          </div>
          <div className="w-12 h-12 relative">
            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-border)" strokeWidth="3" />
              <circle cx="18" cy="18" r="14" fill="none" stroke="var(--color-primary)"
                strokeWidth="3" strokeDasharray={`${completionRate * 0.88} 88`} strokeLinecap="round" />
            </svg>
            <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold"
              style={{ color: 'var(--color-primary)' }}>{completionRate}%</span>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, i) => (
          <div key={i} className="card animate-slide-up" style={{ animationDelay: `${i * 60}ms` }}>
            <div className="flex items-start justify-between mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: card.bg }}>
                <card.icon size={18} style={{ color: card.color }} />
              </div>
            </div>
            <div className="text-3xl font-display font-semibold mb-1" style={{ color: 'var(--color-text)' }}>
              {card.value}
              <span className="text-base font-body font-normal" style={{ color: 'var(--color-text-muted)' }}>{card.suffix}</span>
            </div>
            <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{card.label}</p>
          </div>
        ))}
      </div>

      {/* Today's schedule */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Clock size={18} style={{ color: 'var(--color-primary)' }} />
            <h2 className="font-display font-semibold text-lg" style={{ color: 'var(--color-text)' }}>
              Today&apos;s Schedule
            </h2>
            {(stats?.pending_today ?? 0) > 0 && (
              <span className="badge badge-primary">{stats?.pending_today} pending</span>
            )}
          </div>
          <span className="text-sm" style={{ color: 'var(--color-text-muted)' }}>{format(new Date(), 'MMM d, yyyy')}</span>
        </div>

        {todaysSchedule.length === 0 ? (
          <div className="text-center py-12">
            <CalendarCheck size={40} className="mx-auto mb-3 opacity-30" style={{ color: 'var(--color-text-muted)' }} />
            <p style={{ color: 'var(--color-text-muted)' }}>No appointments scheduled for today</p>
          </div>
        ) : (
          <div className="space-y-2">
            {todaysSchedule.map((appt) => {
              const sc = statusConfig[appt.status] || statusConfig.scheduled
              const timeStr = appt.appointment_time?.slice(0, 5) || ''
              return (
                <div key={appt.id} className="flex items-center gap-4 p-4 rounded-xl transition-colors"
                  style={{ background: appt.status === 'completed' ? 'var(--color-surface-2)' : 'var(--color-surface)' }}>
                  <div className="text-center w-14 flex-shrink-0">
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-primary)' }}>{timeStr}</p>
                  </div>
                  <div className="w-px h-8 flex-shrink-0" style={{ background: 'var(--color-border)' }} />
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary-dark)' }}>
                      {appt.patient_name?.charAt(0)}
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>{appt.patient_name}</p>
                      <p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                        {appt.reason || 'General consultation'} · {appt.doctor_name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className={`badge ${sc.class}`}>{sc.label}</span>
                    {appt.status === 'completed' && <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Quick stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card" style={{ background: 'linear-gradient(135deg, #f0f7f2 0%, #e8f4ec 100%)' }}>
          <div className="flex items-center gap-3 mb-1">
            <CheckCircle2 size={16} style={{ color: 'var(--color-success)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-success)' }}>Completed Today</span>
          </div>
          <p className="text-3xl font-display font-semibold" style={{ color: 'var(--color-text)' }}>
            {stats?.completed_today ?? 0}
          </p>
        </div>
        <div className="card" style={{ background: 'linear-gradient(135deg, #fef9f0 0%, #fef4e8 100%)' }}>
          <div className="flex items-center gap-3 mb-1">
            <TrendingUp size={16} style={{ color: 'var(--color-accent)' }} />
            <span className="text-sm font-medium" style={{ color: 'var(--color-accent)' }}>This Month</span>
          </div>
          <p className="text-3xl font-display font-semibold" style={{ color: 'var(--color-text)' }}>
            {stats?.this_month_appointments ?? 0}
          </p>
        </div>
      </div>
    </div>
  )
}
