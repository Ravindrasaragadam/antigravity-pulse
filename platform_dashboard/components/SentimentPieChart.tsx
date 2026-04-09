"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';

interface SentimentPieChartProps {
  alerts: any[];
}

const COLORS = {
  BUY: '#10b981',
  SELL: '#ef4444',
  NEUTRAL: '#6b7280'
};

export default function SentimentPieChart({ alerts }: SentimentPieChartProps) {
  const data = [
    { name: 'BUY', value: alerts.filter(a => a.signal_type.includes('BUY')).length },
    { name: 'SELL', value: alerts.filter(a => a.signal_type.includes('SELL')).length },
    { name: 'NEUTRAL', value: alerts.filter(a => a.signal_type.includes('NEUTRAL')).length }
  ].filter(d => d.value > 0);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500">No signal data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[entry.name as keyof typeof COLORS]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>
    </ResponsiveContainer>
  );
}
