from fastapi import FastAPI, Request, HTTPException
from fastapi.templating import Jinja2Templates
from fastapi.staticfiles import StaticFiles
from fastapi.responses import JSONResponse
import httpx
import os
from dotenv import load_dotenv
import traceback

# Load environment variables
load_dotenv()

# Check for required environment variables
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')

if not SUPABASE_URL or not SUPABASE_KEY:
    raise Exception("Missing required environment variables. Please check your .env file")

app = FastAPI()

# Mount static files and templates
app.mount("/static", StaticFiles(directory="app/static"), name="static")
templates = Jinja2Templates(directory="app/templates")

async def fetch_from_supabase(table_name, limit=24):
    try:
        print(f"Fetching from table: {table_name}")
        
        async with httpx.AsyncClient() as client:
            headers = {
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
            url = f"{SUPABASE_URL}/rest/v1/{table_name}"
            
            # Add proper column names based on your table structure
            if table_name == 'finance_news':
                params = {
                    "select": "id,timestamp,finance_info",
                    "order": "timestamp.desc",
                    "limit": str(limit)
                }
            else:  # bitcoin_prices table
                params = {
                    "select": "*",
                    "order": "timestamp.desc",
                    "limit": str(limit)
                }
            
            print(f"Making request to: {url} with params: {params}")
            response = await client.get(url, headers=headers, params=params)
            
            print(f"Response status: {response.status_code}")
            print(f"Response body: {response.text[:200]}...")
            
            response.raise_for_status()
            return response.json()
            
    except Exception as e:
        print(f"Error in fetch_from_supabase: {str(e)}")
        print(traceback.format_exc())
        raise

@app.get("/api/btc-price")
async def get_btc_price():
    try:
        print("Attempting to fetch BTC prices...")
        prices = await fetch_from_supabase('btc_price', 24)
        
        if not prices:
            print("No prices found in database - returning empty array")
            return JSONResponse([])
            
        print(f"Found {len(prices)} price entries")
        print("Sample price data:", prices[0] if prices else "No data")
            
        formatted_prices = []
        for price in prices:
            try:
                formatted_prices.append({
                    'price': float(price.get('price', 0)),
                    'timestamp': price.get('timestamp', '')
                })
            except Exception as e:
                print(f"Error formatting price entry: {price}")
                print(f"Error details: {str(e)}")
                
        return JSONResponse(formatted_prices)
        
    except Exception as e:
        print(f"Error in get_btc_price: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            {"error": f"Failed to fetch prices: {str(e)}"},
            status_code=500
        )

@app.get("/api/news")
async def get_news():
    try:
        news_items = await fetch_from_supabase('finance_news', 10)
        
        if not news_items:
            print("No news found in database")
            return JSONResponse([])
        
        # Format news items to match your table structure
        formatted_news = []
        for item in news_items:
            formatted_news.append({
                'finance_info': item.get('finance_info', ''),
                'timestamp': item.get('timestamp', '')
            })
            
        print(f"Returning {len(formatted_news)} news items")
        return JSONResponse(formatted_news)
        
    except Exception as e:
        print(f"Error in get_news: {str(e)}")
        print(traceback.format_exc())
        return JSONResponse(
            {"error": str(e)},
            status_code=500
        )

@app.get("/")
async def dashboard(request: Request):
    return templates.TemplateResponse("dashboard.html", {"request": request})
