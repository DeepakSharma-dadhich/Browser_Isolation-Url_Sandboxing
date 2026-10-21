/**
 * BrowseGuard Live Stream Hub Service
 *
 * Facilitates real-time screen streaming and telemetry broadcasting
 * between VM Agent sandbox worker and SOC frontend web clients.
 *
 * WebSocket Protocols:
 * - Worker ingest:   /ws/ingest/:sessionId  (Worker pushes CDP frames & live telemetry logs)
 * - Client stream:   /ws/live/:sessionId    (Frontend subscribes to live frames & logs)
 */

"use strict";

const { EventEmitter } = require("events");

class LiveStreamHub extends EventEmitter {
  constructor() {
    super();
    // Map<sessionId, StreamSession>
    this.streams = new Map();
  }

  /**
   * Get or create a stream session record.
   */
  getOrCreateStream(sessionId) {
    if (!this.streams.has(sessionId)) {
      this.streams.set(sessionId, {
        sessionId,
        publisherWs: null,
        clients: new Set(),
        latestFrame: null, // base64 JPEG
        latestFrameBuffer: null, // binary Buffer for HTTP fallback
        events: [], // circular buffer of last 60 events
        status: "waiting", // "waiting" | "active" | "completed" | "error"
        startedAt: Date.now(),
        lastActivity: Date.now(),
        cleanupTimer: null
      });
    }
    return this.streams.get(sessionId);
  }

  /**
   * Register a VM Agent publisher WebSocket connection.
   */
  registerPublisher(ws, sessionId) {
    const stream = this.getOrCreateStream(sessionId);
    stream.publisherWs = ws;
    stream.status = "active";
    stream.lastActivity = Date.now();

    if (stream.cleanupTimer) {
      clearTimeout(stream.cleanupTimer);
      stream.cleanupTimer = null;
    }

    console.log(`[LiveStreamHub] Publisher attached for session ${sessionId}`);

    // Notify subscribed clients that publisher is active
    this.broadcastToClients(stream, {
      type: "status",
      status: "active",
      message: "Sandbox worker attached live CDP stream."
    });

    ws.on("message", (raw) => {
      try {
        const text = typeof raw === "string" ? raw : raw.toString("utf8");
        const message = JSON.parse(text);
        stream.lastActivity = Date.now();

        if (message.type === "frame" && message.data) {
          stream.latestFrame = message.data;
          try {
            stream.latestFrameBuffer = Buffer.from(message.data, "base64");
          } catch {
            stream.latestFrameBuffer = null;
          }
          this.broadcastToClients(stream, {
            type: "frame",
            data: message.data,
            timestamp: message.timestamp || Date.now()
          });
        } else if (message.type === "event" || message.type === "log") {
          const logEntry = {
            id: `evt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
            message: message.message || "",
            level: message.level || "info",
            timestamp: message.timestamp || new Date().toISOString()
          };
          stream.events.push(logEntry);
          if (stream.events.length > 80) {
            stream.events.shift();
          }
          this.broadcastToClients(stream, {
            type: "event",
            data: logEntry
          });
        } else if (message.type === "status") {
          stream.status = message.status || stream.status;
          this.broadcastToClients(stream, {
            type: "status",
            status: stream.status,
            message: message.message
          });
        } else if (message.type === "completed") {
          stream.status = "completed";
          this.broadcastToClients(stream, {
            type: "completed",
            message: "Sandbox detonation finished."
          });
          this.scheduleStreamCleanup(sessionId);
        }
      } catch (err) {
        console.warn(`[LiveStreamHub] Error parsing publisher message for ${sessionId}:`, err.message);
      }
    });

    ws.on("close", () => {
      console.log(`[LiveStreamHub] Publisher disconnected for session ${sessionId}`);
      stream.publisherWs = null;
      if (stream.status !== "completed") {
        stream.status = "ended";
        this.broadcastToClients(stream, {
          type: "status",
          status: "ended",
          message: "Detonation agent disconnected."
        });
      }
      this.scheduleStreamCleanup(sessionId);
    });

    ws.on("error", (err) => {
      console.warn(`[LiveStreamHub] Publisher WS error for ${sessionId}:`, err.message);
    });
  }

  /**
   * Subscribe a frontend viewer client to a session's live stream.
   */
  subscribeClient(ws, sessionId) {
    const stream = this.getOrCreateStream(sessionId);
    stream.clients.add(ws);

    console.log(`[LiveStreamHub] Frontend client subscribed to ${sessionId} (total: ${stream.clients.size})`);

    // Immediately push initial synchronization payload
    try {
      ws.send(JSON.stringify({
        type: "init",
        sessionId,
        status: stream.status,
        events: stream.events,
        hasFrame: Boolean(stream.latestFrame)
      }));

      // If we already have a frame, push it immediately so canvas has no blank delay
      if (stream.latestFrame) {
        ws.send(JSON.stringify({
          type: "frame",
          data: stream.latestFrame,
          timestamp: Date.now()
        }));
      }
    } catch (err) {
      console.warn(`[LiveStreamHub] Error sending initial handshake to client:`, err.message);
    }

    ws.on("close", () => {
      stream.clients.delete(ws);
      console.log(`[LiveStreamHub] Frontend client unsubscribed from ${sessionId} (remaining: ${stream.clients.size})`);
      if (stream.clients.size === 0 && !stream.publisherWs) {
        this.scheduleStreamCleanup(sessionId);
      }
    });

    ws.on("error", (err) => {
      stream.clients.delete(ws);
    });
  }

  /**
   * Broadcast payload to all connected frontend clients for a session.
   */
  broadcastToClients(stream, payload) {
    if (!stream.clients || stream.clients.size === 0) return;
    const jsonString = JSON.stringify(payload);
    for (const client of stream.clients) {
      if (client.readyState === 1) { // WebSocket.OPEN
        try {
          client.send(jsonString);
        } catch {
          stream.clients.delete(client);
        }
      }
    }
  }

  /**
   * Return the latest frame buffer (useful for HTTP fallback).
   */
  getLatestFrame(sessionId) {
    const stream = this.streams.get(sessionId);
    return stream ? stream.latestFrameBuffer : null;
  }

  /**
   * Schedule garbage collection of completed/abandoned streams after 5 minutes.
   */
  scheduleStreamCleanup(sessionId) {
    const stream = this.streams.get(sessionId);
    if (!stream) return;
    if (stream.cleanupTimer) clearTimeout(stream.cleanupTimer);

    stream.cleanupTimer = setTimeout(() => {
      // If no clients and no publisher, remove
      if (stream.clients.size === 0 && !stream.publisherWs) {
        this.streams.delete(sessionId);
        console.log(`[LiveStreamHub] Cleaned up stream session memory for ${sessionId}`);
      }
    }, 5 * 60 * 1000);
  }
}

const liveStreamHub = new LiveStreamHub();
module.exports = {
  liveStreamHub,
  LiveStreamHub
};
