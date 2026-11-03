"""
BrowseGuard - Presentation Generator
Creates a professional, dark-themed 7-slide corporate presentation
highlighting the BrowseGuard Zero-Trust Browser Isolation & URL Sandboxing platform.
"""

import os
import sys
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_presentation(output_path="BrowseGuard_Project_Presentation.pptx"):
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette
    BG_DARK = RGBColor(11, 15, 25)        # #0B0F19 - Deep Navy / Charcoal
    CARD_BG = RGBColor(19, 27, 46)        # #131B2E - Dark Slate Blue Card
    CARD_BORDER = RGBColor(31, 46, 77)    # #1F2E4D - Subtle Border
    CYAN_ACCENT = RGBColor(0, 229, 255)   # #00E5FF - Vibrant Cyber Cyan
    EMERALD = RGBColor(16, 185, 129)      # #10B981 - Safe / Success Green
    RED_ACCENT = RGBColor(239, 68, 68)    # #EF4444 - Threat Alert Crimson
    AMBER_ACCENT = RGBColor(245, 158, 11) # #F59E0B - Warning Amber
    PURPLE_ACCENT = RGBColor(99, 102, 241)# #6366F1 - Indigo / Purple
    TEXT_WHITE = RGBColor(248, 250, 252)  # #F8FAFC - Heading White
    TEXT_GRAY = RGBColor(148, 163, 184)   # #94A3B8 - Slate Subtitle
    TEXT_MUTED = RGBColor(100, 116, 139)  # #64748B - Muted Metadata

    blank_layout = prs.slide_layouts[6]

    def add_slide_background(slide):
        bg = slide.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, prs.slide_height)
        bg.fill.solid()
        bg.fill.fore_color.rgb = BG_DARK
        bg.line.fill.background()
        return bg

    def add_header(slide, badge_text, title_text, subtitle_text=""):
        # Header Badge
        badge = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.5), Inches(3.2), Inches(0.35))
        badge.fill.solid()
        badge.fill.fore_color.rgb = RGBColor(15, 34, 64)
        badge.line.color.rgb = CYAN_ACCENT
        badge.line.width = Pt(1)
        tf_b = badge.text_frame
        tf_b.word_wrap = True
        p_b = tf_b.paragraphs[0]
        p_b.text = f"  🛡️ {badge_text.upper()}"
        p_b.font.size = Pt(10)
        p_b.font.bold = True
        p_b.font.color.rgb = CYAN_ACCENT
        p_b.font.name = "Segoe UI"

        # Main Title
        tx_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.9), Inches(11.5), Inches(0.8))
        tf = tx_box.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0
        p = tf.paragraphs[0]
        p.text = title_text
        p.font.size = Pt(26)
        p.font.bold = True
        p.font.color.rgb = TEXT_WHITE
        p.font.name = "Segoe UI"

        # Subtitle
        if subtitle_text:
            p2 = tf.add_paragraph()
            p2.text = subtitle_text
            p2.font.size = Pt(13)
            p2.font.color.rgb = TEXT_GRAY
            p2.font.name = "Segoe UI"

    def add_card(slide, left, top, width, height, title, subtitle="", border_color=CARD_BORDER):
        card = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        card.fill.solid()
        card.fill.fore_color.rgb = CARD_BG
        card.line.color.rgb = border_color
        card.line.width = Pt(1.2)
        return card

    # =========================================================================
    # SLIDE 1: Title & Executive Overview
    # =========================================================================
    slide1 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide1)

    # Decorative top glow bar
    top_bar = slide1.shapes.add_shape(MSO_SHAPE.RECTANGLE, 0, 0, prs.slide_width, Inches(0.1))
    top_bar.fill.solid()
    top_bar.fill.fore_color.rgb = CYAN_ACCENT
    top_bar.line.fill.background()

    # Title & Badge
    badge1 = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(0.8), Inches(4.5), Inches(0.4))
    badge1.fill.solid()
    badge1.fill.fore_color.rgb = RGBColor(16, 32, 60)
    badge1.line.color.rgb = CYAN_ACCENT
    badge1.line.width = Pt(1)
    tf1 = badge1.text_frame
    p = tf1.paragraphs[0]
    p.text = "  ⚡ ENTERPRISE CYBERSECURITY PLATFORM"
    p.font.size = Pt(11)
    p.font.bold = True
    p.font.color.rgb = CYAN_ACCENT
    p.font.name = "Segoe UI"

    title_box = slide1.shapes.add_textbox(Inches(0.8), Inches(1.35), Inches(11.5), Inches(2.0))
    tf_t = title_box.text_frame
    tf_t.word_wrap = True
    p_t = tf_t.paragraphs[0]
    p_t.text = "BrowseGuard"
    p_t.font.size = Pt(44)
    p_t.font.bold = True
    p_t.font.color.rgb = TEXT_WHITE
    p_t.font.name = "Segoe UI"

    p_sub = tf_t.add_paragraph()
    p_sub.text = "Next-Gen Zero-Trust Browser Isolation & Dynamic URL Sandboxing"
    p_sub.font.size = Pt(20)
    p_sub.font.bold = True
    p_sub.font.color.rgb = CYAN_ACCENT
    p_sub.font.name = "Segoe UI"

    p_tag = tf_t.add_paragraph()
    p_tag.text = "Neutralizing Zero-Day Web Attacks, Credential Harvesting & SSRF Exploits Before They Reach Endpoints"
    p_tag.font.size = Pt(14)
    p_tag.font.color.rgb = TEXT_GRAY
    p_tag.font.name = "Segoe UI"

    # 3 Executive Feature Highlights (Cards)
    features = [
        ("🛡️ Dynamic Browser Isolation",
         "Untrusted URLs execute in ephemeral headless Chromium containers. Zero remote JavaScript, CSS, or DOM elements render on employee endpoints.",
         CYAN_ACCENT),
        ("🔥 Fail-Closed SSRF Firewall",
         "Strict Network Guard intercepts all browser egress. Prohibits RFC 1918 private subnets and Cloud Metadata (169.254.169.254) with instant MALICIOUS score.",
         EMERALD),
        ("🧠 Deterministic Threat Engine",
         "50+ explainable security rules (Brand impersonation, typosquatting, ClickFix scareware) producing verifiable 0-100 risk scores and STIX 2.1 IOCs.",
         PURPLE_ACCENT)
    ]

    card_width = Inches(3.64)
    card_height = Inches(2.8)
    card_top = Inches(3.8)

    for i, (f_title, f_desc, accent_color) in enumerate(features):
        c_left = Inches(0.8 + i * 4.0)
        card = add_card(slide1, c_left, card_top, card_width, card_height, f_title, border_color=accent_color)
        
        # Color accent strip on card top
        strip = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, c_left + Inches(0.2), card_top + Inches(0.2), Inches(0.6), Inches(0.08))
        strip.fill.solid()
        strip.fill.fore_color.rgb = accent_color
        strip.line.fill.background()

        tb = slide1.shapes.add_textbox(c_left + Inches(0.2), card_top + Inches(0.4), card_width - Inches(0.4), card_height - Inches(0.6))
        tf = tb.text_frame
        tf.word_wrap = True
        p_ct = tf.paragraphs[0]
        p_ct.text = f_title
        p_ct.font.size = Pt(16)
        p_ct.font.bold = True
        p_ct.font.color.rgb = TEXT_WHITE
        p_ct.font.name = "Segoe UI"

        p_cd = tf.add_paragraph()
        p_cd.text = "\n" + f_desc
        p_cd.font.size = Pt(12)
        p_cd.font.color.rgb = TEXT_GRAY
        p_cd.font.name = "Segoe UI"

    # Slide 1 Footer
    footer = slide1.shapes.add_textbox(Inches(0.8), Inches(6.8), Inches(11.5), Inches(0.4))
    tf_f = footer.text_frame
    p_f = tf_f.paragraphs[0]
    p_f.text = "BrowseGuard Architecture Overview  |  Enterprise Email Gateway & URL Sandboxing Platform"
    p_f.font.size = Pt(10)
    p_f.font.color.rgb = TEXT_MUTED
    p_f.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 2: The Modern Threat Landscape & Problem Statement
    # =========================================================================
    slide2 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide2)
    add_header(slide2, "The Problem Space", "Why Traditional Email Security Fails",
               "Over 90% of targeted enterprise breaches originate from weaponized links bypassing static filters.")

    # Left Column: Flaws in Legacy Defenses
    col_w = Inches(5.6)
    col_h = Inches(4.5)
    c1 = add_card(slide2, Inches(0.8), Inches(2.0), col_w, col_h, "Legacy Defenses", border_color=RED_ACCENT)
    
    tb_l = slide2.shapes.add_textbox(Inches(1.1), Inches(2.2), col_w - Inches(0.6), col_h - Inches(0.4))
    tf_l = tb_l.text_frame
    tf_l.word_wrap = True
    p1 = tf_l.paragraphs[0]
    p1.text = "❌ Flaws in Legacy Defenses"
    p1.font.size = Pt(18)
    p1.font.bold = True
    p1.font.color.rgb = RED_ACCENT
    p1.font.name = "Segoe UI"

    legacy_points = [
        ("Static Blocklists & Reputation Feeds", "Attackers effortlessly bypass feeds by registering brand-new domains (NRDs) or abusing dynamic DNS minutes before an attack."),
        ("Static Link Rewriting Proxies", "Modern phishing kits deploy anti-bot cloaking, geo-fencing, and conditional redirects. Scanners see safe pages while employees get phished."),
        ("Local Endpoint Exposure", "Employee browsers execute untrusted JavaScript, DOM exploits, and drive-by malware payloads directly on corporate hardware.")
    ]
    for title, desc in legacy_points:
        p_t = tf_l.add_paragraph()
        p_t.text = f"\n• {title}"
        p_t.font.bold = True
        p_t.font.size = Pt(13)
        p_t.font.color.rgb = TEXT_WHITE
        p_t.font.name = "Segoe UI"
        p_d = tf_l.add_paragraph()
        p_d.text = f"   {desc}"
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_GRAY
        p_d.font.name = "Segoe UI"

    # Right Column: Modern Threat Tactics
    c2 = add_card(slide2, Inches(6.8), Inches(2.0), col_w, col_h, "Modern Attack Tactics", border_color=AMBER_ACCENT)
    tb_r = slide2.shapes.add_textbox(Inches(7.1), Inches(2.2), col_w - Inches(0.6), col_h - Inches(0.4))
    tf_r = tb_r.text_frame
    tf_r.word_wrap = True
    p2 = tf_r.paragraphs[0]
    p2.text = "⚠️ Emerging Modern Threat Vectors"
    p2.font.size = Pt(18)
    p2.font.bold = True
    p2.font.color.rgb = AMBER_ACCENT
    p2.font.name = "Segoe UI"

    modern_points = [
        ("Brand Impersonation & Typosquatting", "Pixel-perfect clones of Microsoft 365, Google, and Bank portals hosted on lookalike domains and Punycode (xn--) strings."),
        ("ClickFix & Social Engineering Lures", "Fake CAPTCHAs and update prompts tricking users to press Win+R and paste weaponized PowerShell scripts into Windows Run."),
        ("Cloud SaaS Phishing & Webhook Exfil", "Phishing forms hosted on trusted Firebase, Vercel, or Netlify domains exfiltrating credentials to Discord and Telegram bots.")
    ]
    for title, desc in modern_points:
        p_t = tf_r.add_paragraph()
        p_t.text = f"\n• {title}"
        p_t.font.bold = True
        p_t.font.size = Pt(13)
        p_t.font.color.rgb = TEXT_WHITE
        p_t.font.name = "Segoe UI"
        p_d = tf_r.add_paragraph()
        p_d.text = f"   {desc}"
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_GRAY
        p_d.font.name = "Segoe UI"

    # Bottom Stat Bar
    stat_box = slide2.shapes.add_textbox(Inches(0.8), Inches(6.65), Inches(11.6), Inches(0.4))
    tf_s = stat_box.text_frame
    p_s = tf_s.paragraphs[0]
    p_s.text = "💡 Conclusion: Static reputation is too slow. Only dynamic, isolated behavioural execution can reliably defeat modern evasion."
    p_s.font.size = Pt(11)
    p_s.font.italic = True
    p_s.font.color.rgb = CYAN_ACCENT
    p_s.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 3: The BrowseGuard Solution & Core Architectural Philosophy
    # =========================================================================
    slide3 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide3)
    add_header(slide3, "Core Philosophy", "Zero-Trust Isolation & Explainable Scoring",
               "Replacing black-box guesswork with deterministic telemetry and strict containment boundaries.")

    pillars = [
        ("1. Zero Host Execution",
         CYAN_ACCENT,
         [
             "Untrusted links are quarantined in ephemeral headless Chromium containers.",
             "The employee's local browser never receives raw HTML, CSS, or JS from untrusted sources.",
             "Neutralizes drive-by malware downloads, zero-day browser exploits, and memory corruptions."
         ]),
        ("2. Fail-Closed Network Guard",
         RED_ACCENT,
         [
             "Custom Layer-7 egress firewall intercepts every DNS resolution and network route.",
             "Strictly blocks private subnets (RFC 1918), loopback, and Cloud Metadata (169.254.169.254).",
             "Any SSRF or internal pivot attempt immediately terminates the job as MALICIOUS (Score 100)."
         ]),
        ("3. Explainable Deterministic Findings",
         EMERALD,
         [
             "Over 50+ deterministic security rules (BRAND-001, TYPO-001, SSRF-001, CLICKFIX-001).",
             "Every score (0–100) is mathematically tied to observable DOM, network, and certificate signals.",
             "PostgreSQL stores immutable, canonical forensic reports with zero black-box hallucinations."
         ])
    ]

    p_w = Inches(3.64)
    p_h = Inches(4.5)
    for i, (p_title, p_color, p_bullets) in enumerate(pillars):
        c_left = Inches(0.8 + i * 4.0)
        add_card(slide3, c_left, Inches(2.0), p_w, p_h, p_title, border_color=p_color)

        tb = slide3.shapes.add_textbox(c_left + Inches(0.25), Inches(2.2), p_w - Inches(0.5), p_h - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        p_t = tf.paragraphs[0]
        p_t.text = p_title
        p_t.font.size = Pt(17)
        p_t.font.bold = True
        p_t.font.color.rgb = p_color
        p_t.font.name = "Segoe UI"

        for b in p_bullets:
            pb = tf.add_paragraph()
            pb.text = f"\n• {b}"
            pb.font.size = Pt(12)
            pb.font.color.rgb = TEXT_WHITE
            pb.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 4: End-to-End Detonation Lifecycle
    # =========================================================================
    slide4 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide4)
    add_header(slide4, "Pipeline Flow", "Life of a URL Detonation: <5 Seconds to Verdict",
               "From automated gateway ingestion to sandboxed execution and SIEM webhook notification.")

    steps = [
        ("1. Ingestion & Auth", "Email Gateways (SEGs), Browser Extension, or EML uploads submit URL via API v1. SHA-256 Idempotency cache checked.", CYAN_ACCENT),
        ("2. Enqueue & Claim", "PostgreSQL records job as QUEUED. Dedicated Python worker claims the task using atomic file locks.", PURPLE_ACCENT),
        ("3. Sandbox Isolation", "Headless Chromium launched. Network Guard firewall intercepts all egress routes and validates DNS.", RED_ACCENT),
        ("4. Telemetry Harvest", "10+ collectors record Headers, Form inputs, Cookies, SSL chains, JS console, and High-Res screenshots.", AMBER_ACCENT),
        ("5. Scoring & Dispatch", "Threat Analyzer calculates 0-100 score. Signed HMAC-SHA256 Webhook notifies SEG; SOC dashboard updates live.", EMERALD)
    ]

    s_w = Inches(2.2)
    s_h = Inches(3.8)
    for i, (st_title, st_desc, st_color) in enumerate(steps):
        s_left = Inches(0.8 + i * 2.38)
        card = add_card(slide4, s_left, Inches(2.0), s_w, s_h, st_title, border_color=st_color)

        tb = slide4.shapes.add_textbox(s_left + Inches(0.15), Inches(2.15), s_w - Inches(0.3), s_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = st_title
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = st_color
        pt.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = "\n" + st_desc
        pd.font.size = Pt(11)
        pd.font.color.rgb = TEXT_GRAY
        pd.font.name = "Segoe UI"

    # Pipeline Metric Bar at bottom
    m_box = slide4.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.0), Inches(11.6), Inches(0.8))
    m_box.fill.solid()
    m_box.fill.fore_color.rgb = RGBColor(16, 26, 48)
    m_box.line.color.rgb = CYAN_ACCENT
    m_box.line.width = Pt(1)

    tf_mb = m_box.text_frame
    p_mb = tf_mb.paragraphs[0]
    p_mb.text = "⚡ Real-World Benchmark: Sub-second evaluation for cached hashes | 3.5s - 5s for full headless Chromium detonation"
    p_mb.font.size = Pt(12)
    p_mb.font.bold = True
    p_mb.font.color.rgb = CYAN_ACCENT
    p_mb.alignment = PP_ALIGN.CENTER
    p_mb.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 5: Core Engineering Modules Breakdown
    # =========================================================================
    slide5 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide5)
    add_header(slide5, "Engineering Architecture", "Modular, Scalable & Decoupled Platform",
               "Architected with strict separation of concerns across 5 modular sub-systems.")

    modules = [
        ("Control Plane Backend (Node.js/Express)",
         CYAN_ACCENT,
         [
             "REST API v1 (/api/v1/analyses) for automated Email Security Gateways.",
             "Organization-scoped API key authorization & scan quota enforcement.",
             "RFC 822 EML file parser evaluating SPF/DKIM/DMARC headers.",
             "Cryptographic HMAC-SHA256 Webhook engine & STIX 2.1 Threat Intel exporter."
         ]),
        ("Dynamic Sandbox & VM Agent (Python/Playwright)",
         PURPLE_ACCENT,
         [
             "Autonomous queue polling daemon with multi-process concurrency.",
             "Zero-Trust Network Guard egress firewall stopping SSRF & metadata probes.",
             "10 specialized telemetry collectors (Headers, Forms, SSL, JS, Cookies).",
             "Canonical forensic report builder synthesizing evidence into JSON & PNGs."
         ]),
        ("Interactive Remote Browser Isolation (RBI Server)",
         EMERALD,
         [
             "Chrome DevTools Protocol (CDP) Page.startScreencast integration.",
             "Streams low-latency JPEG pixel frames to client HTML5 canvases over WebSockets.",
             "Translates mouse & keyboard inputs with zero endpoint JavaScript execution.",
             "Allows SOC analysts to safely interact with live phishing kits."
         ]),
        ("Client Extension & SOC Dashboard (React / MV3)",
         AMBER_ACCENT,
         [
             "Manifest V3 Chrome/Edge extension intercepting links in Gmail and Outlook 365.",
             "Right-click 'Check Link Safety' in-page preview without navigating away.",
             "React 19 SOC Web Dashboard with live detonation feed, threat dials & timelines.",
             "1-Click Executive PDF/HTML summaries and STIX IOC downloads."
         ])
    ]

    m_w = Inches(5.65)
    m_h = Inches(2.15)
    positions = [
        (Inches(0.8), Inches(2.0)),
        (Inches(6.8), Inches(2.0)),
        (Inches(0.8), Inches(4.45)),
        (Inches(6.8), Inches(4.45))
    ]

    for (m_title, m_color, m_bullets), (left, top) in zip(modules, positions):
        add_card(slide5, left, top, m_w, m_h, m_title, border_color=m_color)

        tb = slide5.shapes.add_textbox(left + Inches(0.2), top + Inches(0.15), m_w - Inches(0.4), m_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = m_title
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = m_color
        pt.font.name = "Segoe UI"

        for b in m_bullets:
            pb = tf.add_paragraph()
            pb.text = f"• {b}"
            pb.font.size = Pt(10.5)
            pb.font.color.rgb = TEXT_WHITE
            pb.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 6: Explainable Threat Engine & Detection Heuristics
    # =========================================================================
    slide6 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide6)
    add_header(slide6, "Threat Heuristics", "50+ Deterministic Detection Rules",
               "Granular rules targeting modern phishing kits, evasion tricks, and infrastructure abuse.")

    rules = [
        ("Brand Impersonation & Typosquatting",
         RED_ACCENT,
         "Rules: BRAND-001, TYPO-001",
         "Detects unauthorized Microsoft, Google, PayPal, Apple, Amazon, and Banking logins. Computes Levenshtein distances and Punycode (xn--) homoglyphs."),
        ("Modern Social Engineering & ClickFix",
         AMBER_ACCENT,
         "Rules: CLICKFIX-001, OAUTH-001",
         "Flags fake CAPTCHAs and update prompts tricking victims to paste PowerShell scripts into Windows Run dialogs. Audits OAuth device code grants."),
        ("Cloud-Hosted Phishing & SaaS Abuse",
         PURPLE_ACCENT,
         "Rules: PHISH-005, EXFIL-001",
         "Detects credential harvesting forms hosted on trusted developer platforms (Firebase, Vercel, Netlify). Intercepts forms routing to Telegram & Discord bots."),
        ("Egress SSRF & Cloud Metadata Hard-Stop",
         CYAN_ACCENT,
         "Rules: SSRF-001, SSRF-002",
         "Egress firewall intercepts attempts to probe RFC 1918 internal subnets or Cloud Instance Metadata (169.254.169.254). Triggers instant Score: 100.")
    ]

    r_w = Inches(5.65)
    r_h = Inches(1.85)
    r_pos = [
        (Inches(0.8), Inches(2.0)),
        (Inches(6.8), Inches(2.0)),
        (Inches(0.8), Inches(4.1)),
        (Inches(6.8), Inches(4.1))
    ]

    for (r_title, r_color, r_code, r_desc), (left, top) in zip(rules, r_pos):
        add_card(slide6, left, top, r_w, r_h, r_title, border_color=r_color)
        tb = slide6.shapes.add_textbox(left + Inches(0.2), top + Inches(0.12), r_w - Inches(0.4), r_h - Inches(0.25))
        tf = tb.text_frame
        tf.word_wrap = True
        pt = tf.paragraphs[0]
        pt.text = r_title
        pt.font.size = Pt(14)
        pt.font.bold = True
        pt.font.color.rgb = TEXT_WHITE
        pt.font.name = "Segoe UI"

        pc = tf.add_paragraph()
        pc.text = r_code
        pc.font.size = Pt(10)
        pc.font.bold = True
        pc.font.color.rgb = r_color
        pc.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = r_desc
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = TEXT_GRAY
        pd.font.name = "Segoe UI"

    # Verdict Spectrum Scale
    v_box = slide6.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(6.15), Inches(11.6), Inches(0.65))
    v_box.fill.solid()
    v_box.fill.fore_color.rgb = RGBColor(16, 26, 48)
    v_box.line.color.rgb = CARD_BORDER
    v_box.line.width = Pt(1)

    tf_v = v_box.text_frame
    p_v = tf_v.paragraphs[0]
    p_v.text = "VERDICT SCALE:  🟢 SAFE (0–20)   |   🟡 SUSPICIOUS (21–59)   |   🟠 HIGH_RISK (60–89)   |   🔴 MALICIOUS (90–100)"
    p_v.font.size = Pt(11)
    p_v.font.bold = True
    p_v.font.color.rgb = TEXT_WHITE
    p_v.alignment = PP_ALIGN.CENTER
    p_v.font.name = "Segoe UI"

    # =========================================================================
    # SLIDE 7: Enterprise Integration, Impact & Value Delivered
    # =========================================================================
    slide7 = prs.slides.add_slide(blank_layout)
    add_slide_background(slide7)
    add_header(slide7, "Enterprise Value", "Business Impact & Deployment Topology",
               "Seamless integration into modern enterprise security stacks with zero user friction.")

    # 3 High Impact Metric Cards
    metrics = [
        ("0%", "Endpoint Attack Surface", "Drive-by malware downloads, memory corruptions, and malicious scripts are executed exclusively inside disposable cloud containers.", EMERALD),
        ("<5s", "Average Detonation Time", "Near-instant verdicts using SHA-256 idempotency cache; sub-5-second full dynamic browser execution for newly observed links.", CYAN_ACCENT),
        ("100%", "Deterministic Forensic Proof", "No black-box ML hallucinations. Every verdict is backed by captured screenshots, DOM structures, SSL chains, and HTTP headers.", PURPLE_ACCENT)
    ]

    m_card_w = Inches(3.64)
    m_card_h = Inches(1.9)
    for i, (val, title, desc, col) in enumerate(metrics):
        m_left = Inches(0.8 + i * 4.0)
        add_card(slide7, m_left, Inches(2.0), m_card_w, m_card_h, title, border_color=col)
        tb = slide7.shapes.add_textbox(m_left + Inches(0.2), Inches(2.1), m_card_w - Inches(0.4), m_card_h - Inches(0.2))
        tf = tb.text_frame
        tf.word_wrap = True

        pv = tf.paragraphs[0]
        pv.text = val
        pv.font.size = Pt(32)
        pv.font.bold = True
        pv.font.color.rgb = col
        pv.font.name = "Segoe UI"

        pt = tf.add_paragraph()
        pt.text = title
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = TEXT_WHITE
        pt.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = desc
        pd.font.size = Pt(10)
        pd.font.color.rgb = TEXT_GRAY
        pd.font.name = "Segoe UI"

    # 3 Integration Channels (Bottom Row)
    integrations = [
        ("Email Security Gateways (SEGs)",
         "Native integration with Proofpoint, Mimecast, Microsoft Defender 365, or Postfix. Inspects inbound links and rewrites or quarantines malicious messages automatically.",
         CYAN_ACCENT),
        ("SIEM / SOAR & Threat Feeds",
         "Automated dispatch of HMAC-SHA256 signed webhooks. 1-click export of STIX 2.1 IOC bundles into Splunk, Microsoft Sentinel, Cortex XSOAR, and MISP.",
         AMBER_ACCENT),
        ("Turnkey Production Deployment",
         "1-Click developer runner ('python main.py') launching backend, worker, and frontend concurrently. Production-ready multi-container Docker Compose topology.",
         EMERALD)
    ]

    i_card_w = Inches(3.64)
    i_card_h = Inches(2.2)
    for i, (i_title, i_desc, i_col) in enumerate(integrations):
        i_left = Inches(0.8 + i * 4.0)
        add_card(slide7, i_left, Inches(4.2), i_card_w, i_card_h, i_title, border_color=CARD_BORDER)
        tb = slide7.shapes.add_textbox(i_left + Inches(0.2), Inches(4.3), i_card_w - Inches(0.4), i_card_h - Inches(0.3))
        tf = tb.text_frame
        tf.word_wrap = True

        pt = tf.paragraphs[0]
        pt.text = f"🔌 {i_title}"
        pt.font.size = Pt(13)
        pt.font.bold = True
        pt.font.color.rgb = i_col
        pt.font.name = "Segoe UI"

        pd = tf.add_paragraph()
        pd.text = "\n" + i_desc
        pd.font.size = Pt(10.5)
        pd.font.color.rgb = TEXT_WHITE
        pd.font.name = "Segoe UI"

    # Save presentation
    prs.save(output_path)
    print(f"Presentation saved successfully to {output_path}")

if __name__ == "__main__":
    out = "BrowseGuard_Project_Presentation.pptx"
    if len(sys.argv) > 1:
        out = sys.argv[1]
    create_presentation(out)
