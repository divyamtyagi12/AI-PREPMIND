import React from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from 'recharts';

export function MasteryProgressChart({ history = [], initialPrior = 0.20 }) {
  if (!history || history.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 border rounded-xl bg-card p-6 text-center text-muted-foreground">
        <p className="text-sm">No learning observations recorded for this topic yet.</p>
        <p className="text-xs mt-1">Complete diagnostic assessments or adaptive practice to generate your mastery curve.</p>
      </div>
    );
  }

  // Prepend baseline step 0 (initial prior before observations)
  const chartData = [
    {
      step: 0,
      label: 'Baseline Prior',
      mastery: Math.round(initialPrior * 100),
      isCorrect: null,
      date: 'Prior',
    },
    ...history.map((h, idx) => ({
      step: idx + 1,
      label: `Obs #${idx + 1}`,
      mastery: Math.round(h.updatedMastery * 100),
      isCorrect: h.isCorrect,
      date: h.recordedAt ? new Date(h.recordedAt).toLocaleDateString() : `#${idx + 1}`,
    })),
  ];

  return (
    <div className="w-full bg-card rounded-xl border p-4 sm:p-6 shadow-xs">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h4 className="text-sm font-semibold tracking-tight">Bayesian Mastery Progression</h4>
          <p className="text-xs text-muted-foreground">Mastery probability trajectory P(L_t) after sequential practice observations</p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Correct Response
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Incorrect Response
          </span>
        </div>
      </div>

      <div className="h-64 sm:h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 10, right: 20, left: -10, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.2} vertical={false} />
            <XAxis dataKey="step" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={(v) => `${v}%`}
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11 }}
            />
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const d = payload[0].payload;
                return (
                  <div className="bg-popover text-popover-foreground rounded-lg border shadow-md p-2.5 text-xs">
                    <p className="font-semibold">{d.label}</p>
                    <p className="text-primary font-bold mt-1">Mastery: {d.mastery}%</p>
                    {d.isCorrect !== null && (
                      <p className={`mt-0.5 font-medium ${d.isCorrect ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {d.isCorrect ? '✓ Correct Answer' : '✗ Incorrect Answer'}
                      </p>
                    )}
                    <p className="text-muted-foreground text-[10px] mt-1">{d.date}</p>
                  </div>
                );
              }}
            />
            {/* Reference line for 70% proficiency threshold */}
            <ReferenceLine y={70} stroke="#3b82f6" strokeDasharray="3 3" label={{ value: 'Proficiency (70%)', position: 'insideTopRight', fontSize: 10, fill: '#3b82f6' }} />
            <Line
              type="monotone"
              dataKey="mastery"
              stroke="#6366f1"
              strokeWidth={2.5}
              dot={(props) => {
                const { cx, cy, payload } = props;
                if (payload.isCorrect === null) {
                  return <circle cx={cx} cy={cy} r={3.5} fill="#6366f1" stroke="#fff" strokeWidth={1.5} key={`dot-${payload.step}`} />;
                }
                const fill = payload.isCorrect ? '#10b981' : '#f43f5e';
                return <circle cx={cx} cy={cy} r={4.5} fill={fill} stroke="#fff" strokeWidth={1.5} key={`dot-${payload.step}`} />;
              }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

