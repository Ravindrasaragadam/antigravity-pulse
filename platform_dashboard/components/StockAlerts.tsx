"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from 'react-markdown';

interface StockAlertsProps {
  market: "INDIA" | "US";
}

export default function StockAlerts({ market }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStockAlerts() {
      try {
        const symbol = market === "INDIA" ? "INDIA_STOCK" : "US_STOCK";
        const { data, error } = await supabase
          .from("alerts")
          .select("*")
          .eq("symbol", symbol)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;
        setAlerts(data || []);
      } catch (err: any) {
        console.error("Error fetching stock alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStockAlerts();
  }, [market]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🚨 Stock-Level Alerts
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "India" : "US"}
          </span>
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🚨 Stock-Level Alerts
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "India" : "US"}
          </span>
        </h2>
        <p className="text-slate-400">
          No stock alerts yet. The backend will generate stock-level alerts when it identifies specific opportunities.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🚨 Stock-Level Alerts
        <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
          {market === "INDIA" ? "India" : "US"}
        </span>
      </h2>
      <div className="space-y-4">
        {alerts.map((alert) => (
          <div
            key={alert.id}
            className="bg-slate-800 p-4 rounded-lg border-l-4 border-orange-500"
          >
            {alert.stock_symbol && (
              <div className="text-sm text-orange-400 font-semibold mb-2">
                {alert.stock_symbol}
              </div>
            )}
            <div className="prose prose-invert prose-sm max-w-none">
              <ReactMarkdown>{alert.reasoning}</ReactMarkdown>
            </div>
            {alert.created_at && (
              <div className="text-xs text-slate-500 mt-2">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
