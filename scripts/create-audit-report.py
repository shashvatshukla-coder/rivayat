from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether

OUT = "output/pdf/RIVAYAT_Security_Performance_Audit_2026-10-11.pdf"
NAVY = colors.HexColor("#172333")
GOLD = colors.HexColor("#C9912E")
CREAM = colors.HexColor("#F7F2E8")
GREEN = colors.HexColor("#1D7A55")
RED = colors.HexColor("#A33A37")
GREY = colors.HexColor("#5B6571")
LIGHT = colors.HexColor("#E6E9ED")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverBrand", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=32, leading=36, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=18, textColor=GREY, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="H1x", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=20, leading=24, textColor=NAVY, spaceAfter=10))
styles.add(ParagraphStyle(name="H2x", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=NAVY, spaceBefore=8, spaceAfter=5))
styles.add(ParagraphStyle(name="Bodyx", parent=styles["BodyText"], fontName="Helvetica", fontSize=8.7, leading=12.2, textColor=colors.HexColor("#26313D"), spaceAfter=5))
styles.add(ParagraphStyle(name="Smallx", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.3, leading=9.4, textColor=GREY))
styles.add(ParagraphStyle(name="Cell", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.2, leading=9.1, textColor=colors.HexColor("#26313D")))
styles.add(ParagraphStyle(name="CellBold", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.2, leading=9.1, textColor=NAVY))
styles.add(ParagraphStyle(name="Status", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7, leading=9, textColor=GREEN))

def P(text, style="Bodyx"):
    return Paragraph(text, styles[style])

def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LIGHT)
    canvas.line(18*mm, 14*mm, 192*mm, 14*mm)
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(GREY)
    canvas.drawString(18*mm, 9*mm, "RIVAYAT controlled security & performance assessment · 11 October 2026")
    canvas.drawRightString(192*mm, 9*mm, f"Page {doc.page}")
    canvas.restoreState()

def table(rows, widths, header=True, font=7.2):
    converted = []
    for r, row in enumerate(rows):
        converted.append([P(str(v), "CellBold" if header and r == 0 else "Cell") for v in row])
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("VALIGN", (0,0), (-1,-1), "TOP"),
        ("LEFTPADDING", (0,0), (-1,-1), 5), ("RIGHTPADDING", (0,0), (-1,-1), 5),
        ("TOPPADDING", (0,0), (-1,-1), 4), ("BOTTOMPADDING", (0,0), (-1,-1), 4),
        ("GRID", (0,0), (-1,-1), .35, LIGHT),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#FAFAF8")]),
    ]
    if header:
        cmds += [("BACKGROUND", (0,0), (-1,0), NAVY), ("TEXTCOLOR", (0,0), (-1,0), colors.white)]
    t.setStyle(TableStyle(cmds))
    return t

doc = SimpleDocTemplate(OUT, pagesize=A4, rightMargin=18*mm, leftMargin=18*mm, topMargin=18*mm, bottomMargin=19*mm, title="RIVAYAT Security & Performance Audit", author="RIVAYAT engineering review")
story = []

story += [Spacer(1, 35*mm), P("RIVAYAT®", "CoverBrand"), P("Security, performance and launch-readiness audit", "CoverSub"), Spacer(1, 8*mm)]
summary = Table([
    [P("Assessment date", "CellBold"), P("11 October 2026", "Cell")],
    [P("Target", "CellBold"), P("www.rivayat.shop storefront and rivayat.onrender.com API", "Cell")],
    [P("Method", "CellBold"), P("Source review, automated functional tests, controlled non-destructive security checks, dependency audit and performance measurement", "Cell")],
    [P("Outcome", "CellBold"), P("No critical dependency or access-control issue found in the tested scope. Five material weaknesses were corrected; three architectural/deployment items remain for follow-up.", "Cell")],
], colWidths=[42*mm, 112*mm])
summary.setStyle(TableStyle([("BACKGROUND",(0,0),(-1,-1),CREAM),("BOX",(0,0),(-1,-1),.8,GOLD),("INNERGRID",(0,0),(-1,-1),.3,colors.HexColor("#DDD2BB")),("VALIGN",(0,0),(-1,-1),"TOP"),("LEFTPADDING",(0,0),(-1,-1),8),("RIGHTPADDING",(0,0),(-1,-1),8),("TOPPADDING",(0,0),(-1,-1),7),("BOTTOMPADDING",(0,0),(-1,-1),7)]))
story += [summary, Spacer(1, 10*mm), P("Important scope note", "H2x"), P("This was an authorized, controlled assessment of the owner’s application. It deliberately excluded denial-of-service activity, credential attacks, social engineering, destructive writes, access to real customer records and attempts to bypass hosting-provider controls. A passing result is not a guarantee that future vulnerabilities do not exist."), PageBreak()]

