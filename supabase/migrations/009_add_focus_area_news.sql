-- Create table for focus area news with trending topics
CREATE TABLE IF NOT EXISTS focus_area_news (
  id SERIAL PRIMARY KEY,
  market TEXT NOT NULL, -- 'INDIA' or 'US'
  base_keywords JSONB NOT NULL, -- e.g., ["Synbio", "AI", "Gold", "Semiconductors"]
  trending_topics JSONB, -- AI-detected trending topics
  news_items JSONB NOT NULL, -- Array of news articles by topic
  sentiment_by_topic JSONB, -- Sentiment score for each topic
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 hours',
  UNIQUE(market)
);

-- Create index for expiration
CREATE INDEX IF NOT EXISTS idx_focus_area_news_expires 
  ON focus_area_news(expires_at);

-- Create index for market lookups
CREATE INDEX IF NOT EXISTS idx_focus_area_news_market 
  ON focus_area_news(market);

-- Add comment
COMMENT ON TABLE focus_area_news IS 
'Stores focus area news for specific markets including base keywords and AI-detected trending topics.
Refreshes every 3 hours. Separate from general market news.';

-- Function to clean expired focus area news
CREATE OR REPLACE FUNCTION clean_expired_focus_news()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM focus_area_news 
  WHERE expires_at < NOW();
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;
