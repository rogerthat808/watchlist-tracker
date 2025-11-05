// finnhub.js
const axios = require("axios");
require("dotenv").config();

const API_KEY = process.env.FINNHUB_API_KEY;

if (!API_KEY) {
  console.error("❌ FINNHUB_API_KEY is not set in .env");
  process.exit(1);
}

// Get real-time quote for a symbol
async function getQuote(symbol) {
  const url = "https://finnhub.io/api/v1/quote";

  const response = await axios.get(url, {
    params: {
      symbol,
      token: API_KEY,
    },
  });

  return response.data; // { c, h, l, o, pc, t }
}

module.exports = { getQuote };