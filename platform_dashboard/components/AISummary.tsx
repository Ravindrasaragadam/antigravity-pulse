"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ReactMarkdown from 'react-markdown';

interface AISummaryProps {
  market: "INDIA" | "US";
}

export default function AISummary({ market }: AISummaryProps) {
  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchAISummary() {
      try {
        const symbol = market === "INDIA" ? "INDIA_MARKET" : "US_MARKET";
        const { data, error } = await supabase
          .from("alerts")
          .select("reasoning")
          .eq("symbol", symbol)
          .order("created_at", { ascending: false })
          .limit(1)
          .single();

        if (error) throw error;

        if (data && data.reasoning) {
          setSummary(data.reasoning);
        } else {
          setSummary("No AI analysis available yet. The backend will generate market reports periodically.");
        }
      } catch (err: any) {
        console.error("Error fetching AI summary:", err);
        setSummary("Unable to fetch AI analysis. Please check backend connection.");
      } finally {
        setLoading(false);
      }
    }

    fetchAISummary();
  }, [market]);

  if (loading) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🧠 AI Market Intelligence
        </h2>
        <div className="animate-pulse space-y-3">
          <div className="h-4 bg-slate-800 rounded w-3/4" />
          <div className="h-4 bg-slate-800 rounded w-1/2" />
          <div className="h-4 bg-slate-800 rounded w-2/3" />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🧠 AI Market Intelligence
        <span className="text-xs bg-cyan-500/20 text-cyan-400 px-2 py-1 rounded-full">
          Last 30 Minutes
        </span>
      </h2>
      <div className="text-slate-300 text-sm leading-relaxed space-y-4">
        <ReactMarkdown
          components={{
            h1: ({children}) => <h1 className="text-xl font-bold text-white mb-3">{children}</h1>,
            h2: ({children}) => <h2 className="text-lg font-semibold text-white mb-2 mt-4">{children}</h2>,
            h3: ({children}) => <h3 className="text-base font-medium text-white mb-2 mt-3">{children}</h3>,
            p: ({children}) => <p className="mb-3">{children}</p>,
            ul: ({children}) => <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>,
            li: ({children}) => <li className="ml-4">{children}</li>,
            strong: ({children}) => <strong className="font-semibold text-white">{children}</strong>,
            em: ({children}) => <em className="italic">{children}</em>,
            a: ({children, href}) => <a href={href} className="text-cyan-400 hover:text-cyan-300 underline" target="_blank" rel="noopener noreferrer">{children}</a>,
          }}
        >{summary}</ReactMarkdown>
      </div>
    </div>
  );
}
