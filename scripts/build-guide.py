from pathlib import Path
from xml.sax.saxutils import escape
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageTemplate, Paragraph, Spacer, Table, TableStyle,
    PageBreak, Image, KeepTogether, HRFlowable
)

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "output" / "pdf" / "RIVAYAT-Final-Site-Guide.pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)

INK = colors.HexColor("#111111")
MUTED = colors.HexColor("#686159")
CREAM = colors.HexColor("#F7F2E9")
IVORY = colors.HexColor("#FFFAF1")
GOLD = colors.HexColor("#B9945D")
GREEN = colors.HexColor("#17643B")
RED = colors.HexColor("#9B1C1C")
LIGHT_LINE = colors.HexColor("#DDD3C5")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverEyebrow", parent=styles["Normal"], fontName="Helvetica-Bold", fontSize=9, leading=12, textColor=GOLD, tracking=1.5, alignment=TA_CENTER, spaceAfter=9))
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=29, leading=33, textColor=INK, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=18, textColor=MUTED, alignment=TA_CENTER, spaceAfter=20))
styles.add(ParagraphStyle(name="H1R", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=21, leading=25, textColor=INK, spaceBefore=0, spaceAfter=11))
styles.add(ParagraphStyle(name="H2R", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=13, leading=17, textColor=INK, spaceBefore=10, spaceAfter=6))
styles.add(ParagraphStyle(name="BodyR", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13.7, textColor=INK, spaceAfter=7, splitLongWords=True))
styles.add(ParagraphStyle(name="SmallR", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.6, leading=10.5, textColor=MUTED, spaceAfter=4, splitLongWords=True))
styles.add(ParagraphStyle(name="BulletR", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=13.2, leftIndent=12, firstLineIndent=-8, textColor=INK, spaceAfter=4))
styles.add(ParagraphStyle(name="CalloutR", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=9.4, leading=14, textColor=INK, backColor=CREAM, borderColor=GOLD, borderWidth=0.8, borderPadding=9, spaceBefore=5, spaceAfter=10))
styles.add(ParagraphStyle(name="TableHeadR", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.4, leading=9, textColor=colors.white))
styles.add(ParagraphStyle(name="TableR", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.3, leading=9.6, textColor=INK, splitLongWords=True))
styles.add(ParagraphStyle(name="TableBoldR", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=7.3, leading=9.6, textColor=INK, splitLongWords=True))
styles.add(ParagraphStyle(name="URLR", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.1, leading=9.4, textColor=colors.HexColor("#315E8A"), splitLongWords=True))


def p(text, style="BodyR"):
    return Paragraph(text, styles[style])


def bullet(text):
    return p(f"- {text}", "BulletR")


def section(title, subtitle=None):
    items = [Paragraph(title, styles["H1R"]), HRFlowable(width="100%", thickness=1, color=GOLD, spaceAfter=10)]
    if subtitle:
        items.append(p(subtitle, "BodyR"))
    return items


def table(headers, rows, widths, font_size=7.3):
    head = [p(escape(str(value)), "TableHeadR") for value in headers]
    body = [[p(escape(str(value)), "TableR") for value in row] for row in rows]
    result = Table([head] + body, colWidths=widths, repeatRows=1, hAlign="LEFT", splitByRow=True)
    result.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), INK),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, LIGHT_LINE),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, IVORY]),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return result


class GuideDoc(BaseDocTemplate):
    pass


def decorate_page(canvas, doc):
    canvas.saveState()
    page = canvas.getPageNumber()
    if page > 1:
        canvas.setFillColor(INK)
        canvas.rect(0, A4[1] - 16 * mm, A4[0], 16 * mm, fill=1, stroke=0)
        canvas.setFillColor(colors.white)
        canvas.setFont("Helvetica-Bold", 8)
        canvas.drawString(18 * mm, A4[1] - 10.3 * mm, "RIVAYAT FINAL SITE GUIDE")
        canvas.setFillColor(GOLD)
        canvas.drawRightString(A4[0] - 18 * mm, A4[1] - 10.3 * mm, "OWN YOUR VIBE")
    canvas.setStrokeColor(LIGHT_LINE)
    canvas.line(18 * mm, 14 * mm, A4[0] - 18 * mm, 14 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7)
    canvas.drawString(18 * mm, 9.4 * mm, "Release package 2026-08-24 | Canonical host: www.rivayat.shop")
    canvas.drawRightString(A4[0] - 18 * mm, 9.4 * mm, f"Page {page}")
    canvas.restoreState()


