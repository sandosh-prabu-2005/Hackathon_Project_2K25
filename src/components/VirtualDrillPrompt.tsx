import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import PlayArrowRoundedIcon from "@mui/icons-material/PlayArrowRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import ScreenRotationAltRoundedIcon from "@mui/icons-material/ScreenRotationAltRounded";
import ArrowBackRoundedIcon from "@mui/icons-material/ArrowBackRounded";

/* =====================================================
   Neo mesh background + PRO split with video globe (front view)
   - Right panel: hosted MP4 (autoplay, loop, muted, inline)
   - Pauses when tab hidden; resumes on return
   - No new libraries; drop-in replacement
   ===================================================== */

const twinkle = keyframes`
  0%,100% { opacity:.25; transform: translateY(0) }
  50%     { opacity:.7;  transform: translateY(-2px) }
`;
const drift = keyframes`
  0%   { transform: translate3d(0,0,0) scale(1); }
  50%  { transform: translate3d(2%, -2%, 0) scale(1.05); }
  100% { transform: translate3d(0,0,0) scale(1); }
`;

const BG = styled.div`
  position: fixed; inset: 0; isolation: isolate; overflow: hidden;

  /* Match the video’s background (#000) and keep a very subtle mesh */
  background:
    // radial-gradient(900px 500px at 15% 15%, rgba(46,72,173,.16), transparent 60%),
    // radial-gradient(1200px 600px at 80% 30%, rgba(0,255,255,.06), transparent 60%),
    // linear-gradient(135deg, #000 0%, #04070b 55%, #000 100%);
    background-color: #000;

  &:before{
    content:""; position:absolute; inset:-20%; filter: blur(60px); opacity:.38; pointer-events:none;
    background:
      radial-gradient(650px 420px at 10% 80%, rgba(34,197,94,.22), transparent 60%),
      radial-gradient(600px 420px at 95% 10%, rgba(59,130,246,.20), transparent 60%),
      conic-gradient(from 180deg at 70% 40%, rgba(56,189,248,.12), rgba(99,102,241,.10), rgba(34,197,94,.12), rgba(56,189,248,.12));
    animation: ${drift} 24s ease-in-out infinite;
  }

  /* Subtle grid; dimmer so it doesn't lift blacks */
  &:after{
    content:""; position:absolute; inset:0; pointer-events:none;
    background:
      linear-gradient(transparent 31px, rgba(255,255,255,.025) 32px),
      linear-gradient(90deg, transparent 31px, rgba(255,255,255,.025) 32px);
    background-size: 32px 32px;
    mask-image: linear-gradient(to bottom, transparent, black 20%, black 80%, transparent);
    opacity:.35;
  }
`;


const Divider = styled.div`
  position:absolute; top:0; bottom:0; left:40vw; width:1px;
  background: linear-gradient(to bottom, transparent, rgba(255,255,255,.12) 20%, rgba(255,255,255,.12) 80%, transparent);
  pointer-events:none;
`;
const SeamBlend = styled.div`
  position:absolute; top:0; bottom:0; left:40vw;
  width: clamp(40px, 6vw, 96px);
  pointer-events:none;
  background: linear-gradient(to left, rgba(0,0,0,0) 0%, rgba(0,0,0,.45) 60%, rgba(0,0,0,.85) 100%);
  mix-blend-mode: multiply;
`;

/* ----------------------------- Right pane video ----------------------------- */

