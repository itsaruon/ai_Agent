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

// Add Chart.js initialization
let priceChart;

function initChart() {
    const ctx = document.getElementById('btcChart').getContext('2d');
    priceChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Bitcoin Price',
                data: [],
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.1)',
                borderWidth: 2,
                tension: 0.4,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            interaction: {
                intersect: false,
                mode: 'index'
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    backgroundColor: '#1f2937',
                    titleColor: '#e5e7eb',
                    bodyColor: '#e5e7eb',
                    borderColor: '#374151',
                    borderWidth: 1,
                    padding: 12
                }
            },
            scales: {
                y: {
                    beginAtZero: false,
                    grid: {
                        color: 'rgba(75, 85, 99, 0.2)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        }
                    }
                },
                x: {
                    grid: {
                        color: 'rgba(75, 85, 99, 0.2)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxRotation: 0
                    }
                }
            }
        }
    });
}

function updateChart(prices) {
    if (!priceChart) {
        initChart();
    }

    const labels = prices.map(p => {
        const date = new Date(p.timestamp || p.created_at);
        return date.toLocaleTimeString();
    }).reverse();  // Reverse to show oldest to newest

    const data = prices.map(p => p.price).reverse();

    priceChart.data.labels = labels;
    priceChart.data.datasets[0].data = data;
    priceChart.update();
}

async function fetchData() {
    try {
        console.log('Fetching live data...');
        
        // Update last updated time first
        const now = new Date();
        document.getElementById('last-updated').textContent = `Last updated: ${now.toLocaleString()}`;

        const [priceResponse, newsResponse] = await Promise.all([
            fetch('/api/btc-price'),
            fetch('/api/news')
        ]);

        if (!priceResponse.ok || !newsResponse.ok) {
            throw new Error('API request failed');
        }

        const prices = await priceResponse.json();
        const news = await newsResponse.json();
        
        console.log('Received price data:', prices);

        if (prices && prices.length > 0) {
            const latestPrice = prices[0].price;
            const oldestPrice = prices[prices.length - 1].price;
            
            // Update the price display
            document.getElementById('btc-price').textContent = `$${latestPrice.toLocaleString()}`;
            
            // Calculate price change
            const priceChange = ((latestPrice - oldestPrice) / oldestPrice) * 100;
            const priceChangeElement = document.getElementById('price-change');
            priceChangeElement.textContent = `${priceChange.toFixed(2)}%`;
            
            // Update price change color
            if (priceChange > 0) {
                priceChangeElement.classList.add('text-green-500');
                priceChangeElement.classList.remove('text-red-500');
            } else if (priceChange < 0) {
                priceChangeElement.classList.add('text-red-500');
                priceChangeElement.classList.remove('text-green-500');
            }

            // Update chart
            updateChart(prices);
            
            // Update technical analysis
            updateTechnicalAnalysis(prices);
        }

        // Update news feed
        if (news && news.length > 0) {
            const newsContainer = document.getElementById('news-feed');
            newsContainer.innerHTML = news.map(item => `
                <div class="news-item">
                    <p class="news-title">${item.finance_info}</p>
                    <span class="news-time">${new Date(item.timestamp).toLocaleString()}</span>
                </div>
            `).join('');
            
            document.getElementById('news-count').textContent = news.length;
        }

        // Update last updated time
        document.getElementById('update-time').textContent = new Date().toLocaleString();

    } catch (error) {
        console.error('Error fetching data:', error);
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

function updateNewsFeed(news) {
    const newsFeed = document.getElementById('news-feed');
    newsFeed.innerHTML = news.map(item => `
        <div class="news-item">
            <p class="news-title">${item.finance_info}</p>
            <small class="news-time">${new Date(item.timestamp).toLocaleString()}</small>
        </div>
    `).join('');
}

function updateTechnicalAnalysis(prices) {
    if (!prices || prices.length < 14) return; // Need at least 14 data points for RSI
    
    // Calculate indicators
    const indicators = {
        sma: calculateSMA(prices, 20),    // 20-period Simple Moving Average
        rsi: calculateRSI(prices, 14),     // 14-period Relative Strength Index
        macd: calculateMACD(prices),       // Moving Average Convergence Divergence
        volume: calculateVolume(prices)    // 24h Volume
    };
    
    // Update Technical Analysis section
    const technicalSection = document.getElementById('technical-analysis');
    technicalSection.innerHTML = `
        <div class="grid grid-cols-2 gap-4">
            <div class="indicator-card">
                <span class="indicator-label">SMA (20)</span>
                <span class="indicator-value">$${indicators.sma.toLocaleString()}</span>
            </div>
            <div class="indicator-card">
                <span class="indicator-label">RSI (14)</span>
                <span class="indicator-value ${getRSIClass(indicators.rsi)}">${indicators.rsi.toFixed(2)}</span>
            </div>
            <div class="indicator-card">
                <span class="indicator-label">MACD</span>
                <span class="indicator-value ${getMACDClass(indicators.macd)}">${indicators.macd.toFixed(2)}</span>
            </div>
            <div class="indicator-card">
                <span class="indicator-label">24h Volume</span>
                <span class="indicator-value">$${indicators.volume.toLocaleString()}</span>
            </div>
        </div>
    `;
}

// Helper functions for technical indicators
function calculateSMA(prices, period) {
    const priceValues = prices.slice(0, period).map(p => p.price);
    return priceValues.reduce((a, b) => a + b, 0) / period;
}

function calculateRSI(prices, period) {
    let gains = 0;
    let losses = 0;
    
    for (let i = 1; i < period; i++) {
        const difference = prices[i-1].price - prices[i].price;
        if (difference > 0) {
            gains += difference;
        } else {
            losses -= difference;
        }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    const rs = avgGain / avgLoss;
    return 100 - (100 / (1 + rs));
}

function calculateMACD(prices) {
    const ema12 = calculateEMA(prices, 12);
    const ema26 = calculateEMA(prices, 26);
    return ema12 - ema26;
}

function calculateEMA(prices, period) {
    const priceValues = prices.map(p => p.price);
    const multiplier = 2 / (period + 1);
    let ema = priceValues[0];
    
    for (let i = 1; i < period; i++) {
        ema = (priceValues[i] - ema) * multiplier + ema;
    }
    
    return ema;
}

function calculateVolume(prices) {
    // In a real implementation, this would use actual volume data
    return prices[0].price * 100; // Placeholder calculation
}

// Helper functions for styling
function getRSIClass(rsi) {
    if (rsi > 70) return 'text-red-500';
    if (rsi < 30) return 'text-green-500';
    return 'text-gray-300';
}

function getMACDClass(macd) {
    if (macd > 0) return 'text-green-500';
    return 'text-red-500';
}

// Initial load
initChart();
fetchData();

// Initial fetch
document.addEventListener('DOMContentLoaded', () => {
    fetchData();
    // Update every 30 seconds without page refresh
    setInterval(fetchData, 30000);
});

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
