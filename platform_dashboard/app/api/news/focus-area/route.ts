import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CACHE_TTL_HOURS = 3;

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

// Base focus keywords from config
const BASE_FOCUS_KEYWORDS = ['Synbio', 'AI', 'Gold', 'Semiconductors'];

// RSS sources for different markets
const RSS_FEEDS: Record<string, string[]> = {
  INDIA: [
    'https://www.moneycontrol.com/rss/news.xml',
    'https://www.economictimes.com/rssfeedsdefault.cms',
    'https://www.business-standard.com/rss/markets.xml',
  ],
  US: [
    'https://feeds.finance.yahoo.com/rss/2.0/headline?s=%5EGSPC',
    'https://www.marketwatch.com/rss/markets',
    'https://seekingalpha.com/market_outlook.rss',
  ],
};

async function fetchCachedFocusNews(market: string) {
  const { data, error } = await supabase
    .from('focus_area_news')
    .select('*')
    .eq('market', market)
    .single();

  if (error || !data) return null;

  // Check if cache is still valid
  const cacheTime = new Date(data.created_at).getTime();
  const now = Date.now();
  const hoursDiff = (now - cacheTime) / (1000 * 60 * 60);

  if (hoursDiff > CACHE_TTL_HOURS) {
    return null;
  }

  return {
    topics: data.news_items as TopicNews[],
    trending_topics: data.trending_topics as string[],
    base_keywords: data.base_keywords as string[],
    timestamp: data.created_at,
  };
}

async function saveFocusNews(
  market: string,
  topics: TopicNews[],
  trendingTopics: string[],
  baseKeywords: string[]
) {
  const { error } = await supabase
    .from('focus_area_news')
    .upsert({
      market,
      base_keywords: baseKeywords,
      trending_topics: trendingTopics,
      news_items: topics,
      sentiment_by_topic: topics.reduce((acc, t) => ({ ...acc, [t.topic]: t.sentiment }), {}),
      created_at: new Date().toISOString(),
      expires_at: new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString(),
    });

  if (error) {
    console.error('Error saving focus news:', error);
  }
}

async function fetchRSSFeed(url: string): Promise<NewsItem[]> {
  try {
    const response = await fetch(url, {
      headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
      next: { revalidate: 300 }, // 5 minutes
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    const text = await response.text();
    
    // Simple regex-based RSS parsing
    const items: NewsItem[] = [];
    const itemRegex = /<item>[\s\S]*?<\/item>/g;
    const items_match = text.match(itemRegex);
    
    if (items_match) {
      for (const item of items_match.slice(0, 10)) {
        const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/);
        const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/);
        const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/);
        
        if (titleMatch && linkMatch) {
          items.push({
            title: titleMatch[1].replace(/<[^>]+>/g, '').trim(),
            link: linkMatch[1].trim(),
            source: new URL(url).hostname.replace('www.', ''),
            published: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
            sentiment: 'neutral',
          });
        }
      }
    }
    
    return items;
  } catch (error) {
    console.error(`Error fetching RSS from ${url}:`, error);
    return [];
  }
}

function detectTrendingTopics(news: NewsItem[]): string[] {
  // Simple keyword extraction from news titles
  const allText = news.map(n => n.title).join(' ').toLowerCase();
  
  // Common trending keywords to look for
  const trendingCandidates = [
    'earnings', 'breakout', 'rally', 'crash', 'ipo', 'merger', 'acquisition',
    'fed', 'inflation', 'gdp', 'rates', 'crypto', 'blockchain', 'ev', 'renewable',
    'oil', 'gas', 'pharma', 'biotech', 'fintech', '5g', 'cloud', 'ai', 'ml'
  ];
  
  const found = trendingCandidates.filter(word => 
    allText.includes(word.toLowerCase())
  );
  
  // Return top 2 trending topics
  return found.slice(0, 2).map(w => w.charAt(0).toUpperCase() + w.slice(1));
}

function filterNewsByTopic(news: NewsItem[], topic: string): NewsItem[] {
  const topicLower = topic.toLowerCase();
  return news.filter(item => 
    item.title.toLowerCase().includes(topicLower) ||
    topicLower.split(' ').some(word => item.title.toLowerCase().includes(word))
  );
}

function calculateSentiment(news: NewsItem[]): number {
  // Simple sentiment based on keywords
  const positiveWords = ['rally', 'surge', 'gain', 'profit', 'growth', 'bull', 'up', 'high', 'boost'];
  const negativeWords = ['fall', 'drop', 'loss', 'bear', 'down', 'low', 'crash', 'decline', 'sell'];
  
  let score = 0;
  const text = news.map(n => n.title).join(' ').toLowerCase();
  
  positiveWords.forEach(word => {
    if (text.includes(word)) score += 0.1;
  });
  
  negativeWords.forEach(word => {
    if (text.includes(word)) score -= 0.1;
  });
  
  return Math.max(-1, Math.min(1, score));
}

export async function POST(request: Request) {
  try {
    const { market = 'INDIA', base_keywords = BASE_FOCUS_KEYWORDS } = await request.json();

    if (!['INDIA', 'US'].includes(market)) {
      return NextResponse.json(
        { error: 'Market must be INDIA or US' },
        { status: 400 }
      );
    }

    // Fetch news from RSS feeds
    const feeds = RSS_FEEDS[market] || RSS_FEEDS.INDIA;
    const allNews: NewsItem[] = [];
    
    for (const feed of feeds) {
      const news = await fetchRSSFeed(feed);
      allNews.push(...news);
    }

    // Detect trending topics
    const trendingTopics = detectTrendingTopics(allNews);

    // Filter news by focus areas
    const topics: TopicNews[] = base_keywords.map((keyword: string) => {
      const filtered = filterNewsByTopic(allNews, keyword);
      return {
        topic: keyword,
        news: filtered.slice(0, 3),
        sentiment: calculateSentiment(filtered),
      };
    });

    // Save to database
    await saveFocusNews(market, topics, trendingTopics, base_keywords);

    return NextResponse.json({
      topics,
      trending_topics: trendingTopics,
      base_keywords,
      timestamp: new Date().toISOString(),
      cached: false,
    });

  } catch (error) {
    console.error('Focus area news error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch focus area news' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const market = searchParams.get('market') || 'INDIA';

  if (!['INDIA', 'US'].includes(market)) {
    return NextResponse.json(
      { error: 'Market must be INDIA or US' },
      { status: 400 }
    );
  }

  // Try to get cached data
  const cached = await fetchCachedFocusNews(market);

  if (cached) {
    return NextResponse.json({
      ...cached,
      cached: true,
    });
  }

  return NextResponse.json(
    { error: 'No cached focus news found' },
    { status: 404 }
  );
}
