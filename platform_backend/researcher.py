import requests
import yfinance as yf
from bs4 import BeautifulSoup
from .config import WATCHLIST, INCLUDE_INTERNATIONAL

class MarketResearcher:
    def __init__(self):
        self.watchlist = WATCHLIST
        self.include_international = INCLUDE_INTERNATIONAL

    def get_stock_movements(self, filter_significant=True):
        """Checks for movements in the watchlist. If filter_significant is False, returns all (for AI)."""
        results = []
        for symbol in self.watchlist:
            if not symbol: continue
            try:
                # 1. Try raw symbol first (Standard for US Stocks: NVDA, DNA, TWST)
                ticker_sym = symbol
                ticker = yf.Ticker(ticker_sym)
                # Use a small fast fetch to check if it exists
                data = ticker.history(period="1d")
                
                # 2. If no data, try adding .NS (Indian National Stock Exchange)
                if data.empty and "." not in symbol:
                    ticker_sym = f"{symbol}.NS"
                    ticker = yf.Ticker(ticker_sym)
                    data = ticker.history(period="1d")

                if not data.empty:
                    change = ((data['Close'].iloc[-1] - data['Open'].iloc[-1]) / data['Open'].iloc[-1]) * 100
                    stats = {
                        "symbol": symbol,
                        "change": round(change, 2),
                        "price": round(data['Close'].iloc[-1], 2)
                    }
                    if not filter_significant or abs(change) >= 2.0:
                        results.append(stats)
                else:
                    print(f"No price data found for {symbol} (tried raw and .NS)")
            except Exception as e:
                print(f"Error fetching price for {symbol}: {e}")
        return results

    def get_indian_news(self):
        """Scrapes headlines from Economic Times and Business Standard (RSS)."""
        news_items = []
        feeds = [
            "https://economictimes.indiatimes.com/markets/rssfeeds/1977021501.cms",
            "https://www.business-standard.com/rss/markets-106.rss"
        ]
        
        for url in feeds:
            try:
                response = requests.get(url, timeout=10)
                soup = BeautifulSoup(response.content, features="xml")
                items = soup.find_all('item')[:5] # Top 5 from each
                for item in items:
                    news_items.append({
                        "headline": item.title.text,
                        "link": item.link.text,
                        "source": "ET/BS",
                        "is_international": False
                    })
            except Exception as e:
                print(f"Error fetching news from {url}: {e}")
        return news_items

    def get_global_news(self):
        """Scrapes global finance headlines if enabled."""
        if not self.include_international:
            return []
        
        # Yahoo Finance RSS
        return self._scrape_rss("https://finance.yahoo.com/news/rssindex", "Yahoo", True)

    def get_focus_news(self):
        """Specifically search for FOCUS_KEYWORDS using Google News RSS."""
        if not self.include_international or not self.watchlist:
            return []
        
        focus_news = []
        # Take first 5 keywords if it's a list or comma string
        keywords = self.watchlist[:5]
        
        for kw in keywords:
            # Google News RSS search URL
            url = f"https://news.google.com/rss/search?q={kw}+market+news&hl=en-IN&gl=IN&ceid=IN:en"
            focus_news.extend(self._scrape_rss(url, f"GNews:{kw}", False, limit=3))
            
        return focus_news

    def _scrape_rss(self, url, source_name, is_international, limit=5):
        news_items = []
        try:
            response = requests.get(url, timeout=10)
            soup = BeautifulSoup(response.content, features="xml")
            items = soup.find_all('item')[:limit]
            for item in items:
                news_items.append({
                    "headline": item.title.text,
                    "link": item.link.text,
                    "source": source_name,
                    "is_international": is_international
                })
        except Exception as e:
            print(f"Error fetching news from {url}: {e}")
        return news_items

    def collect_all_data(self):
        """Combines all input for the AI Brain."""
        return {
            "moves": self.get_stock_movements(filter_significant=False), # Provide ALL prices to AI
            "local_news": self.get_indian_news(),
            "global_news": self.get_global_news() if self.include_international else [],
            "focus_news": self.get_focus_news() if self.include_international else []
        }
