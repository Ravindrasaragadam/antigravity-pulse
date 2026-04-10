-- Create dedicated table for stock fundamentals
CREATE TABLE IF NOT EXISTS stock_fundamentals (
  symbol TEXT PRIMARY KEY,
  pe_ratio FLOAT,
  eps FLOAT,
  book_value FLOAT,
  dividend_yield FLOAT,
  roe FLOAT,
  debt_equity FLOAT,
  market_cap TEXT,
  sector TEXT,
  industry TEXT,
  -- Technical indicators
  rsi FLOAT,
  trend TEXT,
  support FLOAT,
  resistance FLOAT,
  -- Analysis metadata
  signal TEXT, -- BUY, SELL, NEUTRAL
  confidence INTEGER, -- 0-100
  investment_horizon TEXT, -- SHORT_TERM, LONG_TERM
  stop_loss FLOAT,
  target FLOAT,
  highlights JSONB, -- Array of key points
  sentiment TEXT,
  recent_news_summary TEXT,
  related_stocks JSONB, -- Array of related stock symbols
  -- Timestamps
  analyzed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 hours',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for expiration cleanup
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_expires 
  ON stock_fundamentals(expires_at);

-- Create index for sector queries
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_sector 
  ON stock_fundamentals(sector);

-- Create index for signal queries
CREATE INDEX IF NOT EXISTS idx_stock_fundamentals_signal 
  ON stock_fundamentals(signal);

-- Add comment
COMMENT ON TABLE stock_fundamentals IS 
'Stores AI-analyzed stock fundamentals, technical indicators, and trading signals.
Data expires after 3 hours and should be refreshed via new analysis.';

-- Function to clean expired fundamentals
CREATE OR REPLACE FUNCTION clean_expired_fundamentals()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM stock_fundamentals 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
