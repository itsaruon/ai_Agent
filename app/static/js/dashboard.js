// Initialize chart variable at the top
let btcChart = null;
let lastNotificationTime = 0;
const REFRESH_INTERVAL = 60000; // Refresh every minute

// Technical Analysis Constants
const ALERT_THRESHOLD = 1000; // $1000 price change
const SENTIMENT_THRESHOLDS = {
    BULLISH: 2,
    BEARISH: -2
};

async function fetchData() {
    try {
        console.log('Fetching live data...');
        showLoading();  // Show loading state
        
        // Fetch price data
        const priceResponse = await fetch('/api/btc-price');
        console.log('Price Response Status:', priceResponse.status);
        
        if (!priceResponse.ok) {
            throw new Error(`HTTP error! status: ${priceResponse.status}`);
        }
        
        const prices = await priceResponse.json();
        console.log('Received price data:', prices);

        // Fetch news data
        const newsResponse = await fetch('/api/news');
        console.log('News Response Status:', newsResponse.status);
        
        if (!newsResponse.ok) {
            throw new Error(`HTTP error! status: ${newsResponse.status}`);
        }
        
        const news = await newsResponse.json();
        console.log('Received news data:', news);

        if (prices.error || news.error) {
            console.error('API Error:', prices.error || news.error);
            return;
        }

        // Update the dashboard only if we have price data
        if (prices && prices.length > 0) {
            console.log('Updating dashboard with data:', { prices, news });
            updateDashboard(prices, news);
        } else {
            console.error('No price data received');
        }
        
    } catch (error) {
        console.error('Error fetching data:', error);
    } finally {
        hideLoading();  // Hide loading state
    }
}

function updateDashboard(prices, news) {
    console.log('Starting dashboard update with prices:', prices);
    
    // Update price stats
    if (prices && prices.length > 0) {
        const latestPrice = prices[0].price;
        const oldestPrice = prices[prices.length - 1].price;
        const priceChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;

        console.log('Updating price elements:', {
            latestPrice,
            oldestPrice,
            priceChange
        });

        // Update DOM elements
        document.getElementById('btc-price').textContent = `$${latestPrice.toLocaleString()}`;
        document.getElementById('price-change').textContent = `${priceChange.toFixed(2)}%`;
        document.getElementById('news-count').textContent = news.length;
        
        // Update chart
        updateChart(prices);
    } else {
        console.error('No prices available for dashboard update');
    }

    // Update news feed
    if (news && news.length > 0) {
        updateNewsFeed(news);
    }
}

function updateSentiment(priceChange) {
    const sentiment = document.getElementById('market-sentiment');
    let sentimentText = 'Neutral';
    let sentimentColor = '#6B7280'; // Gray

    if (priceChange > SENTIMENT_THRESHOLDS.BULLISH) {
        sentimentText = 'Bullish';
        sentimentColor = '#10B981'; // Green
    } else if (priceChange < SENTIMENT_THRESHOLDS.BEARISH) {
        sentimentText = 'Bearish';
        sentimentColor = '#EF4444'; // Red
    }

    sentiment.textContent = sentimentText;
    sentiment.style.color = sentimentColor;
}

function calculateTechnicalIndicators(prices) {
    // Simple Moving Average (5 periods)
    const sma = prices.slice(0, 5).reduce((a, b) => a + b.price, 0) / 5;
    
    // Relative Strength Index (RSI)
    const gains = [];
    const losses = [];
    for (let i = 1; i < prices.length; i++) {
        const difference = prices[i-1].price - prices[i].price;
        if (difference > 0) {
            gains.push(difference);
            losses.push(0);
        } else {
            gains.push(0);
            losses.push(Math.abs(difference));
        }
    }
    
    const avgGain = gains.reduce((a, b) => a + b, 0) / gains.length;
    const avgLoss = losses.reduce((a, b) => a + b, 0) / losses.length;
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    // Price momentum
    const momentum = prices[0].price - prices[prices.length-1].price;
    
    return {
        sma: sma.toFixed(2),
        rsi: rsi.toFixed(2),
        momentum: momentum > 0 ? 'Positive' : 'Negative',
        trend: sma > prices[0].price ? 'Downward' : 'Upward'
    };
}

