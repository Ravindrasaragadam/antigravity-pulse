-- Create table for stock-specific news
CREATE TABLE IF NOT EXISTS stock_news (
  id SERIAL PRIMARY KEY,
  stock_symbol TEXT NOT NULL,
  title TEXT NOT NULL,
  link TEXT NOT NULL,
  source TEXT NOT NULL,
  published_at TIMESTAMP WITH TIME ZONE,
  sentiment TEXT DEFAULT 'neutral', -- positive, negative, neutral
  ai_signal TEXT, -- BUY, SELL, NEUTRAL (AI-detected from news)
  ai_confidence INTEGER, -- 0-100
  summary TEXT,
  keywords JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 hours'
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_news_symbol 
  ON stock_news(stock_symbol);

CREATE INDEX IF NOT EXISTS idx_stock_news_expires 
  ON stock_news(expires_at);

CREATE INDEX IF NOT EXISTS idx_stock_news_published 
  ON stock_news(published_at DESC);

-- Add comment
COMMENT ON TABLE stock_news IS 
'Stores news articles specific to individual stocks.
Refreshes every 3 hours. Used on stock detail pages.';

-- Function to clean expired stock news
CREATE OR REPLACE FUNCTION clean_expired_stock_news()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stock_news 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get recent stock news
CREATE OR REPLACE FUNCTION get_recent_stock_news(p_symbol TEXT, p_limit INTEGER DEFAULT 10)
RETURNS TABLE (
  id INTEGER,
  stock_symbol TEXT,
  title TEXT,
  link TEXT,
  source TEXT,
  published_at TIMESTAMP WITH TIME ZONE,
  sentiment TEXT,
  ai_signal TEXT,
  ai_confidence INTEGER,
  summary TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sn.id,
    sn.stock_symbol,
    sn.title,
    sn.link,
    sn.source,
    sn.published_at,
    sn.sentiment,
    sn.ai_signal,
    sn.ai_confidence,
    sn.summary
  FROM stock_news sn
  WHERE sn.stock_symbol = p_symbol
    AND sn.expires_at > NOW()
  ORDER BY sn.published_at DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;
