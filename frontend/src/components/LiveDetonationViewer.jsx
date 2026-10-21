import React, { useState, useEffect, useRef, useCallback } from "react";

/**
 * LiveDetonationViewer
 *
 * ANY.RUN-style interactive live browser detonation chamber.
 * Supports:
 * - Live 60FPS CDP screencast stream.
 * - Bidirectional mouse interaction (click, drag, right-click).
 * - Mouse wheel scrolling.
 * - Real-time keyboard input typing.
 * - Full browser navigation: Back, Forward, Reload, and Live Address Bar!
 * - Cloudflare Turnstile detection & click-to-bypass assistant.
 * - Interactive timer with "+30s" extension.
 * - "Stop & Generate Threat Report" button to instantly commit forensic findings to PostgreSQL.
 */
export default function LiveDetonationViewer({
  sessionId,
  targetUrl,
  onTakeOverRbi,
  onComplete,
  compact = false
}) {
  const [connectionStatus, setConnectionStatus] = useState("connecting"); // "connecting" | "interactive" | "ended" | "error"
  const [currentUrl, setCurrentUrl] = useState(targetUrl || "");
  const [addressBarInput, setAddressBarInput] = useState(targetUrl || "");
  const [pageTitle, setPageTitle] = useState("Initializing Isolated Chromium Sandbox...");
  const [frameCount, setFrameCount] = useState(0);
  const [fps, setFps] = useState(0);
  const [events, setEvents] = useState([]);
  const [timeLeft, setTimeLeft] = useState(120);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showConsole, setShowConsole] = useState(true);
  const [cloudflareDetected, setCloudflareDetected] = useState(false);
  const [isFinalizing, setIsFinalizing] = useState(false);

  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const containerRef = useRef(null);
  const tickerEndRef = useRef(null);
  const imgRef = useRef(new Image());
  const fpsCounterRef = useRef({ count: 0, lastCheck: Date.now() });

  // Countdown timer
  useEffect(() => {
    if (connectionStatus !== "interactive" && connectionStatus !== "connecting") return;
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Auto finalize when timer runs out
          handleFinishAnalysis();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [connectionStatus]);

  // Extend session time (+30s)
  const handleExtendTime = () => {
    setTimeLeft((prev) => prev + 30);
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "extend_time", seconds: 30 }));
    }
  };

  // Auto-scroll ticker console
  useEffect(() => {
    if (showConsole && tickerEndRef.current) {
      tickerEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [events, showConsole]);

  // Translate mouse event coordinates to isolated Chromium canvas coordinates (1280x800)
  const getCanvasCoords = useCallback((e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 800 / rect.height;
    return {
      x: Math.round((e.clientX - rect.left) * scaleX),
      y: Math.round((e.clientY - rect.top) * scaleY)
    };
  }, []);

  // Dispatch Mouse Down
  const handleMouseDown = useCallback((e) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    if (canvasRef.current) canvasRef.current.focus();
    const { x, y } = getCanvasCoords(e);
    const buttonMap = ["left", "middle", "right"];
    wsRef.current.send(
      JSON.stringify({
        type: "mouse",
        eventType: "mousePressed",
        x,
        y,
        button: buttonMap[e.button] || "left",
        clickCount: 1
      })
    );
  }, [getCanvasCoords]);

  // Dispatch Mouse Up
  const handleMouseUp = useCallback((e) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const { x, y } = getCanvasCoords(e);
    const buttonMap = ["left", "middle", "right"];
    wsRef.current.send(
      JSON.stringify({
        type: "mouse",
        eventType: "mouseReleased",
        x,
        y,
        button: buttonMap[e.button] || "left",
        clickCount: 1
      })
    );
  }, [getCanvasCoords]);

  // Dispatch Mouse Move
  const handleMouseMove = useCallback((e) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    const { x, y } = getCanvasCoords(e);
    wsRef.current.send(
      JSON.stringify({
        type: "mouse",
        eventType: "mouseMoved",
        x,
        y,
        button: "none",
        clickCount: 0
      })
    );
  }, [getCanvasCoords]);

  // Dispatch Wheel Scroll
  const handleWheel = useCallback((e) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    wsRef.current.send(
      JSON.stringify({
        type: "wheel",
        x,
        y,
        deltaX: e.deltaX,
        deltaY: e.deltaY
      })
    );
  }, [getCanvasCoords]);

  // Dispatch Keyboard Press
  const handleKeyDown = useCallback((e) => {
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    // Don't intercept browser developer tools shortcuts or reload
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    wsRef.current.send(
      JSON.stringify({
        type: "key",
        eventType: "keyDown",
        key: e.key,
        code: e.code,
        text: e.key.length === 1 ? e.key : "",
        keyCode: e.keyCode
      })
    );
  }, []);

  // Dispatch Navigation
  const handleNavigate = (e) => {
    if (e) e.preventDefault();
    let target = addressBarInput.trim();
    if (!target) return;
    if (!target.startsWith("http://") && !target.startsWith("https://")) {
      target = "https://" + target;
    }
    setCurrentUrl(target);
    setAddressBarInput(target);

    // If onTakeOverRbi is available or the automated session is complete, launch interactive RBI
    if (onTakeOverRbi && (connectionStatus === "ended" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      onTakeOverRbi(target);
      return;
    }

    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "navigate", url: target }));
    } else if (onTakeOverRbi) {
      onTakeOverRbi(target);
    }
  };

  const handleBack = () => {
    if (onTakeOverRbi && (connectionStatus === "ended" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      onTakeOverRbi(currentUrl || targetUrl);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "back" }));
    } else if (onTakeOverRbi) {
      onTakeOverRbi(currentUrl || targetUrl);
    }
  };

  const handleForward = () => {
    if (onTakeOverRbi && (connectionStatus === "ended" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      onTakeOverRbi(currentUrl || targetUrl);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "forward" }));
    } else if (onTakeOverRbi) {
      onTakeOverRbi(currentUrl || targetUrl);
    }
  };

  const handleReload = () => {
    if (onTakeOverRbi && (connectionStatus === "ended" || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN)) {
      onTakeOverRbi(currentUrl || targetUrl);
      return;
    }
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "reload" }));
    } else if (onTakeOverRbi) {
      onTakeOverRbi(currentUrl || targetUrl);
    }
  };

  const handleSolveTurnstile = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "solve_turnstile" }));
    }
  };

  // User Finish & Generate Threat Report
  const handleFinishAnalysis = () => {
    setIsFinalizing(true);
    setConnectionStatus("finalizing");
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: "finish_analysis" }));
    }
    // Timeout fallback to trigger onComplete
    setTimeout(() => {
      if (onComplete) onComplete(sessionId);
    }, 2500);
  };

  // Connect WebSocket to /ws/live/:sessionId or /ws/rbi/:sessionId
  useEffect(() => {
    if (!sessionId) return;

    let isMounted = true;
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const host = window.location.port === "5173" ? "localhost:3000" : window.location.host;
    // Route to live bridge
    const wsUrl = `${protocol}//${host}/ws/live/${encodeURIComponent(sessionId)}`;

    setConnectionStatus("connecting");
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!isMounted) return;
      setConnectionStatus("interactive");
      setEvents((prev) => [
        ...prev,
        {
          id: "sys_conn",
          message: `Connected to interactive detonation sandbox for session ${sessionId}`,
          level: "info",
          timestamp: new Date().toISOString()
        }
      ]);
    };

    ws.onmessage = (event) => {
      if (!isMounted) return;
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === "init") {
          if (msg.url) {
            setCurrentUrl(msg.url);
            setAddressBarInput(msg.url);
          }
          if (msg.title) setPageTitle(msg.title);
          if (Array.isArray(msg.events)) setEvents(msg.events);
        } else if (msg.type === "frame" && msg.data) {
          setConnectionStatus("interactive");
          setFrameCount((c) => c + 1);

          if (msg.url) {
            setCurrentUrl(msg.url);
            setAddressBarInput(msg.url);
          }
          if (msg.title) setPageTitle(msg.title);

          // Calculate FPS
          fpsCounterRef.current.count++;
          const now = Date.now();
          if (now - fpsCounterRef.current.lastCheck >= 1000) {
            setFps(fpsCounterRef.current.count);
            fpsCounterRef.current.count = 0;
            fpsCounterRef.current.lastCheck = now;
          }

          // Draw frame to interactive canvas
          const canvas = canvasRef.current;
          if (canvas) {
            const ctx = canvas.getContext("2d");
            imgRef.current.onload = () => {
              ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
            };
            imgRef.current.src = `data:image/jpeg;base64,${msg.data}`;
          }
        } else if (msg.type === "state") {
          if (msg.url) {
            setCurrentUrl(msg.url);
            setAddressBarInput(msg.url);
          }
          if (msg.title) setPageTitle(msg.title);
        } else if (msg.type === "event" || msg.type === "log") {
          const entry = msg.data || msg;
          setEvents((prev) => [...prev.slice(-60), entry]);

          if (entry.message && entry.message.toLowerCase().includes("cloudflare")) {
            setCloudflareDetected(true);
          }
        } else if (msg.type === "completed" || msg.type === "analysis_completed") {
          setConnectionStatus("ended");
          setIsFinalizing(false);
          if (onComplete) onComplete(sessionId);
        }
      } catch (err) {
        console.warn("[LiveDetonationViewer] WS parse error:", err);
      }
    };

    ws.onerror = (err) => {
      if (!isMounted) return;
      console.warn("[LiveDetonationViewer] WS error:", err);
      setConnectionStatus("error");
    };

    ws.onclose = () => {
      if (!isMounted) return;
      if (connectionStatus !== "ended" && !isFinalizing) {
        setConnectionStatus("ended");
      }
    };

    return () => {
      isMounted = false;
      if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
        ws.close();
      }
    };
  }, [sessionId, onComplete]);

  // Format seconds mm:ss
  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
      .toString()
      .padStart(2, "0");
    const s = (secs % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={`live-detonation-viewer ${isFullscreen ? "fullscreen" : ""}`}
      style={{
        background: "#071020",
        border: "1px solid rgba(0, 172, 245, 0.45)",
        borderRadius: "12px",
        overflow: "hidden",
        boxShadow: "0 12px 40px rgba(0, 0, 0, 0.75), 0 0 25px rgba(0, 172, 245, 0.15)",
        margin: compact ? "0" : "18px 0 24px",
        display: "flex",
        flexDirection: "column"
      }}
    >
      {/* 1. ANY.RUN Top Control Bar */}
      <div
        style={{
          background: "linear-gradient(90deg, #0b192e 0%, #081426 100%)",
          padding: "10px 16px",
          borderBottom: "1px solid rgba(0, 172, 245, 0.25)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "10px"
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span
            style={{
              display: "inline-block",
              width: "10px",
              height: "10px",
              borderRadius: "50%",
              background: connectionStatus === "ended" ? "#10b981" : "#ef4444",
              boxShadow: connectionStatus === "ended" ? "0 0 8px #10b981" : "0 0 10px #ef4444",
              animation: connectionStatus === "ended" ? "none" : "pulse 1.5s infinite"
            }}
          />
          <span
            style={{
              fontWeight: 900,
              fontSize: "0.85rem",
              letterSpacing: "0.05em",
              color: connectionStatus === "ended" ? "#10b981" : "#f43f5e",
              textTransform: "uppercase"
            }}
          >
            {connectionStatus === "ended"
              ? "DETONATION COMPLETE (ARCHIVED)"
              : isFinalizing
              ? "FINALIZING THREAT REPORT..."
              : "● LIVE INTERACTIVE DETONATION"}
          </span>

          <span
            style={{
              background: connectionStatus === "ended" ? "rgba(16, 185, 129, 0.15)" : "rgba(0, 172, 245, 0.15)",
              color: connectionStatus === "ended" ? "#34d399" : "#38bdf8",
              border: `1px solid ${connectionStatus === "ended" ? "rgba(16, 185, 129, 0.35)" : "rgba(0, 172, 245, 0.35)"}`,
              padding: "2px 8px",
              borderRadius: "4px",
              fontSize: "0.72rem",
              fontWeight: 700
            }}
          >
            {connectionStatus === "ended" ? "REPLAY MODE" : "INTERACTIVE READY"}
          </span>

          {connectionStatus === "ended" && onTakeOverRbi && (
            <button
              type="button"
              onClick={() => onTakeOverRbi(addressBarInput.trim() || currentUrl || targetUrl)}
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)",
                border: "none",
                color: "#07101e",
                borderRadius: "5px",
                padding: "2px 10px",
                fontSize: "0.74rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)",
                display: "inline-flex",
                alignItems: "center",
                gap: "4px"
              }}
              title="Launch interactive Remote Browser Isolation session to browse live"
            >
              ⚡ Take Over Browser Live
            </button>
          )}
        </div>

        {/* Action Controls & Session Timer */}
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              background: "rgba(15, 23, 42, 0.8)",
              padding: "4px 10px",
              borderRadius: "6px",
              border: "1px solid rgba(255, 255, 255, 0.1)",
              fontFamily: "monospace",
              fontSize: "0.78rem"
            }}
          >
            <span style={{ color: "#94a3b8" }}>⏱️ {formatTime(timeLeft)}</span>
            <button
              type="button"
              onClick={handleExtendTime}
              style={{
                background: "rgba(0, 172, 245, 0.2)",
                border: "1px solid rgba(0, 172, 245, 0.4)",
                color: "#38bdf8",
                borderRadius: "4px",
                padding: "2px 6px",
                fontSize: "0.72rem",
                fontWeight: 700,
                cursor: "pointer"
              }}
              title="Add 30 seconds to detonation time"
            >
              +30s
            </button>
          </div>

          <span style={{ color: "#64748b", fontSize: "0.75rem", fontFamily: "monospace" }}>
            {fps > 0 ? `${fps} FPS` : `${frameCount} frames`}
          </span>

          {/* Stop & Generate Threat Report Button */}
          <button
            type="button"
            onClick={handleFinishAnalysis}
            disabled={isFinalizing || connectionStatus === "ended"}
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              color: "#ffffff",
              border: "none",
              borderRadius: "6px",
              padding: "5px 14px",
              fontSize: "0.8rem",
              fontWeight: 800,
              cursor: isFinalizing ? "wait" : "pointer",
              display: "flex",
              alignItems: "center",
              gap: "6px",
              boxShadow: "0 2px 10px rgba(16, 185, 129, 0.35)"
            }}
            title="Stop session and compile complete forensic threat analysis & MITRE ATT&CK verdict"
          >
            {isFinalizing ? "⏳ Compiling..." : "🏁 Generate Threat Report"}
          </button>

          <button
            type="button"
            onClick={() => setShowConsole(!showConsole)}
            style={{
              background: showConsole ? "rgba(0, 172, 245, 0.2)" : "rgba(255, 255, 255, 0.06)",
              color: showConsole ? "#38bdf8" : "#94a3b8",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "0.75rem"
            }}
            title="Toggle Action Console Ticker"
          >
            {showConsole ? "Hide Ticker" : "Show Ticker"}
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            style={{
              background: "rgba(255, 255, 255, 0.06)",
              color: "#94a3b8",
              border: "1px solid rgba(255, 255, 255, 0.12)",
              borderRadius: "4px",
              padding: "4px 8px",
              fontSize: "0.75rem"
            }}
            title="Toggle Fullscreen Detonation Chamber"
          >
            {isFullscreen ? "🗗" : "⛶"}
          </button>
        </div>
      </div>

      {/* 2. Interactive Navigation Bar (Back, Forward, Reload, Address Bar) */}
      <div
        style={{
          background: "#050c18",
          borderBottom: "1px solid rgba(0, 172, 245, 0.2)",
          padding: "8px 16px",
          display: "flex",
          alignItems: "center",
          gap: "8px",
          flexWrap: "wrap"
        }}
      >
        <button
          type="button"
          onClick={handleBack}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            borderRadius: "4px",
            padding: "4px 10px",
            fontSize: "0.85rem",
            cursor: "pointer"
          }}
          title="Go Back"
        >
          ◀
        </button>
        <button
          type="button"
          onClick={handleForward}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            borderRadius: "4px",
            padding: "4px 10px",
            fontSize: "0.85rem",
            cursor: "pointer"
          }}
          title="Go Forward"
        >
          ▶
        </button>
        <button
          type="button"
          onClick={handleReload}
          style={{
            background: "rgba(255, 255, 255, 0.06)",
            border: "1px solid rgba(255, 255, 255, 0.12)",
            color: "#e2e8f0",
            borderRadius: "4px",
            padding: "4px 10px",
            fontSize: "0.85rem",
            cursor: "pointer"
          }}
          title="Reload Page"
        >
          🔄
        </button>

        {/* Live URL Address Form */}
        <form onSubmit={handleNavigate} style={{ display: "flex", flex: 1, gap: "6px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "#0a1324",
              border: "1px solid rgba(0, 172, 245, 0.35)",
              borderRadius: "6px",
              padding: "0 10px",
              flex: 1
            }}
          >
            <span style={{ color: "#38bdf8", marginRight: "6px", fontSize: "0.8rem" }}>🔒</span>
            <input
              type="text"
              value={addressBarInput}
              onChange={(e) => setAddressBarInput(e.target.value)}
              placeholder="Navigate to URL..."
              style={{
                background: "transparent",
                border: "none",
                outline: "none",
                color: "#ffffff",
                fontFamily: "monospace",
                fontSize: "0.82rem",
                width: "100%",
                padding: "6px 0"
              }}
            />
          </div>
          <button
            type="submit"
            style={{
              background: "rgba(0, 172, 245, 0.25)",
              border: "1px solid #00acf5",
              color: "#38bdf8",
              borderRadius: "6px",
              padding: "0 14px",
              fontSize: "0.8rem",
              fontWeight: 700,
              cursor: "pointer",
              whiteSpace: "nowrap"
            }}
          >
            Navigate ➔
          </button>
          {onTakeOverRbi && (
            <button
              type="button"
              onClick={() => onTakeOverRbi(addressBarInput.trim() || currentUrl || targetUrl)}
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)",
                border: "none",
                color: "#07101e",
                borderRadius: "6px",
                padding: "0 14px",
                fontSize: "0.8rem",
                fontWeight: 800,
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "6px",
                boxShadow: "0 0 10px rgba(0, 229, 255, 0.35)",
                whiteSpace: "nowrap"
              }}
              title="Take over this site in an isolated live browser session"
            >
              🖥️ Take Over Live
            </button>
          )}
        </form>

        {/* Cloudflare Turnstile Alert & Helper Pill */}
        {cloudflareDetected && (
          <button
            type="button"
            onClick={handleSolveTurnstile}
            style={{
              background: "rgba(245, 158, 11, 0.15)",
              border: "1px solid #f59e0b",
              color: "#fbbf24",
              borderRadius: "6px",
              padding: "4px 10px",
              fontSize: "0.75rem",
              fontWeight: 700,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "4px"
            }}
            title="Attempt Cloudflare Turnstile Verification"
          >
            🛡️ Turnstile Detected (Click to Assist)
          </button>
        )}
      </div>

      {/* 3. Interactive Screencast Canvas Area */}
      <div
        style={{
          position: "relative",
          width: "100%",
          minHeight: compact ? "340px" : "480px",
          maxHeight: isFullscreen ? "calc(100vh - 190px)" : "600px",
          background: "#020713",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          overflow: "hidden"
        }}
      >
        <canvas
          ref={canvasRef}
          width={1280}
          height={800}
          tabIndex={0}
          onMouseDown={handleMouseDown}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
          onWheel={handleWheel}
          onKeyDown={handleKeyDown}
          onContextMenu={(e) => e.preventDefault()}
          style={{
            maxWidth: "100%",
            maxHeight: "100%",
            objectFit: "contain",
            display: "block",
            cursor: "crosshair",
            outline: "none"
          }}
        />

        {/* Loading Overlay if frame not arrived yet */}
        {frameCount === 0 && (
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(2, 7, 19, 0.9)",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "20px",
              textAlign: "center"
            }}
          >
            <div
              style={{
                width: "55px",
                height: "55px",
                borderRadius: "50%",
                border: "3px solid rgba(0, 172, 245, 0.2)",
                borderTopColor: "#00acf5",
                animation: "spin 1s linear infinite",
                marginBottom: "16px"
              }}
            />
            <h4 style={{ margin: "0 0 8px", color: "#e2e8f0", fontSize: "1rem" }}>
              INITIALIZING INTERACTIVE DETONATION SESSION
            </h4>
            <p style={{ margin: "0 0 12px", color: "#64748b", fontSize: "0.82rem", maxWidth: "460px" }}>
              Connecting live CDP screencast and input dispatch channels to isolated Chromium. You will be able to click, type, and navigate within seconds.
            </p>
            <div
              style={{
                background: "rgba(0, 0, 0, 0.5)",
                padding: "6px 14px",
                borderRadius: "6px",
                border: "1px dashed rgba(0, 172, 245, 0.3)",
                fontSize: "0.75rem",
                color: "#38bdf8",
                fontFamily: "monospace"
              }}
            >
              Session: {sessionId} | Anti-Bot Stealth: ACTIVE
            </div>
          </div>
        )}

        {/* Replay Takeover Floating Action */}
        {connectionStatus === "ended" && onTakeOverRbi && (
          <div
            style={{
              position: "absolute",
              top: "14px",
              right: "14px",
              background: "rgba(11, 25, 44, 0.94)",
              border: "1px solid rgba(0, 229, 255, 0.4)",
              borderRadius: "8px",
              padding: "8px 14px",
              display: "flex",
              alignItems: "center",
              gap: "10px",
              boxShadow: "0 6px 24px rgba(0, 0, 0, 0.75)",
              zIndex: 10
            }}
          >
            <span style={{ fontSize: "0.78rem", color: "#cbd5e1" }}>
              Detonation captured. Want to navigate manually?
            </span>
            <button
              type="button"
              onClick={() => onTakeOverRbi(addressBarInput.trim() || currentUrl || targetUrl)}
              style={{
                background: "linear-gradient(135deg, #0ea5e9 0%, #00e5ff 100%)",
                border: "none",
                color: "#07101e",
                borderRadius: "5px",
                padding: "4px 12px",
                fontSize: "0.78rem",
                fontWeight: 800,
                cursor: "pointer",
                boxShadow: "0 0 10px rgba(0, 229, 255, 0.4)"
              }}
            >
              🖥️ Browse Live (RBI)
            </button>
          </div>
        )}

        {/* Live Interaction Hint Watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            right: "12px",
            background: "rgba(0, 0, 0, 0.7)",
            backdropFilter: "blur(6px)",
            padding: "4px 10px",
            borderRadius: "4px",
            border: "1px solid rgba(255, 255, 255, 0.1)",
            fontSize: "0.7rem",
            color: connectionStatus === "ended" ? "#38bdf8" : "#94a3b8",
            fontFamily: "monospace",
            pointerEvents: "none"
          }}
        >
          {connectionStatus === "ended"
            ? "DETONATION COMPLETE • CLICK [BROWSE LIVE] TO NAVIGATE"
            : "INTERACTIVE BROWSER • CLICK & TYPE TO NAVIGATE"}
        </div>
      </div>

      {/* 4. Action Telemetry Ticker Console */}
      {showConsole && (
        <div
          style={{
            background: "#040b17",
            borderTop: "1px solid rgba(0, 172, 245, 0.2)",
            padding: "8px 14px",
            maxHeight: "140px",
            overflowY: "auto",
            fontFamily: "monospace",
            fontSize: "0.75rem"
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
            <span style={{ color: "#64748b", fontWeight: 700, fontSize: "0.7rem", textTransform: "uppercase" }}>
              ⚡ Real-Time Detonation Telemetry ({events.length} events)
            </span>
            <span style={{ color: "#38bdf8", fontSize: "0.7rem" }}>
              {connectionStatus === "interactive" ? "● Interactive Stream Active" : connectionStatus}
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "3px" }}>
            {events.length === 0 ? (
              <span style={{ color: "#475569", fontStyle: "italic" }}>
                Waiting for sandbox events...
              </span>
            ) : (
              events.map((evt, idx) => {
                const timeStr = evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "--:--:--";
                const isAction = evt.level === "action";
                const isError = evt.level === "error";

                return (
                  <div
                    key={evt.id || idx}
                    style={{
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "6px",
                      lineHeight: "1.4",
                      color: isError ? "#f87171" : isAction ? "#38bdf8" : "#cbd5e1"
                    }}
                  >
                    <span style={{ color: "#475569", flexShrink: 0 }}>[{timeStr}]</span>
                    <span
                      style={{
                        color: isError ? "#ef4444" : isAction ? "#00acf5" : "#10b981",
                        fontWeight: 700,
                        flexShrink: 0
                      }}
                    >
                      {isError ? "✖ [ERR]" : isAction ? "▶ [ACTION]" : "● [INFO]"}
                    </span>
                    <span style={{ wordBreak: "break-all" }}>{evt.message}</span>
                  </div>
                );
              })
            )}
            <div ref={tickerEndRef} />
          </div>
        </div>
      )}
    </div>
  );
}
