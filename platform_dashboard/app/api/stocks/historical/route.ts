import { NextResponse } from 'next/server';

// Detect market type
function detectMarket(symbol: string): 'INDIA' | 'US' {
  if (symbol.endsWith('.NS') || symbol.endsWith('.BO')) return 'INDIA';
  if (symbol.length <= 4 && /^[A-Z]+$/.test(symbol)) return 'US';
  if (symbol.includes('=') || symbol.endsWith('.US')) return 'US';
  return 'INDIA';
}

function getYahooSymbol(symbol: string): string {
  const market = detectMarket(symbol);
  if (market === 'INDIA' && !symbol.includes('.')) {
    return `${symbol}.NS`;
  }
  return symbol;
}

interface HistoricalData {
  symbol: string;
  currentPrice: number;
  dayChange: number;
  dayChangePercent: number;
  periods: {
    '5d': { change: number; changePercent: number };
    '1w': { change: number; changePercent: number };
    '1m': { change: number; changePercent: number };
    '1y': { change: number; changePercent: number };
  };
}

async function fetchHistoricalData(symbol: string): Promise<HistoricalData | null> {
  try {
    const yahooSymbol = getYahooSymbol(symbol);
    
    // Fetch multiple time ranges
    const ranges = ['5d', '1mo', '1y'];
    const prices: Record<string, number> = {};
    
    for (const range of ranges) {
      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=${range}`,
        { next: { revalidate: 300 } }
      );
      
      if (!response.ok) continue;
      
      const data = await response.json();
      const result = data.chart?.result?.[0];
      
      if (result && result.meta && result.timestamp) {
        const closePrices = result.indicators?.quote?.[0]?.close;
        if (closePrices && closePrices.length > 0) {
          // Get first valid price in range
          const firstPrice = closePrices.find((p: number | null) => p !== null);
          if (firstPrice) {
            prices[range] = firstPrice;
          }
        }
      }
    }
    
    // Get current price
    const currentResponse = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d&range=1d`,
      { next: { revalidate: 60 } }
    );
    
    if (!currentResponse.ok) return null;
    
    const currentData = await currentResponse.json();
    const result = currentData.chart?.result?.[0];
    
    if (!result || !result.meta) return null;
    
    const currentPrice = result.meta.regularMarketPrice || 0;
    const previousClose = result.meta.previousClose || currentPrice;
    const dayChange = currentPrice - previousClose;
    const dayChangePercent = previousClose > 0 ? (dayChange / previousClose) * 100 : 0;
    
    return {
      symbol,
      currentPrice,
      dayChange,
      dayChangePercent,
      periods: {
        '5d': {
          change: prices['5d'] ? currentPrice - prices['5d'] : 0,
          changePercent: prices['5d'] ? ((currentPrice - prices['5d']) / prices['5d']) * 100 : 0,
        },
        '1w': {
          change: prices['5d'] ? currentPrice - prices['5d'] : 0,
          changePercent: prices['5d'] ? ((currentPrice - prices['5d']) / prices['55d']) * 100 : 0,
        },
        '1m': {
          change: prices['1mo'] ? currentPrice - prices['1mo'] : 0,
          changePercent: prices['1mo'] ? ((currentPrice - prices['1mo']) / prices['1mo']) * 100 : 0,
        },
        '1y': {
          change: prices['1y'] ? currentPrice - prices['1y'] : 0,
          changePercent: prices['1y'] ? ((currentPrice - prices['1y']) / prices['1y']) * 100 : 0,
        },
      },
    };
  } catch (error) {
    console.error(`Error fetching historical data for ${symbol}:`, error);
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get('symbol');
  const symbols = searchParams.get('symbols');

  try {
    if (symbols) {
      // Multiple symbols
      const symbolList = symbols.split(',').map(s => s.trim());
      const results: HistoricalData[] = [];
      
      for (const sym of symbolList) {
        const data = await fetchHistoricalData(sym);
        if (data) results.push(data);
      }
      
      return NextResponse.json({ data: results });
    }
    
    if (symbol) {
      // Single symbol
      const data = await fetchHistoricalData(symbol);
      if (data) {
        return NextResponse.json(data);
      }
      return NextResponse.json(
        { error: 'Failed to fetch historical data' },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: 'Symbol or symbols required' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Historical API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
