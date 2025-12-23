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
  address: '123 Commerce Street, Suite 100, San Francisco, CA 94102',
  phone: '1-800-ARBI-SHOP',
};

/**
 * Contact Page
 */
router.get('/contact', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Contact Us', `
    <h1>Contact Us</h1>

    <div class="info-box">
      <h2>Get in Touch</h2>
      <p>We're here to help! Contact us through any of the following methods:</p>
    </div>

    <div class="contact-grid">
      <div class="contact-method">
        <h3>📧 Email</h3>
        <p><a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a></p>
        <p class="response-time">Response time: 24-48 hours</p>
      </div>

      <div class="contact-method">
        <h3>📞 Phone</h3>
        <p>${BUSINESS_INFO.phone}</p>
        <p class="response-time">Mon-Fri 9am-5pm PST</p>
      </div>

      <div class="contact-method">
        <h3>📍 Address</h3>
        <p>${BUSINESS_INFO.address}</p>
      </div>
    </div>

    <div class="info-box">
      <h3>Business Hours</h3>
      <p>Monday - Friday: 9:00 AM - 5:00 PM PST</p>
      <p>Saturday - Sunday: Closed</p>
    </div>
  `));
});

/**
 * Returns & Refunds Page
 */
router.get('/returns', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Returns & Refunds', `
    <h1>Returns & Refunds Policy</h1>

    <div class="info-box highlight">
      <h2>30-Day Money-Back Guarantee</h2>
      <p>We stand behind our products. If you're not completely satisfied, return it within 30 days for a full refund.</p>
    </div>

    <h2>How to Return an Item</h2>
    <ol>
      <li><strong>Contact Us:</strong> Email <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a> with your order number</li>
      <li><strong>Get Authorization:</strong> We'll send you a return authorization and shipping label</li>
      <li><strong>Ship It Back:</strong> Pack the item securely and ship using the provided label</li>
      <li><strong>Receive Refund:</strong> Once we receive and inspect the item, we'll process your refund within 5-7 business days</li>
    </ol>

    <h2>Refund Policy</h2>
    <ul>
      <li>✓ Full refund for returns within 30 days</li>
      <li>✓ Item must be unused and in original packaging</li>
      <li>✓ Refunds processed to original payment method</li>
      <li>✓ Return shipping covered for defective items</li>
    </ul>

    <h2>Exceptions</h2>
    <p>Due to hygiene reasons, the following items cannot be returned once opened:</p>
    <ul>
      <li>Personal care items</li>
      <li>Intimate products</li>
      <li>Items marked as "Final Sale"</li>
    </ul>

    <div class="info-box">
      <h3>Questions?</h3>
      <p>Contact us at <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a> and we'll help you out!</p>
    </div>
  `));
});

/**
 * Shipping Policy Page
 */
router.get('/shipping', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Shipping Policy', `
    <h1>Shipping Policy</h1>

    <div class="info-box highlight">
      <h2>🚚 Free Fast Shipping</h2>
      <p>Free standard shipping on all orders within the United States</p>
    </div>

    <h2>Processing Time</h2>
    <p>Orders are typically processed and shipped within <strong>1-2 business days</strong> (Monday-Friday, excluding holidays).</p>

    <h2>Delivery Times</h2>
    <table>
      <tr>
        <td><strong>Standard Shipping:</strong></td>
        <td>5-7 business days</td>
      </tr>
      <tr>
        <td><strong>Expedited Shipping:</strong></td>
        <td>2-3 business days</td>
      </tr>
      <tr>
        <td><strong>Overnight Shipping:</strong></td>
        <td>1 business day</td>
      </tr>
    </table>

    <p class="note"><em>Note: Delivery times are estimates and may vary based on carrier and destination. Times may be longer during peak seasons.</em></p>

    <h2>Tracking</h2>
    <p>Once your order ships, you'll receive a confirmation email with tracking information. Track your package directly through the carrier's website.</p>

    <h2>International Shipping</h2>
    <p>We currently ship to the United States only. International shipping coming soon!</p>

    <h2>Shipping Carriers</h2>
    <p>We partner with reliable carriers including:</p>
    <ul>
      <li>USPS (United States Postal Service)</li>
      <li>FedEx</li>
      <li>UPS</li>
    </ul>

    <div class="info-box">
      <h3>Shipping Issues?</h3>
      <p>If your package is delayed or damaged, please contact us at <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a> and we'll resolve it immediately.</p>
    </div>
  `));
});

/**
 * Privacy Policy Page
 */
router.get('/privacy', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Privacy Policy', `
    <h1>Privacy Policy</h1>
    <p class="last-updated">Last Updated: December 22, 2025</p>

    <h2>Information We Collect</h2>
    <p>When you make a purchase, we collect:</p>
    <ul>
      <li>Name and shipping address</li>
      <li>Email address</li>
      <li>Payment information (processed securely by Stripe)</li>
      <li>Order history and preferences</li>
    </ul>

    <h2>How We Use Your Information</h2>
    <p>We use your information to:</p>
    <ul>
      <li>Process and fulfill your orders</li>
      <li>Send order confirmations and shipping updates</li>
      <li>Respond to customer service requests</li>
      <li>Improve our products and services</li>
      <li>Comply with legal obligations</li>
    </ul>

    <h2>Information Sharing</h2>
    <p>We do not sell your personal information. We only share data with:</p>
    <ul>
      <li><strong>Payment Processors:</strong> Stripe for secure payment processing</li>
      <li><strong>Shipping Carriers:</strong> To deliver your orders</li>
      <li><strong>Service Providers:</strong> For essential business operations</li>
      <li><strong>Legal Requirements:</strong> When required by law</li>
    </ul>

    <h2>Data Security</h2>
    <p>We implement industry-standard security measures to protect your personal information. All payment processing is handled securely through Stripe, and we never store your full credit card information.</p>

    <h2>Cookies</h2>
    <p>We use cookies to improve your browsing experience and analyze site traffic. You can disable cookies in your browser settings, though some features may not work properly.</p>

    <h2>Your Rights</h2>
    <p>You have the right to:</p>
    <ul>
      <li>Access your personal data</li>
      <li>Request corrections to your data</li>
      <li>Request deletion of your data</li>
      <li>Opt-out of marketing communications</li>
    </ul>

    <h2>Contact Us</h2>
    <p>For privacy-related questions, contact us at:</p>
    <p><a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a></p>
  `));
});

/**
 * Terms of Service Page
 */
router.get('/terms', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/html');
  res.send(generatePage('Terms of Service', `
    <h1>Terms of Service</h1>
    <p class="last-updated">Last Updated: December 22, 2025</p>

    <h2>Agreement to Terms</h2>
    <p>By accessing and using ${BUSINESS_INFO.name}'s website and services, you agree to be bound by these Terms of Service and all applicable laws and regulations.</p>

    <h2>Use License</h2>
    <p>Permission is granted to temporarily access our website for personal, non-commercial transitory viewing only. This license does not include:</p>
    <ul>
      <li>Modifying or copying our materials</li>
      <li>Using materials for commercial purposes</li>
      <li>Attempting to reverse engineer any software</li>
      <li>Removing copyright or proprietary notations</li>
    </ul>

    <h2>Product Information</h2>
    <p>We strive to provide accurate product descriptions, images, and pricing. However, we do not warrant that product descriptions or other content is accurate, complete, reliable, current, or error-free. We reserve the right to correct errors and update information at any time.</p>

    <h2>Pricing</h2>
    <p>All prices are in US Dollars and are subject to change without notice. We reserve the right to:</p>
    <ul>
      <li>Modify or discontinue products without notice</li>
      <li>Limit quantities available for purchase</li>
      <li>Refuse or cancel orders that appear fraudulent</li>
    </ul>

    <h2>Payment Terms</h2>
    <p>Payment is processed at checkout through Stripe. By providing payment information, you represent that:</p>
    <ul>
      <li>You are authorized to use the payment method</li>
      <li>You authorize us to charge the total amount</li>
      <li>You will pay all applicable taxes</li>
    </ul>

    <h2>Merchant of Record</h2>
    <p><strong>${BUSINESS_INFO.name}</strong> is the merchant of record for all purchases. We handle:</p>
    <ul>
      <li>Payment processing and billing</li>
      <li>Customer support and refunds</li>
      <li>Order fulfillment and shipping</li>
      <li>Product warranties and returns</li>
    </ul>

    <h2>Order Fulfillment</h2>
    <p>We work with trusted suppliers and fulfillment partners to deliver your orders. While we aim to ship within 1-2 business days, actual fulfillment times may vary based on product availability and supplier processing times.</p>

    <h2>Limitation of Liability</h2>
    <p>${BUSINESS_INFO.name} shall not be liable for any indirect, incidental, special, consequential, or punitive damages resulting from your use of our products or services.</p>

    <h2>Governing Law</h2>
    <p>These terms are governed by and construed in accordance with the laws of California, United States.</p>

    <h2>Contact Information</h2>
    <p>For questions about these Terms of Service, contact us at:</p>
    <p><strong>${BUSINESS_INFO.name}</strong><br>
    ${BUSINESS_INFO.address}<br>
    Email: <a href="mailto:${BUSINESS_INFO.email}">${BUSINESS_INFO.email}</a><br>
    Phone: ${BUSINESS_INFO.phone}</p>
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
            padding-bottom: 120px;
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