function VideoPane({
  src = "https://cdn.pixabay.com/video/2016/08/24/4788-180289892_large.mp4",
  overlayTint = "radial-gradient(60% 60% at 50% 50%, rgba(16,185,129,.10), rgba(56,189,248,.08) 45%, transparent 70%)",
}: { src?: string; overlayTint?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null);

  // Try to autoplay once metadata is ready (iOS-friendly)
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const playSafely = () => { v.muted = true; v.play().catch(() => {}); };
    const onLoaded = () => playSafely();
    v.addEventListener("loadedmetadata", onLoaded);
    playSafely();
    return () => v.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  // Pause when tab/page is hidden to save CPU/GPU
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const onVis = () => {
      if (document.hidden) v.pause();
      else v.play().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", overflow: "hidden", backgroundColor: "#000" }}>
      <video
        ref={ref}
        src={src}
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
        controls={false}
        aria-label="Rotating globe video"
        style={{
          position: "absolute", inset: 0,
          width: "100%", height: "100%",
          objectFit: "cover",
          filter: "saturate(1.05) brightness(1.05) contrast(1.02)",
        }}
      />
      {/* gentle tint to blend with page theme */}
      <div style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background: overlayTint,
        mixBlendMode: "screen",
      }}/>
      {/* very subtle stars overlay */}
      <div style={{ pointerEvents: "none", position: "absolute", inset: 0, opacity: .10, animation: `${twinkle} 8s ease-in-out infinite` }}>
        <svg width="100%" height="100%">
          <defs>
            <radialGradient id="star" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#fff" stopOpacity="1" />
              <stop offset="100%" stopColor="#fff" stopOpacity="0" />
            </radialGradient>
          </defs>
          {Array.from({ length: 28 }).map((_, i) => (
            <circle key={i} cx={`${Math.random()*100}%`} cy={`${Math.random()*100}%`} r={Math.random()*1.2+0.4} fill="url(#star)" />
          ))}
        </svg>
      </div>
    </div>
  );
}

/* ----------------------------- The page ----------------------------- */

