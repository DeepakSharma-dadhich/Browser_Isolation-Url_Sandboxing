import React, { useEffect, useRef, useState, useCallback } from "react";

/**
 * Interactive Remote Browser Isolation (RBI) Player Modal.
 *
 * Renders real-time JPEG screencast frames from the isolated Chromium worker,
 * intercepts and dispatches mouse/wheel/keyboard events over WebSockets,
 * completely isolating the user from malicious scripts and zero-day browser exploits.
 */
export default function LiveIsolationModal({ initialUrl, onClose }) {
  const [sessionData, setSessionData] = useState(null);
  const [currentUrl, setCurrentUrl] = useState(initialUrl);
  const [pageTitle, setPageTitle] = useState("Initializing Isolated Browser...");
  const [status, setStatus] = useState("connecting"); // "connecting" | "active" | "error" | "terminated"
  const [errorMessage, setErrorMessage] = useState("");
  const [fps, setFps] = useState(0);
  const [timeLeft, setTimeLeft] = useState(120);

  const canvasRef = useRef(null);
  const wsRef = useRef(null);
  const frameCountRef = useRef(0);
  const lastFpsTimeRef = useRef(Date.now());
  const imgRef = useRef(new Image());
  const sessionIdRef = useRef("");

  // Countdown timer for interactive isolation
  useEffect(() => {
    if (status !== "active") return;
    const interval = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [status]);

  const handleExtendTime = () => {
    setTimeLeft((prev) => prev + 60);
  };

  // Start session
  useEffect(() => {
    let isMounted = true;

    async function initSession() {
      try {
        setStatus("connecting");
        const resp = await fetch("/api/v1/rbi/launch", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url: initialUrl })
        });

        if (!resp.ok) {
          const errData = await resp.json().catch(() => ({}));
          throw new Error(errData.error || `HTTP ${resp.status}`);
        }

        const data = await resp.json();
        if (!isMounted) return;

        setSessionData(data.data);
        sessionIdRef.current = data.data.session_id;

        // Connect WebSocket
        const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
        const wsUrl = `${protocol}//${window.location.host}${data.data.ws_path}`;
        const ws = new WebSocket(wsUrl);
        wsRef.current = ws;

        ws.onopen = () => {
          if (!isMounted) return;
          setStatus("active");
        };

        ws.onmessage = (event) => {
          if (!isMounted) return;
          try {
            const msg = JSON.parse(event.data);
            if (msg.type === "frame" && msg.data) {
              frameCountRef.current++;
              const now = Date.now();
              if (now - lastFpsTimeRef.current >= 1000) {
                setFps(frameCountRef.current);
                frameCountRef.current = 0;
                lastFpsTimeRef.current = now;
              }

              if (msg.url) setCurrentUrl(msg.url);
              if (msg.title) setPageTitle(msg.title);

              // Render frame to canvas
              const canvas = canvasRef.current;
              if (canvas) {
                const ctx = canvas.getContext("2d");
                imgRef.current.onload = () => {
                  ctx.drawImage(imgRef.current, 0, 0, canvas.width, canvas.height);
                };
                imgRef.current.src = `data:image/jpeg;base64,${msg.data}`;
              }
            } else if (msg.type === "state") {
              if (msg.url) setCurrentUrl(msg.url);
              if (msg.title) setPageTitle(msg.title);
            }
          } catch (e) {
            console.error("Frame parse error:", e);
          }
        };

        ws.onerror = (e) => {
          console.error("RBI WebSocket Error:", e);
          if (isMounted) {
            setStatus("error");
            setErrorMessage("WebSocket connection to isolation sandbox failed.");
          }
        };

        ws.onclose = () => {
          if (isMounted && status !== "error") {
            setStatus("terminated");
          }
        };
      } catch (err) {
        if (!isMounted) return;
        setStatus("error");
        setErrorMessage(err.message);
      }
    }

    initSession();

    return () => {
      isMounted = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
      if (sessionIdRef.current) {
        fetch(`/api/v1/rbi/${sessionIdRef.current}/terminate`, { method: "POST" }).catch(() => {});
      }
    };
  }, [initialUrl]);

  // Translate client canvas coordinates to isolated viewport coordinates (1280x800)
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

  // Mouse handlers
  const handleMouseDown = useCallback((e) => {
    if (status !== "active" || !wsRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const buttonMap = ["left", "middle", "right"];
    wsRef.current.send(JSON.stringify({
      type: "mouse",
      eventType: "mousePressed",
      x,
      y,
      button: buttonMap[e.button] || "left",
      clickCount: 1
    }));
  }, [status, getCanvasCoords]);

  const handleMouseUp = useCallback((e) => {
    if (status !== "active" || !wsRef.current) return;
    const { x, y } = getCanvasCoords(e);
    const buttonMap = ["left", "middle", "right"];
    wsRef.current.send(JSON.stringify({
      type: "mouse",
      eventType: "mouseReleased",
      x,
      y,
      button: buttonMap[e.button] || "left",
      clickCount: 1
    }));
  }, [status, getCanvasCoords]);

  const handleMouseMove = useCallback((e) => {
    if (status !== "active" || !wsRef.current) return;
    const { x, y } = getCanvasCoords(e);
    wsRef.current.send(JSON.stringify({
      type: "mouse",
      eventType: "mouseMoved",
      x,
      y,
      button: "none",
      clickCount: 0
    }));
  }, [status, getCanvasCoords]);

  const handleWheel = useCallback((e) => {
    if (status !== "active" || !wsRef.current) return;
    e.preventDefault();
    const { x, y } = getCanvasCoords(e);
    wsRef.current.send(JSON.stringify({
      type: "wheel",
      x,
      y,
      deltaX: e.deltaX,
      deltaY: e.deltaY
    }));
  }, [status, getCanvasCoords]);

  const handleKeyDown = useCallback((e) => {
    if (status !== "active" || !wsRef.current) return;
    // Don't forward browser shortcuts
    if (e.ctrlKey || e.altKey || e.metaKey) return;
    wsRef.current.send(JSON.stringify({
      type: "key",
      eventType: "keyDown",
      key: e.key,
      code: e.code,
      text: e.key.length === 1 ? e.key : "",
      keyCode: e.keyCode
    }));
  }, [status]);

  const handleNavigateSubmit = (e) => {
    e.preventDefault();
    if (status === "active" && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "navigate", url: currentUrl }));
    }
  };

  const handleReload = () => {
    if (status === "active" && wsRef.current) {
      wsRef.current.send(JSON.stringify({ type: "reload" }));
    }
  };

  return (
    <div className="rbi-modal-overlay">
      <div className="rbi-window">
        {/* Top Control Bar */}
        <header className="rbi-header">
          <div className="rbi-title-group">
            <span className="rbi-shield-icon">🛡️</span>
            <div>
              <div className="rbi-heading">BrowseGuard Remote Browser Isolation (RBI)</div>
              <div className="rbi-subheading">{pageTitle}</div>
            </div>
          </div>

          <div className="rbi-badges">
            <span className="rbi-badge live">● {status === "active" ? `LIVE (${fps} FPS)` : status.toUpperCase()}</span>
            <span
              className="rbi-badge"
              style={{
                background: timeLeft < 30 ? "rgba(220, 38, 38, 0.25)" : "rgba(37, 99, 235, 0.2)",
                color: timeLeft < 30 ? "#fca5a5" : "#60a5fa",
                borderColor: timeLeft < 30 ? "#dc2626" : "rgba(59, 130, 246, 0.4)",
                fontWeight: 700
              }}
            >
              ⏱️ {Math.floor(timeLeft / 60)}:{(timeLeft % 60).toString().padStart(2, "0")}
            </span>
            <button
              type="button"
              className="rbi-nav-btn"
              onClick={handleExtendTime}
              style={{
                padding: "2px 8px",
                fontSize: "0.75rem",
                borderRadius: "4px",
                background: "#0284c7",
                color: "#fff",
                fontWeight: 700
              }}
              title="Add 60 seconds to interactive isolation session"
            >
              +60s Extend
            </button>
            <span className="rbi-badge secure">🔒 Zero-Trust Stream</span>
            <span className="rbi-badge filter">🛡️ SSRF Egress Filter: Active</span>
          </div>

          <button type="button" className="rbi-close-btn" onClick={onClose}>
            ✕ Exit Isolation
          </button>
        </header>

        {/* Browser Nav Address Bar */}
        <div className="rbi-nav-bar">
          <button type="button" className="rbi-nav-btn" onClick={handleReload} title="Reload page">
            🔄
          </button>
          <form className="rbi-url-form" onSubmit={handleNavigateSubmit}>
            <input
              type="text"
              className="rbi-url-input"
              value={currentUrl}
              onChange={(e) => setCurrentUrl(e.target.value)}
              placeholder="Enter destination URL..."
              autoComplete="off"
            />
            <button type="submit" className="rbi-go-btn">Go</button>
          </form>
        </div>

        {/* Viewport Canvas */}
        <div className="rbi-viewport" onWheel={handleWheel} tabIndex={0} onKeyDown={handleKeyDown}>
          {status === "connecting" && (
            <div className="rbi-loading-curtain">
              <div className="spinner"></div>
              <h3>Initializing Isolated Chromium Sandbox...</h3>
              <p>Spinning up isolated browser process with fail-closed network filters.</p>
            </div>
          )}

          {status === "error" && (
            <div className="rbi-loading-curtain error">
              <span style={{ fontSize: "3rem" }}>⚠️</span>
              <h3>Unable to Connect to Isolation Sandbox</h3>
              <p>{errorMessage}</p>
              <button type="button" className="primary-button" onClick={onClose} style={{ marginTop: "16px" }}>
                Close Window
              </button>
            </div>
          )}

          {status === "terminated" && (
            <div className="rbi-loading-curtain">
              <span style={{ fontSize: "3rem" }}>🔒</span>
              <h3>Isolation Session Terminated</h3>
              <p>The remote sandbox process has been cleanly destroyed.</p>
              <button type="button" className="primary-button" onClick={onClose} style={{ marginTop: "16px" }}>
                Close Window
              </button>
            </div>
          )}

          <canvas
            ref={canvasRef}
            width={1280}
            height={800}
            className="rbi-canvas"
            onMouseDown={handleMouseDown}
            onMouseUp={handleMouseUp}
            onMouseMove={handleMouseMove}
          />
        </div>

        {/* Footer info banner */}
        <footer className="rbi-footer">
          <span>
            🛡️ <strong>Zero Attack Surface:</strong> Active web code is executing inside an isolated container. Your endpoint only receives safe JPEG screencast pixels.
          </span>
          <span className="rbi-resolution">Resolution: 1280 × 800</span>
        </footer>
      </div>
    </div>
  );
}