function updateTechnicalIndicators(indicators) {
    // Add technical indicators section to your HTML if not already present
    const technicalSection = document.getElementById('technical-indicators') || createTechnicalSection();
    
    technicalSection.innerHTML = `
        <div class="indicator">
            <span class="indicator-label">SMA (5):</span>
            <span class="indicator-value">$${parseFloat(indicators.sma).toLocaleString()}</span>
        </div>
        <div class="indicator">
            <span class="indicator-label">RSI:</span>
            <span class="indicator-value">${indicators.rsi}</span>
        </div>
        <div class="indicator">
            <span class="indicator-label">Momentum:</span>
            <span class="indicator-value ${indicators.momentum.toLowerCase()}">${indicators.momentum}</span>
        </div>
        <div class="indicator">
            <span class="indicator-label">Trend:</span>
            <span class="indicator-value ${indicators.trend.toLowerCase()}">${indicators.trend}</span>
        </div>
    `;
}

function createTechnicalSection() {
    const section = document.createElement('div');
    section.id = 'technical-indicators';
    section.className = 'card technical-indicators';
    document.querySelector('.grid').appendChild(section);
    return section;
}

function checkPriceAlerts(currentPrice) {
    const lastPrice = localStorage.getItem('lastPrice');
    const currentTime = Date.now();
    
    // Only show notification every 5 minutes maximum
    if (lastPrice && (currentTime - lastNotificationTime > 300000)) {
        const priceChange = Math.abs(currentPrice - lastPrice);
        if (priceChange > ALERT_THRESHOLD) {
            showNotification(`BTC price changed by $${priceChange.toLocaleString()}!`);
            lastNotificationTime = currentTime;
        }
    }
    
    localStorage.setItem('lastPrice', currentPrice);
}

function showNotification(message) {
    if (!("Notification" in window)) return;
    
    Notification.requestPermission().then(permission => {
        if (permission === "granted") {
            new Notification("Crypto AI Analyst", {
                body: message,
                icon: "/static/img/bitcoin.png"
            });
        }
    });
}

function updateChart(prices) {
    const ctx = document.getElementById('btcChart').getContext('2d');
    
    if (btcChart) {
        btcChart.destroy();
    }

    btcChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: prices.map(p => new Date(p.created_at).toLocaleString()),
            datasets: [{
                label: 'BTC Price (USD)',
                data: prices.map(p => p.price),
                borderColor: '#2563eb',
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: false
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    ticks: {
                        callback: value => `$${value.toLocaleString()}`
                    }
                }
            }
        }
    });
}

function updateNewsFeed(news) {
    const newsFeed = document.getElementById('news-feed');
    newsFeed.innerHTML = news.map(item => `
        <div class="news-item">
            <p class="news-title">${item.finance_info}</p>
            <small class="news-time">${new Date(item.timestamp).toLocaleString()}</small>
        </div>
    `).join('');
}

// Initial load with immediate feedback
console.log('Dashboard script loaded, initiating first data fetch...');
fetchData();

// Refresh every minute
setInterval(fetchData, 60000);

// Add loading indicators
function showLoading() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.classList.add('loading');
    });
}

function hideLoading() {
    document.querySelectorAll('.stat-value').forEach(el => {
        el.classList.remove('loading');
    });
}

// Add loading animation CSS
const style = document.createElement('style');
style.textContent = `
    .loading {
        position: relative;
        overflow: hidden;
    }
    .loading::after {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(
            90deg,
            transparent,
            rgba(255, 255, 255, 0.1),
            transparent
        );
        animation: loading 1.5s infinite;
    }
    @keyframes loading {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
    }
`;
document.head.appendChild(style);
