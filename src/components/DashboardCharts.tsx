'use client';

import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

interface ChartRow { month: string; appointments: number; leads: number; }
interface DoctorRow { name: string; value: number; }

const PIE_COLORS = ['#4a8c4a', '#e8940a', '#7c6ab5', '#2d7d94', '#c0392b'];

const tooltipStyle = {
  borderRadius: 10,
  border: 'none',
  boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
  fontSize: 12,
};

const RADIAN = Math.PI / 180;
function PieLabel({ cx, cy, midAngle, innerRadius, outerRadius, percent }: {
  cx: number; cy: number; midAngle: number;
  innerRadius: number; outerRadius: number; percent: number;
}) {
  const r = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + r * Math.cos(-midAngle * RADIAN);
  const y = cy + r * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="white" textAnchor="middle" dominantBaseline="central"
      fontSize={13} fontWeight="bold">
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
}

export default function DashboardCharts({
  chartData,
  doctorDist,
}: {
  chartData: ChartRow[];
  doctorDist: DoctorRow[];
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Monthly bar chart */}
      <div className="card lg:col-span-7">
        <h2 className="font-display font-semibold text-base mb-5" style={{ color: 'var(--color-text)' }}>
          Monthly Overview
        </h2>
        {chartData.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData} barCategoryGap="30%">
              <XAxis dataKey="month" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} axisLine={false} tickLine={false} allowDecimals={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
              <Bar dataKey="appointments" name="Appointments" fill="#4a8c4a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="leads" name="New Patients" fill="#e8940a" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Doctor pie chart */}
      <div className="card lg:col-span-5">
        <h2 className="font-display font-semibold text-base mb-5" style={{ color: 'var(--color-text)' }}>
          Appointments by Doctor
        </h2>
        {doctorDist.length === 0 ? (
          <div className="flex items-center justify-center h-48 text-sm" style={{ color: 'var(--color-text-muted)' }}>
            No data yet
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie
                data={doctorDist}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={85}
                labelLine={false}
                label={PieLabel}
              >
                {doctorDist.map((_, i) => (
                  <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
