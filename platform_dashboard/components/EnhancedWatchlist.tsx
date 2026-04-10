"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import LoadingThinking from "./LoadingThinking";
import { SkeletonRow } from "./SkeletonCard";

interface WatchlistStock {
  symbol: string;
  name: string;
  price: number;
  dayChange: number;
  dayChangePercent: number;
  change5d?: number;
  change1w?: number;
  change1m?: number;
  change1y?: number;
  signal?: string;
  priority?: number;
}

interface Recommendation {
  symbol: string;
  name: string;
  reason: string;
  price: number;
  change: number;
}

interface EnhancedWatchlistProps {
  market: "INDIA" | "US";
}

export default function EnhancedWatchlist({ market }: EnhancedWatchlistProps) {
  const [watchlist, setWatchlist] = useState<WatchlistStock[]>([]);
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"symbol" | "price" | "change1d" | "change1m">("symbol");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  useEffect(() => {
    async function fetchWatchlist() {
      setLoading(true);
      try {
        // Fetch watchlist from database
        const { data: watchlistData, error } = await supabase
          .from("user_watchlist")
          .select(`
            *,
            stock_symbols:stock_symbol (name, sector)
          `)
          .eq("is_active", true)
          .order("priority", { ascending: false })
          .limit(20);

        if (error) throw error;

        // Get symbols
        const symbols = (watchlistData || []).map((w: any) => w.stock_symbol);

        if (symbols.length === 0) {
          setWatchlist([]);
          setLoading(false);
          return;
        }

        // Fetch current prices and historical data
        const response = await fetch(`/api/stocks/historical?symbols=${symbols.join(',')}`);
        const historicalData = response.ok ? await response.json() : { data: [] };

        // Fetch recent alerts for signals
        const { data: alertsData } = await supabase
          .from("alerts")
          .select("stock_symbol, signal_type")
          .in("stock_symbol", symbols)
          .order("created_at", { ascending: false });

        // Build watchlist with full data
        const stocks: WatchlistStock[] = (watchlistData || []).map((item: any) => {
          const hist = historicalData.data?.find((h: any) => h.symbol === item.stock_symbol);
          const alert = alertsData?.find((a: any) => a.stock_symbol === item.stock_symbol);

          return {
            symbol: item.stock_symbol,
            name: item.stock_symbols?.name || item.stock_symbol,
            price: hist?.currentPrice || 0,
            dayChange: hist?.dayChange || 0,
            dayChangePercent: hist?.dayChangePercent || 0,
            change5d: hist?.periods?.['5d']?.changePercent || 0,
            change1w: hist?.periods?.['1w']?.changePercent || 0,
            change1m: hist?.periods?.['1m']?.changePercent || 0,
            change1y: hist?.periods?.['1y']?.changePercent || 0,
            signal: alert?.signal_type,
            priority: item.priority,
          };
        });

        // Filter by market
        const filtered = stocks.filter((s) => {
          if (market === "INDIA") {
            return s.symbol.length > 4 || s.symbol.includes('.NS') || s.symbol.includes('.BO');
          }
          return s.symbol.length <= 4 || s.symbol.includes('.US');
        });

        setWatchlist(filtered);

        // Fetch recommendations from alerts or trending
        const { data: trendData } = await supabase
          .from("alerts")
          .select("stock_symbol, reasoning, signal_type")
          .eq("signal_type", "BUY")
          .not("stock_symbol", "in", symbols)
          .order("created_at", { ascending: false })
          .limit(5);

        const recs: Recommendation[] = (trendData || []).map((a: any) => ({
          symbol: a.stock_symbol,
          name: a.stock_symbol,
          reason: a.reasoning?.slice(0, 60) + "..." || "Trending stock",
          price: 0,
          change: 0,
        }));

        setRecommendations(recs);
      } catch (err) {
        console.error("Error fetching watchlist:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchWatchlist();
  }, [market]);

  const sortedWatchlist = [...watchlist].sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case "symbol":
        comparison = a.symbol.localeCompare(b.symbol);
        break;
      case "price":
        comparison = a.price - b.price;
        break;
      case "change1d":
        comparison = a.dayChangePercent - b.dayChangePercent;
        break;
      case "change1m":
        comparison = (a.change1m || 0) - (b.change1m || 0);
        break;
    }
    return sortOrder === "asc" ? comparison : -comparison;
  });

  const formatChange = (change?: number) => {
    if (change === undefined || change === null) return "—";
    const sign = change > 0 ? "+" : "";
    return `${sign}${change.toFixed(2)}%`;
  };

  const getChangeColor = (change?: number) => {
    if (change === undefined || change === null) return "text-slate-400";
    return change > 0 ? "text-emerald-400" : change < 0 ? "text-rose-400" : "text-slate-400";
  };

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            ⭐ Watchlist
            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
              {market === "INDIA" ? "India" : "US"}
            </span>
          </h2>
        </div>
        <div className="py-6">
          <LoadingThinking message="Loading watchlist" size="md" />
        </div>
        <div className="space-y-3 mt-4">
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
          <SkeletonRow />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          ⭐ Watchlist
          <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "India" : "US"}
          </span>
          <span className="text-xs text-slate-500">({sortedWatchlist.length} stocks)</span>
        </h2>
        
        {/* Sort Controls */}
        <div className="flex gap-2">
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="bg-slate-800 text-sm px-3 py-1.5 rounded border border-slate-700"
          >
            <option value="symbol">Symbol</option>
            <option value="price">Price</option>
            <option value="change1d">1D Change</option>
            <option value="change1m">1M Change</option>
          </select>
          <button
            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
            className="bg-slate-800 px-3 py-1.5 rounded border border-slate-700 text-sm"
          >
            {sortOrder === "asc" ? "↑" : "↓"}
          </button>
        </div>
      </div>

      {/* Watchlist Table */}
      {sortedWatchlist.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-slate-400 border-b border-slate-700">
                <th className="text-left py-2 px-2">Symbol</th>
                <th className="text-right py-2 px-2">Price</th>
                <th className="text-right py-2 px-2">1D</th>
                <th className="text-right py-2 px-2">5D</th>
                <th className="text-right py-2 px-2">1M</th>
                <th className="text-right py-2 px-2">1Y</th>
                <th className="text-center py-2 px-2">Signal</th>
              </tr>
            </thead>
            <tbody>
              {sortedWatchlist.map((stock) => (
                <tr key={stock.symbol} className="border-b border-slate-800 hover:bg-slate-800/50 transition-colors">
                  <td className="py-3 px-2">
                    <Link
                      href={`/stock/${stock.symbol}`}
                      className="font-medium text-white hover:text-cyan-400 transition-colors"
                    >
                      {stock.symbol}
                    </Link>
                    <p className="text-xs text-slate-500 truncate max-w-[120px]">{stock.name}</p>
                  </td>
                  <td className="text-right py-3 px-2 font-medium">
                    ₹{stock.price.toFixed(2)}
                  </td>
                  <td className={`text-right py-3 px-2 ${getChangeColor(stock.dayChangePercent)}`}>
                    {formatChange(stock.dayChangePercent)}
                  </td>
                  <td className={`text-right py-3 px-2 ${getChangeColor(stock.change5d)}`}>
                    {formatChange(stock.change5d)}
                  </td>
                  <td className={`text-right py-3 px-2 ${getChangeColor(stock.change1m)}`}>
                    {formatChange(stock.change1m)}
                  </td>
                  <td className={`text-right py-3 px-2 ${getChangeColor(stock.change1y)}`}>
                    {formatChange(stock.change1y)}
                  </td>
                  <td className="text-center py-3 px-2">
                    {stock.signal ? (
                      <span className={`text-xs px-2 py-1 rounded ${
                        stock.signal === "BUY"
                          ? "bg-emerald-500/20 text-emerald-400"
                          : stock.signal === "SELL"
                          ? "bg-rose-500/20 text-rose-400"
                          : "bg-amber-500/20 text-amber-400"
                      }`}>
                        {stock.signal}
                      </span>
                    ) : (
                      <span className="text-slate-600">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-slate-400">
          <p>Your watchlist is empty.</p>
          <p className="text-sm mt-2">
            Search for stocks above and click "+ Add to Watchlist"
          </p>
        </div>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="mt-6 pt-6 border-t border-slate-800">
          <h3 className="text-sm font-semibold text-slate-400 mb-3 uppercase tracking-wider">
            💡 Recommended Based on Your Interests
          </h3>
          <div className="space-y-2">
            {recommendations.map((rec) => (
              <div key={rec.symbol} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                <div>
                  <Link
                    href={`/stock/${rec.symbol}`}
                    className="font-medium text-white hover:text-cyan-400 transition-colors"
                  >
                    {rec.symbol}
                  </Link>
                  <p className="text-xs text-slate-400">{rec.reason}</p>
                </div>
                <Link
                  href={`/stock/${rec.symbol}`}
                  className="text-xs px-3 py-1.5 bg-cyan-500/20 text-cyan-400 rounded hover:bg-cyan-500/30 transition-colors"
                >
                  View →
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
