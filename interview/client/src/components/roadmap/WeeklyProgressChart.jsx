import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function WeeklyProgressChart({ data = [] }) {
  if (!data || data.length === 0) {
    return (
      <div className="bg-card text-card-foreground rounded-2xl border p-5 shadow-xs flex items-center justify-center h-64 text-muted-foreground text-sm">
        No study activity recorded yet.
      </div>
    );
  }

  return (
    <div className="bg-card text-card-foreground rounded-2xl border p-5 shadow-xs">
      <div className="mb-4">
        <h3 className="text-base font-bold tracking-tight">Study Time Distribution</h3>
        <p className="text-xs text-muted-foreground">Planned vs Completed study duration (minutes)</p>
      </div>
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
              tickFormatter={(val) => {
                const parts = String(val).split('-');
                return parts.length >= 3 ? `${parts[1]}/${parts[2]}` : val;
              }}
            />
            <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [`${value} min`, name === 'completed' ? 'Completed' : 'Planned']}
              contentStyle={{
                backgroundColor: 'var(--card)',
                borderColor: 'var(--border)',
                borderRadius: '0.75rem',
                fontSize: '0.75rem',
              }}
            />
            <Legend
              wrapperStyle={{ fontSize: '0.75rem', paddingTop: '0.5rem' }}
              formatter={(value) => (value === 'completed' ? 'Completed Study Time' : 'Planned Target')}
            />
            <Bar dataKey="planned" fill="#94a3b8" radius={[4, 4, 0, 0]} maxBarSize={28} />
            <Bar dataKey="completed" fill="#3b82f6" radius={[4, 4, 0, 0]} maxBarSize={28} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

