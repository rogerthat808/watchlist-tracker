const express = require("express");
const dotenv = require("dotenv");
const path = require("path");           
const { getQuote } = require("./finnhub");
const { pool } = require("./db");

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(express.json());

// serve static files from /public
app.use(express.static(path.join(__dirname, "public")));

/**
 * Health check route
 * GET /
 */
app.get("/", (req, res) => {
  res.send("Watchlist server is running.");
});

/**
 * Finnhub quote route
 * GET /quote/:symbol
 * Example: GET /quote/AAPL
 */
app.get("/quote/:symbol", async (req, res) => {
  const symbol = req.params.symbol.toUpperCase();

  try {
    const quote = await getQuote(symbol);

    if (!quote || typeof quote.c !== "number") {
      return res.status(500).json({
        error: "Invalid response from Finnhub",
        raw: quote,
      });
    }

    res.json({
      symbol,
      current_price: quote.c,
      high: quote.h,
      low: quote.l,
      open: quote.o,
      previous_close: quote.pc,
      raw: quote, // keep this for debugging; remove later if you want
    });
  } catch (err) {
    console.error("Error in /quote route:", err.response?.data || err.message);
    res.status(500).json({
      error: "Failed to fetch quote from Finnhub",
      details: err.response?.data || err.message,
    });
  }
});

/**
 * Create a new watchlist
 * POST /watchlists
 * body: { "name": "Tech I skipped" }
 */
app.post("/watchlists", async (req, res) => {
  const { name } = req.body;

  // if no name provided, send error
  if (!name) {
    return res.status(400).json({ error: "name is required" });
  }

  try {
    const result = await pool.query(
      "INSERT INTO watchlists (name) VALUES ($1) RETURNING *",
      [name]
    );
    // return the new row
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error creating watchlist:", err);
    res.status(500).json({ error: "Failed to create watchlist" });
  }
});

/**
 * Add a stock symbol to a specific watchlist
 * POST /watchlists/:id/items
 * body: { "symbol": "AAPL" }
 */
app.post("/watchlists/:id/items", async (req, res) => {
  const watchlistId = req.params.id;
  const { symbol } = req.body;

  if (!symbol) {
    return res.status(400).json({ error: "symbol is required" });
  }

  try {
    // Confirm the watchlist exists
    const wl = await pool.query("SELECT id FROM watchlists WHERE id = $1", [watchlistId]);
    if (wl.rows.length === 0) {
      return res.status(404).json({ error: "Watchlist not found" });
    }

    const upperSymbol = symbol.toUpperCase();

    // Fetch current market price from Finnhub
    const quote = await getQuote(upperSymbol);
    const currentPrice = quote.c;

    if (!currentPrice || currentPrice <= 0) {
      return res.status(400).json({ error: "Invalid price from Finnhub", quote });
    }

    // Insert the stock into the watchlist_items table
    const result = await pool.query(
      `INSERT INTO watchlist_items (watchlist_id, symbol, initial_price)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [watchlistId, upperSymbol, currentPrice]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error("Error adding symbol to watchlist:", err);
    res.status(500).json({ error: "Failed to add symbol" });
  }
});

/**
 * Get all items in a watchlist
 * GET /watchlists/:id/items
 */
app.get("/watchlists/:id/items", async (req, res) => {
  const watchlistId = req.params.id;

  try {
    const { rows } = await pool.query(
      `SELECT id, symbol, initial_price, added_at
       FROM watchlist_items
       WHERE watchlist_id = $1
       ORDER BY id`,
      [watchlistId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Error getting watchlist items:", err);
    res.status(500).json({ error: "Failed to get items" });
  }
});

/**
 * Get performance for a watchlist
 * GET /watchlists/:id/performance
 * For each symbol:
 *  - uses initial_price from DB
 *  - fetches current price from Finnhub
 *  - returns abs and % change
 */
app.get("/watchlists/:id/performance", async (req, res) => {
  const watchlistId = req.params.id;

  try {
    // 1) Load all items from this watchlist
    const { rows: items } = await pool.query(
      `SELECT id, symbol, initial_price, added_at
       FROM watchlist_items
       WHERE watchlist_id = $1
       ORDER BY id`,
      [watchlistId]
    );

    if (items.length === 0) {
      return res.json({
        watchlist_id: watchlistId,
        items: [],
        summary: {
          count: 0,
          avg_pct_change: null,
        },
      });
    }

    // 2) For each symbol, fetch current price and compute performance
    const withPerf = await Promise.all(
      items.map(async (item) => {
        const quote = await getQuote(item.symbol);
        const current = quote.c || 0;
        const initial = Number(item.initial_price);

        const absChange = current - initial;
        const pctChange = initial !== 0 ? (absChange / initial) * 100 : null;

        return {
          id: item.id,
          symbol: item.symbol,
          added_at: item.added_at,
          initial_price: initial,
          current_price: current,
          abs_change: absChange,
          pct_change: pctChange,
        };
      })
    );

    // 3) Simple summary: avg % change across the watchlist
    const pctValues = withPerf
      .map((i) => i.pct_change)
      .filter((v) => typeof v === "number");

    const avgPct =
      pctValues.length > 0
        ? pctValues.reduce((sum, v) => sum + v, 0) / pctValues.length
        : null;

    res.json({
      watchlist_id: watchlistId,
      items: withPerf,
      summary: {
        count: withPerf.length,
        avg_pct_change: avgPct,
      },
    });
  } catch (err) {
    console.error("Error getting watchlist performance:", err);
    res.status(500).json({ error: "Failed to get performance" });
  }
});

/**
 * Delete a single item from a watchlist
 * DELETE /watchlists/:id/items/:itemId
 */
app.delete("/watchlists/:id/items/:itemId", async (req, res) => {
  const { id: watchlistId, itemId } = req.params;

  try {
    const result = await pool.query(
      `DELETE FROM watchlist_items
       WHERE watchlist_id = $1 AND id = $2
       RETURNING *`,
      [watchlistId, itemId]
    );

    if (result.rows.length === 0) {
      return res
        .status(404)
        .json({ error: "Item not found in this watchlist" });
    }

    res.json({
      message: "Item deleted",
      item: result.rows[0],
    });
  } catch (err) {
    console.error("Error deleting item:", err);
    res.status(500).json({ error: "Failed to delete item" });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server listening on http://localhost:${PORT}`);
});