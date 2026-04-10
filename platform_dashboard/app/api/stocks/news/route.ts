import { NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

const CACHE_TTL_HOURS = 3;

interface NewsItem {
  title: string;
  link: string;
  source: string;
  published: string;
  sentiment: string;
  ai_signal?: string;
  ai_confidence?: number;
  summary?: string;
}

// Yahoo Finance RSS for stock-specific news
const YAHOO_NEWS_URL = 'https://feeds.finance.yahoo.com/rss/2.0/headline';

async function fetchCachedStockNews(symbol: string): Promise<NewsItem[]> {
  const { data, error } = await supabase
    .from('stock_news')
    .select('*')
    .eq('stock_symbol', symbol.toUpperCase())
    .gt('expires_at', new Date().toISOString())
    .order('published_at', { ascending: false })
    .limit(10);

  if (error || !data || data.length === 0) {
    return [];
  }

  return data.map(item => ({
    title: item.title,
    link: item.link,
    source: item.source,
    published: item.published_at,
    sentiment: item.sentiment,
    ai_signal: item.ai_signal,
    ai_confidence: item.ai_confidence,
    summary: item.summary,
  }));
}

async function saveStockNews(symbol: string, news: NewsItem[]) {
  const expiresAt = new Date(Date.now() + CACHE_TTL_HOURS * 60 * 60 * 1000).toISOString();
  
  const records = news.map(item => ({
    stock_symbol: symbol.toUpperCase(),
    title: item.title,
    link: item.link,
    source: item.source,
    published_at: item.published,
    sentiment: item.sentiment,
    ai_signal: item.ai_signal,
    ai_confidence: item.ai_confidence,
    summary: item.summary,
    expires_at: expiresAt,
  }));

  // Delete old records for this symbol
  await supabase
    .from('stock_news')
    .delete()
    .eq('stock_symbol', symbol.toUpperCase());

  // Insert new records
  const { error } = await supabase
    .from('stock_news')
    .insert(records);

  if (error) {
    console.error('Error saving stock news:', error);
  }
}

async function fetchStockNewsFromYahoo(symbol: string): Promise<NewsItem[]> {
  try {
    // Convert symbol for Yahoo Finance
    const yahooSymbol = symbol.includes('.') ? symbol : `${symbol}.NS`;
    
    const response = await fetch(
      `${YAHOO_NEWS_URL}?s=${encodeURIComponent(yahooSymbol)}&region=IN&lang=en-IN`,
      { 
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        next: { revalidate: 300 }
      }
    );

    if (!response.ok) {
      // Try without .NS suffix for US stocks
      if (symbol.includes('.NS')) {
        const usResponse = await fetch(
          `${YAHOO_NEWS_URL}?s=${encodeURIComponent(symbol.replace('.NS', ''))}`,
          { headers: { 'Accept': 'application/rss+xml' } }
        );
        if (!usResponse.ok) return [];
        return parseNewsFromRSS(await usResponse.text());
      }
      return [];
    }

    return parseNewsFromRSS(await response.text());
  } catch (error) {
    console.error(`Error fetching news for ${symbol}:`, error);
    return [];
  }
}

function parseNewsFromRSS(rssText: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item>[\s\S]*?<\/item>/g;
  const itemsMatch = rssText.match(itemRegex);

  if (itemsMatch) {
    for (const item of itemsMatch.slice(0, 10)) {
      const titleMatch = item.match(/<title>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/title>/i);
      const linkMatch = item.match(/<link>([\s\S]*?)<\/link>/i);
      const pubDateMatch = item.match(/<pubDate>([\s\S]*?)<\/pubDate>/i);
      const descMatch = item.match(/<description>(?:<!\[CDATA\[)?([\s\S]*?)(?:\]\]>)?<\/description>/i);

      if (titleMatch) {
        const title = titleMatch[1].replace(/<[^>]+>/g, '').trim();
        const sentiment = detectSentimentFromText(title);
        const signal = sentimentToSignal(sentiment);

        items.push({
          title,
          link: linkMatch ? linkMatch[1].trim() : '#',
          source: 'Yahoo Finance',
          published: pubDateMatch ? pubDateMatch[1] : new Date().toISOString(),
          sentiment,
          ai_signal: signal,
          ai_confidence: 60,
          summary: descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim().slice(0, 200) : '',
        });
      }
    }
  }

  return items;
}

function detectSentimentFromText(text: string): string {
  const positiveWords = ['surge', 'rally', 'gain', 'profit', 'growth', 'bull', 'up', 'high', 'boost', 'breakout', 'strong'];
  const negativeWords = ['fall', 'drop', 'loss', 'bear', 'down', 'low', 'crash', 'decline', 'sell', 'weak', 'plunge'];
  
  const textLower = text.toLowerCase();
  let score = 0;
  
  positiveWords.forEach(word => {
    if (textLower.includes(word)) score++;
  });
  
  negativeWords.forEach(word => {
    if (textLower.includes(word)) score--;
  });
  
  if (score > 0) return 'positive';
  if (score < 0) return 'negative';
  return 'neutral';
}

function sentimentToSignal(sentiment: string): string {
  switch (sentiment) {
    case 'positive': return 'BUY';
    case 'negative': return 'SELL';
    default: return 'NEUTRAL';
  }
}

export async function POST(request: Request) {
  try {
    const { symbol } = await request.json();

    if (!symbol) {
      return NextResponse.json(
        { error: 'Symbol required' },
        { status: 400 }
      );
    }

    // Fetch fresh news
    const news = await fetchStockNewsFromYahoo(symbol);

    // Save to database
    await saveStockNews(symbol, news);

    return NextResponse.json({
      news,
      count: news.length,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Stock news POST error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch stock news' },
      { status: 500 }
    );
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');

  if (!symbol) {
    return NextResponse.json(
      { error: 'Symbol required' },
      { status: 400 }
    );
  }

  // Check cache first
  const cachedNews = await fetchCachedStockNews(symbol);

  if (cachedNews.length > 0) {
    return NextResponse.json({
      news: cachedNews,
      count: cachedNews.length,
      cached: true,
      timestamp: new Date().toISOString(),
    });
  }

  // Fetch fresh news if no cache
  const news = await fetchStockNewsFromYahoo(symbol);
  
  if (news.length > 0) {
    await saveStockNews(symbol, news);
  }

  return NextResponse.json({
    news,
    count: news.length,
    cached: false,
    timestamp: new Date().toISOString(),
  });
}
