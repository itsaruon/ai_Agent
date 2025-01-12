import os
import requests
from datetime import datetime
from dotenv import load_dotenv
from supabase import create_client
import time
import re

# Load environment variables
load_dotenv(override=True)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
BRAVE_API_KEY = os.getenv("BRAVE_API_KEY")

def clean_text(text):
    """Remove HTML tags and clean up the text"""
    clean = re.sub(r'<[^>]+>', '', text)
    return ' '.join(clean.split())

def search_brave_news(query):
    """Search for news using Brave Search API"""
    try:
        response = requests.get(
            "https://api.search.brave.com/res/v1/web/search",
            headers={
                "Accept": "application/json",
                "Accept-Encoding": "gzip",
                "X-Subscription-Token": BRAVE_API_KEY
            },
            params={
                "q": query,
                "fresh": "true",
                "text_format": "raw",
                "search_lang": "en"
            }
        )
        response.raise_for_status()
        
        results = response.json().get('web', {}).get('results', [])
        if results:
            first_result = results[0]
            return f"Title: {clean_text(first_result.get('title', ''))}\nDescription: {clean_text(first_result.get('description', ''))}"
            
        return None
        
    except Exception as e:
        print(f"Error fetching news: {e}")
        return None

def store_news(news_info):
    """Store the news in Supabase"""
    try:
        supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
        
        response = (
            supabase
            .from_("eco_info")
            .insert({
                "finance_info": news_info,
                "timestamp": datetime.utcnow().isoformat()
            })
            .execute()
        )
        return True
        
    except Exception as e:
        print(f"Error storing news: {e}")
        return False

def run_news_agent():
    """Main function to fetch and store financial news"""
    queries = [
        "bitcoin latest news",
        "cryptocurrency market news",
        "global economic news",
        "federal reserve news"
    ]
    
    for query in queries:
        print(f"\nProcessing: {query}")
        
        if news_info := search_brave_news(query):
            if store_news(news_info):
                print(f"✓ Stored news for: {query}")
            else:
                print(f"✗ Failed to store news for: {query}")
        else:
            print(f"✗ No news found for: {query}")
            
        time.sleep(1)  # Rate limiting

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY, BRAVE_API_KEY]):
        print("Error: Missing required environment variables")
        exit(1)
        
    print("\n=== Starting Financial News Collection ===")
    run_news_agent()
    print("\n=== Finished News Collection ===")
