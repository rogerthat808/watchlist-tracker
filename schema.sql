-- ============================================
--  WATCHLIST DATABASE SCHEMA
--  Purpose: Track watchlists of stocks you never bought and measure performance
-- ============================================

-- Drop tables if they already exist (for easy re-runs)
DROP TABLE IF EXISTS watchlist_items;
DROP TABLE IF EXISTS watchlists;

-- ============================================
--  Table: watchlists
-- ============================================
CREATE TABLE watchlists (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
--  Table: watchlist_items
-- ============================================
CREATE TABLE watchlist_items (
    id SERIAL PRIMARY KEY,
    watchlist_id INT NOT NULL REFERENCES watchlists(id) ON DELETE CASCADE,
    symbol TEXT NOT NULL,
    initial_price NUMERIC(18, 6) NOT NULL,
    added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
--  Indexes
-- ============================================
CREATE INDEX idx_watchlist_items_watchlist_id ON watchlist_items(watchlist_id);