doc = GuideDoc(
    str(OUTPUT), pagesize=A4,
    leftMargin=18 * mm, rightMargin=18 * mm,
    topMargin=23 * mm, bottomMargin=19 * mm,
    title="RIVAYAT Final Site - Feature, Deployment and SEO Guide",
    author="RIVAYAT Fashion"
)
frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="main")
doc.addPageTemplates(PageTemplate(id="guide", frames=[frame], onPage=decorate_page))

story = []
story.append(Spacer(1, 10 * mm))
logo = ROOT / "assets" / "branding" / "rivayat-logo.png"
story.append(Image(str(logo), width=42 * mm, height=42 * mm, hAlign="CENTER"))
story.append(Spacer(1, 5 * mm))
story.append(p("PRODUCTION HANDOFF", "CoverEyebrow"))
story.append(p("RIVAYAT Final Site", "CoverTitle"))
story.append(p("Feature, deployment, security, SEO and owner sign-off guide", "CoverSub"))

cover_table = Table([
    [p("32", "CoverTitle"), p("100%", "CoverTitle"), p("41", "CoverTitle")],
    [p("unique supplied products", "SmallR"), p("original product files retained", "SmallR"), p("canonical sitemap URLs", "SmallR")],
], colWidths=[55 * mm, 55 * mm, 55 * mm], hAlign="CENTER")
cover_table.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, -1), CREAM),
    ("BOX", (0, 0), (-1, -1), 0.8, GOLD),
    ("INNERGRID", (0, 0), (-1, -1), 0.35, LIGHT_LINE),
    ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
    ("ALIGN", (0, 0), (-1, -1), "CENTER"),
    ("TOPPADDING", (0, 0), (-1, 0), 12),
    ("BOTTOMPADDING", (0, 1), (-1, 1), 10),
]))
story.append(cover_table)
story.append(Spacer(1, 9 * mm))
story.append(p("STATUS: CODE-COMPLETE PACKAGE - OWNER DATA AND LIVE DEPLOYMENT STILL REQUIRED", "CalloutR"))
story.append(p("This package uses the corrected uploaded server baseline, preserves the old API behavior, and adds production controls without retaining hardcoded credentials. The live database is not modified until this package is deployed with the documented Render environment variables.", "BodyR"))
story.append(Spacer(1, 16 * mm))
story.append(p("Prepared for RIVAYAT Fashion | India | 24 August 2026", "CoverSub"))
story.append(PageBreak())

story += section("1. Executive handoff", "What is finished, what is intentionally not claimed, and what the owner must confirm before launch.")
story.append(p("The storefront package is ready for controlled deployment. It replaces the earlier placeholder catalogue with the 32 unique supplied product photographs, adds a mobile-first Myntra-inspired account and shopping structure, and extends the admin area for team profiles, bugs, reviews, coupons and operations."))
story.append(p("Important integrity decision", "H2R"))
story.append(p("No fake customer reviews are published. Fabricated testimonials can mislead shoppers, undermine trust, and create consumer-protection risk. New products show an honest 'Be the first to review' state. Only signed-in submissions can enter moderation, and delivered-order reviews receive a verified-purchase flag."))
story.append(p("Owner confirmations required before public launch", "H2R"))
for item in [
    "Confirm selling price, MRP, available sizes and opening stock for all 32 products. Current values are clearly marked as draft launch data in catalog.js.",
    "Provide legal business name, complete invoice/return address, and GSTIN if the business is registered for GST.",
    "Confirm image and trademark rights for every supplied photograph, including any club, team, sponsor or player marks visible in independent fanwear.",
    "Confirm the four team names and roles, then provide approved bios, links and original-resolution profile photographs.",
    "Provide a verified Resend domain/sender, Google OAuth client ID, Algolia keys/index, Search Console token, and the final Render service origin.",
    "Rotate the database credential, administrator password and any API key ever embedded in or shared with the older server copy. Do not reuse exposed values."
]:
    story.append(bullet(item))