story += [P("1. Executive result", "H1x")]
story += [table([
    ["Area", "Result", "Evidence"],
    ["Forgot password", "FIXED", "Hidden reset controls are disabled until code request succeeds; browser validation can no longer block the email step."],
    ["Password policy", "VERIFIED", "8–15 characters with at least one number and one symbol, enforced in client and server tests."],
    ["Performance", "IMPROVED", "Asset directory reduced from 40,485,633 bytes to 9,463,097 bytes (76.6% smaller). Product images total 3,434,378 bytes."],
    ["Security", "HARDENED", "CSP, clickjacking, MIME, referrer and permissions headers; CORS allowlist; request limits; input validation; protected-route checks."],
    ["Forms & email", "CONNECTED", "Contact form now calls the API, sends internal/confirmation mail when configured, and reports success/errors. Newsletter unsubscribe retained."],
    ["SEO/readiness", "COMPLETED", "Direct-route rewrites, sitemap/robots updates, FAQ, metadata, structured content and public-page coverage."],
    ["Automated verification", "PASS", "Catalogue, syntax, SVG navigation, auth policy, recovery flow, performance budgets, public assets and security regression tests all pass."],
], [35*mm, 25*mm, 104*mm])]
story += [Spacer(1, 6*mm), P("Measured performance", "H2x"), table([
    ["Metric", "Before", "After", "Change"],
    ["Asset directory", "40.49 MB", "9.46 MB", "−76.6%"],
    ["Product catalogue images", "Large PNG set", "3.43 MB WebP", "32/32 optimized"],
    ["Largest product image", ">2 MB observed", "246,816 bytes", "Within 300 KB budget"],
    ["Service-worker install", "Heroes/categories/logos precached", "Lean app shell only", "Large visual assets deferred"],
    ["Theme hero", "Light and dark elements present", "One active image element", "Avoids duplicate hero download"],
], [49*mm, 36*mm, 37*mm, 42*mm]), PageBreak()]

feature_rows = [
    ["Checklist item", "Status", "Implementation / evidence"],
    ["Dark-mode toggle", "Complete", "Theme-aware SVG navigation and active hero switching."],
    ["Cookie banner", "Complete", "Essential-only or consent-based analytics choice."],
    ["Search", "Complete", "Desktop/mobile search interface and API fallback."],
    ["Back to top", "Complete", "Floating control appears after scrolling."],
    ["Mobile menu", "Complete", "Drawer plus bottom navigation."],
    ["Loading animation", "Complete", "Startup shell and action states."],
    ["Hover effects", "Complete", "Cards, links and controls include interaction states."],
    ["Scroll progress", "Complete", "Top progress indicator bound to page scroll."],
    ["Copy action", "Complete", "Referral copy control retained."],
    ["Print CSS", "Complete", "Navigation, overlays and non-document controls hidden on print."],
    ["Sticky header", "Complete", "Persistent navigation header."],
    ["Skip to content", "Complete", "Keyboard-accessible skip link focuses main content."],
    ["Password visibility", "Complete", "Show/hide controls for login, signup and reset."],
    ["UTM tracking", "Complete", "Source/medium/campaign captured; event sent only with consent."],
    ["Success/error states", "Complete", "Auth, contact and other actions expose status messages."],
    ["Confirmation dialogs", "Complete", "Destructive account/order actions retain confirmation."],
    ["Last updated", "Complete", "Policy/help content dated 11 October 2026."],
    ["Expandable FAQ", "Complete", "Seven disclosure-based answers on /faq."],
    ["Floating contact", "Complete", "WhatsApp action available across pages."],
]
story += [P("2. Requested feature checklist", "H1x"), table(feature_rows, [43*mm, 23*mm, 98*mm]), PageBreak()]

