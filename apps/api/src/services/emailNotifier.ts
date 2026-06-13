/**
 * Email Notification Service
 * Sends alerts for sales, stock issues, price changes
 * Supports: Gmail, SendGrid, Mailgun, or any SMTP service
 */

import nodemailer from 'nodemailer';

interface SaleNotification {
  orderId: string;
  productTitle: string;
  salePrice: number;
  supplierCost: number;
  profit: number;
  customerEmail: string;
  trackingNumber?: string;
  vendor?: string;
}

interface StockAlert {
  listingId: string;
  productTitle: string;
  vendor: string;
  fallbackUsed?: {
    vendor: string;
    oldPrice: number;
    newPrice: number;
    oldProfit: number;
    newProfit: number;
  };
}

interface PriceChangeAlert {
  listingId: string;
  productTitle: string;
  vendor: string;
  oldPrice: number;
  newPrice: number;
  oldProfit: number;
  newProfit: number;
  percentChange: number;
  isProfitable: boolean;
}

export class EmailNotifierService {
  private transporter: any;
  private isEnabled: boolean;
  private ownerEmail: string;

  constructor() {
    // Check if email notifications are configured
    this.isEnabled = !!(
      process.env.NOTIFICATION_EMAIL &&
      process.env.NOTIFICATION_PASSWORD &&
      process.env.OWNER_EMAIL
    );

    this.ownerEmail = process.env.OWNER_EMAIL || 'owner@example.com';

    if (this.isEnabled) {
      // Auto-detect email provider
      const email = process.env.NOTIFICATION_EMAIL!;

      if (process.env.SENDGRID_API_KEY) {
        // SendGrid
        this.transporter = nodemailer.createTransport({
          host: 'smtp.sendgrid.net',
          port: 587,
          auth: {
            user: 'apikey',
            pass: process.env.SENDGRID_API_KEY,
          },
        });
        console.log('✅ Email notifications enabled (SendGrid)');
      } else if (process.env.MAILGUN_API_KEY) {
        // Mailgun
        this.transporter = nodemailer.createTransport({
          host: 'smtp.mailgun.org',
          port: 587,
          auth: {
            user: process.env.NOTIFICATION_EMAIL,
            pass: process.env.MAILGUN_API_KEY,
          },
        });
        console.log('✅ Email notifications enabled (Mailgun)');
      } else {
        // Generic SMTP (Gmail, etc.)
        this.transporter = nodemailer.createTransport({
          service: email.includes('@gmail.com') ? 'gmail' : undefined,
          host: process.env.SMTP_HOST || undefined,
          port: parseInt(process.env.SMTP_PORT || '587'),
          secure: process.env.SMTP_SECURE === 'true',
          auth: {
            user: process.env.NOTIFICATION_EMAIL,
            pass: process.env.NOTIFICATION_PASSWORD,
          },
        });
        console.log('✅ Email notifications enabled (SMTP)');
      }
    } else {
      console.log('⚠️  Email notifications disabled (configure NOTIFICATION_EMAIL, NOTIFICATION_PASSWORD, OWNER_EMAIL)');
    }
  }

