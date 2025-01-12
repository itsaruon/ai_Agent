import os
from datetime import datetime, timedelta
from dotenv import load_dotenv
from postgrest import PostgrestClient
from openai import OpenAI
import requests
import json
import matplotlib.pyplot as plt
from io import BytesIO

# Load environment variables
load_dotenv(override=True)
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
MAILGUN_API_KEY = os.getenv("MAILGUN_API_KEY")
MAILGUN_DOMAIN = os.getenv("MAILGUN_DOMAIN")

def get_latest_data():
    """Fetch the latest data from Supabase tables"""
    try:
        postgrest_client = PostgrestClient(
            base_url=f"{SUPABASE_URL}/rest/v1",
            headers={
                "apikey": SUPABASE_KEY,
                "Authorization": f"Bearer {SUPABASE_KEY}"
            }
        )
        
        # Get last 5 BTC prices
        btc_prices = postgrest_client.from_("btc_price")\
            .select("*")\
            .order("created_at", desc=True)\
            .limit(5)\
            .execute().data
        
        # Get last 10 financial news items
        news_items = postgrest_client.from_("eco_info")\
            .select("*")\
            .order("timestamp", desc=True)\
            .limit(10)\
            .execute().data
            
        return btc_prices, news_items
        
    except Exception as e:
        print(f"Error fetching data: {e}")
        return None, None

def generate_simple_analysis(btc_prices, news_items):
    """Generate a professional analysis with improved formatting"""
    try:
        # Calculate price change
        latest_price = btc_prices[0]['price']
        oldest_price = btc_prices[-1]['price']
        price_change = ((latest_price - oldest_price) / oldest_price) * 100
        
        # Get latest crypto and finance news
        crypto_news = [n for n in news_items if '[CRYPTO]' in n['finance_info']][:2]
        finance_news = [n for n in news_items if '[FINANCE]' in n['finance_info']][:2]
        
        # Format news items more professionally
        def format_news_item(item):
            # Remove the [CRYPTO] or [FINANCE] prefix and 'Title:' text
            info = item['finance_info']
            info = info.replace('[CRYPTO]', '').replace('[FINANCE]', '').replace('Title:', '')
            info = info.strip()
            
            # Split into title and description if possible
            parts = info.split('Description:', 1)
            title = parts[0].strip()
            description = parts[1].strip() if len(parts) > 1 else ""
            
            return f"• {title}\n  {description}"

        # Create analysis with improved formatting
        analysis = f"""Dear Noura,

I hope this email finds you well. Here is your daily financial market update.

Bitcoin Market Summary
---------------------
Current Price: ${latest_price:,.2f}
24-Hour Change: {price_change:+.2f}%

Cryptocurrency News
------------------
{format_news_item(crypto_news[0]) if crypto_news else '• No recent crypto news'}
{format_news_item(crypto_news[1]) if len(crypto_news) > 1 else ''}

Financial Market Updates
-----------------------
{format_news_item(finance_news[0]) if finance_news else '• No recent financial news'}
{format_news_item(finance_news[1]) if len(finance_news) > 1 else ''}

I will continue monitoring the markets and keep you updated on any significant changes.

Best Regards,
Financial AI Agent"""

        return analysis
        
    except Exception as e:
        print(f"Error generating analysis: {e}")
        return None

def create_btc_price_chart(btc_prices):
    """Create a BTC price chart using matplotlib"""
    try:
        # Extract dates and prices
        dates = [datetime.fromisoformat(p['created_at']) for p in btc_prices]
        prices = [p['price'] for p in btc_prices]
        
        # Create the plot
        plt.figure(figsize=(10, 6))
        plt.plot(dates, prices, marker='o')
        
        # Customize the plot
        plt.title('Bitcoin Price Movement')
        plt.xlabel('Date')
        plt.ylabel('Price (USD)')
        plt.grid(True)
        
        # Rotate date labels for better readability
        plt.xticks(rotation=45)
        
        # Adjust layout to prevent label cutoff
        plt.tight_layout()
        
        # Save to BytesIO instead of file
        img_buffer = BytesIO()
        plt.savefig(img_buffer, format='png')
        img_buffer.seek(0)
        plt.close()
        
        return img_buffer
        
    except Exception as e:
        print(f"Error creating chart: {e}")
        return None

def send_email(analysis, btc_chart):
    """Send email using Mailgun API with chart attachment"""
    try:
        print("\nAttempting to send email via Mailgun...")
        
        # Prepare email data
        email_data = {
            "from": f"Financial Analysis <mailgun@{MAILGUN_DOMAIN}>",
            "to": "aoura.nlaboudi@gmail.com",
            "subject": f"Financial Market Update - {datetime.now().strftime('%Y-%m-%d')}",
            "text": analysis
        }
        
        # Prepare files
        files = [
            ("attachment", ("btc_price_chart.png", btc_chart, "image/png"))
        ]
        
        response = requests.post(
            f"https://api.mailgun.net/v3/{MAILGUN_DOMAIN}/messages",
            auth=("api", MAILGUN_API_KEY),
            data=email_data,
            files=files
        )
        
        # Print response details
        print(f"\nMailgun Response Status: {response.status_code}")
        print(f"Mailgun Response Text: {response.text}")
        
        if response.status_code != 200:
            print(f"Error sending email: {response.text}")
            return False
            
        print("\n✓ Email sent successfully with chart!")
        return True
        
    except Exception as e:
        print(f"\nError sending email: {str(e)}")
        return False

def run_email_agent():
    """Main function to orchestrate the email agent"""
    print("\n=== Starting Financial Email Agent ===")
    
    # Get latest data
    btc_prices, news_items = get_latest_data()
    if not btc_prices or not news_items:
        print("Failed to fetch data from database")
        return
    
    # Generate analysis
    analysis = generate_simple_analysis(btc_prices, news_items)
    if not analysis:
        print("Failed to generate analysis")
        return
    
    # Create price chart
    btc_chart = create_btc_price_chart(btc_prices)
    if not btc_chart:
        print("Failed to create price chart")
        return
    
    # Send email with chart
    if send_email(analysis, btc_chart):
        print("✓ Successfully sent financial analysis email with chart")
    else:
        print("✗ Failed to send email")

if __name__ == "__main__":
    if not all([SUPABASE_URL, SUPABASE_KEY, MAILGUN_API_KEY, MAILGUN_DOMAIN]):
        print("Error: Missing required environment variables")
        exit(1)
        
    run_email_agent()