launch_rows = [
    ["Launch item", "Status", "Evidence / limitation"],
    ["Privacy and terms", "Complete", "Linked legal pages and legal centre."],
    ["Secrets off frontend", "Verified", "No server secret is intentionally shipped in client code; environment files were not printed."],
    ["HTTPS", "Live", "Production domains use HTTPS/HSTS; deployment header checks must be repeated after release."],
    ["Cookie consent", "Complete", "Analytics remains off until explicit consent."],
    ["Meta and Open Graph", "Complete", "Canonical, OG, Twitter and route-specific metadata."],
    ["Favicon / PWA", "Complete", "Favicon, manifest and app icons."],
    ["Sitemap / robots", "Complete", "FAQ added; private/account/API paths remain blocked from indexing."],
    ["Image alternatives", "Verified", "Published storefront image references include alt text."],
    ["Compressed images", "Complete", "Catalogue/category/brand raster assets converted to WebP."],
    ["Speed", "Improved", "Performance budgets and lean service-worker precache added."],
    ["Contrast / themes", "Reviewed", "Explicit light/dark variables and theme-aware icons; retain periodic assistive testing."],
    ["Mobile", "Covered", "Responsive navigation, cookie layout and floating controls."],
    ["Custom 404", "Complete", "SPA not-found state with recovery links."],
    ["Broken internal assets", "Verified", "Tests resolve referenced assets and exercise public routes."],
    ["Form validation", "Complete", "HTML constraints plus server-side validation."],
    ["Spam protection", "Improved", "Honeypots and endpoint-specific rate limits."],
    ["Analytics", "Complete", "First-party event storage with anonymous HMAC session hash and 180-day TTL."],
    ["Calls to action", "Complete", "Shop, help, contact, work-with-us and account actions remain visible."],
]
story += [P("3. Pre-launch checklist", "H1x"), table(launch_rows, [42*mm, 24*mm, 98*mm]), PageBreak()]

story += [P("4. Functional verification", "H1x"), P("The release command regenerated search and merchant outputs, parsed the server and all inline browser JavaScript, and ran the regression suite. The following flows were checked without using real customer records."), table([
    ["Function group", "Verification", "Result"],
    ["Catalogue", "32 unique products; unique IDs/slugs/images; stock and pricing constraints", "Pass"],
    ["Search feeds", "32 Algolia records regenerated", "Pass"],
    ["Merchant feed", "160 product-size records regenerated", "Pass"],
    ["Authentication", "Login/signup/recovery API contracts; invalid-token boundary", "Pass"],
    ["Forgot password", "Initial hidden controls, transition to code/password step, password constraints", "Pass"],
    ["Public routing", "Home, policy, ownership, style, hero and static assets", "Pass"],
    ["Theme/navigation", "SVG-only navigation shell; light/dark icon behavior", "Pass"],
    ["Contact/newsletter", "Real API contract, bot trap, unsubscribe endpoints", "Pass"],
    ["Orders/returns/reviews", "Client/server route families and existing contract coverage", "Pass by source/route audit"],
    ["Deployment", "Vercel rewrites and security headers configured", "Pending production rollout"],
    ["Email delivery", "Professional branded templates and recipients are implemented", "Requires valid Resend/domain configuration"],
], [43*mm, 92*mm, 29*mm])]
story += [Spacer(1, 6*mm), P("Test command", "H2x"), P("<font name='Courier'>npm run check</font> — passed in full. <font name='Courier'>npm audit --omit=dev</font> — 0 known vulnerabilities across info, low, moderate, high and critical severities."), PageBreak()]

