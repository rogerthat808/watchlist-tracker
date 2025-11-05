# 📈 Watchlist Performance Tracker

A simple Node.js + PostgreSQL project that tracks the performance of stocks you **didn’t buy** — so you can see how your watchlists would have performed over time.  
The app uses the [Finnhub API](https://finnhub.io) to fetch real-time market data and stores the price of each symbol when it’s added to your watchlist.

---

## 🚀 Tech Stack
- **Backend:** Node.js + Express  
- **Database:** PostgreSQL  
- **API:** Finnhub Market Data API  
- **Frontend:** Minimal HTML/JavaScript (served by Express)

---

## ⚙️ Setup

### 1. Clone the repo
```bash
git clone https://github.com/rogerthat808/watchlist-tracker.git
cd watchlist-tracker
```

### 2. Install dependencies
```bash
npm install
```

### 3. Create your `.env` file
```
PORT=4000
DATABASE_URL=postgresql://<username>:<password>@localhost:5432/watchlist
FINNHUB_API_KEY=your_finnhub_api_key
```

### 4. Set up the database
Run the schema file once:
```bash
psql -U <your_pg_user> -d watchlist -f schema.sql
```

### 5. Start the server
```bash
npm start
```

Then open [http://localhost:4000](http://localhost:4000) in your browser.

---

## 🖥️ Using the App
- **Add symbol:** Fetches the current price and saves it to your watchlist  
- **Load items:** Lists all stored symbols and snapshot prices  
- **Load performance:** Compares current vs. stored prices (% gain/loss)  
- **Delete:** Removes a symbol from your watchlist  

Your data is saved in PostgreSQL and persists between restarts.

---

## 🧑‍💻 Console Commands
You can also use the browser console to interact directly:
```js
api.addSymbol("AAPL")
api.getItems()
api.getPerformance()
api.deleteItem(3)
```

---

## 📂 Project Structure
```
watchlist-backend/
├── public/
│   └── index.html        # Frontend dashboard
├── server.js             # Express server
├── finnhub.js            # Finnhub API helper
├── db.js                 # PostgreSQL connection
├── schema.sql            # Database setup
├── .env                  # Environment variables
└── package.json
```

---

## 🛠️ Notes
- Keep PostgreSQL running to preserve data.  
- You only need to restart the server (`npm start`) when you revisit later.  
- Do **not** re-run `schema.sql` unless you want to wipe and reset your tables.  
- The `.env` file is excluded from version control (`.gitignore`) to protect your API key.

---

## 📄 License
MIT © 2025
