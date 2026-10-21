/**
 * BrowseGuard Zero-Trust Shield - High-Reputation Domain Whitelist & Heuristics
 * Provides 0ms instant bypass for top legitimate global services, preventing browsing delays.
 */

var BrowseGuardWhitelist;
(function (root, factory) {
  const instance = factory();
  BrowseGuardWhitelist = instance;
  if (typeof root !== "undefined") root.BrowseGuardWhitelist = instance;
  if (typeof globalThis !== "undefined") globalThis.BrowseGuardWhitelist = instance;
  if (typeof self !== "undefined") self.BrowseGuardWhitelist = instance;
  if (typeof window !== "undefined") window.BrowseGuardWhitelist = instance;
  if (typeof module === "object" && module.exports) module.exports = instance;
})(typeof self !== "undefined" ? self : (typeof window !== "undefined" ? window : this), function () {
  "use strict";

  // Top trusted apex domains that should NEVER suffer sandbox inspection delays
  const TRUSTED_APEX_DOMAINS = new Set([
    // Search Engines & Big Tech
    "google.com", "google.co.uk", "google.co.in", "google.ca", "google.com.au",
    "gstatic.com", "googleusercontent.com", "googleapis.com", "googlevideo.com",
    "youtube.com", "youtu.be",
    "microsoft.com", "live.com", "office.com", "office365.com", "sharepoint.com", "azure.com", "bing.com", "msn.com",
    "apple.com", "icloud.com",
    "amazon.com", "amazon.co.uk", "amazon.in", "amazon.co.jp", "amazon.de", "aws.amazon.com",
    "cloudflare.com",

    // Developer & Knowledge
    "github.com", "github.io", "githubusercontent.com", "gitlab.com",
    "stackoverflow.com", "stackexchange.com",
    "wikipedia.org", "wikimedia.org", "wikidata.org",
    "npmjs.com", "python.org", "pypi.org", "docker.com", "w3schools.com", "mdn.dev", "mozilla.org",

    // Social, Media & Entertainment
    "linkedin.com", "licdn.com",
    "twitter.com", "x.com", "t.co",
    "facebook.com", "fb.com", "instagram.com", "whatsapp.com", "threads.net",
    "reddit.com", "redd.it", "redditstatic.com",
    "spotify.com", "netflix.com", "twitch.tv", "vimeo.com", "pinterest.com",

    // Work, Collaboration & Enterprise SaaS
    "slack.com", "slack-edge.com", "zoom.us", "zoom.com", "discord.com", "discord.gg",
    "salesforce.com", "force.com",
    "atlassian.com", "jira.com", "confluence.atlassian.net", "trello.com",
    "notion.so", "figma.com", "canva.com", "dropbox.com", "box.com",
    "adobe.com", "behance.net", "zendesk.com", "intercom.io", "stripe.com", "paypal.com",

    // News & Global Media
    "nytimes.com", "bbc.com", "bbc.co.uk", "cnn.com", "reuters.com", "bloomberg.com",
    "theguardian.com", "forbes.com", "wsj.com", "washingtonpost.com", "medium.com",

    // Government & Educational
    "gov.uk", "usa.gov", "nih.gov", "cdc.gov", "edu", "ac.uk"
  ]);

  // Known webmail and enterprise collaboration hosts where phishing arrives, plus local test beds
  const WEBMAIL_AND_CHAT_HOSTS = [
    "mail.google.com",
    "outlook.live.com",
    "outlook.office.com",
    "outlook.office365.com",
    "mail.yahoo.com",
    "webmail.",
    "app.slack.com",
    "teams.microsoft.com",
    "discord.com",
    "localhost",
    "127.0.0.1"
  ];

  /**
   * Extract apex domain (e.g. 'instagram.com' from 'www.instagram.com' or 'sub.corp.example.co.uk')
   */
  function getApexDomain(hostname) {
    if (!hostname) return "";
    hostname = hostname.toLowerCase().trim();

    // Remove port if present
    const colonIdx = hostname.indexOf(":");
    if (colonIdx !== -1) hostname = hostname.substring(0, colonIdx);

    // If it's an IP address, return as is
    if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes("[")) {
      return hostname;
    }

    const parts = hostname.split(".");
    if (parts.length <= 2) return hostname;

    // Handle common double-extension ccTLDs (.co.uk, .com.au, .co.in, etc.)
    const secondLevelTlds = ["co", "com", "org", "net", "gov", "ac", "edu"];
    const tld = parts[parts.length - 1];
    const sld = parts[parts.length - 2];

    if (parts.length >= 3 && secondLevelTlds.includes(sld) && tld.length === 2) {
      return parts.slice(-3).join(".");
    }

    return parts.slice(-2).join(".");
  }

  /**
   * Check if current page is an email client or workplace chat
   */
  function isWebmailOrChatHost(hostname) {
    if (!hostname) return false;
    const lower = hostname.toLowerCase();
    return WEBMAIL_AND_CHAT_HOSTS.some((target) => lower.includes(target));
  }

  /**
   * Check if target URL qualifies for 0ms instant whitelist bypass.
   * Ensures no unicode homoglyphs, IP addresses, or userinfo trickery.
   */
  function isInstantWhitelisted(url, customWhitelist = []) {
    try {
      if (!url || typeof url !== "string") return false;
      if (!/^https?:\/\//i.test(url)) return true; // Non-http schemes not intercepted

      const parsed = new URL(url);
      const hostname = parsed.hostname.toLowerCase();

      // Disallow userinfo (e.g. http://google.com@evil.com)
      if (parsed.username || parsed.password) return false;

      // Disallow raw IP addresses from instant whitelist
      if (/^(\d{1,3}\.){3}\d{1,3}$/.test(hostname) || hostname.includes("[")) {
        return false;
      }

      // Disallow Punycode homoglyph spoofing (xn--)
      if (hostname.includes("xn--")) {
        return false;
      }

      const apex = getApexDomain(hostname);

      // Check default global whitelist
      if (TRUSTED_APEX_DOMAINS.has(apex) || TRUSTED_APEX_DOMAINS.has(hostname)) {
        return true;
      }

      // Check user/enterprise custom whitelist
      if (Array.isArray(customWhitelist) && customWhitelist.length > 0) {
        for (const item of customWhitelist) {
          const cleanItem = item.trim().toLowerCase();
          if (!cleanItem) continue;
          if (hostname === cleanItem || hostname.endsWith("." + cleanItem) || apex === cleanItem) {
            return true;
          }
        }
      }

      return false;
    } catch {
      return false;
    }
  }

  return {
    TRUSTED_APEX_DOMAINS,
    WEBMAIL_AND_CHAT_HOSTS,
    getApexDomain,
    isWebmailOrChatHost,
    isInstantWhitelisted
  };
});
