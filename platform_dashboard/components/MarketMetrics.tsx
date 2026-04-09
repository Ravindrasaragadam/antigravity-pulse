"use client";

interface MarketMetricsProps {
  alerts: any[];
}

export default function MarketMetrics({ alerts }: MarketMetricsProps) {
  const totalAlerts = alerts.length;
  const buySignals = alerts.filter(a => a.signal_type.includes('BUY')).length;
  const sellSignals = alerts.filter(a => a.signal_type.includes('SELL')).length;
  const neutralSignals = alerts.filter(a => a.signal_type.includes('NEUTRAL')).length;
  
  const avgStrength = alerts.length > 0 
    ? alerts.reduce((sum, a) => sum + (a.strength || 0), 0) / alerts.length 
    : 0;

  const accuracyScore = alerts.length > 0
    ? alerts.reduce((sum, a) => sum + (a.accuracy_score || 0), 0) / alerts.length
    : 0;

  const metrics = [
    {
      label: "Total Alerts",
      value: totalAlerts,
      color: "text-cyan-400",
      icon: "📊"
    },
    {
      label: "BUY Signals",
      value: buySignals,
      color: "text-emerald-400",
      icon: "📈"
    },
    {
      label: "SELL Signals",
      value: sellSignals,
      color: "text-rose-400",
      icon: "📉"
    },
    {
      label: "Avg Strength",
      value: avgStrength > 0 ? `${(avgStrength * 100).toFixed(0)}%` : "--",
      color: "text-purple-400",
      icon: "💪"
    },
    {
      label: "Accuracy",
      value: accuracyScore > 0 ? `${(accuracyScore * 100).toFixed(0)}%` : "--",
      color: "text-amber-400",
      icon: "🎯"
    }
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
      {metrics.map((metric, index) => (
        <div
          key={index}
          className="bg-slate-900 border border-slate-800 p-4 rounded-xl hover:border-slate-700 transition-colors"
        >
          <div className="text-2xl mb-2">{metric.icon}</div>
          <div className={`text-2xl font-bold ${metric.color}`}>
            {metric.value}
          </div>
          <div className="text-slate-500 text-sm mt-1">{metric.label}</div>
        </div>
      ))}
    </div>
  );
}
