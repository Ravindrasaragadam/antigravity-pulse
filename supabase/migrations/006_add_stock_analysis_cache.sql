-- Create table for caching AI stock analysis (3-hour TTL)
CREATE TABLE IF NOT EXISTS stock_analysis_cache (
  symbol TEXT PRIMARY KEY,
  analysis JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  expires_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() + INTERVAL '3 hours'
);

-- Create index on expires_at for cleanup queries
CREATE INDEX IF NOT EXISTS idx_stock_analysis_cache_expires 
  ON stock_analysis_cache(expires_at);

-- Add comment explaining the table
COMMENT ON TABLE stock_analysis_cache IS 
'Caches AI-generated stock analysis for 3 hours to reduce API costs. 
Dashboard fetches from this first before calling NVIDIA NIM.';

-- Create function to clean expired cache entries
CREATE OR REPLACE FUNCTION clean_expired_stock_analysis()
RETURNS void AS $$
BEGIN
  DELETE FROM stock_analysis_cache 
  WHERE expires_at < NOW();
END;
$$ LANGUAGE plpgsql;

-- Optional: Create a trigger to auto-cleanup on insert (runs cleanup every 10 inserts)
CREATE OR REPLACE FUNCTION trigger_cleanup_analysis_cache()
RETURNS TRIGGER AS $$
DECLARE
  count_cache INTEGER;
BEGIN
  SELECT COUNT(*) INTO count_cache FROM stock_analysis_cache;
  
  -- Clean up expired entries every 10 inserts
  IF count_cache % 10 = 0 THEN
    PERFORM clean_expired_stock_analysis();
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER cleanup_analysis_cache_trigger
  AFTER INSERT ON stock_analysis_cache
  FOR EACH ROW
  EXECUTE FUNCTION trigger_cleanup_analysis_cache();
