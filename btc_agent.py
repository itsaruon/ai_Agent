import requests
from supabase import create_client
import os
from datetime import datetime
from dotenv import load_dotenv

# Load environment variables
load_dotenv(override=True)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

def get_btc_price():
    """Fetches the current Bitcoin price in USD using the CoinGecko API."""
    try:
        url = "https://api.coingecko.com/api/v3/simple/price"
        params = {"ids": "bitcoin", "vs_currencies": "usd"}
        
        response = requests.get(url, params=params)
        response.raise_for_status()
        return response.json()["bitcoin"]["usd"]
        
    except (requests.RequestException, KeyError) as e:
        print(f"Error fetching BTC price: {e}")
        return None

def store_btc_price(price):
    """Stores the BTC price in Supabase database."""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        data = {
            "price": float(price),
            "created_at": datetime.utcnow().isoformat()
        }
        
        supabase.from_("btc_price").insert(data).execute()
        return True
        
    except Exception as e:
        print(f"Error storing price in database: {e}")
        return False

if __name__ == "__main__":
    # Fetch BTC price
    price = get_btc_price()
    if not price:
        print("Failed to fetch BTC price")
        exit(1)
        
    # Store price in database
    print(f"Current Bitcoin price: ${price:,.2f} USD")
    if store_btc_price(price):
        print("Successfully stored price in database")
    else:
        print("Failed to store price in database")
