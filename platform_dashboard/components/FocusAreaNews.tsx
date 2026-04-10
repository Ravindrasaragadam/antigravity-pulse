"use client";

import { useEffect, useState } from "react";
import LoadingThinking from "./LoadingThinking";

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
  sentiment: string;
  summary?: string;
}

interface TopicNews {
  topic: string;
  news: NewsItem[];
  sentiment: number;
}

interface FocusAreaNewsProps {
  market: "INDIA" | "US";
  baseKeywords?: string[];
}

export default function FocusAreaNews({ 
  market, 
  baseKeywords = ["Synbio", "AI", "Gold", "Semiconductors"] 
}: FocusAreaNewsProps) {
  const [topics, setTopics] = useState<TopicNews[]>([]);
  const [trendingTopics, setTrendingTopics] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");

  useEffect(() => {
    async function fetchFocusNews() {
      setLoading(true);
      setGenerating(false);
      
      try {
        // Try to get cached focus area news
        const response = await fetch(`/api/news/focus-area?market=${market}`);
        
        if (response.ok) {
          const data = await response.json();
          setTopics(data.topics || []);
          setTrendingTopics(data.trending_topics || []);
          setLastUpdated(data.timestamp || new Date().toISOString());
          setLoading(false);
          return;
        }

        // If no cache, trigger generation
        setGenerating(true);
        const generateResponse = await fetch('/api/news/focus-area', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ market, base_keywords: baseKeywords }),
        });
        
        if (generateResponse.ok) {
          const data = await generateResponse.json();
          setTopics(data.topics || []);
          setTrendingTopics(data.trending_topics || []);
          setLastUpdated(data.timestamp || new Date().toISOString());
        }
      } catch (err) {
        console.error("Error fetching focus news:", err);
      } finally {
        setLoading(false);
        setGenerating(false);
      }
    }

    fetchFocusNews();
  }, [market, baseKeywords]);

  if (loading || generating) {
    return (
      <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          🎯 Focus Area News
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "🇮🇳" : "🇺🇸"}
          </span>
        </h2>
        <div className="py-8">
          <LoadingThinking message="Analyzing focus areas" size="md" />
          <p className="text-xs text-slate-500 mt-4 text-center">
            Scanning news for {baseKeywords.join(", ")} and trending topics...
          </p>
        </div>
      </div>
    );
  }

  const allTopics = topics.length > 0 ? topics : baseKeywords.map(k => ({ 
    topic: k, 
    news: [], 
    sentiment: 0 
  }));

  return (
    <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
      <div className="flex justify-between items-start mb-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          🎯 Focus Area News
          <span className="text-xs bg-purple-500/20 text-purple-400 px-2 py-1 rounded-full">
            {market === "INDIA" ? "🇮🇳" : "🇺🇸"}
          </span>
        </h2>
        {lastUpdated && (
          <span className="text-xs text-slate-500">
            {new Date(lastUpdated).toLocaleTimeString()}
          </span>
        )}
      </div>

      {/* Trending Topics */}
      {trendingTopics.length > 0 && (
        <div className="mb-4">
          <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
            🔥 Trending Now
          </h3>
          <div className="flex flex-wrap gap-2">
            {trendingTopics.map((topic, i) => (
              <span 
                key={i} 
                className="text-xs px-3 py-1.5 bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 rounded-full border border-amber-500/30"
              >
                {topic}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Base Keywords */}
      <div className="mb-4">
        <h3 className="text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
          📊 Your Focus Areas
        </h3>
        <div className="flex flex-wrap gap-2">
          {baseKeywords.map((keyword, i) => (
            <span 
              key={i} 
              className="text-xs px-2 py-1 bg-slate-800 text-slate-300 rounded"
            >
              {keyword}
            </span>
          ))}
        </div>
      </div>

      {/* News by Topic */}
      <div className="space-y-4">
        {allTopics.slice(0, 3).map((topicData) => (
          <div key={topicData.topic} className="border-l-2 border-slate-700 pl-4">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-sm font-semibold text-white">{topicData.topic}</h3>
              <span className={`text-xs px-2 py-0.5 rounded ${
                topicData.sentiment > 0.2 ? 'bg-emerald-500/20 text-emerald-400' :
                topicData.sentiment < -0.2 ? 'bg-rose-500/20 text-rose-400' :
                'bg-slate-500/20 text-slate-400'
              }`}>
                {topicData.sentiment > 0.2 ? '🟢' : topicData.sentiment < -0.2 ? '🔴' : '⚪'}
              </span>
            </div>
            
            {topicData.news && topicData.news.length > 0 ? (
              <div className="space-y-2">
                {topicData.news.slice(0, 2).map((item, i) => (
                  <a
                    key={i}
                    href={item.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block text-xs text-slate-300 hover:text-cyan-400 transition-colors"
                  >
                    <span className="text-slate-500">[{item.source}]</span>{" "}
                    {item.title}
                  </a>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">No recent news for this topic</p>
            )}
          </div>
        ))}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-500">
        Focus area news refreshes every 3 hours
      </div>
    </div>
  );
}
