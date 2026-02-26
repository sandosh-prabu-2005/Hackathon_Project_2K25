import { useEffect, useRef, useState } from "react";
import { Unity, useUnityContext } from "react-unity-webgl";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import styled from "@emotion/styled";
import { keyframes } from "@emotion/react";
import ExitToAppRoundedIcon from "@mui/icons-material/ExitToAppRounded";
import FullscreenRoundedIcon from "@mui/icons-material/FullscreenRounded";
import ScreenRotationAltRoundedIcon from "@mui/icons-material/ScreenRotationAltRounded";

const twinkle = keyframes`
  0%,100% { opacity:.25; transform:translateY(0) }
  50%     { opacity:.75; transform:translateY(-2px) }
`;
const BG = styled.div`
  position:absolute; inset:0;
  background:
    radial-gradient(900px 500px at 15% 15%, rgba(46,72,173,.35), transparent 60%),
    radial-gradient(1200px 600px at 80% 30%, rgba(0,255,255,.07), transparent 60%),
    linear-gradient(135deg,#0b1220 0%,#1b2a44 100%);
  &:after{
    content:""; position:absolute; inset:0; pointer-events:none;
    background:
      radial-gradient(2px 2px at 22% 30%, #fff 55%, transparent 56%),
      radial-gradient(2px 2px at 40% 70%, #fff 55%, transparent 56%),
      radial-gradient(1px 1px at 60% 20%, #fff 55%, transparent 56%),
      radial-gradient(2px 2px at 80% 80%, #fff 55%, transparent 56%),
      radial-gradient(1px 1px at 30% 85%, #fff 55%, transparent 56%);
    opacity:.18; animation:${twinkle} 8s ease-in-out infinite;
  }
`;

export default function Vdu1() {
  const navigate = useNavigate();
  const { state } = useLocation();
  const containerRef = useRef(null);
  const [needsRotate, setNeedsRotate] = useState(false);

  const {
    unityProvider,
    addEventListener,
    removeEventListener,
    isLoaded,
    loadingProgression,
    requestFullscreen,
  } = useUnityContext({
    loaderUrl: "/Build/VD1/Export.loader.js",
    dataUrl: "/Build/VD1/Export.data",
    frameworkUrl: "/Build/VD1/Export.framework.js",
    codeUrl: "/Build/VD1/Export.wasm",
    companyName: "DefaultCompany",
    productName: "Virtual-Drill",
    productVersion: "0.1.0",
  });

  const isMobile = () =>
    (navigator.maxTouchPoints || 0) > 1 ||
    /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);

  const isPortrait = () =>
    window.matchMedia && window.matchMedia("(orientation: portrait)").matches;

  const updateRotateOverlay = () => setNeedsRotate(isMobile() && isPortrait());

  const lockLandscapeIfPossible = async () => {
    try {
      if (
        screen.orientation &&
        typeof (screen.orientation as any).lock === "function"
      ) {
        await (screen.orientation as any).lock("landscape");
      }
    } catch {}
  };

  const goFullscreenAndLock = async () => {
    try {
      const el = containerRef.current || document.documentElement;
      if (!document.fullscreenElement && el?.requestFullscreen) {
        await el.requestFullscreen();
      } else if (
        !document.fullscreenElement &&
        (el as any)?.webkitRequestFullscreen
      ) {
        (el as any).webkitRequestFullscreen();
      }
    } catch {}
    try { if (typeof requestFullscreen === "function") await requestFullscreen(true); } catch {}
    await lockLandscapeIfPossible();
    updateRotateOverlay();
  };

  useEffect(() => {
    const onUnityScore = (e: Event) => {
      const customEvent = e as CustomEvent<{ score?: number }>;
      console.log("Unity → React score:", customEvent.detail?.score);
    };
    window.addEventListener("unity-score", onUnityScore);
    return () => window.removeEventListener("unity-score", onUnityScore);
  }, []);

  useEffect(() => {
    const onMsg = (payload: any) => console.log("Unity event:", payload);
    addEventListener("UnityEvent", onMsg);
    return () => removeEventListener("UnityEvent", onMsg);
  }, [addEventListener, removeEventListener]);

  useEffect(() => {
    if (state?.autoFullscreen) goFullscreenAndLock();

    const firstPointer = () => { goFullscreenAndLock(); window.removeEventListener("pointerdown", firstPointer); };
    window.addEventListener("pointerdown", firstPointer, { once: true });

    updateRotateOverlay();
    window.addEventListener("resize", updateRotateOverlay);
    window.addEventListener("orientationchange", updateRotateOverlay);

    return () => {
      window.removeEventListener("pointerdown", firstPointer);
      window.removeEventListener("resize", updateRotateOverlay);
      window.removeEventListener("orientationchange", updateRotateOverlay);
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    };
  }, [state]);

  const pct = Math.round(loadingProgression * 100);

  return (
    <div ref={containerRef} className="w-screen h-screen">
      <div className="relative h-full w-full overflow-hidden text-white">
        <BG />

        {!isLoaded && (
          <div className="absolute top-4 left-4 right-4 z-20">
            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "tween", ease: "easeOut", duration: 0.2 }}
              />
            </div>
            <div className="mt-2 text-right text-xs text-white/80">{pct}%</div>
          </div>
        )}

        {needsRotate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute inset-0 z-30 grid place-items-center bg-black/80 backdrop-blur-sm"
          >
            <div className="text-center">
              <ScreenRotationAltRoundedIcon className="mx-auto mb-3" sx={{ fontSize: 56, color: "#fff" }} />
              <h2 className="text-xl font-semibold">Please rotate your device</h2>
              <p className="mt-1 text-white/80">Landscape gives the best experience.</p>
              <button onClick={goFullscreenAndLock} className="btn btn-ghost mt-4">
                <FullscreenRoundedIcon fontSize="small" />
                Try Fullscreen Again
              </button>
            </div>
          </motion.div>
        )}

        <div className="absolute inset-0">
          <Unity unityProvider={unityProvider} style={{ width: "100%", height: "100%" }} />
        </div>

        <div className="pointer-events-none absolute bottom-4 left-4 z-20 flex gap-2">
          <button
            onClick={goFullscreenAndLock}
            className="pointer-events-auto btn btn-ghost"
            title="Fullscreen"
          >
            <FullscreenRoundedIcon fontSize="small" />
            <span className="hidden sm:inline">Fullscreen</span>
          </button>

          <button
            onClick={() => {
              if (document.fullscreenElement && document.exitFullscreen) document.exitFullscreen();
              navigate("/quiz");
            }}
            className="pointer-events-auto inline-flex items-center gap-2 rounded-xl bg-rose-500/90 px-3 py-2 text-white shadow-lg hover:bg-rose-500"
            title="Exit"
          >
            <ExitToAppRoundedIcon fontSize="small" />
            <span className="hidden sm:inline">Exit</span>
          </button>
        </div>
      </div>
    </div>
  );
}
