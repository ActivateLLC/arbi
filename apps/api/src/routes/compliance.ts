/**
 * Compliance Pages
 *
 * Required pages for Google Ads compliance:
 * - Contact
 * - Returns/Refunds
 * - Shipping
 * - Privacy Policy
 * - Terms of Service
 */

import { Router, Request, Response } from 'express';

const router = Router();

// Base business info
const BUSINESS_INFO = {
  name: 'Arbi Inc.',
  email: 'support@arbi.creai.dev',
  address: '2261 Market Street #4567, San Francisco, CA 94114',
  phone: '(415) 555-0142',
};

/**
 * Contact Page
 */
router.get('/contact', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Contact Us', `
    <h1>Contact Us</h1>

    <p>Have a question about your order? Need help with a product? We're here for you.</p>

    <div class="contact-grid">
      <div class="contact-method">
        <h3>Email</h3>
        <p><a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a></p>
        <p class="response-time">We typically respond within 24 hours</p>
      </div>

      <div class="contact-method">
        <h3>Phone</h3>
        <p>${BUSINESS_INFO.phone}</p>
        <p class="response-time">Monday-Friday, 9am-5pm Pacific</p>
      </div>

      <div class="contact-method">
        <h3>Mailing Address</h3>
        <p>${BUSINESS_INFO.address}</p>
      </div>
    </div>

    <div class="info-box">
      <h3>Before You Contact Us</h3>
      <p>For faster help, check out our <a href="/shipping">Shipping</a> and <a href="/returns">Returns</a> pages. They answer most common questions about orders and deliveries.</p>
    </div>
  `));
});

/**
 * Returns & Refunds Page
 */
router.get('/returns', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Returns & Refunds', `
    <h1>Returns & Refunds</h1>

    <p>Not happy with your purchase? We get it. Here's how returns work.</p>

    <h2>30-Day Return Window</h2>
    <p>You have 30 days from delivery to return most items for a full refund. The product needs to be unused and in its original packaging.</p>

    <h2>How to Start a Return</h2>
    <p>Email us at <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a> with your order number. We'll send you a prepaid return label within one business day.</p>

    <p>Once we receive your return and confirm everything's in order, your refund will be processed within 5-7 business days to your original payment method.</p>

    <h2>Defective or Damaged Items</h2>
    <p>If something arrives broken or defective, we'll cover return shipping and send a replacement at no extra cost. Just let us know within 7 days of delivery.</p>

    <h2>What Can't Be Returned</h2>
    <p>For health and safety reasons, we can't accept returns on opened personal care items or anything marked as final sale at checkout.</p>

    <p>Have questions? Email <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a> and we'll sort it out.</p>
  `));
});

/**
 * Shipping Policy Page
 */
router.get('/shipping', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Shipping', `
    <h1>Shipping</h1>

    <p>We ship to addresses in the United States. Standard shipping is free on all orders.</p>

    <h2>Processing & Delivery</h2>
    <p>Most orders ship within 1-2 business days. Once shipped, delivery typically takes 5-7 business days depending on your location. You'll get tracking info via email as soon as your order leaves our warehouse.</p>

    <p>Need it faster? Expedited options are available at checkout.</p>

    <h2>Tracking Your Order</h2>
    <p>Check your email for the shipping confirmation with your tracking number. You can use it to follow your package on USPS, FedEx, or UPS depending on which carrier we use.</p>

    <h2>Delays & Issues</h2>
    <p>Packages occasionally get delayed by carriers, especially during holidays. If your order is taking longer than expected or arrives damaged, email us at <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a> and we'll take care of it.</p>

    <p class="note">Note: We currently only ship within the US.</p>
  `));
});

/**
 * Privacy Policy Page
 */
router.get('/privacy', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Privacy Policy', `
    <h1>Privacy Policy</h1>
    <p class="last-updated">Updated December 2025</p>

    <p>We take your privacy seriously. Here's what we collect and why.</p>

    <h2>What We Collect</h2>
    <p>When you order from us, we collect your name, shipping address, email, and payment info. Stripe handles all payment processing — we never see or store your full credit card details.</p>

    <h2>How We Use It</h2>
    <p>We use your information to process orders, send shipping updates, and provide customer support. We also look at browsing patterns to improve the site, but nothing personally identifiable.</p>

    <h2>Who We Share With</h2>
    <p>We don't sell your data. Period. We only share what's necessary:</p>
    <p>Stripe processes payments. Shipping carriers (USPS, FedEx, UPS) get your address to deliver your order. That's it.</p>

    <h2>Your Rights</h2>
    <p>You can request a copy of your data, ask us to correct or delete it, or opt out of emails anytime. Just email <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a>.</p>

    <h2>Cookies</h2>
    <p>We use cookies to remember your cart and improve site performance. You can disable them in your browser if you want.</p>

    <p>Questions? Email us at <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a>.</p>
  `));
});

/**
 * Terms of Service Page
 */
router.get('/terms', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Terms of Service', `
    <h1>Terms of Service</h1>
    <p class="last-updated">Updated December 2025</p>

    <p>By using our site and making a purchase, you're agreeing to these terms. Pretty standard stuff, but worth reading.</p>

    <h2>Pricing & Availability</h2>
    <p>All prices are in USD. We do our best to keep product info and pricing accurate, but mistakes happen. If we mess up a price or description, we'll let you know and give you the option to complete or cancel your order.</p>

    <p>We sometimes run out of stock or discontinue products. If that happens after you order, we'll refund you right away.</p>

    <h2>Payments</h2>
    <p>We use Stripe to process payments securely. When you check out, you're confirming that you're authorized to use that payment method and agreeing to the total shown.</p>

    <h2>Who You're Buying From</h2>
    <p>Arbi Inc. is the seller for all orders. We handle billing, customer support, shipping, and returns. If you have any issues, you work with us directly.</p>

    <h2>Fulfillment</h2>
    <p>We partner with suppliers to fulfill orders. Most ship within 1-2 business days, but timing can vary depending on product availability.</p>

    <h2>Liability</h2>
    <p>We're not responsible for indirect damages from using our products or site. If something goes wrong with an order, check our <a href="/returns">returns policy</a> — we'll make it right.</p>

    <h2>Questions?</h2>
    <p><strong>Arbi Inc.</strong><br>
    ${BUSINESS_INFO.address}<br>
    <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a><br>
    ${BUSINESS_INFO.phone}</p>
  `));
});

/**
 * Generate page template with cyber theme
 */
function generatePage(title: string, content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${title} - ${BUSINESS_INFO.name}</title>
    <link href="https://fonts.googleapis.com/css2?family=Exo+2:wght@100..900&family=Syne:wght@400..800&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Exo 2', sans-serif;
            background: linear-gradient(135deg, #050505 0%, #0a0a0a 100%);
            color: #e2e8f0;
            line-height: 1.6;
            padding-bottom: 180px;
            min-height: 100vh;
            position: relative;
        }

        /* Noise overlay */
        body::before {
            content: '';
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            pointer-events: none;
            z-index: 1;
            opacity: 0.03;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
        }

        .header {
            background: linear-gradient(135deg, #00f0ff 0%, #7000ff 100%);
            color: white;
            padding: 40px 20px;
            text-align: center;
            box-shadow: 0 4px 20px rgba(0, 240, 255, 0.3);
            position: relative;
            z-index: 2;
            clip-path: polygon(
                0 0, 100% 0,
                100% calc(100% - 20px), calc(100% - 20px) 100%,
                0 100%
            );
        }

        .logo-container {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            margin-bottom: 10px;
        }

        .logo-icon {
            width: 50px;
            height: 50px;
            background: rgba(255, 255, 255, 0.2);
            backdrop-filter: blur(10px);
            clip-path: polygon(
                8px 0, 100% 0,
                100% calc(100% - 8px), calc(100% - 8px) 100%,
                0 100%, 0 8px
            );
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Syne', sans-serif;
            font-size: 32px;
            font-weight: 800;
            text-shadow: 0 0 15px rgba(0, 240, 255, 0.8);
        }

        .header h1 {
            font-family: 'Syne', sans-serif;
            font-size: 32px;
            font-weight: 800;
            text-shadow: 0 0 20px rgba(0, 240, 255, 0.5);
            margin: 0;
        }

        .container {
            max-width: 900px;
            margin: 40px auto;
            background: rgba(10, 10, 10, 0.8);
            backdrop-filter: blur(10px);
            padding: 40px;
            border-radius: 10px;
            border: 1px solid rgba(0, 240, 255, 0.2);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
            position: relative;
            z-index: 2;
        }

        h1 {
            font-family: 'Syne', sans-serif;
            font-size: 36px;
            color: #00f0ff;
            margin-bottom: 20px;
            padding-bottom: 15px;
            border-bottom: 3px solid #00f0ff;
            text-shadow: 0 0 10px rgba(0, 240, 255, 0.5);
        }

        h2 {
            font-family: 'Syne', sans-serif;
            font-size: 24px;
            color: #00f0ff;
            margin-top: 30px;
            margin-bottom: 15px;
        }

        h3 {
            font-family: 'Syne', sans-serif;
            font-size: 18px;
            color: #7000ff;
            margin-top: 20px;
            margin-bottom: 10px;
        }

        p {
            margin-bottom: 15px;
            color: #cbd5e0;
        }

        ul, ol {
            margin-left: 30px;
            margin-bottom: 20px;
        }

        li {
            margin-bottom: 8px;
            color: #cbd5e0;
        }

        a {
            color: #00f0ff;
            text-decoration: none;
            transition: all 0.3s ease;
        }

        a:hover {
            text-shadow: 0 0 10px rgba(0, 240, 255, 0.8);
            text-decoration: underline;
        }

        .info-box {
            background: rgba(0, 240, 255, 0.05);
            border-left: 4px solid #00f0ff;
            padding: 20px;
            margin: 20px 0;
            border-radius: 4px;
            box-shadow: 0 0 10px rgba(0, 240, 255, 0.1);
        }

        .info-box.highlight {
            background: linear-gradient(135deg, rgba(0, 240, 255, 0.1), rgba(112, 0, 255, 0.1));
            border-left: 4px solid #7000ff;
            box-shadow: 0 0 20px rgba(112, 0, 255, 0.2);
        }

        .info-box h2,
        .info-box h3 {
            margin-top: 0;
        }

        .contact-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin: 30px 0;
        }

        .contact-method {
            background: rgba(0, 240, 255, 0.05);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid rgba(0, 240, 255, 0.2);
            transition: all 0.3s ease;
        }

        .contact-method:hover {
            border-color: #00f0ff;
            box-shadow: 0 0 20px rgba(0, 240, 255, 0.2);
            transform: translateY(-2px);
        }

        .contact-method h3 {
            margin-top: 0;
            margin-bottom: 10px;
        }

        .response-time {
            font-size: 14px;
            color: #718096;
            font-style: italic;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        td {
            padding: 12px;
            border-bottom: 1px solid rgba(0, 240, 255, 0.1);
            color: #cbd5e0;
        }

        td strong {
            color: #00f0ff;
        }

        .last-updated {
            font-size: 14px;
            color: #718096;
            font-style: italic;
            margin-bottom: 20px;
        }

        .note {
            font-size: 14px;
            color: #718096;
            font-style: italic;
            margin: 20px 0;
        }

        .footer {
            position: fixed;
            bottom: 0;
            left: 0;
            right: 0;
            background: rgba(10, 10, 10, 0.95);
            backdrop-filter: blur(10px);
            padding: 20px;
            text-align: center;
            border-top: 1px solid rgba(0, 240, 255, 0.2);
            box-shadow: 0 -2px 20px rgba(0, 240, 255, 0.1);
            z-index: 10;
        }

        .footer-logo {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            margin-bottom: 12px;
        }

        .footer-logo-icon {
            width: 30px;
            height: 30px;
            background: rgba(0, 240, 255, 0.1);
            clip-path: polygon(
                6px 0, 100% 0,
                100% calc(100% - 6px), calc(100% - 6px) 100%,
                0 100%, 0 6px
            );
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: 'Syne', sans-serif;
            font-size: 20px;
            font-weight: 800;
            color: #00f0ff;
        }

        .footer-logo-text {
            font-family: 'Syne', sans-serif;
            font-size: 18px;
            font-weight: 700;
            color: #00f0ff;
        }

        .footer-links {
            display: flex;
            justify-content: center;
            flex-wrap: wrap;
            gap: 20px;
            margin-bottom: 10px;
        }

        .footer-links a {
            color: #00f0ff;
            font-size: 14px;
            font-weight: 500;
        }

        .footer p {
            margin: 4px 0;
            font-size: 13px;
            color: #718096;
        }

        @media (max-width: 768px) {
            body {
                padding-bottom: 220px;
            }

            .container {
                margin: 20px;
                padding: 20px;
            }

            h1 {
                font-size: 28px;
            }

            .header h1 {
                font-size: 24px;
            }

            .contact-grid {
                grid-template-columns: 1fr;
            }

            .footer-links {
                gap: 12px;
            }
        }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo-container">
            <div class="logo-icon">A</div>
            <h1>ARBI</h1>
        </div>
    </div>

    <div class="container">
        ${content}
    </div>

    <footer class="footer">
        <div class="footer-logo">
            <div class="footer-logo-icon">A</div>
            <div class="footer-logo-text">ARBI</div>
        </div>
        <div class="footer-links">
            <a href="/contact">Contact</a>
            <a href="/returns">Returns & Refunds</a>
            <a href="/shipping">Shipping</a>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
        </div>
        <p>&copy; 2025 ${BUSINESS_INFO.name}. All rights reserved.</p>
    </footer>
</body>
</html>
  `;
}

export default router;
