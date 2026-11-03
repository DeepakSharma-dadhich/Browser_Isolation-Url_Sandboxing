"use strict";

const dns = require("dns").promises;
const net = require("net");

/**
 * Cloud metadata IPs and hostnames.
 */
const BLOCKED_HOSTNAMES = new Set([
  "169.254.169.254",
  "169.254.170.2",
  "instance-data",
  "metadata.google.internal",
  "metadata.google",
  "100.100.100.200",
  "localhost"
]);

const INTERNAL_SUFFIXES = [
  ".localhost",
  ".local",
  ".internal",
  ".lan",
  ".home",
  ".corp",
  ".intranet"
];

/**
 * Check whether an IPv4 address is in a private, loopback, or cloud-metadata range.
 */
function isBlockedIpv4(ipStr) {
  const parts = ipStr.split(".").map(Number);
  if (parts.length !== 4 || parts.some((p) => isNaN(p) || p < 0 || p > 255)) {
    return true;
  }

  const [b0, b1] = parts;

  // 0.0.0.0/8 (Current network)
  if (b0 === 0) return true;

  // 127.0.0.0/8 (Loopback)
  if (b0 === 127) return true;

  // 10.0.0.0/8 (RFC 1918 Private)
  if (b0 === 10) return true;

  // 172.16.0.0/12 (RFC 1918 Private: 172.16 - 172.31)
  if (b0 === 172 && b1 >= 16 && b1 <= 31) return true;

  // 192.168.0.0/16 (RFC 1918 Private)
  if (b0 === 192 && b1 === 168) return true;

  // 169.254.0.0/16 (Link-Local / Cloud Metadata)
  if (b0 === 169 && b1 === 254) return true;

  // 100.64.0.0/10 (Carrier-Grade NAT: 100.64 - 100.127)
  if (b0 === 100 && b1 >= 64 && b1 <= 127) return true;

  // 224.0.0.0/4 (Multicast)
  if (b0 >= 224 && b0 <= 239) return true;

  // 240.0.0.0/4 (Reserved / Future use)
  if (b0 >= 240) return true;

  return false;
}

/**
 * Check whether an IPv6 address is in a private, loopback, or link-local range.
 */
function isBlockedIpv6(ipStr) {
  const norm = ipStr.toLowerCase();

  // ::1 / :: (Loopback / Unspecified)
  if (norm === "::1" || norm === "::") return true;

  // IPv4-mapped IPv6 (e.g. ::ffff:127.0.0.1 or ::ffff:7f00:1)
  if (norm.startsWith("::ffff:")) {
    const embeddedIpv4 = norm.replace("::ffff:", "");
    if (net.isIPv4(embeddedIpv4)) {
      return isBlockedIpv4(embeddedIpv4);
    }
  }

  // fc00::/7 (Unique Local Address)
  if (norm.startsWith("fc") || norm.startsWith("fd")) return true;

  // fe80::/10 (Link-Local)
  if (norm.startsWith("fe8") || norm.startsWith("fe9") || norm.startsWith("fea") || norm.startsWith("feb")) return true;

  return false;
}

/**
 * Validate that an outbound target URL does not resolve to any internal, private,
 * loopback, or cloud-metadata destination.
 *
 * @param {string} rawUrl
 * @returns {Promise<boolean>}
 * @throws {Error} if URL is malformed or targets a private/internal IP
 */
async function validateOutboundUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") {
    throw new Error("Invalid outbound destination URL.");
  }

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    throw new Error(`Malformed outbound URL: ${err.message}`);
  }

  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error(`Forbidden outbound protocol '${parsed.protocol}'. Only HTTP and HTTPS are permitted.`);
  }

  const hostname = (parsed.hostname || "").toLowerCase().trim();
  if (!hostname) {
    throw new Error("Missing outbound hostname.");
  }

  // Check static blocked hostnames & suffixes
  if (BLOCKED_HOSTNAMES.has(hostname)) {
    throw new Error(`Outbound target rejected: destination '${hostname}' is a protected internal/cloud endpoint.`);
  }

  for (const suffix of INTERNAL_SUFFIXES) {
    if (hostname.endsWith(suffix)) {
      throw new Error(`Outbound target rejected: internal domain suffix '${suffix}' is disallowed.`);
    }
  }

  // Check if hostname is an IP literal
  if (net.isIPv4(hostname)) {
    if (isBlockedIpv4(hostname)) {
      throw new Error(`Outbound target rejected: private/reserved IPv4 address '${hostname}' is disallowed.`);
    }
    return true;
  }

  if (net.isIPv6(hostname)) {
    if (isBlockedIpv6(hostname)) {
      throw new Error(`Outbound target rejected: private/reserved IPv6 address '${hostname}' is disallowed.`);
    }
    return true;
  }

  // Perform DNS resolution to check all resolved target IPs
  try {
    const addresses = await dns.lookup(hostname, { all: true });
    if (!addresses || addresses.length === 0) {
      throw new Error(`DNS resolution failed for outbound destination '${hostname}'.`);
    }

    for (const record of addresses) {
      const { address, family } = record;
      if (family === 4 && isBlockedIpv4(address)) {
        throw new Error(`Outbound target rejected: resolved to private/reserved IPv4 address '${address}'.`);
      }
      if (family === 6 && isBlockedIpv6(address)) {
        throw new Error(`Outbound target rejected: resolved to private/reserved IPv6 address '${address}'.`);
      }
    }
  } catch (dnsErr) {
    if (dnsErr.message.includes("Outbound target rejected")) {
      throw dnsErr;
    }
    throw new Error(`Failed to verify outbound destination safety for '${hostname}': ${dnsErr.message}`);
  }

  return true;
}

module.exports = {
  validateOutboundUrl,
  isBlockedIpv4,
  isBlockedIpv6
};