story.append(p("Catalog replacement safety", "H2R"))
story.append(p("On the first deploy, CATALOG_SYNC_MODE=replace creates one ProductBackup document per old product, then replaces the live product collection only when CATALOG_VERSION changes. If insertion fails, the server restores the previous catalogue. After successful verification, switch the mode to seed-empty."))
story.append(PageBreak())

story += section("2. Customer storefront functions")
customer_rows = [
    ["Catalog", "32 unique supplied products across cricket jerseys, football jerseys, T-shirts, shorts, women, overshirts and jackets. Filters, sorting, stock and direct product pages are supported."],
    ["Mobile UI", "Responsive navigation, horizontal product rails, touch-sized controls, compact cards, smooth scrolling, reduced-motion support, and no horizontal overflow by design."],
    ["Account hub", "Myntra-style Profile, Orders, Addresses, Wishlist, Returns and RIVAYAT Credits sections. Users can upload or remove a profile photo and manage multiple addresses."],
    ["Authentication", "Email signup OTP, email/username login, optional Google login, and a repaired two-step forgot-password flow using a 4-digit code with expiry, throttling and attempt limits."],
    ["Address lookup", "A 6-digit PIN code calls the India Post-compatible lookup endpoint and auto-fills city, district and state. Delivery price is still computed server-side."],
    ["Coupons", "Customers can enter a coupon or referral code. Rules are validated against live subtotal, expiry, minimum cart and active status on the server."],
    ["Checkout", "Cash on Delivery, stock reservation, delivery-zone quote, coupon/referral discount, optional loyalty redemption and email/Telegram notifications."],
    ["Orders", "Private order history, visual status timeline, eligible cancellation, return/exchange requests, WhatsApp support link and invoice download."],
    ["Invoices", "Authenticated customers and admins receive a server-generated PDF. Guest orders retain a browser print-to-PDF fallback."],
    ["Reviews", "Interactive 1-to-5 star control, optional photo, one review per product/account, admin moderation, verified-purchase detection and real aggregate rating updates."],
    ["Resilience", "Installable web app manifest, service-worker shell/image cache, dedicated no-network overlay, 404 page, recoverable error screen and user problem reporter."],
    ["Sharing", "Full-resolution Open Graph/Twitter logo, product-specific server-rendered metadata, stable canonical URLs, square favicon and device-specific application icons."],
]
story.append(table(["Area", "Production behavior"], customer_rows, [40 * mm, 125 * mm]))
story.append(Spacer(1, 4 * mm))
story.append(p("Extra functions retained or strengthened: wishlist, recently viewed products, dark mode, newsletter, referrals, WhatsApp support, stock-aware ordering, return-window rules, security headers and operational notifications."))
story.append(PageBreak())

story += section("3. Admin and operations functions")
admin_rows = [
    ["Dashboard", "Revenue, active order value, order states, product count, low stock, customer count, pending returns, open/critical bugs and outstanding credits."],
    ["Products", "Create/update/delete items, sizes, per-size stock, gallery, variants, price/MRP, description, badge, colour and status. Algolia sync runs server-side."],
    ["Orders", "Search/filter orders, change valid status, trigger delivery loyalty, restock cancellations and export operational data."],
    ["Returns", "Approve, reject or resolve return/exchange requests. Customer eligibility respects delivery status and the configured return window."],
    ["Coupons", "Create fixed or percentage discounts, minimum cart, expiry, active state and deletion."],
    ["Reviews", "Approve, hold or delete text/photo reviews. Product rating and count are recalculated only from approved records."],
    ["Team", "Edit Founder, Manager, Business Head, Marketing Head or additional profiles, including original upload, bio, role and verified HTTPS links."],
    ["Bug Centre", "View customer reports, screenshots, automatic browser errors and automatic server errors in one list. Deduplication counts repeated runtime faults; admins move reports through Open, Investigating, Resolved or Ignored."],
    ["Homepage", "Change hero copy, offer, buttons and image without editing source files."],
    ["Search", "Reindex all active products into Algolia from an authenticated server endpoint. Search falls back to escaped MongoDB matching when Algolia is absent or unavailable."],
]
story.append(table(["Admin area", "What it controls"], admin_rows, [39 * mm, 126 * mm]))
story.append(p("Admin access is token-based and role-gated. Seed credentials come from Render only; the password should be removed from Render after the first admin record is created."))

