import React, { useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    createUnityInstance?: (
      canvas: HTMLCanvasElement,
      config: any,
      onProgress: (progress: number) => void
    ) => Promise<any>;
  }
}

export default function Vdu1Player() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef(null);
  const unityRef = useRef<{ Quit?: () => Promise<void> } | null>(null);
  const [progress, setProgress] = useState(0);

  const base = import.meta.env.BASE_URL || "/";
  const buildUrl = `${base}Build/VD1`;
  const loaderUrl = `${buildUrl}/Export.loader.js`;

  useEffect(() => {
    let script;

    const resize = () => {
      const canvas = canvasRef.current;
      const wrap = containerRef.current;
      if (!canvas || !wrap) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const { clientWidth: w, clientHeight: h } = wrap;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
    };

    const initUnity = () => {
      if (!window.createUnityInstance || !canvasRef.current) return;
      const canvas = canvasRef.current;
      const config = {
        dataUrl: `${buildUrl}/Export.data`,
        frameworkUrl: `${buildUrl}/Export.framework.js`,
        codeUrl: `${buildUrl}/Export.wasm`,
        streamingAssetsUrl: `${base}StreamingAssets`,
        companyName: "DefaultCompany",
        productName: "Virtual-Drill",
        productVersion: "0.1.0",
        devicePixelRatio: Math.min(window.devicePixelRatio || 1, 2),
        matchWebGLToCanvasSize: false,
        showBanner: (msg: any, type: string) => console[type === "error" ? "error" : "log"]("[Unity]", msg),
      };
      resize();
      window.createUnityInstance(canvas, config, (p) => setProgress(p))
        .then((inst) => (unityRef.current = inst))
        .catch((err) => alert(err));
    };

    script = document.createElement("script");
    script.src = loaderUrl;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = initUnity;
    document.body.appendChild(script);

    window.addEventListener("resize", resize);
    window.addEventListener("orientationchange", resize);

    return () => {
      window.removeEventListener("resize", resize);
      window.removeEventListener("orientationchange", resize);
      try { script && document.body.removeChild(script); } catch {}
      if (unityRef.current?.Quit) unityRef.current.Quit().finally(() => (unityRef.current = null));
      // Restore scroll on unmount
      document.documentElement.style.overflow = "";
      document.body.style.overflow = "";
    };
  }, [loaderUrl]);

  // Lock scroll and attempt fullscreen on mount
  useEffect(() => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
    
    const tryFullscreen = async () => {
      try {
        const el = document.documentElement;
        if (!document.fullscreenElement && el.requestFullscreen) {
          await el.requestFullscreen();
        }
      } catch {}
    };
    
    // Attempt fullscreen on first user interaction
    const onInteract = () => {
      tryFullscreen();
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
    window.addEventListener("click", onInteract, { once: true });
    window.addEventListener("keydown", onInteract, { once: true });
    
    return () => {
      window.removeEventListener("click", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
  }, []);

  const pct = Math.round(progress * 100);

  return (
    <div ref={containerRef} style={{ position: "fixed", inset: 0, width: "100vw", height: "100vh", overflow: "hidden", background: "#231F20" }}>
      {/* Loader */}
      {progress < 1 && (
        <div className="absolute top-4 left-4 right-4 z-10">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-2 text-right text-xs text-white/80">{pct}%</div>
        </div>
      )}

      <canvas
        ref={canvasRef}
        id="unity-canvas"
        tabIndex={-1}
        style={{ display: "block", width: "100%", height: "100%", background: "#231F20" }}
      />
    </div>
  );
}
