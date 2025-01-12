# Crypto AI Analyst 🤖📈

An advanced cryptocurrency monitoring system leveraging artificial intelligence to deliver comprehensive market analysis. This automated platform combines real-time Bitcoin price tracking, financial news aggregation, and AI-powered insights to provide daily personalized financial reports.

![Python Version](https://img.shields.io/badge/python-3.10-blue.svg)
![License](https://img.shields.io/badge/license-MIT-green.svg)
![OpenAI](https://img.shields.io/badge/AI-OpenAI-lightgrey)
![Supabase](https://img.shields.io/badge/Database-Supabase-dark)

## 🌟 Key Features

- **Automated Market Monitoring**
  - Real-time Bitcoin price tracking
  - Historical price trend analysis
  - Custom price movement visualizations
  - Automated daily execution via GitHub Actions

- **Intelligent Analysis**
  - AI-powered market insights using OpenAI's GPT models
  - Pattern recognition in price movements
  - Sentiment analysis of market news
  - Contextual financial recommendations

- **Data Management**
  - Secure data storage with Supabase
  - Real-time database updates
  - Efficient data querying and caching
  - Historical data retention

- **Professional Reporting**
  - Automated email delivery via Mailgun
  - Custom-generated price charts
  - Curated financial news digest
  - Professional formatting and presentation

## 🛠️ Technical Architecture

### Core Components

1. **Data Collection Layer**
   - Bitcoin price API integration
   - Financial news aggregation
   - Real-time data validation
   - Error handling and retry mechanisms

2. **Processing Layer**
   - OpenAI GPT integration for analysis
   - Custom data processing pipelines
   - Mathematical analysis algorithms
   - Technical indicator calculations

3. **Storage Layer**
   - Supabase PostgreSQL database
   - Real-time data synchronization
   - Efficient query optimization
   - Data integrity checks

4. **Presentation Layer**
   - Matplotlib visualization engine
   - Custom chart generation
   - Email template system
   - PDF report generation

## 📋 Prerequisites

- Python 3.10 or higher
- Supabase account
- OpenAI API access
- Mailgun account
- GitHub account (for automation)

## 🚀 Installation & Setup

1. **Clone the Repository**
```bash
git clone https://github.com/yourusername/crypto-ai-analyst.git
cd crypto-ai-analyst
```

2. **Environment Setup**
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
```

3. **Configuration**
Create a `.env` file with your credentials:
```env
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
MAILGUN_API_KEY=your_mailgun_key
MAILGUN_DOMAIN=your_mailgun_domain
```

4. **Database Setup**
```sql
-- Create required tables in Supabase
CREATE TABLE btc_price (
    id SERIAL PRIMARY KEY,
    price DECIMAL NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

CREATE TABLE eco_info (
    id SERIAL PRIMARY KEY,
    finance_info TEXT NOT NULL,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);
```

5. **GitHub Actions Setup**
- Configure repository secrets
- Enable GitHub Actions
- Set up workflow schedules

## 💻 Usage

### Manual Execution
```bash
python email_agent.py
```

### Automated Execution
The system automatically runs daily through GitHub Actions:
- Fetches latest market data
- Generates AI analysis
- Creates visualizations
- Sends email reports

## 🔧 Development

### Project Structure
```
crypto-ai-analyst/
├── .github/
│   └── workflows/
│       └── crypto_monitor.yml
├── email_agent.py        # Main application logic
├── requirements.txt      # Dependencies
├── .env                 # Environment variables
└── README.md           # Documentation
```

### Testing
```bash
# Run tests
python -m pytest tests/
```

## 📈 Performance
- **Response Time**: < 2 seconds for data retrieval
- **Analysis Time**: < 5 seconds for AI processing
- **Email Delivery**: < 3 seconds
- **Overall Execution**: < 15 seconds

## 🤝 Contributing
1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit changes (`git commit -m 'Add AmazingFeature'`)
4. Push to branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📝 License
Distributed under the MIT License. See `LICENSE` for more information.

## 👤 Author
Noura Alaboudi
- LinkedIn: https://www.linkedin.com/in/noura-al/