story.append(p("Bug privacy boundary", "H2R"))
story.append(p("The automatic reporter stores error message, route, browser user agent and occurrence count. It does not copy checkout or password request bodies. Customer screenshots are limited to supported image formats and 5 MB."))
story.append(PageBreak())

story += section("4. Loyalty, orders and invoice logic")
story.append(p("RIVAYAT Credits use a simple INR-equivalent ledger so every change is explainable. One credit equals INR 1. The default earning rate is 2 percent of eligible merchandise value after product discounts and redeemed credits. Credits are awarded once, only when an admin marks the order Delivered."))
loyalty_rows = [
    ["Redeem", "Signed-in user only; atomic balance check; default cap is 20 percent of merchandise value after coupon/referral discount."],
    ["Reserve", "Stock is atomically reduced per size. If credit reservation or order creation fails, reserved stock and credits are rolled back."],
    ["Earn", "Delivered status awards floor(eligible value x configured percentage), once per order, with an Earned ledger entry."],
    ["Cancel", "Pending/Confirmed customers may cancel. Inventory is restocked once and redeemed credits are refunded once. Delivered orders must use returns."],
    ["Audit", "CreditTransaction records Earned, Redeemed, Refunded or Adjusted values with account, email, order and timestamp."],
]
story.append(table(["Event", "Rule"], loyalty_rows, [35 * mm, 130 * mm]))
story.append(p("Invoice contents", "H2R"))
for item in [
    "Seller and support details from environment variables; GSTIN is shown only when configured.",
    "Order ID/date/status, customer and shipping address, product, size, quantity, rate and line amount.",
    "Subtotal, coupon/referral discount, credits redeemed, delivery and final total.",
    "Payment method/status and loyalty earned after delivery.",
    "A clear note that the document is not a GST tax invoice unless a GSTIN is displayed."
]:
    story.append(bullet(item))
story.append(PageBreak())

story += section("5. Render environment variables", "Add these in Render Dashboard -> Service -> Environment. Never commit real secrets to Git.")
required_rows = [
    ["NODE_ENV", "production", "Enables production-safe OTP behavior."],
    ["MONGO_URI", "Secret MongoDB URI", "Required database connection. Rotate the credential from the old file first."],
    ["APP_SECRET", "32+ random characters", "Signs account tokens and OTP hashes. Use a new high-entropy secret."],
    ["BASE_URL", "https://www.rivayat.shop", "Canonical URL used in metadata, products and redirects."],
    ["ALLOWED_ORIGINS", "Apex, www, Render service", "Comma-separated browser origins allowed by CORS."],
    ["CATALOG_SYNC_MODE", "replace first; then seed-empty", "Backs up and replaces the old catalogue once per version."],
    ["CATALOG_VERSION", "2026-08-24-supplied-assets-v1", "Version gate that prevents repeated replacement."],
    ["ADMIN_EMAIL", "Owner email", "Seeds or promotes the administrator."],
    ["ADMIN_PASSWORD", "12+ unique characters", "First seed only; remove after successful admin login."],
    ["RESEND_API_KEY", "Secret re_ key", "Required for signup and forgot-password OTP delivery."],
    ["EMAIL_FROM", "RIVAYAT <orders@rivayat.shop>", "Must belong to a verified Resend domain."],
]
story.append(table(["Variable", "Recommended value", "Purpose"], required_rows, [42 * mm, 52 * mm, 71 * mm]))
story.append(Spacer(1, 5 * mm))
optional_rows = [
    ["GOOGLE_CLIENT_ID", "Google OAuth web client; authorize both apex/www origins and callback use."],
    ["ALGOLIA_APP_ID", "Algolia application ID."],
    ["ALGOLIA_SEARCH_API_KEY", "Search-only key. The browser never receives the admin key."],
    ["ALGOLIA_ADMIN_API_KEY", "Server-only write key for product sync/reindex."],
    ["ALGOLIA_INDEX_NAME", "Default: rivayat_products."],
    ["GOOGLE_SITE_VERIFICATION", "Only the Search Console token, not the full meta element."],
    ["BUSINESS_LEGAL_NAME", "Seller name printed on invoices."],
    ["BUSINESS_ADDRESS", "Complete legal/return address printed on invoices."],
    ["BUSINESS_GSTIN", "Leave blank unless the business has a valid GSTIN."],
    ["SUPPORT_EMAIL / SUPPORT_PHONE", "Public contact and invoice support details."],
    ["LOYALTY_EARN_PERCENT", "Default 2; clamped from 0 to 20."],
    ["LOYALTY_MAX_REDEMPTION_PERCENT", "Default 20; clamped from 0 to 50."],
    ["RETURN_WINDOW_DAYS", "Default 7; allowed 1 to 30."],
    ["TELEGRAM_BOT_TOKEN / TELEGRAM_CHAT_ID", "Optional private order and operations alerts."],
]
story.append(table(["Optional variable", "Purpose"], optional_rows, [60 * mm, 105 * mm]))
story.append(PageBreak())

