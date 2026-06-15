/**
 * Legal / policy pages (Contact, Returns & Refunds, Shipping, Privacy, Terms).
 *
 * These are linked from the storefront footer and are REQUIRED for Google Ads
 * approval, Stripe, and App/Play Store review. Branded to match the storefront.
 *
 * NOTE: This is standard e-commerce boilerplate, not legal advice — have counsel
 * review before relying on it. Update COMPANY/SUPPORT_EMAIL as needed.
 */

import { Router, Request, Response } from 'express';

const router = Router();

const COMPANY = 'Activate LLC';
const BRAND_LINE = 'ARBI is a store operated by Activate LLC.';
const SUPPORT_EMAIL = 'contact@creai.dev';
const UPDATED = 'June 15, 2026';

/** Branded dark page shell matching the order-confirmation page. */
function page(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title} — ARBI</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: radial-gradient(1100px 560px at 50% -8%, #15203f 0%, #0b0f22 62%); background-attachment: fixed;
      color: #cbd5e1; min-height: 100vh; line-height: 1.7; padding: 26px 16px 60px; }
    .wrap { max-width: 720px; margin: 0 auto; }
    .brand { display: flex; align-items: center; gap: 10px; margin: 4px 0 28px; }
    .logo { width: 34px; height: 34px; background: #00f0ff; border-radius: 7px; transform: rotate(45deg);
      display: flex; align-items: center; justify-content: center; box-shadow: 0 0 18px rgba(0,240,255,.45); }
    .logo span { transform: rotate(-45deg); color: #04121f; font-weight: 800; font-size: 17px; }
    .brand b { font-size: 17px; letter-spacing: .2em; color: #fff; }
    .card { background: rgba(18,24,48,.72); -webkit-backdrop-filter: blur(20px); backdrop-filter: blur(20px);
      border: 1px solid rgba(255,255,255,.10); border-radius: 20px; padding: 34px 28px;
      box-shadow: 0 24px 60px rgba(0,0,0,.45); }
    h1 { color: #fff; font-size: 26px; margin-bottom: 6px; }
    .updated { color: #64748b; font-size: 13px; margin-bottom: 24px; }
    h2 { color: #fff; font-size: 16px; margin: 24px 0 8px; }
    p, li { color: #94a3b8; font-size: 14.5px; margin-bottom: 10px; }
    ul { padding-left: 20px; }
    a { color: #00f0ff; text-decoration: none; }
    a:hover { text-decoration: underline; }
    .footer { margin-top: 26px; text-align: center; display: flex; flex-wrap: wrap; justify-content: center; gap: 14px; }
    .footer a { color: #64748b; font-size: 12px; }
    .copy { text-align: center; color: #475569; font-size: 12px; margin-top: 10px; }
  </style>
</head>
<body>
  <div class="wrap">
    <a href="/" style="text-decoration:none"><div class="brand"><div class="logo"><span>A</span></div><b>ARBI</b></div></a>
    <div class="card">
      <h1>${title}</h1>
      <p class="updated">Last updated: ${UPDATED}</p>
      ${bodyHtml}
    </div>
    <div class="footer">
      <a href="/contact">Contact</a>
      <a href="/returns">Returns &amp; Refunds</a>
      <a href="/shipping">Shipping</a>
      <a href="/privacy">Privacy Policy</a>
      <a href="/terms">Terms of Service</a>
    </div>
    <p class="copy">&copy; 2026 ${COMPANY}. All rights reserved. ${BRAND_LINE}</p>
  </div>
</body>
</html>`;
}

router.get('/contact', (_req: Request, res: Response) => {
  res.send(page('Contact Us', `
    <p>We're here to help with any question about your order, shipping, returns, or our products.</p>
    <h2>Customer support</h2>
    <p>Email: <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a></p>
    <p>We aim to respond to all enquiries within <strong>1 business day</strong> (Mon–Fri).</p>
    <h2>Order help</h2>
    <p>Please include your order number (shown on your confirmation page and receipt email) so we can assist you faster.</p>
  `));
});

router.get('/returns', (_req: Request, res: Response) => {
  res.send(page('Returns &amp; Refunds', `
    <p>Your satisfaction matters. If something isn't right, we'll make it right.</p>
    <h2>30-day returns</h2>
    <p>You may request a return within <strong>30 days</strong> of delivery for items that are unused and in their original condition and packaging.</p>
    <h2>How to start a return</h2>
    <ul>
      <li>Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a> with your order number and the item(s) you'd like to return.</li>
      <li>We'll reply with return instructions and the return address.</li>
    </ul>
    <h2>Refunds</h2>
    <p>Once your return is received and inspected, we'll process your refund to the original payment method within <strong>5–10 business days</strong>. Original shipping costs are non-refundable unless the item arrived damaged or incorrect.</p>
    <h2>Damaged or incorrect items</h2>
    <p>If your order arrives damaged or incorrect, contact us within 7 days of delivery and we'll arrange a replacement or full refund at no cost to you.</p>
  `));
});

router.get('/shipping', (_req: Request, res: Response) => {
  res.send(page('Shipping Policy', `
    <h2>Processing time</h2>
    <p>Orders are processed within <strong>1–2 business days</strong>. You'll receive a tracking number by email once your order ships.</p>
    <h2>Delivery estimates</h2>
    <ul>
      <li>Domestic (US): typically 5–12 business days after processing.</li>
      <li>International: typically 10–20 business days, depending on destination and customs.</li>
    </ul>
    <p>Delivery times are estimates and may vary due to carrier delays, customs, or peak periods.</p>
    <h2>Tracking</h2>
    <p>Tracking information is emailed to you once available. If you haven't received tracking within 5 business days, contact <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <h2>Customs &amp; duties</h2>
    <p>International orders may be subject to import duties or taxes levied by the destination country, which are the responsibility of the recipient.</p>
  `));
});

router.get('/privacy', (_req: Request, res: Response) => {
  res.send(page('Privacy Policy', `
    <p>${COMPANY} ("we", "us") respects your privacy. This policy explains what we collect, why, and your choices.</p>
    <h2>Information we collect</h2>
    <ul>
      <li><strong>Order &amp; contact details</strong> you provide at checkout: name, email, and shipping address.</li>
      <li><strong>Payment information</strong> is processed securely by our payment processor (Stripe). We do not store full card numbers.</li>
      <li><strong>Usage data</strong> such as pages visited, collected via cookies and analytics to improve our store and measure advertising.</li>
    </ul>
    <h2>How we use it</h2>
    <ul>
      <li>To process and fulfill your orders and provide customer support.</li>
      <li>To send order confirmations, receipts, and shipping updates.</li>
      <li>To measure and improve our advertising (e.g., Google Ads conversion measurement).</li>
    </ul>
    <h2>Sharing</h2>
    <p>We share data only as needed to operate the store: with our payment processor (Stripe), shipping/fulfillment suppliers, and advertising/analytics providers (e.g., Google). We do not sell your personal information.</p>
    <h2>Cookies</h2>
    <p>We use cookies for essential site function and to measure advertising performance. You can control cookies through your browser settings.</p>
    <h2>Your rights</h2>
    <p>You may request access to, correction of, or deletion of your personal data by emailing <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
    <h2>Contact</h2>
    <p>Questions about this policy? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `));
});

router.get('/terms', (_req: Request, res: Response) => {
  res.send(page('Terms of Service', `
    <p>By accessing this store and placing an order, you agree to these terms.</p>
    <h2>Orders &amp; pricing</h2>
    <p>All prices are shown at checkout in USD. We reserve the right to cancel and refund any order due to pricing errors, suspected fraud, or stock unavailability.</p>
    <h2>Payment</h2>
    <p>Payments are processed securely by Stripe. By submitting an order you authorize us to charge your selected payment method for the order total.</p>
    <h2>Shipping &amp; returns</h2>
    <p>Fulfillment is governed by our <a href="/shipping">Shipping Policy</a> and <a href="/returns">Returns &amp; Refunds</a> policy.</p>
    <h2>Intellectual property</h2>
    <p>All content on this site is owned by ${COMPANY} or its licensors and may not be reproduced without permission.</p>
    <h2>Limitation of liability</h2>
    <p>To the maximum extent permitted by law, ${COMPANY} is not liable for indirect or consequential damages arising from use of this store. Our total liability for any order is limited to the amount you paid for it.</p>
    <h2>Changes</h2>
    <p>We may update these terms from time to time. Continued use of the store constitutes acceptance of the updated terms.</p>
    <h2>Contact</h2>
    <p>Questions? Email <a href="mailto:${SUPPORT_EMAIL}">${SUPPORT_EMAIL}</a>.</p>
  `));
});

export default router;
