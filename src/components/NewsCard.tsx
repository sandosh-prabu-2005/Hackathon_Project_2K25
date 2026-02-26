import { useEffect, useState } from "react";
import { Newspaper, OpenInNew, TrendingUp, Schedule } from '@mui/icons-material';

type NewsArticle = {
  title: string;
  description: string;
  url: string;
  source: { name: string };
  publishedAt: string;
  urlToImage?: string;
};

export default function NewsCard() {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  useEffect(() => {
    const fetchNews = async () => {
      try {
        setLoading(true);
        const newsRes = await fetch(`http://localhost:8080/api/news`);
        const newsData = await newsRes.json();
        setNews(newsData.articles?.slice(0, 4) || []);
      } catch (err) {
        console.error("Failed to fetch news data");
      } finally {
        setLoading(false);
      }
    };

    fetchNews();
  }, []);

  if (loading) {
    return (
      <div style={styles.card}>
        <p style={{ color: "#cbd5e1", textAlign: "center" }}>Loading news...</p>
      </div>
    );
  }

  if (!news.length) {
    return (
      <div style={styles.card}>
        <p style={{ color: "#cbd5e1", textAlign: "center" }}>No news available</p>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div style={styles.card}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Newspaper sx={{ fontSize: 24, color: "#3b82f6" }} />
          <h3 style={styles.title}>WEATHER & DISASTER NEWS</h3>
        </div>
        <TrendingUp sx={{ fontSize: 20, color: "#94a3b8" }} />
      </div>

      {/* Divider */}
      <div style={styles.divider}></div>

      {/* News List */}
      <div style={styles.newsList}>
        {news.map((article, index) => (
          <a
            key={index}
            href={article.url}
            target="_blank"
            rel="noreferrer"
            style={{
              ...styles.newsItem,
              background: hoveredIndex === index ? 'rgba(59,130,246,0.1)' : 'rgba(255,255,255,0.05)',
              borderColor: hoveredIndex === index ? 'rgba(59,130,246,0.3)' : 'rgba(255,255,255,0.08)',
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <div style={styles.newsContent}>
              <div style={styles.newsHeader}>
                <h4 style={styles.newsTitle}>{article.title}</h4>
                <OpenInNew sx={{ fontSize: 16, color: "#60a5fa", flexShrink: 0 }} />
              </div>
              <p style={styles.newsDescription}>{article.description?.substring(0, 80)}...</p>
              <div style={styles.newsFooter}>
                <span style={styles.newsSource}>{article.source.name}</span>
                <span style={styles.newsDate}>
                  <Schedule sx={{ fontSize: 14 }} /> {formatDate(article.publishedAt)}
                </span>
              </div>
            </div>
          </a>
        ))}
      </div>

      {/* View More */}
      <a
        href="https://newsapi.org"
        target="_blank"
        rel="noreferrer"
        style={styles.viewMore}
      >
        View More News →
      </a>
    </div>
  );
}

const styles: { [key: string]: React.CSSProperties } = {
  card: {
    background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
    borderRadius: 16,
    padding: 28,
    boxShadow: "0 20px 40px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)",
    fontFamily: "Inter, sans-serif",
    border: '1px solid rgba(255,255,255,0.1)',
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    margin: 0,
    fontSize: '0.75rem',
    fontWeight: 700,
    color: '#94a3b8',
    letterSpacing: '0.05em',
  },
  divider: {
    height: 1,
    background: 'rgba(255,255,255,0.1)',
    margin: '16px 0',
  },
  newsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    flex: 1,
  },
  newsItem: {
    textDecoration: 'none',
    padding: 12,
    background: 'rgba(255,255,255,0.05)',
    borderRadius: 10,
    border: '1px solid rgba(255,255,255,0.08)',
    transition: 'all 0.3s ease',
    cursor: 'pointer',
  },
  newsContent: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
  },
  newsHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 8,
  },
  newsTitle: {
    margin: 0,
    fontSize: '0.875rem',
    fontWeight: 600,
    color: '#e2e8f0',
    lineHeight: 1.4,
  },
  newsDescription: {
    margin: 0,
    fontSize: '0.75rem',
    color: '#a0aec0',
    lineHeight: 1.4,
  },
  newsFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    fontSize: '0.7rem',
  },
  newsSource: {
    background: 'rgba(59,130,246,0.2)',
    color: '#60a5fa',
    padding: '2px 8px',
    borderRadius: 4,
    fontWeight: 600,
  },
  newsDate: {
    color: '#64748b',
    display: 'flex',
    alignItems: 'center',
    gap: 4,
  },
  viewMore: {
    marginTop: 12,
    padding: '10px 16px',
    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
    color: '#fff',
    textDecoration: 'none',
    borderRadius: 8,
    fontSize: '0.875rem',
    fontWeight: 600,
    textAlign: 'center',
    transition: 'all 0.3s ease',
  },
};