story += section("6. First deployment runbook")
steps = [
    "Rotate exposed MongoDB/admin/API credentials. Confirm the old values cannot authenticate.",
    "Upload this package to the Git repository root. Render uses package-lock.json, npm ci, npm start and /health.",
    "Add required environment variables. Use Node 20, 22 or 24. Do not manually set PORT; Render provides it.",
    "Deploy with CATALOG_SYNC_MODE=replace and the exact catalog version shown in this guide.",
    "Check logs for: MongoDB connected, then 'RIVAYAT catalog ... loaded (32 products)'. Record the backupBatchId from the catalogVersion site setting.",
    "Open the storefront on mobile and desktop. Confirm all 32 products, original images, Men/Women sections, prices, sizes and stock.",
    "Sign in as admin. Verify Team Profiles, Bug Centre, Coupons, Reviews, Orders and Homepage. Remove ADMIN_PASSWORD from Render after login succeeds.",
    "Send signup and forgot-password OTPs to real inboxes. If delivery fails, verify the Resend domain, EMAIL_FROM and API key.",
    "Configure Algolia and call the admin reindex endpoint. Search at least one jersey, colour and category. Confirm Mongo fallback by temporarily omitting Algolia variables in a non-production environment.",
    "Place a test order, download its PDF invoice, mark it Delivered, verify credit earning, then test a separate Pending cancellation and credit refund.",
    "Change CATALOG_SYNC_MODE to seed-empty after the final data check. Keep CATALOG_VERSION unchanged until a deliberate future migration.",
]
for index, item in enumerate(steps, start=1):
    story.append(KeepTogether([p(f"{index}. {item}", "BodyR")]))
story.append(p("Render Blueprint note", "H2R"))
story.append(p("render.yaml is included. Render's current Blueprint specification supports autoDeployTrigger: commit, buildCommand, startCommand, healthCheckPath, generateValue and sync:false secret prompts. If the service already belongs to another Blueprint, update that existing Blueprint rather than managing the same service twice."))
story.append(PageBreak())

story += section("7. SEO, GEO and Search Console")
story.append(p("Technical SEO shipped", "H2R"))
for item in [
    "Canonical clean URLs on the live www host for home, shop, policy pages and all 32 products.",
    "Product server metadata with INR Offer, stock availability, brand, SKU, image dimensions and aggregate rating only when genuine approved reviews exist.",
    "Organization/WebSite structured data with logo, support contact, India service area and team roles.",
    "Open Graph and Twitter share cards with 1100 x 1100 PNG artwork; product links use product artwork.",
    "A 96 x 96 stable favicon, 180 px Apple icon, 192/512 PWA icons, manifest, robots.txt, image sitemap and 41 canonical URLs.",
    "llms.txt as an optional descriptive aid. It is not a Google ranking switch and does not replace crawlable pages or structured data."
]:
    story.append(bullet(item))