findings = [
    ["ID / severity", "Finding", "Status / remediation"],
    ["F-01 · High", "Large PNG catalogue and heavy service-worker precache caused excessive transfer and install work.", "Fixed: WebP conversion, 76.6% asset reduction, performance budgets, lean precache."],
    ["F-02 · Medium", "Hidden required reset-password fields blocked the first recovery submission with ‘not focusable’ browser errors.", "Fixed: fields start disabled and become enabled/required only after a successful code request."],
    ["F-03 · Medium", "Static frontend lacked a complete deployment-level security-header policy.", "Fixed: Vercel CSP, frame denial, MIME protection, referrer and permissions policies."],
    ["F-04 · Medium", "All API routes accepted request bodies up to 16 MB, increasing resource-exhaustion exposure.", "Fixed: ordinary routes limited to 1 MB; only image-based Style recommendation retains 16 MB."],
    ["F-05 · Medium", "Contact was cosmetic and some public forms lacked a bot trap.", "Fixed: API-backed contact mail, honeypots and endpoint-specific limits."],
    ["F-06 · Medium · residual", "Custom bearer tokens are stored in localStorage while the current CSP permits inline script for the single-file SPA.", "Recommended: complete Clerk or another mature auth migration with secure cookie/session design and remove unsafe-inline through script extraction/nonces."],
    ["F-07 · Low/Medium · residual", "Rate-limit counters are process-local and reset on restart or scale-out.", "Recommended: use a shared Redis/Upstash limiter for production-wide enforcement."],
    ["F-08 · Operational · residual", "At baseline, the Render health response did not expose the new build version, indicating the API deployment was behind source.", "Required after commit: wait for/restart Render deployment, then confirm health version and recovery/email flow."],
]
story += [P("5. Controlled security assessment", "H1x"), P("The assessment attempted safe attack classes against the local application boundary: hostile Origin/CORS, invalid bearer tokens, encoded path traversal, malformed password-recovery input, oversized payloads, header inspection and dependency-vulnerability discovery. It did not attempt brute force, account takeover, destructive writes or access to private data."), table(findings, [31*mm, 68*mm, 65*mm]), PageBreak()]

story += [P("6. Security test record", "H1x"), table([
    ["Test", "Expected control", "Observed"],
    ["Hostile Origin", "Reject; no Access-Control-Allow-Origin", "403; no allow-origin header; pass"],
    ["Invalid admin bearer", "No protected data", "403; pass"],
    ["Encoded traversal", "Do not expose server.js or secrets", "Non-200; no source markers; pass"],
    ["Malformed recovery email", "Reject before database lookup", "400; pass"],
    ["Oversized ordinary JSON", "Limit request", "413 with generic response; pass"],
    ["Security headers", "CSP, DENY framing, nosniff", "Present in local API and configured for Vercel; pass"],
    ["Dependency audit", "No known production advisories", "0 vulnerabilities; pass"],
    ["Error leakage", "No stack/file paths in tested failures", "No leakage observed; pass"],
], [54*mm, 68*mm, 42*mm])]
story += [Spacer(1, 7*mm), P("Deployment acceptance steps", "H2x"), P("1. Confirm Vercel serves the new CSP and direct /forgot-password and /faq routes. 2. Confirm Render /health reports build <font name='Courier'>2026-10-11-performance-security-v1</font>. 3. Request exactly one reset code for an owned test email and complete the browser flow. 4. Submit one owned contact test and verify internal recipients plus customer confirmation. 5. Check consent choices and one analytics page-view record. 6. Monitor error and rate-limit telemetry after launch."), Spacer(1, 6*mm), P("Conclusion", "H2x"), P("The release is materially faster and safer than the audited baseline. The reported browser-breaking recovery bug is corrected, launch checklist gaps are filled, and the automated suite prevents the same regressions. Production acceptance still depends on successful Vercel/Render rollout and correctly configured email, database and third-party credentials."), Spacer(1, 10*mm), P("Prepared for RIVAYAT / Shukla Group of Companies", "Smallx")]

doc.build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