  /**
   * Notify when a sale happens
   */
  async notifySale(notification: SaleNotification): Promise<void> {
    if (!this.isEnabled) {
      console.log('📧 [SIMULATED] Sale notification:', notification);
      return;
    }

    try {
      const subject = `💰 New Sale! Profit: $${notification.profit.toFixed(2)} - ${notification.productTitle}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #4CAF50;">🎉 New Order Received!</h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Product Details</h3>
            <p><strong>Product:</strong> ${notification.productTitle}</p>
            <p><strong>Order ID:</strong> ${notification.orderId}</p>
            <p><strong>Customer:</strong> ${notification.customerEmail}</p>
          </div>

          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">💰 Profit Breakdown</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0;"><strong>Sale Price:</strong></td>
                <td style="text-align: right;">$${notification.salePrice.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0;"><strong>Supplier Cost:</strong></td>
                <td style="text-align: right;">-$${notification.supplierCost.toFixed(2)}</td>
              </tr>
              <tr style="border-top: 2px solid #4CAF50;">
                <td style="padding: 8px 0;"><strong>Your Profit:</strong></td>
                <td style="text-align: right; font-size: 1.2em; color: #2e7d32;"><strong>$${notification.profit.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          ${notification.trackingNumber ? `
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">📦 Fulfillment Status</h3>
            <p><strong>Vendor:</strong> ${notification.vendor?.toUpperCase()}</p>
            <p><strong>Status:</strong> ✅ Auto-fulfilled</p>
            <p><strong>Tracking:</strong> ${notification.trackingNumber}</p>
          </div>
          ` : `
          <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">⚠️ Manual Fulfillment Required</h3>
            <p>Auto-fulfillment is disabled. Please manually purchase and ship this order.</p>
          </div>
          `}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is an automated notification from your Arbi dropshipping system.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.NOTIFICATION_EMAIL,
        to: this.ownerEmail,
        subject,
        html,
      });

      console.log(`📧 Sale notification sent to ${this.ownerEmail}`);
    } catch (error: any) {
      console.error('❌ Failed to send sale notification:', error.message);
    }
  }

  /**
   * Notify when primary supplier is out of stock
   */
  async notifyOutOfStock(alert: StockAlert): Promise<void> {
    if (!this.isEnabled) {
      console.log('📧 [SIMULATED] Out of stock alert:', alert);
      return;
    }

    try {
      const subject = alert.fallbackUsed
        ? `⚠️ Fallback Supplier Used: ${alert.productTitle}`
        : `🚨 Product Out of Stock: ${alert.productTitle}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${alert.fallbackUsed ? '#FF9800' : '#F44336'};">
            ${alert.fallbackUsed ? '⚠️ Fallback Supplier Used' : '🚨 Product Out of Stock'}
          </h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Product Information</h3>
            <p><strong>Product:</strong> ${alert.productTitle}</p>
            <p><strong>Listing ID:</strong> ${alert.listingId}</p>
            <p><strong>Primary Vendor:</strong> ${alert.vendor.toUpperCase()}</p>
          </div>

          ${alert.fallbackUsed ? `
          <div style="background: #fff3e0; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #F57C00;">Fallback Applied</h3>
            <p><strong>Fallback Vendor:</strong> ${alert.fallbackUsed.vendor.toUpperCase()}</p>
            <p><strong>Original Price:</strong> $${alert.fallbackUsed.oldPrice.toFixed(2)}</p>
            <p><strong>Fallback Price:</strong> $${alert.fallbackUsed.newPrice.toFixed(2)}</p>
            <p><strong>Price Difference:</strong> +$${(alert.fallbackUsed.newPrice - alert.fallbackUsed.oldPrice).toFixed(2)}</p>
            <hr style="margin: 15px 0;">
            <p><strong>Original Profit:</strong> $${alert.fallbackUsed.oldProfit.toFixed(2)}</p>
            <p><strong>New Profit:</strong> $${alert.fallbackUsed.newProfit.toFixed(2)}</p>
            <p><strong>Profit Impact:</strong> ${alert.fallbackUsed.newProfit < alert.fallbackUsed.oldProfit ? '-' : '+'}$${Math.abs(alert.fallbackUsed.newProfit - alert.fallbackUsed.oldProfit).toFixed(2)}</p>
          </div>
          ` : `
          <div style="background: #ffebee; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #C62828;">⚠️ All Suppliers Out of Stock</h3>
            <p>Primary supplier and all fallback suppliers are out of stock.</p>
            <p><strong>Recommended Actions:</strong></p>
            <ul>
              <li>Pause Google Ads campaign for this product</li>
              <li>Find alternative suppliers manually</li>
              <li>Monitor for restocking</li>
            </ul>
          </div>
          `}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is an automated stock alert from your Arbi system.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.NOTIFICATION_EMAIL,
        to: this.ownerEmail,
        subject,
        html,
      });