story.append(p("About meta keywords and GEO", "H2R"))
story.append(p("The requested meta keywords are present for completeness and non-Google consumers, but Google states that its web ranking does not use the keywords meta tag. There is no guaranteed 'high ranking' switch. Google's AI search features use the same core technical requirements and people-first SEO; no special AI file or schema is required. The meaningful GEO work is clear entity information, crawlable product facts, verified Organization/Product markup, consistent canonical URLs and original useful content."))
story.append(p("Search Console actions after deployment", "H2R"))
for item in [
    "Verify a Domain property for rivayat.shop through DNS, and keep the HTML token as a secondary method if desired.",
    "Submit https://www.rivayat.shop/sitemap.xml and remove obsolete sitemap submissions.",
    "Use URL Inspection on the homepage, /shop and several product pages. Test the live URL, then request indexing.",
    "The current search result may retain older dress/Pakistan copy until Google recrawls. Keep one canonical host and redirect every alternate host consistently.",
    "Monitor Page indexing, Core Web Vitals, HTTPS, Merchant listings and Product snippets. Fix groups of URLs, not only one sample URL.",
    "Validate Product and Organization markup in Rich Results Test. Add Merchant Center feeds only after prices, stock, shipping and return policies are final.",
    "Review Search Console weekly for the first month after launch, then monthly. Ranking and favicon refresh timing remain controlled by Google."
]:
    story.append(bullet(item))
story.append(PageBreak())

story += section("8. Security and reliability notes")
security_rows = [
    ["Secrets", "No database URI, admin password or app secret is stored in server.js. Environment validation blocks startup when core values are unsafe."],
    ["Authentication", "HMAC-signed 30-day token; admin/user role checks; password hashing; reset/signup OTP expiration and attempt limits."],
    ["Abuse", "Route-specific in-memory throttling for auth, orders, PIN code, reviews, bugs and validation endpoints."],
    ["Browser", "CSP, HSTS on HTTPS, frame denial, no MIME sniffing, restricted referrer and permissions policy."],
    ["Images", "Supported MIME/data URL checks and maximum byte limits for profile, team, review, hero and bug screenshots."],
    ["Orders", "Server recalculates product price, coupon, delivery, stock and credits instead of trusting browser totals."],
    ["Privacy", "Non-admin review responses remove private email/user IDs; order and invoice access is owner-or-admin only."],
    ["Offline", "Only public shell/assets are cached. Authentication, orders, profiles, reviews and admin APIs are never stored by the service worker."],
    ["Recovery", "Catalog backups, inventory rollback, credit rollback/refund, idempotent order IDs and repeat-safe loyalty flags."],
]
story.append(table(["Control", "Implementation"], security_rows, [37 * mm, 128 * mm]))
story.append(p("Known operational limits", "H2R"))
for item in [
    "The current rate limiter is per server instance and memory-backed. Add Redis if multiple Render instances or high traffic are expected.",
    "India Post-compatible PIN data is fetched through api.postalpincode.in; checkout remains usable if lookup fails, but the provider should be monitored.",
    "Cash on Delivery is the only enabled payment method. Do not enable online payments until a payment provider, webhook verification and refund reconciliation are implemented.",
    "Large base64 profile/review/team images consume MongoDB document space. For sustained growth, move uploads to object storage and retain original files plus generated thumbnails.",
]:
    story.append(bullet(item))
story.append(PageBreak())

