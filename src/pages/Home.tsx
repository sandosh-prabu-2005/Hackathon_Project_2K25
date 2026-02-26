import { Link } from "react-router-dom";
import {
  GpsFixed,
  Terrain,
  Waves,
  ArrowForward,
  Map,
  Vibration,
  LayersOutlined,
  SmartToy,
  Cloud,
  Security,
  Warning,
  Public,
  Flood,
  LocalFireDepartment,
  Route,
  Landscape,
  Cyclone,
} from "@mui/icons-material";
import ChatBot from "../components/ChatBot";
import Weather from "../components/WeatherDashboard";
import WeatherCard from "../components/WeatherCard";
import NewsCard from "../components/NewsCard";
import DisasterNewsCarousel from "../components/DisasterNewsCarousel";

export default function Home() {
  return (
    <div className="container site" style={{ background: "#000" }}>
      {/* Professional Header */}
      <header style={{ background: "#000" }}>
        <div className="header-inner">
          <div className="brand">
            <div className="logo">
              <i className="fas fa-shield-alt"></i>
            </div>
            <div className="brand-info">
              <h1>Aithon</h1>
              <p>Disaster Intelligence Platform</p>
            </div>
          </div>
          <nav className="nav-links">
            <a href="#features">Features</a>
            <a href="#about">About</a>
            <a href="#contact">Contact</a>
          </nav>
        </div>
      </header>
      <Weather />
      <DisasterNewsCarousel />
      {/* Hero Section */}
      <section
        className="hero"
        style={{ minHeight: "90vh", paddingTop: 80, paddingBottom: 80 }}
      >
        <div style={{ maxWidth: 900 }}>
          <div
            className="hero-pill"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 10,
              background: "#000",
              border: "1px solid #111",
              padding: "10px 20px",
              borderRadius: 20,
              fontSize: 14,
              color: "#60a5fa",
              marginBottom: 30,
              fontWeight: 500,
            }}
          >
            <i className="fas fa-brain"></i>
            AI-Powered Early Warning System
          </div>

          <h1
            className="hero-title"
            style={{
              fontSize: "3.5rem",
              fontWeight: 700,
              lineHeight: 1.2,
              marginBottom: 30,
              background: "linear-gradient(135deg, #fff 0%, #cbd5e1 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Disaster Intelligence
            <span
              className="hero-accent"
              style={{
                display: "block",
                background: "linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)",
                backgroundClip: "text",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              Platform
            </span>
          </h1>

          <p
            className="lead"
            style={{
              fontSize: "1.25rem",
              color: "#a0aec0",
              lineHeight: 1.8,
              marginBottom: 50,
              maxWidth: 700,
            }}
          >
            Advanced AI-driven early warning systems for earthquakes,
            landslides, floods, and cyclones. Harnessing machine learning and
            geospatial data to protect communities worldwide.
          </p>

          {/* CTA Cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(280px, 1fr))",
              gap: 24,
            }}
          >
            {/* Earthquake Card */}
            <Link to="/earthquake" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(244,63,94,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(244,63,94,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(244,63,94,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <GpsFixed style={{ fontSize: 32, color: "#f43f5e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Earthquake Analysis
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  Real-time seismic risk assessment with advanced ML algorithms
                  for accurate predictions
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#f43f5e",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>

            {/* Landslide Card */}
            <Link to="/landslide" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(217,119,6,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(217,119,6,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(217,119,6,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <Terrain style={{ fontSize: 32, color: "#d97706" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Landslide Detection
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  AI-powered segmentation using satellite imagery and deep
                  learning for risk identification
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#d97706",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>

            {/* Flood Card */}
            <Link to="/flood" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(14,165,233,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(14,165,233,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(14,165,233,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(14,165,233,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(14,165,233,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <Waves style={{ fontSize: 32, color: "#0ea5e9" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Flood Prediction
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  Water level prediction with rainfall analysis for proactive
                  flood risk management
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#0ea5e9",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>

            {/* Cyclone Card */}
            <Link to="/cyclone" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 16,
                  padding: 28,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 16,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-8px)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.5)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(34,197,94,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.2)";
                  e.currentTarget.style.boxShadow =
                    "0 4px 20px rgba(34,197,94,0.1)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div
                    style={{
                      padding: 12,
                      background: "rgba(34,197,94,0.15)",
                      borderRadius: 12,
                    }}
                  >
                    <Cloud style={{ fontSize: 32, color: "#22c55e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 20,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Cyclone Tracking
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 15,
                    color: "#a0aec0",
                    lineHeight: 1.7,
                  }}
                >
                  Real-time tropical cyclone path prediction and intensity
                  forecasting for coastal protection
                </p>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#22c55e",
                    fontWeight: 600,
                    marginTop: 10,
                    fontSize: 15,
                  }}
                >
                  Explore <ArrowForward style={{ fontSize: 20 }} />
                </div>
              </div>
            </Link>
          </div>

          {/* disaster-roadmap Card */}
          <Link to="/disaster-vd" style={{ textDecoration: "none" }}>
  <div
    style={{
      background: "#000",
      border: "1px solid #111",
      borderRadius: 16,
      padding: 28,
      height: "100%",
      display: "flex",
      flexDirection: "column",
      gap: 18,
      marginTop: "40px",
      gridColumn: "span 2",
      cursor: "pointer",
      transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
      boxShadow: "0 6px 30px rgba(0,0,0,0.6)",
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.transform = "translateY(-8px)";
      e.currentTarget.style.borderColor = "rgba(99,102,241,0.5)";
      e.currentTarget.style.boxShadow =
        "0 20px 40px rgba(99,102,241,0.25)";
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.transform = "translateY(0)";
      e.currentTarget.style.borderColor = "#111";
      e.currentTarget.style.boxShadow =
        "0 6px 30px rgba(0,0,0,0.6)";
    }}
  >
    {/* Header */}
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <div
        style={{
          padding: 12,
          background: "rgba(99,102,241,0.15)",
          borderRadius: 12,
        }}
      >
        <Route style={{ fontSize: 32, color: "#6366f1" }} />
      </div>

      <h3
        style={{
          margin: 0,
          fontSize: 20,
          fontWeight: 700,
          color: "#fff",
        }}
      >
        Disaster Roadmap
      </h3>
    </div>

    {/* Description */}
    <p
      style={{
        margin: 0,
        fontSize: 15,
        color: "#a0aec0",
        lineHeight: 1.7,
      }}
    >
      A unified disaster prediction and response roadmap integrating
      multi-hazard intelligence, simulations, and mission-based analysis.
    </p>

    {/* Disaster Prediction Icons */}
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: 12,
        marginTop: 6,
      }}
    >
      {[
        { icon: <Flood />, label: "Flood" },
        { icon: <Landscape />, label: "Landslide" },
        { icon: <Cyclone />, label: "Cyclone" },
      ].map((item, i) => (
        <div
          key={i}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "rgba(99,102,241,0.12)",
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 600,
            color: "#c7d2fe",
          }}
        >
          {item.icon}
          {item.label}
        </div>
      ))}
    </div>

    {/* CTA */}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        color: "#6366f1",
        fontWeight: 600,
        marginTop: 10,
        fontSize: 15,
      }}
    >
      Explore <ArrowForward style={{ fontSize: 20 }} />
    </div>
  </div>
</Link>

        </div>
      </section>

      {/* Weather Card Section */}
      <section style={{ background: "#000", padding: "60px 20px" }}>
        <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
          <h2
            style={{
              fontSize: "2rem",
              fontWeight: 700,
              color: "#fff",
              marginBottom: 40,
              textAlign: "center",
              background: "linear-gradient(135deg, #fff 0%, #cbd5e1 100%)",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}
          >
            Real-Time Weather & News
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(350px, 1fr))",
              gap: 24,
            }}
          >
            <WeatherCard />
            <NewsCard />
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-40 dark-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2
              className="text-3xl md:text-5xl font-bold mb-6 section-heading"
              style={{ fontSize: "2.5rem", fontWeight: 800 }}
            >
              Advanced Technology Solutions
            </h2>
            <p
              className="text-xl max-w-3xl mx-auto text-muted"
              style={{ fontSize: "1.1rem", color: "#a0aec0" }}
            >
              Our cutting-edge AI models provide unprecedented accuracy in
              disaster prediction and risk assessment
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 features">
            {/* Earthquake Card */}
            <Link to="/earthquake" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 20,
                  padding: 40,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                  backdropFilter: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 36px 64px rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(244,63,94,0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(0,0,0,0.6)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      padding: 16,
                      background: "rgba(244,63,94,0.2)",
                      borderRadius: 14,
                    }}
                  >
                    <Vibration style={{ fontSize: 36, color: "#f43f5e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Earthquake Risk Analysis
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "#a0aec0",
                    lineHeight: 1.8,
                  }}
                >
                  Comprehensive seismic risk assessment using global earthquake
                  data, geographical parameters, and advanced machine learning
                  algorithms for accurate risk classification.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 14,
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#f43f5e",
                      }}
                    ></div>
                    Real-time Analysis
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#f43f5e",
                      }}
                    ></div>
                    Global Coverage
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#f43f5e",
                    fontWeight: 700,
                    marginTop: 16,
                    fontSize: 16,
                  }}
                >
                  Start Analysis <ArrowForward style={{ fontSize: 22 }} />
                </div>
              </div>
            </Link>

            {/* Landslide Card */}
            <Link to="/landslide" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 20,
                  padding: 40,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                  backdropFilter: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 36px 64px rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(217,119,6,0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(0,0,0,0.6)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      padding: 16,
                      background: "rgba(217,119,6,0.2)",
                      borderRadius: 14,
                    }}
                  >
                    <LayersOutlined
                      style={{ fontSize: 36, color: "#d97706" }}
                    />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Landslide Detection & Segmentation
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "#a0aec0",
                    lineHeight: 1.8,
                  }}
                >
                  Advanced image processing and deep learning segmentation for
                  landslide-prone area identification using satellite imagery
                  and ResNet18 neural networks.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 14,
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#d97706",
                      }}
                    ></div>
                    AI-Powered
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#d97706",
                      }}
                    ></div>
                    Satellite Imagery
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#d97706",
                    fontWeight: 700,
                    marginTop: 16,
                    fontSize: 16,
                  }}
                >
                  Start Analysis <ArrowForward style={{ fontSize: 22 }} />
                </div>
              </div>
            </Link>

            {/* Cyclone Card */}
            <Link to="/cyclone" style={{ textDecoration: "none" }}>
              <div
                style={{
                  background: "#000",
                  border: "1px solid #111",
                  borderRadius: 20,
                  padding: 40,
                  height: "100%",
                  display: "flex",
                  flexDirection: "column",
                  gap: 20,
                  cursor: "pointer",
                  transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                  backdropFilter: "none",
                  position: "relative",
                  overflow: "hidden",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-12px)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.4)";
                  e.currentTarget.style.boxShadow =
                    "0 36px 64px rgba(0,0,0,0.6)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.borderColor = "rgba(34,197,94,0.25)";
                  e.currentTarget.style.boxShadow =
                    "0 12px 48px rgba(0,0,0,0.6)";
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div
                    style={{
                      padding: 16,
                      background: "rgba(34,197,94,0.2)",
                      borderRadius: 14,
                    }}
                  >
                    <Cloud style={{ fontSize: 36, color: "#22c55e" }} />
                  </div>
                  <h3
                    style={{
                      margin: 0,
                      fontSize: 24,
                      fontWeight: 700,
                      color: "#fff",
                    }}
                  >
                    Cyclone Tracking & Prediction
                  </h3>
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: 16,
                    color: "#a0aec0",
                    lineHeight: 1.8,
                  }}
                >
                  Real-time tropical cyclone path tracking and intensity
                  forecasting using CNN-GRU neural networks for coastal storm
                  preparedness and early warning systems.
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginTop: 16,
                    fontSize: 14,
                    color: "#cbd5e1",
                    flexWrap: "wrap",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    ></div>
                    Path Prediction
                  </div>
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 8 }}
                  >
                    <div
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: "50%",
                        background: "#22c55e",
                      }}
                    ></div>
                    Intensity Forecast
                  </div>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    color: "#22c55e",
                    fontWeight: 700,
                    marginTop: 16,
                    fontSize: 16,
                  }}
                >
                  Start Analysis <ArrowForward style={{ fontSize: 22 }} />
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* Technology Section */}
      <section className="py-40 dark-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-20">
            <h2
              className="text-3xl md:text-5xl font-bold mb-6 section-heading"
              style={{ fontSize: "2.5rem", fontWeight: 800 }}
            >
              Enterprise-Grade Technology
            </h2>
            <p
              className="text-xl max-w-3xl mx-auto text-muted"
              style={{ fontSize: "1.1rem", color: "#a0aec0" }}
            >
              Built with industry-leading AI frameworks and deployed on scalable
              cloud infrastructure
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 32,
            }}
          >
            {/* Machine Learning Card */}
            <div
              style={{
                background: "#000",
                border: "1px solid #111",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px)";
                e.currentTarget.style.borderColor = "rgba(96,165,250,0.4)";
                e.currentTarget.style.boxShadow = "0 36px 64px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(96,165,250,0.25)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.6)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 18,
                    background: "rgba(96,165,250,0.2)",
                    borderRadius: 16,
                  }}
                >
                  <SmartToy style={{ fontSize: 42, color: "#60a5fa" }} />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Machine Learning
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#a0aec0",
                  lineHeight: 1.7,
                }}
              >
                Advanced neural networks trained on extensive geological
                datasets
              </p>
            </div>

            {/* Cloud Infrastructure Card */}
            <div
              style={{
                background: "#000",
                border: "1px solid #111",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px)";
                e.currentTarget.style.borderColor = "rgba(103,232,249,0.4)";
                e.currentTarget.style.boxShadow = "0 36px 64px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(103,232,249,0.25)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.6)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 18,
                    background: "rgba(103,232,249,0.2)",
                    borderRadius: 16,
                  }}
                >
                  <Cloud style={{ fontSize: 42, color: "#67e8f9" }} />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Cloud Infrastructure
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#a0aec0",
                  lineHeight: 1.7,
                }}
              >
                Scalable deployment with real-time processing capabilities
              </p>
            </div>

            {/* Data Security Card */}
            <div
              style={{
                background: "#000",
                border: "1px solid #111",
                borderRadius: 20,
                padding: 40,
                display: "flex",
                flexDirection: "column",
                gap: 20,
                transition: "all 0.4s cubic-bezier(0.4, 0, 0.2, 1)",
                boxShadow: "0 12px 48px rgba(0,0,0,0.6)",
                textAlign: "center",
                position: "relative",
                overflow: "hidden",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-12px)";
                e.currentTarget.style.borderColor = "rgba(250,204,21,0.4)";
                e.currentTarget.style.boxShadow = "0 36px 64px rgba(0,0,0,0.6)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.borderColor = "rgba(250,204,21,0.25)";
                e.currentTarget.style.boxShadow = "0 12px 48px rgba(0,0,0,0.6)";
              }}
            >
              <div style={{ display: "flex", justifyContent: "center" }}>
                <div
                  style={{
                    padding: 18,
                    background: "rgba(250,204,21,0.2)",
                    borderRadius: 16,
                  }}
                >
                  <Security style={{ fontSize: 42, color: "#facc15" }} />
                </div>
              </div>
              <h3
                style={{
                  margin: 0,
                  fontSize: 22,
                  fontWeight: 700,
                  color: "#fff",
                }}
              >
                Data Security
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 16,
                  color: "#a0aec0",
                  lineHeight: 1.7,
                }}
              >
                Enterprise-grade security with encrypted data processing
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="site-footer">
        <div className="footer-divider" aria-hidden>
          <svg
            viewBox="0 0 1200 100"
            preserveAspectRatio="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M0,0 C300,80 900,0 1200,60 L1200,100 L0,100 Z"
              fill="rgba(255,255,255,0.02)"
            ></path>
            <path
              d="M0,20 C350,100 850,10 1200,60 L1200,100 L0,100 Z"
              fill="rgba(79,70,229,0.06)"
            ></path>
          </svg>
        </div>
        <div className="footer-inner max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="footer-top">
            <div className="footer-col footer-brand">
              <div className="brand-row">
                <div className="brand-badge">
                  <i className="fas fa-shield-alt"></i>
                </div>
                <span className="brand-name">Aithon</span>
              </div>
              <p className="footer-desc">
                Leading provider of AI-powered disaster intelligence solutions
                for safer communities.
              </p>
              <div className="social">
                <a href="#" aria-label="Twitter">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" aria-label="LinkedIn">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" aria-label="GitHub">
                  <i className="fab fa-github"></i>
                </a>
              </div>

              <form
                className="newsletter"
                onSubmit={(e) => {
                  e.preventDefault();
                  alert("Thanks — demo only");
                }}
              >
                <label htmlFor="nl-email" className="sr-only">
                  Join newsletter
                </label>
                <div className="nl-row">
                  <input
                    id="nl-email"
                    type="email"
                    placeholder="Your email address"
                    required
                  />
                  <button className="btn btn-primary" type="submit">
                    Join
                  </button>
                </div>
                <div className="nl-note">
                  Get product updates and research highlights.
                </div>
              </form>
            </div>

            <div className="footer-col">
              <h4>Platform</h4>
              <ul className="footer-list">
                <li>
                  <a href="#">Earthquake Analysis</a>
                </li>
                <li>
                  <a href="#">Landslide Detection</a>
                </li>
                <li>
                  <a href="#">Risk Assessment</a>
                </li>
                <li>
                  <a href="#">API Access</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Resources</h4>
              <ul className="footer-list">
                <li>
                  <a href="#">Documentation</a>
                </li>
                <li>
                  <a href="#">Research Papers</a>
                </li>
                <li>
                  <a href="#">Case Studies</a>
                </li>
                <li>
                  <a href="#">Support</a>
                </li>
              </ul>
            </div>

            <div className="footer-col">
              <h4>Company</h4>
              <ul className="footer-list">
                <li>
                  <a href="#">About Us</a>
                </li>
                <li>
                  <a href="#">Careers</a>
                </li>
                <li>
                  <a href="#">Contact</a>
                </li>
                <li>
                  <a href="#">Privacy Policy</a>
                </li>
              </ul>
            </div>
          </div>

          <div className="footer-bottom border-t">
            <div className="footer-bottom-inner">
              <p className="copyright">
                © 2026 Aithon Disaster Intelligence. All rights reserved.
              </p>
              <div className="footer-links">
                <a href="#">Terms of Service</a>
                <a href="#">Privacy Policy</a>
                <a href="#">Cookie Policy</a>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Floating Chatbot */}
      <ChatBot />

      <button
        className="back-to-top"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
      >
        ↑
      </button>
    </div>
  );
}
