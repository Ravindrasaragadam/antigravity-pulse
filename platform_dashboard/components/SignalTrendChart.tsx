"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface SignalTrendChartProps {
  alerts: any[];
}

export default function SignalTrendChart({ alerts }: SignalTrendChartProps) {
  const signalCounts = alerts.reduce((acc, alert) => {
    const symbol = alert.symbol;
    if (!acc[symbol]) {
      acc[symbol] = { BUY: 0, SELL: 0, NEUTRAL: 0 };
    }
    if (alert.signal_type.includes('BUY')) acc[symbol].BUY++;
    else if (alert.signal_type.includes('SELL')) acc[symbol].SELL++;
    else acc[symbol].NEUTRAL++;
    return acc;
  }, {} as Record<string, { BUY: number; SELL: number; NEUTRAL: number }>);

  const data = (Object.entries(signalCounts) as [string, { BUY: number; SELL: number; NEUTRAL: number }][])
    .map(([symbol, counts]) => ({
      symbol,
      BUY: counts.BUY,
      SELL: counts.SELL,
      NEUTRAL: counts.NEUTRAL
    }))
    .slice(0, 10);

  if (data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center">
        <p className="text-slate-500">No signal trend data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={256}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
        <XAxis 
          dataKey="symbol" 
          stroke="#94a3b8"
          fontSize={12}
        />
        <YAxis 
          stroke="#94a3b8"
          fontSize={12}
        />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1e293b', border: '1px solid #334155', borderRadius: '8px' }}
          itemStyle={{ color: '#e2e8f0' }}
        />
        <Bar dataKey="BUY" stackId="a" fill="#10b981" name="BUY" />
        <Bar dataKey="SELL" stackId="a" fill="#ef4444" name="SELL" />
        <Bar dataKey="NEUTRAL" stackId="a" fill="#6b7280" name="NEUTRAL" />
      </BarChart>
    </ResponsiveContainer>
  );
}
