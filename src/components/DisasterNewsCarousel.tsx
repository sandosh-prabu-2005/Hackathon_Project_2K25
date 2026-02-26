import { useEffect, useState } from "react";
import { Warning, TrendingUp } from '@mui/icons-material';

type NewsArticle = {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
};

export default function DisasterNewsCarousel() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const newsRes = await fetch(`http://localhost:8080/api/news`);
        const newsData = await newsRes.json();
        setNews(newsData.articles?.slice(0, 10) || []);
      } catch (err) {
        console.error("Failed to fetch news data");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  // Auto-rotate through news
  useEffect(() => {
    if (!news.length) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % news.length);
    }, 5000); // Change news every 5 seconds

    return () => clearInterval(interval);
  }, [news.length]);

  if (loading || !news.length) {
    return null;
  }

  const currentNews = news[currentIndex];

  return (
    <a
      href={currentNews.url}
      target="_blank"
      rel="noreferrer"
      style={styles.ticker}
    >
      <div style={styles.tickerContent}>
        <div style={styles.label}>
          <Warning sx={{ fontSize: 18, color: "#ef4444" }} />
          <span>LATEST NEWS</span>
        </div>

        <div style={styles.newsWrapper}>
          <div style={styles.newsText}>
            <span style={styles.newsTitle}>{currentNews.title}</span>
            <span style={styles.newsSeparator}>•</span>
            <span style={styles.newsSource}>{currentNews.source.name}</span>
          </div>
        </div>

        <div style={styles.indicator}>
          {news.map((_, index) => (
            <div
              key={index}
              style={{
                ...styles.dot,
                background: index === currentIndex ? "#ef4444" : "rgba(239,68,68,0.3)",
              }}
            />
          ))}
        </div>
      </div>

      {/* Animated scrolling text effect */}
      <style>{`
        @keyframes scroll {
          0% {
            transform: translateX(100%);
          }
          100% {
            transform: translateX(-100%);
          }
        }
        
        .news-ticker-text {
          animation: scroll 15s linear infinite;
        }
      `}</style>
    </a>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  ticker: {
    display: 'block',
    background: 'linear-gradient(90deg, rgba(139,0,0,0.8) 0%, rgba(239,68,68,0.6) 100%)',
    borderTop: '2px solid #ef4444',
    borderBottom: '2px solid #ef4444',
    padding: '12px 20px',
    textDecoration: 'none',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontFamily: 'Inter, sans-serif',
    color: '#fff',
  },
  tickerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    flexShrink: 0,
    padding: '4px 12px',
    background: 'rgba(239,68,68,0.3)',
    borderRadius: 6,
    fontSize: '0.75rem',
    fontWeight: 700,
    letterSpacing: '0.05em',
    color: '#fca5a5',
    whiteSpace: 'nowrap',
  },
  newsWrapper: {
    flex: 1,
    overflow: 'hidden',
  },
  newsText: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    fontSize: '0.875rem',
    fontWeight: 500,
  },
  newsTitle: {
    color: '#e2e8f0',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    maxWidth: '100%',
  },
  newsSeparator: {
    color: '#ef4444',
    flexShrink: 0,
  },
  newsSource: {
    color: '#cbd5e1',
    fontSize: '0.75rem',
    flexShrink: 0,
  },
  indicator: {
    display: 'flex',
    gap: 4,
    flexShrink: 0,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    transition: 'all 0.3s ease',
  },
};