      console.log(`📧 Stock alert sent to ${this.ownerEmail}`);
    } catch (error: any) {
      console.error('❌ Failed to send stock alert:', error.message);
    }
  }

  /**
   * Notify when supplier price changes significantly
   */
  async notifyPriceChange(alert: PriceChangeAlert): Promise<void> {
    if (!this.isEnabled) {
      console.log('📧 [SIMULATED] Price change alert:', alert);
      return;
    }

    try {
      const subject = alert.isProfitable
        ? `📈 Price Change Alert: ${alert.productTitle}`
        : `🚨 URGENT: Price Increase Makes Product Unprofitable: ${alert.productTitle}`;

      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: ${alert.isProfitable ? '#FF9800' : '#F44336'};">
            ${alert.isProfitable ? '📈 Price Change Detected' : '🚨 Critical Price Increase'}
          </h2>

          <div style="background: #f5f5f5; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Product Information</h3>
            <p><strong>Product:</strong> ${alert.productTitle}</p>
            <p><strong>Listing ID:</strong> ${alert.listingId}</p>
            <p><strong>Vendor:</strong> ${alert.vendor.toUpperCase()}</p>
          </div>

          <div style="background: ${alert.isProfitable ? '#fff3e0' : '#ffebee'}; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0;">Price Change Details</h3>
            <p><strong>Old Price:</strong> $${alert.oldPrice.toFixed(2)}</p>
            <p><strong>New Price:</strong> $${alert.newPrice.toFixed(2)}</p>
            <p><strong>Change:</strong> ${alert.percentChange > 0 ? '+' : ''}${alert.percentChange.toFixed(1)}%</p>
            <hr style="margin: 15px 0;">
            <p><strong>Old Profit:</strong> $${alert.oldProfit.toFixed(2)}</p>
            <p><strong>New Profit:</strong> $${alert.newProfit.toFixed(2)}</p>
            <p style="color: ${alert.newProfit < alert.oldProfit ? '#C62828' : '#2e7d32'};">
              <strong>Profit Impact:</strong> ${alert.newProfit < alert.oldProfit ? '-' : '+'}$${Math.abs(alert.newProfit - alert.oldProfit).toFixed(2)}
            </p>
          </div>

          ${!alert.isProfitable ? `
          <div style="background: #ffcdd2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C62828;">
            <h3 style="margin-top: 0; color: #C62828;">⚠️ IMMEDIATE ACTION REQUIRED</h3>
            <p>This product is no longer profitable at the current supplier price.</p>
            <p><strong>Recommended Actions:</strong></p>
            <ol>
              <li><strong>Pause Google Ads campaign immediately</strong> to prevent losses</li>
              <li>Find alternative suppliers with lower prices</li>
              <li>Increase your selling price (if market allows)</li>
              <li>Remove product from marketplace</li>
            </ol>
          </div>
          ` : `
          <div style="background: #e8f5e9; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #2e7d32;">✅ Still Profitable</h3>
            <p>Despite the price change, this product remains profitable. Consider monitoring for further changes.</p>
          </div>
          `}

          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd; color: #666; font-size: 12px;">
            <p>This is an automated price monitoring alert from your Arbi system.</p>
          </div>
        </div>
      `;

      await this.transporter.sendMail({
        from: process.env.NOTIFICATION_EMAIL,
        to: this.ownerEmail,
        subject,
        html,
      });

      console.log(`📧 Price change alert sent to ${this.ownerEmail}`);
    } catch (error: any) {
      console.error('❌ Failed to send price change alert:', error.message);
    }
  }
}

// Export singleton
export const emailNotifier = new EmailNotifierService();