export default function VirtualDrillPrompt({
  videoSrc = "https://cdn.pixabay.com/video/2019/07/26/25550-350507943_large.mp4",
}: { videoSrc?: string }) {
  const navigate = useNavigate();

  const startDrill = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      if (orientation?.lock) { try { await orientation.lock("landscape"); } catch {} }
    } catch {}
    navigate("/drill", { state: { autoFullscreen: true } });
  };
 const startDrillGame = async () => {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && el.requestFullscreen) {
        await el.requestFullscreen();
      }
      const orientation = screen.orientation as ScreenOrientation & { lock?: (orientation: string) => Promise<void> };
      if (orientation?.lock) { try { await orientation.lock("landscape"); } catch {} }
    } catch {}
    navigate("/game", { state: { autoFullscreen: true } });
  };
  return (
    <BG>
      <div style={{ width: "100vw", height: "100vh", display: "flex", overflow: "hidden", backgroundColor: "#000"  }}>
        {/* LEFT 40% (unchanged layout; inline styles so Tailwind is optional) */}
        <div style={{ position: "relative", zIndex: 10, width: "40vw", minWidth: 340, padding: "2rem 1.75rem", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{
            marginBottom: 16, display: "inline-flex", alignItems: "center", gap: 8,
            borderRadius: 999, background: "rgba(52,211,153,.10)", padding: "6px 12px",
            border: "1px solid rgba(52,211,153,.30)"
          }}>
            <span style={{
              height: 8, width: 8, borderRadius: 999, background: "#34d399",
              animation: "pulse 1.5s infinite"
            }}/>
            <span style={{ color: "rgba(167,243,208,.9)", fontSize: 12, letterSpacing: .4 }}>Disaster Drill Ready</span>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            style={{
              width: "100%", maxWidth: 680, borderRadius: 24,
              border: "1px solid rgba(255,255,255,.10)",
              background: "rgba(255,255,255,.05)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 30px 100px rgba(0,0,0,.35)"
            }}
            role="dialog" aria-labelledby="vdp-title" aria-describedby="vdp-desc"
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 24px 0" }}>
              <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center",
                borderRadius: 12, background: "rgba(16,185,129,.18)", padding: 8, border: "1px solid rgba(52,211,153,.30)" }}>
                <FullscreenRoundedIcon fontSize="small" sx={{ color: '#86efac' }} />
              </span>
              <p style={{ fontSize: 14, color: "rgba(187,247,208,.95)" }}>Optimized for fullscreen landscape</p>
            </div>

            <div style={{ padding: "22px 24px 28px" }}>
              <h1 id="vdp-title" style={{ fontSize: 34, lineHeight: 1.1, fontWeight: 800, color: "#fff" }}>Begin Virtual Drill</h1>
              <p id="vdp-desc" style={{ marginTop: 10, color: "rgba(255,255,255,.82)", lineHeight: 1.6 }}>
                We’ll launch the simulation in fullscreen and try to lock orientation to landscape for the best experience.
              </p>

              <div style={{ marginTop: 18, display: "flex", flexWrap: "wrap", alignItems: "center", gap: 12 }}>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startDrill}
                  style={{
                    padding: "12px 18px", borderRadius: 12, background: "#10b981",
                    color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                    border: "none", cursor: "pointer", boxShadow: "0 10px 30px rgba(16,185,129,.35)"
                  }}
                >
                  <PlayArrowRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />
                  Start drill
                </motion.button>
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={startDrillGame}
                  style={{
                    padding: "12px 18px", borderRadius: 12, background: "#10b981",
                    color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                    border: "none", cursor: "pointer", boxShadow: "0 10px 30px rgba(16,185,129,.35)"
                  }}
                >
                  <PlayArrowRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />
                  Start drill Game
                </motion.button>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.06 }}
                  whileTap={{ scale: 0.97 }}
                  onClick={() => navigate(-1)}
                  style={{
                    padding: "12px 18px", borderRadius: 12, background: "rgba(255,255,255,.10)",
                    color: "#fff", fontWeight: 600, display: "flex", alignItems: "center", gap: 8,
                    border: "1px solid rgba(255,255,255,.25)", cursor: "pointer"
                  }}
                >
                  <ArrowBackRoundedIcon sx={{ fontSize: 26, color: '#fff' }} />
                  Not now
                </motion.button>
              </div>

              <div style={{ marginTop: 18, display: "grid", gridTemplateColumns: "repeat(3,minmax(0,1fr))", gap: 10, color: "rgba(255,255,255,.9)", fontSize: 14 }}>
                <Pill icon={<FullscreenRoundedIcon sx={{ fontSize: 20, color: '#34d399' }} />} text="Fullscreen" ring="rgba(52,211,153,.30)" />
                <Pill icon={<ScreenRotationAltRoundedIcon sx={{ fontSize: 20, color: '#60a5fa' }} />} text="Landscape" ring="rgba(96,165,250,.30)" />
                <Pill icon={<PlayArrowRoundedIcon sx={{ fontSize: 20, color: '#f59e0b' }} />} text="Unity WebGL" ring="rgba(245,158,11,.30)" />
              </div>

              <div style={{ marginTop: 18, borderRadius: 12, background: "rgba(52,211,153,.10)", border: "1px solid rgba(52,211,153,.30)", padding: "10px 12px", color: "rgba(187,247,208,.95)", fontSize: 14 }}>
                Tip: If orientation lock fails on desktop, use the in-game settings or rotate your device manually.
              </div>
            </div>
          </motion.div>
        </div>

        <Divider />
        <SeamBlend />

        {/* RIGHT 60%: Video globe */}
        <div style={{ position: "relative", width: "60vw", minWidth: 400, height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <motion.div
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.9, ease: "easeOut" }}
            style={{ position: "relative", width: "100%", height: "100%" }}
            aria-hidden
          >
            <VideoPane src={videoSrc} />
          </motion.div>
        </div>
      </div>
    </BG>
  );
}

function Pill({ icon, text, ring }: { icon: React.ReactNode; text: string; ring: string }) {
  return (
    <motion.div whileHover={{ scale: 1.04 }} style={{
      display: "flex", alignItems: "center", gap: 8, borderRadius: 10,
      background: "rgba(255,255,255,.10)", padding: "8px 10px",
      border: `1px solid ${ring}`, boxShadow: "0 2px 10px rgba(0,0,0,.15)"
    }}>
      {icon}<span>{text}</span>
    </motion.div>
  );
}
