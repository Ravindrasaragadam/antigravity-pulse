"use client";

import { useEffect, useState, type ReactElement } from "react";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import LoadingThinking from "./LoadingThinking";

interface StockAlert {
  id: string;
  stock_symbol: string;
  stock_name?: string;
  signal_type: string;
  reasoning: string;
  focus_areas?: string[];
  created_at: string;
  signal_strength?: number;
}

interface StockAlertsProps {
  market: "INDIA" | "US";
}

export default function StockAlerts({ market }: StockAlertsProps) {
  const [alerts, setAlerts] = useState<StockAlert[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStockAlerts() {
      try {
        const symbolPrefix = market === "INDIA" ? "INDIA" : "US";
        
        // Fetch alerts with stock symbol info
        const { data, error } = await supabase
          .from("alerts")
          .select(`
            *,
            stock_symbols:stock_symbol (
              name,
              sector
            )
          `)
          .or(`symbol.eq.${symbolPrefix}_STOCK,symbol.eq.${symbolPrefix}_MARKET`)
          .not("stock_symbol", "is", null)
          .order("created_at", { ascending: false })
          .limit(10);

        if (error) throw error;

        // Transform data to include stock names and focus areas
        const transformedAlerts = (data || []).map((alert: any) => ({
          id: alert.id,
          stock_symbol: alert.stock_symbol,
          stock_name: alert.stock_symbols?.name || alert.stock_symbol,
          signal_type: alert.signal_type || "NEUTRAL",
          reasoning: alert.reasoning || "",
          focus_areas: alert.metadata?.focus_areas || [alert.stock_symbols?.sector].filter(Boolean),
          signal_strength: alert.signal_strength,
          created_at: alert.created_at
        }));

        setAlerts(transformedAlerts);
      } catch (err: any) {
        console.error("Error fetching stock alerts:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchStockAlerts();
  }, [market]);

  const getSignalColor = (signal: string) => {
    switch (signal.toUpperCase()) {
      case "BUY":
        return "bg-emerald-500/20 text-emerald-400 border-emerald-500/50";
      case "SELL":
        return "bg-rose-500/20 text-rose-400 border-rose-500/50";
      default:
        return "bg-slate-500/20 text-slate-400 border-slate-500/50";
    }
  };

  const getSignalEmoji = (signal: string) => {
    switch (signal.toUpperCase()) {
      case "BUY":
        return "📈";
      case "SELL":
        return "📉";
      default:
        return "➖";
    }
  };

  // Parse reasoning text and convert stock symbols to clickable links
  const renderReasoningWithLinks = (reasoning: string) => {
    if (!reasoning) return reasoning;
    
    // Pattern to match stock symbols (uppercase 3-10 chars, optionally with .NS/.US)
    const stockPattern = /\b([A-Z]{3,10}(?:\.(?:NS|US))?|[A-Z]{3,10})\b/g;
    
    const parts: (string | ReactElement)[] = [];
    let lastIndex = 0;
    let match;
    
    // Reset regex
    stockPattern.lastIndex = 0;
    
    while ((match = stockPattern.exec(reasoning)) !== null) {
      const symbol = match[0];
      const index = match.index;
      
      // Add text before the match
      if (index > lastIndex) {
        parts.push(reasoning.slice(lastIndex, index));
      }
      
      // Add the linked symbol
      parts.push(
        <Link
          key={`${symbol}-${index}`}
          href={`/stock/${symbol}`}
          className="text-cyan-400 hover:text-cyan-300 underline transition-colors"
        >
          {symbol}
        </Link>
      );
      
      lastIndex = index + symbol.length;
    }
    
    // Add remaining text
    if (lastIndex < reasoning.length) {
      parts.push(reasoning.slice(lastIndex));
    }
    
    return parts.length > 0 ? <>{parts}</> : reasoning;
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🚨 Stock Alerts
          <span className="text-xs bg-orange-500/20 text-orange-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "India" : "US"}
          </span>
        </h2>
        <div className="py-6">
          <LoadingThinking message="Loading alerts" size="md" />
        </div>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🚨 Stock Alerts
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
    <div className="bg-slate-900/80 backdrop-blur-xl border border-amber-500/20 p-6 rounded-xl shadow-[0_0_30px_rgba(245,158,11,0.1)]">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🚨 Stock Alerts
        <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full border border-amber-500/30">
          {market === "INDIA" ? "India" : "US"}
        </span>
      </h2>
      <div className="space-y-4">
        {alerts.map((alert, index) => (
          <div
            key={alert.id}
            className="bg-slate-800/80 backdrop-blur-sm p-4 rounded-lg border-l-4 border-amber-500 hover:border-amber-400 hover:bg-slate-800 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_4px_20px_rgba(245,158,11,0.15)]"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            {/* Stock Symbol and Name */}
            <div className="flex items-start justify-between mb-3">
              <div>
                <Link 
                  href={`/stock/${alert.stock_symbol}`}
                  className="text-lg font-bold text-white hover:text-amber-400 transition-colors duration-200"
                >
                  {alert.stock_symbol}
                </Link>
                {alert.stock_name && alert.stock_name !== alert.stock_symbol && (
                  <p className="text-sm text-slate-400">{alert.stock_name}</p>
                )}
              </div>
              
              {/* Signal Badge */}
              <div className={`px-3 py-1 rounded-full text-xs font-bold uppercase border ${getSignalColor(alert.signal_type)}`}>
                {getSignalEmoji(alert.signal_type)} {alert.signal_type}
              </div>
            </div>

            {/* Reason with Clickable Stock Symbols */}
            <p className="text-slate-300 text-sm mb-3 leading-relaxed">
              {renderReasoningWithLinks(alert.reasoning)}
            </p>

            {/* Focus Area Tags */}
            {alert.focus_areas && alert.focus_areas.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {alert.focus_areas.map((tag, idx) => (
                  <span 
                    key={idx}
                    className="text-xs bg-slate-700/80 text-amber-400 px-2 py-1 rounded border border-amber-500/20"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Timestamp */}
            <div className="text-xs text-slate-500 flex justify-between items-center">
              <span>{new Date(alert.created_at).toLocaleString()}</span>
              {alert.signal_strength && (
                <span className="text-amber-400/80 font-medium">
                  Confidence: {Math.round(alert.signal_strength * 100)}%
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
