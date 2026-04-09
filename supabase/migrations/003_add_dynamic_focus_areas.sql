-- Migration: Add dynamic focus areas table
-- This allows focus areas to be dynamically updated based on market trends

-- Table to store dynamic focus areas with priority and rationale
CREATE TABLE IF NOT EXISTS focus_areas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    keyword TEXT NOT NULL UNIQUE,
    category TEXT, -- SECTOR, THEME, EVENT, ASSET_CLASS
    priority INTEGER DEFAULT 5, -- 1-10, higher = more important
    rationale TEXT, -- Why this focus area is relevant now
    market_context TEXT, -- MARKET_CORRECTION, TRENDING_UP, EARNINGS_SEASON, etc.
    is_user_defined BOOLEAN DEFAULT FALSE, -- True if from FOCUS_KEYWORDS env var
    is_active BOOLEAN DEFAULT TRUE,
    last_evaluated_at TIMESTAMPTZ DEFAULT now(),
    metadata JSONB -- Additional data like related stocks, news count, etc.
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_focus_areas_active ON focus_areas(is_active);
CREATE INDEX IF NOT EXISTS idx_focus_areas_priority ON focus_areas(priority DESC);
CREATE INDEX IF NOT EXISTS idx_focus_areas_category ON focus_areas(category);

-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_focus_areas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_focus_areas ON focus_areas;
CREATE TRIGGER trigger_update_focus_areas
    BEFORE UPDATE ON focus_areas
    FOR EACH ROW
    EXECUTE FUNCTION update_focus_areas_updated_at();

-- Table to store focus area evaluation history
CREATE TABLE IF NOT EXISTS focus_area_evaluations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    evaluated_at TIMESTAMPTZ DEFAULT now(),
    previous_focus_areas TEXT[],
    new_focus_areas TEXT[],
    market_conditions TEXT, -- Description of market when evaluation happened
    trigger_type TEXT, -- WEEKLY_REEVAL, MARKET_CORRECTION, MANUAL, etc.
    reasoning TEXT -- AI-generated reasoning for the changes
);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_focus_evaluations_date ON focus_area_evaluations(evaluated_at DESC);
