"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import SentimentPieChart from "@/components/SentimentPieChart";
import PriceMovementChart from "@/components/PriceMovementChart";
import SignalTrendChart from "@/components/SignalTrendChart";
import MarketMetrics from "@/components/MarketMetrics";
import CommoditiesWidget from "@/components/CommoditiesWidget";
import TradingViewWidget from "@/components/TradingViewWidget";

export default function Dashboard() {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterType, setFilterType] = useState<string>("ALL");
  const [sortBy, setSortBy] = useState<string>("date");

  useEffect(() => {
    async function fetchAlerts() {
      try {
        const { data, error: sbError } = await supabase
          .from("alerts")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(50);
        
        if (sbError) throw sbError;
        setAlerts(data || []);
      } catch (err: any) {
        console.error("Dashboard Fetch Error:", err);
        setError(err.message || "Failed to connect to Supabase. Check your environment variables.");
      } finally {
        setLoading(false);
      }
    }
    fetchAlerts();
  }, []);
  
  const filteredAlerts = alerts.filter(alert => {
    if (filterType === "ALL") return true;
    return alert.signal_type.includes(filterType);
  });
  
  const sortedAlerts = [...filteredAlerts].sort((a, b) => {
    if (sortBy === "date") {
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    } else if (sortBy === "strength") {
      return (b.strength || 0) - (a.strength || 0);
    }
    return 0;
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white p-8">
      <header className="flex justify-between items-center mb-8 border-b border-slate-800 pb-6">
        <div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">
            Market Pulse
          </h1>
          <p className="text-slate-400 mt-2">Market Intelligence & Signal Hub</p>
        </div>
        <div className="flex gap-4">
          <div className="bg-slate-900 px-4 py-2 rounded-lg border border-slate-800">
            <span className="text-sm font-medium text-slate-500 block uppercase">Market Status</span>
            <span className="text-emerald-400 font-bold">● LIVE (NSE/BSE)</span>
          </div>
        </div>
      </header>

      {/* TradingView Widget at top */}
      <div className="mb-8 bg-slate-900 border border-slate-800 p-4 rounded-xl">
        <TradingViewWidget />
      </div>

      {/* Market Metrics */}
      <div className="mb-8">
        <MarketMetrics alerts={alerts} />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Sentiment Distribution</h2>
          <SentimentPieChart alerts={alerts} />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Price Movements</h2>
          <PriceMovementChart alerts={alerts} />
        </div>
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-semibold mb-4">Signal Trends</h2>
          <SignalTrendChart alerts={alerts} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Alerts List */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              🚀 Recent Signals
            </h2>
            <div className="flex gap-2">
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <option value="ALL">All Signals</option>
                <option value="BUY">BUY Only</option>
                <option value="SELL">SELL Only</option>
                <option value="NEUTRAL">NEUTRAL Only</option>
              </select>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-slate-900 border border-slate-700 text-white px-3 py-2 rounded-lg text-sm"
              >
                <option value="date">Sort by Date</option>
                <option value="strength">Sort by Strength</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="animate-pulse space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-32 bg-slate-900 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="bg-rose-500/10 border border-rose-500/50 p-8 rounded-xl text-center">
              <h3 className="text-xl font-bold text-rose-400 mb-2">Connection Error</h3>
              <p className="text-slate-400 mb-4">{error}</p>
              <p className="text-sm text-slate-500">
                Ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in Vercel.
              </p>
            </div>
          ) : sortedAlerts.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 p-12 rounded-xl text-center">
              <p className="text-slate-500 italic">No signals found. The AI is still scanning...</p>
            </div>
          ) : (
            sortedAlerts.slice(0, 10).map((alert) => (
              <div key={alert.id} className="bg-slate-900 border border-slate-800 p-6 rounded-xl hover:border-cyan-500/50 transition-colors">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                      alert.signal_type.includes('BUY') ? 'bg-emerald-500/20 text-emerald-400' : 
                      alert.signal_type.includes('SELL') ? 'bg-rose-500/20 text-rose-400' : 'bg-slate-700 text-slate-300'
                    }`}>
                      {alert.signal_type}
                    </span>
                    <h3 className="text-xl font-bold mt-2">{alert.symbol}</h3>
                    {alert.strength && (
                      <span className="text-sm text-slate-500">Strength: {Math.round(alert.strength * 100)}%</span>
                    )}
                  </div>
                  <span className="text-slate-500 text-sm">
                    {new Date(alert.created_at).toLocaleString()}
                  </span>
                </div>
                <p className="text-slate-300 leading-relaxed">
                  {alert.reasoning}
                </p>
              </div>
            ))
          )}
        </div>

        {/* Right Column: Commodities Widget */}
        <div className="space-y-8">
          <CommoditiesWidget />
        </div>
      </div>
    </main>
  );
}
