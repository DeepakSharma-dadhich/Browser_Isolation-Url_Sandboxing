"use strict";

const crypto = require("crypto");

// Regex to capture full URLs
const URL_REGEX = /https?:\/\/[^\s<>"'{}|\\^`]+/gi;

/**
 * Decode Quoted-Printable encoded MIME text (e.g. '=3D' -> '=', '=\r\n' -> '')
 */
function decodeQuotedPrintable(input) {
  if (!input) return "";
  return input
    .replace(/=\r?\n/g, "")
    .replace(/=([0-9A-Fa-f]{2})/g, (_, hex) => {
      try {
        return String.fromCharCode(parseInt(hex, 16));
      } catch {
        return "";
      }
    });
}

/**
 * Decode standard MIME headers like '=?UTF-8?B?...?=' or '=?UTF-8?Q?...?='
 */
function decodeMimeHeader(headerValue) {
  if (!headerValue) return "";
  return headerValue.replace(/=\?([^?]+)\?([BQbq])\?([^?]+)\?=/g, (_, charset, encoding, text) => {
    try {
      if (encoding.toUpperCase() === "B") {
        return Buffer.from(text, "base64").toString("utf-8");
      }
      if (encoding.toUpperCase() === "Q") {
        return decodeQuotedPrintable(text.replace(/_/g, " "));
      }
    } catch {
      return text;
    }
    return text;
  });
}

/**
 * Parse an RFC822 / .EML raw stream into structured forensics, headers, and body parts.
 * @param {string} rawEml - The raw string representation of the .eml email file.
 */
function parseRawEml(rawEml) {
  if (!rawEml || typeof rawEml !== "string") {
    throw new Error("Raw RFC822 email content is required.");
  }

  const lines = rawEml.split(/\r?\n/);
  const headerLines = [];
  let bodyStartIndex = -1;

  // 1. Separate headers from body (first blank line or boundary divides headers from body)
  for (let i = 0; i < lines.length; i++) {
    const lineTrimmed = lines[i].trim();
    if (lineTrimmed === "") {
      bodyStartIndex = i + 1;
      break;
    }
    // Also detect direct boundary marker following headers
    if (lineTrimmed.startsWith("--") && headerLines.length >= 2) {
      bodyStartIndex = i;
      break;
    }
    // Unfold multiline headers (lines starting with space or tab)
    if ((lines[i].startsWith(" ") || lines[i].startsWith("\t")) && headerLines.length > 0) {
      headerLines[headerLines.length - 1] += " " + lines[i].trim();
    } else {
      headerLines.push(lines[i]);
    }
  }

  // 2. Parse headers into key-value map
  const headers = {};
  for (const line of headerLines) {
    const colonIdx = line.indexOf(":");
    if (colonIdx > 0) {
      const key = line.slice(0, colonIdx).trim().toLowerCase();
      const val = decodeMimeHeader(line.slice(colonIdx + 1).trim());
      if (headers[key]) {
        // Multi-value headers like 'received'
        if (Array.isArray(headers[key])) {
          headers[key].push(val);
        } else {
          headers[key] = [headers[key], val];
        }
      } else {
        headers[key] = val;
      }
    }
  }

  const rawBody = bodyStartIndex >= 0 ? lines.slice(bodyStartIndex).join("\n") : "";

  // 3. Extract sender address and domain
  const fromRaw = headers["from"] || "unknown@unverified.org";
  const fromMatch = fromRaw.match(/<([^>]+)>/) || [null, fromRaw];
  const fromAddress = (fromMatch[1] || fromRaw).trim();
  const fromName = fromRaw.includes("<") ? fromRaw.split("<")[0].replace(/["']/g, "").trim() : fromAddress;
  const fromDomain = fromAddress.includes("@") ? fromAddress.split("@")[1].toLowerCase() : "";

  // Return-Path check (spoofing indicator)
  const returnPathRaw = headers["return-path"] || "";
  const returnPathMatch = returnPathRaw.match(/<([^>]+)>/) || [null, returnPathRaw];
  const returnPathAddress = (returnPathMatch[1] || returnPathRaw).trim();
  const returnPathDomain = returnPathAddress.includes("@") ? returnPathAddress.split("@")[1].toLowerCase() : "";

  // 4. Authentication-Results (SPF / DKIM / DMARC)
  const authResultsRaw = headers["authentication-results"] || "";
  let spfStatus = "UNKNOWN";
  let dkimStatus = "UNKNOWN";
  let dmarcStatus = "UNKNOWN";

  if (authResultsRaw) {
    if (/spf=pass/i.test(authResultsRaw)) spfStatus = "PASS";
    else if (/spf=fail/i.test(authResultsRaw) || /spf=softfail/i.test(authResultsRaw)) spfStatus = "FAIL";
    else if (/spf=none/i.test(authResultsRaw)) spfStatus = "NONE";

    if (/dkim=pass/i.test(authResultsRaw)) dkimStatus = "PASS";
    else if (/dkim=fail/i.test(authResultsRaw)) dkimStatus = "FAIL";
    else if (/dkim=none/i.test(authResultsRaw)) dkimStatus = "NONE";

    if (/dmarc=pass/i.test(authResultsRaw)) dmarcStatus = "PASS";
    else if (/dmarc=fail/i.test(authResultsRaw)) dmarcStatus = "FAIL";
    else if (/dmarc=none/i.test(authResultsRaw)) dmarcStatus = "NONE";
  }

  // 5. Detect multipart boundary and parse body parts
  const contentType = headers["content-type"] || "text/plain";
  let htmlBody = "";
  let textBody = "";
  const attachments = [];

  const boundaryMatch = contentType.match(/boundary=["']?([^"';]+)["']?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = rawBody.split(`--${boundary}`);

    for (const part of parts) {
      if (!part || part.trim() === "--" || part.trim() === "") continue;

      const partLines = part.split(/\r?\n/);
      const partHeaders = {};
      let partBodyStart = -1;

      // Skip any leading empty lines resulting from the boundary split
      let headerStart = 0;
      while (headerStart < partLines.length && partLines[headerStart].trim() === "") {
        headerStart++;
      }

      for (let j = headerStart; j < partLines.length; j++) {
        if (partLines[j].trim() === "") {
          partBodyStart = j + 1;
          break;
        }
        const colIdx = partLines[j].indexOf(":");
        if (colIdx > 0) {
          const k = partLines[j].slice(0, colIdx).trim().toLowerCase();
          const v = partLines[j].slice(colIdx + 1).trim();
          partHeaders[k] = v;
        }
      }

      let content = partBodyStart >= 0 ? partLines.slice(partBodyStart).join("\n") : "";
      const transferEnc = (partHeaders["content-transfer-encoding"] || "").toLowerCase();
      if (transferEnc.includes("quoted-printable")) {
        content = decodeQuotedPrintable(content);
      } else if (transferEnc.includes("base64") && !partHeaders["content-disposition"]) {
        try {
          content = Buffer.from(content.replace(/\s/g, ""), "base64").toString("utf-8");
        } catch {}
      }

      const partType = (partHeaders["content-type"] || "").toLowerCase();
      const disposition = (partHeaders["content-disposition"] || "").toLowerCase();

      // Check for file attachment
      if (disposition.includes("attachment") || partHeaders["content-type"]?.includes("name=")) {
        const nameMatch = (partHeaders["content-disposition"] || partHeaders["content-type"]).match(/filename=["']?([^"';]+)["']?/i);
        const filename = nameMatch ? nameMatch[1] : "attachment.bin";
        const isRisky = /\.(exe|scr|bat|ps1|vbs|iso|img|hta|dll|jar|zip|rar|7z|js|wsf|pdf\.exe)$/i.test(filename);
        attachments.push({
          filename,
          content_type: partHeaders["content-type"] || "application/octet-stream",
          is_risky: isRisky,
          size_bytes: content.length
        });
      } else if (partType.includes("text/html")) {
        htmlBody += content;
      } else if (partType.includes("text/plain")) {
        textBody += content;
      }
    }
  } else {
    // Single part
    let singleBody = rawBody;
    const transferEnc = (headers["content-transfer-encoding"] || "").toLowerCase();
    if (transferEnc.includes("quoted-printable")) {
      singleBody = decodeQuotedPrintable(singleBody);
    } else if (transferEnc.includes("base64")) {
      try {
        singleBody = Buffer.from(singleBody.replace(/\s/g, ""), "base64").toString("utf-8");
      } catch {}
    }

    if (contentType.toLowerCase().includes("text/html")) {
      htmlBody = singleBody;
    } else {
      textBody = singleBody;
    }
  }

  // 6. Hyperlink Extraction & Anchor Text Mismatch Analysis
  const extractedLinks = [];
  const seenUrls = new Set();

  // A. Extract HTML Anchor Tags (<a href="..." ...>anchor text</a>)
  const fullHtml = htmlBody || textBody;
  const anchorTagRegex = /<a\s+[^>]*href=["'](https?:\/\/[^"'>]+)["'][^>]*>(.*?)<\/a>/gi;
  let match;

  while ((match = anchorTagRegex.exec(fullHtml)) !== null) {
    const rawUrl = match[1].trim();
    const anchorContent = match[2].replace(/<[^>]+>/g, "").trim();

    try {
      const parsed = new URL(rawUrl);
      if (seenUrls.has(parsed.href)) continue;
      seenUrls.add(parsed.href);

      // Check anchor mismatch (e.g. anchor says "login.microsoft.com" but href is "attacker-domain.xyz")
      let isMismatched = false;
      const anchorUrlMatch = anchorContent.match(/https?:\/\/([^\s/]+)/i);
      if (anchorUrlMatch) {
        const anchorHost = anchorUrlMatch[1].toLowerCase();
        if (anchorHost !== parsed.hostname.toLowerCase() && !parsed.hostname.toLowerCase().endsWith("." + anchorHost)) {
          isMismatched = true;
        }
      }

      extractedLinks.push({
        url: parsed.href,
        hostname: parsed.hostname,
        protocol: parsed.protocol,
        display_text: anchorContent || parsed.hostname,
        is_mismatched: isMismatched,
        is_ip_address: /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname)
      });
    } catch {}
  }

  // B. Extract plain text URLs that were not wrapped in anchor tags
  const rawUrlsInText = (textBody + " " + htmlBody).match(URL_REGEX) || [];
  for (const rawUrl of rawUrlsInText) {
    const cleaned = rawUrl.replace(/[.,;:)\]>]+$/, "").trim();
    try {
      const parsed = new URL(cleaned);
      if (!seenUrls.has(parsed.href)) {
        seenUrls.add(parsed.href);
        extractedLinks.push({
          url: parsed.href,
          hostname: parsed.hostname,
          protocol: parsed.protocol,
          display_text: parsed.hostname,
          is_mismatched: false,
          is_ip_address: /^(\d{1,3}\.){3}\d{1,3}$/.test(parsed.hostname)
        });
      }
    } catch {}
  }

  // 7. Security Scoring & Phishing Indicator Detection
  const phishingIndicators = [];
  let threatScore = 10; // Baseline

  // Indicator 1: SPF / DMARC Failure
  if (spfStatus === "FAIL" || dmarcStatus === "FAIL") {
    threatScore += 35;
    phishingIndicators.push({
      signal: "EMAIL_AUTH_FAILURE",
      severity: "HIGH",
      title: "Domain Authentication Failed (SPF/DMARC)",
      description: `Sender domain '${fromDomain}' failed SPF or DMARC authentication. Email is likely spoofed.`
    });
  }

  // Indicator 2: Sender / Return-Path Mismatch
  if (fromDomain && returnPathDomain && fromDomain !== returnPathDomain) {
    threatScore += 25;
    phishingIndicators.push({
      signal: "RETURN_PATH_MISMATCH",
      severity: "MEDIUM",
      title: "Return-Path Envelope Mismatch",
      description: `Display domain '${fromDomain}' differs from actual envelope sender '${returnPathDomain}'.`
    });
  }

  // Indicator 3: Anchor Text URL Mismatch
  const mismatchedLinks = extractedLinks.filter((l) => l.is_mismatched);
  if (mismatchedLinks.length > 0) {
    threatScore += 40;
    phishingIndicators.push({
      signal: "DECEPTIVE_HYPERLINK",
      severity: "CRITICAL",
      title: "Deceptive Anchor Link Detected",
      description: `Display text mentions '${mismatchedLinks[0].display_text}', but points to malicious destination '${mismatchedLinks[0].hostname}'.`
    });
  }

  // Indicator 4: IP Address Hostname
  const ipLinks = extractedLinks.filter((l) => l.is_ip_address);
  if (ipLinks.length > 0) {
    threatScore += 30;
    phishingIndicators.push({
      signal: "RAW_IP_DESTINATION",
      severity: "HIGH",
      title: "Direct IP Address Destination",
      description: `Embedded link points to raw IP address '${ipLinks[0].hostname}', bypassing DNS reputation safeguards.`
    });
  }

  // Indicator 5: Suspicious File Attachment
  const riskyAttachments = attachments.filter((a) => a.is_risky);
  if (riskyAttachments.length > 0) {
    threatScore += 45;
    phishingIndicators.push({
      signal: "EXECUTABLE_ATTACHMENT",
      severity: "CRITICAL",
      title: "Dangerous Payload Attachment",
      description: `Attached file '${riskyAttachments[0].filename}' has a high-risk executable or script extension.`
    });
  }

  // Indicator 6: Urgency / Credential Harvest Keywords
  const fullContentLower = (headers["subject"] + " " + textBody + " " + htmlBody).toLowerCase();
  const urgencyKeywords = [
    "urgent", "suspend", "immediate action", "verify your account",
    "password expires", "unauthorized login", "wire transfer",
    "overdue invoice", "security alert", "confirm identity"
  ];
  const matchedKeywords = urgencyKeywords.filter((kw) => fullContentLower.includes(kw));
  if (matchedKeywords.length >= 2) {
    threatScore += 20;
    phishingIndicators.push({
      signal: "SOCIAL_ENGINEERING_PRESSURE",
      severity: "MEDIUM",
      title: "Psychological Urgency Detected",
      description: `Subject and body contain psychological coercion patterns: '${matchedKeywords.slice(0, 3).join("', '")}'.`
    });
  }

  // Indicator 7: Quishing (QR code Phishing) check
  const quishingKeywords = ["qr code", "scan qr", "scan the code with your phone", "authenticator app qr"];
  if (quishingKeywords.some((q) => fullContentLower.includes(q))) {
    threatScore += 25;
    phishingIndicators.push({
      signal: "QUISHING_TACTIC_DETECTED",
      severity: "HIGH",
      title: "QR Code Lure Pattern (Quishing)",
      description: "Email instructs victim to scan a QR code using an unmanaged personal mobile device to bypass security filters."
    });
  }

  // Bound score 0-100
  threatScore = Math.min(100, Math.max(5, threatScore));

  let verdict = "CLEAN";
  if (threatScore >= 70) {
    verdict = "MALICIOUS";
  } else if (threatScore >= 40) {
    verdict = "SUSPICIOUS";
  }

  return {
    success: true,
    email_summary: {
      subject: headers["subject"] || "No Subject",
      from: {
        raw: fromRaw,
        name: fromName,
        address: fromAddress,
        domain: fromDomain
      },
      to: headers["to"] || "Unspecified",
      date: headers["date"] || new Date().toISOString(),
      message_id: headers["message-id"] || `msg_${crypto.randomBytes(8).toString("hex")}`,
      return_path: returnPathAddress || fromAddress,
      auth_results: {
        spf: spfStatus,
        dkim: dkimStatus,
        dmarc: dmarcStatus
      },
      threat_score: threatScore,
      verdict: verdict,
      phishing_indicators: phishingIndicators,
      attachments_count: attachments.length,
      attachments: attachments
    },
    extracted_links_count: extractedLinks.length,
    extracted_links: extractedLinks,
    preview: {
      has_html: Boolean(htmlBody),
      has_text: Boolean(textBody),
      text_snippet: (textBody || htmlBody.replace(/<[^>]+>/g, " ")).slice(0, 300).trim() + "..."
    },
    raw_body_preview: htmlBody || textBody
  };
}

module.exports = {
  parseRawEml,
  decodeQuotedPrintable,
  decodeMimeHeader
};