story += section("9. QA evidence and final sign-off")
qa_rows = [
    ["Catalog", "PASS", "32 products, 32 IDs, 32 slugs and 32 unique image hashes."],
    ["Image integrity", "PASS", "Product and Men/Women source files copied unchanged. No product image was recompressed. Full-resolution logo retained; small icon derivatives are separate files."],
    ["JavaScript", "PASS", "server.js, service-worker.js and the executable storefront script compile successfully."],
    ["Static delivery", "PASS", "Root, catalog, CSS, manifest, service worker, sitemap, robots, llms and logo return HTTP 200 with security headers."],
    ["Dependencies", "PASS", "npm audit --omit=dev reports zero known vulnerabilities at package time."],
    ["Sitemap", "PASS", "41 URLs: 9 public pages plus 32 canonical product pages with image entries."],
    ["Live data", "OWNER", "Prices, inventory, legal details, team photos, credentials and live checkout must be approved after deployment."],
]
qa = Table([[p("Check", "TableHeadR"), p("Result", "TableHeadR"), p("Evidence", "TableHeadR")]] + [[p(a, "TableR"), p(b, "TableBoldR"), p(c, "TableR")] for a, b, c in qa_rows], colWidths=[38 * mm, 22 * mm, 105 * mm], repeatRows=1)
qa.setStyle(TableStyle([
    ("BACKGROUND", (0, 0), (-1, 0), INK),
    ("VALIGN", (0, 0), (-1, -1), "TOP"),
    ("GRID", (0, 0), (-1, -1), 0.35, LIGHT_LINE),
    ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, IVORY]),
    ("TEXTCOLOR", (1, 1), (1, -2), GREEN),
    ("TEXTCOLOR", (1, -1), (1, -1), RED),
    ("LEFTPADDING", (0, 0), (-1, -1), 5),
    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ("TOPPADDING", (0, 0), (-1, -1), 5),
    ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
]))
story.append(qa)
story.append(Spacer(1, 7 * mm))
story.append(p("Recommended owner sign-off", "H2R"))
for item in [
    "I approve the 32-product price/stock/size sheet.",
    "I confirm image and trademark permissions.",
    "I approve the team names, roles, bios, links and photos.",
    "I approve legal business/invoice/return details.",
    "I confirm rotated secrets and successful OTP, order, invoice, cancellation, loyalty and admin tests.",
    "I approve Search Console submission and final canonical www host."
]:
    story.append(bullet(f"[ ] {item}"))
story.append(Spacer(1, 5 * mm))
story.append(p("Owner: ______________________________    Date: __________________", "BodyR"))
story.append(p("Final launch approval: ______________________________", "BodyR"))
story.append(PageBreak())

story += section("10. Authoritative references")
references = [
    ("Google favicon guidance", "https://developers.google.com/search/docs/appearance/favicon-in-search"),
    ("Google ecommerce structured data", "https://developers.google.com/search/docs/specialty/ecommerce/include-structured-data-relevant-to-ecommerce"),
    ("Google Product structured data", "https://developers.google.com/search/docs/appearance/structured-data/product"),
    ("Google Organization structured data", "https://developers.google.com/search/docs/appearance/structured-data/organization"),
    ("Google supported and ignored meta tags", "https://developers.google.com/search/docs/crawling-indexing/special-tags"),
    ("Google AI features and website guidance", "https://developers.google.com/search/docs/appearance/ai-features"),
    ("Google ecommerce site structure", "https://developers.google.com/search/docs/specialty/ecommerce/help-google-understand-your-ecommerce-site-structure"),
    ("Google request recrawl guidance", "https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl"),
    ("Search Console Core Web Vitals", "https://support.google.com/webmasters/answer/9205520?hl=en"),
    ("Search Console Page indexing", "https://support.google.com/webmasters/answer/7440203?hl=en"),
    ("Render Blueprint YAML reference", "https://render.com/docs/blueprint-spec"),
    ("Render Blueprints overview", "https://render.com/docs/infrastructure-as-code"),
]
for name, url in references:
    story.append(Paragraph(f'- <b>{name}</b><br/><link href="{url}" color="#315E8A">{url}</link>', styles["URLR"]))
story.append(Spacer(1, 7 * mm))
story.append(p("No source guarantees search ranking, indexing speed, rich results, favicon display or AI citation. These remain search-engine decisions influenced by technical quality, content usefulness, reputation and competition.", "CalloutR"))

doc.build(story)
print(OUTPUT)
