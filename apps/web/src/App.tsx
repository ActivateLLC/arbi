import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import React, { useEffect, useRef, useState } from 'react';
import Reveal from 'reveal.js';

import 'reveal.js/dist/reveal.css';
import 'reveal.js/dist/theme/black.css';

gsap.registerPlugin(ScrollTrigger);

interface PricingTier {
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  platformFee: string;
  ctaText: string;
}

const pricingTiers: PricingTier[] = [
  {
    name: 'Free',
    price: '$0',
    description: 'Perfect for getting started with zero capital',
    features: [
      'Zero capital requirement',
      'Buyer pays first model',
      'Direct shipping to customer',
      'Basic arbitrage scanning',
      'Email support',
    ],
    platformFee: '25% of sales',
    ctaText: 'Start Free',
  },
  {
    name: 'Growth',
    price: '$49',
    description: 'Scale your arbitrage business',
    features: [
      'Everything in Free',
      'Advanced opportunity scanning',
      'Priority processing',
      'Real-time price alerts',
      'Chat support',
    ],
    highlighted: true,
    platformFee: '15% of sales',
    ctaText: 'Start Growing',
  },
  {
    name: 'Pro',
    price: '$149',
    description: 'Maximum profits, minimum fees',
    features: [
      'Everything in Growth',
      'Unlimited scanning',
      'API access',
      'Custom automation rules',
      'Dedicated account manager',
    ],
    platformFee: '10% of sales',
    ctaText: 'Go Pro',
  },
  {
    name: 'Enterprise',
    price: 'Custom',
    description: 'For high-volume operations',
    features: [
      'Everything in Pro',
      'White-label solution',
      'Custom integrations',
      'SLA guarantees',
      '24/7 priority support',
    ],
    platformFee: 'Negotiable',
    ctaText: 'Contact Sales',
  },
];

function App() {
  const heroRef = useRef<HTMLDivElement>(null);
  const featuresRef = useRef<HTMLDivElement>(null);
  const pricingRef = useRef<HTMLDivElement>(null);
  const presentationRef = useRef<HTMLDivElement>(null);
  const [showPresentation, setShowPresentation] = useState(false);

  useEffect(() => {
    // Hero animations with GSAP
    const heroTimeline = gsap.timeline();
    heroTimeline
      .from('.hero-title', { y: 100, opacity: 0, duration: 1, ease: 'power3.out' })
      .from('.hero-subtitle', { y: 50, opacity: 0, duration: 0.8, ease: 'power3.out' }, '-=0.5')
      .from('.hero-cta', { y: 30, opacity: 0, duration: 0.6, ease: 'power3.out' }, '-=0.3')
      .from('.hero-badge', { scale: 0, opacity: 0, duration: 0.5, ease: 'back.out(1.7)' }, '-=0.2');

    // Feature cards scroll animation
    gsap.from('.feature-card', {
      scrollTrigger: {
        trigger: featuresRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
      y: 80,
      opacity: 0,
      duration: 0.8,
      stagger: 0.2,
      ease: 'power3.out',
    });

    // Pricing cards animation
    gsap.from('.pricing-card', {
      scrollTrigger: {
        trigger: pricingRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        toggleActions: 'play none none reverse',
      },
      y: 60,
      opacity: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power3.out',
    });

    // Stats counter animation
    gsap.from('.stat-number', {
      scrollTrigger: {
        trigger: '.stats-section',
        start: 'top 80%',
      },
      textContent: 0,
      duration: 2,
      snap: { textContent: 1 },
      stagger: 0.2,
      ease: 'power1.out',
    });

    return () => {
      ScrollTrigger.getAll().forEach((trigger) => trigger.kill());
    };
  }, []);

  useEffect(() => {
    if (showPresentation && presentationRef.current) {
      const deck = new Reveal(presentationRef.current, {
        embedded: true,
        hash: false,
        controls: true,
        progress: true,
        center: true,
        transition: 'slide',
        width: '100%',
        height: '100%',
      });
      deck.initialize();

      return () => {
        deck.destroy();
      };
    }
  }, [showPresentation]);

  return (
    <div className="landing-page">
      {/* Navigation */}
      <nav className="navbar">
        <div className="nav-container">
          <div className="nav-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">ARBI</span>
          </div>
          <div className="nav-links">
            <a href="#features">Features</a>
            <a href="#how-it-works">How It Works</a>
            <a href="#pricing">Pricing</a>
            <button className="nav-cta" onClick={() => setShowPresentation(true)}>
              Watch Demo
            </button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero" ref={heroRef}>
        <div className="hero-content">
          <div className="hero-badge">
            <span className="badge-icon">💰</span>
            <span>Zero Capital Required</span>
          </div>
          <h1 className="hero-title">
            Start Your Arbitrage Business
            <br />
            <span className="gradient-text">With Zero Investment</span>
          </h1>
          <p className="hero-subtitle">
            The revolutionary platform where buyers pay first. No inventory, no risk,
            no capital needed. Just pure profit from day one.
          </p>
          <div className="hero-cta">
            <button className="btn-primary">Get Started Free</button>
            <button className="btn-secondary" onClick={() => setShowPresentation(true)}>
              <span className="play-icon">▶</span>
              See How It Works
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <span className="stat-value">$0</span>
              <span className="stat-label">Capital Required</span>
            </div>
            <div className="stat">
              <span className="stat-value">2-3</span>
              <span className="stat-label">Days to Profit</span>
            </div>
            <div className="stat">
              <span className="stat-value">0</span>
              <span className="stat-label">Inventory Risk</span>
            </div>
          </div>
        </div>
        <div className="hero-visual">
          <div className="visual-card">
            <div className="flow-diagram">
              <div className="flow-step">
                <span className="step-number">1</span>
                <span className="step-icon">🔍</span>
                <span className="step-text">Find Deal</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-number">2</span>
                <span className="step-icon">💳</span>
                <span className="step-text">Buyer Pays First</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-number">3</span>
                <span className="step-icon">📦</span>
                <span className="step-text">Direct Ship</span>
              </div>
              <div className="flow-arrow">→</div>
              <div className="flow-step">
                <span className="step-number">4</span>
                <span className="step-icon">💰</span>
                <span className="step-text">Keep Profit</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Zero Capital Feature Section */}
      <section className="zero-capital-section" id="features" ref={featuresRef}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Revolutionary Model</span>
            <h2>Zero Capital Arbitrage</h2>
            <p>Traditional arbitrage requires thousands in capital. We changed that.</p>
          </div>

          <div className="comparison-grid">
            <div className="comparison-card old-way">
              <h3>❌ Traditional Arbitrage</h3>
              <ul>
                <li>
                  <span className="icon">💸</span>
                  Requires $1,000-$5,000 capital
                </li>
                <li>
                  <span className="icon">📦</span>
                  You store and handle inventory
                </li>
                <li>
                  <span className="icon">⏳</span>
                  7-14 days timeline
                </li>
                <li>
                  <span className="icon">⚠️</span>
                  High risk of unsold inventory
                </li>
                <li>
                  <span className="icon">📉</span>
                  Negative cash flow first
                </li>
              </ul>
            </div>

            <div className="comparison-card new-way feature-card">
              <h3>✅ ARBI Zero-Capital Model</h3>
              <ul>
                <li>
                  <span className="icon">🆓</span>
                  $0 capital required
                </li>
                <li>
                  <span className="icon">🚚</span>
                  Never touch merchandise
                </li>
                <li>
                  <span className="icon">⚡</span>
                  2-3 days timeline
                </li>
                <li>
                  <span className="icon">🛡️</span>
                  Zero inventory risk
                </li>
                <li>
                  <span className="icon">📈</span>
                  Positive cash flow from day 1
                </li>
              </ul>
            </div>
          </div>

          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">💳</div>
              <h3>Buyer Pays First</h3>
              <p>
                Customers pay you before you purchase from the supplier.
                Use their money to fulfill the order.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📦</div>
              <h3>Direct Shipping</h3>
              <p>
                Products ship directly from supplier to customer.
                You never see or touch the merchandise.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🤖</div>
              <h3>AI-Powered Scanning</h3>
              <p>
                Our AI continuously scans for profitable arbitrage opportunities
                across multiple marketplaces.
              </p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">⚡</div>
              <h3>Instant Processing</h3>
              <p>
                Automatic order fulfillment. When a buyer pays,
                we handle everything automatically.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="section-container">
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-number" data-value="10000">$10,000+</span>
              <span className="stat-description">Average Monthly Revenue</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" data-value="0">$0</span>
              <span className="stat-description">Startup Capital Needed</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" data-value="50">50%+</span>
              <span className="stat-description">Average Profit Margin</span>
            </div>
            <div className="stat-item">
              <span className="stat-number" data-value="1000">1,000+</span>
              <span className="stat-description">Active Users</span>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="how-it-works" id="how-it-works">
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Simple Process</span>
            <h2>How It Works</h2>
            <p>Start making money in 4 simple steps</p>
          </div>

          <div className="steps-timeline">
            <div className="step-item">
              <div className="step-number-large">01</div>
              <div className="step-content">
                <h3>Find Profitable Deals</h3>
                <p>
                  Our AI scans Target, Walmart, Amazon, and more to find products
                  priced below their market value. We show you exactly how much profit
                  you can make.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number-large">02</div>
              <div className="step-content">
                <h3>List on Your Marketplace</h3>
                <p>
                  Create your listing with our beautiful templates. Product images
                  are automatically hosted on our CDN for fast, professional display.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number-large">03</div>
              <div className="step-content">
                <h3>Buyer Pays You</h3>
                <p>
                  When a customer purchases, they pay YOU first through Stripe.
                  The money goes directly to your connected account instantly.
                </p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number-large">04</div>
              <div className="step-content">
                <h3>Auto-Fulfill & Profit</h3>
                <p>
                  We automatically purchase from the supplier using the buyer&apos;s payment
                  and ship directly to them. You keep the profit spread. No inventory, no hassle.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="pricing" id="pricing" ref={pricingRef}>
        <div className="section-container">
          <div className="section-header">
            <span className="section-badge">Stripe Connected</span>
            <h2>Simple, Transparent Pricing</h2>
            <p>Choose the plan that fits your business. Upgrade or downgrade anytime.</p>
          </div>

          <div className="pricing-grid">
            {pricingTiers.map((tier) => (
              <div
                key={tier.name}
                className={`pricing-card ${tier.highlighted ? 'highlighted' : ''}`}
              >
                {tier.highlighted && <div className="popular-badge">Most Popular</div>}
                <div className="pricing-header">
                  <h3>{tier.name}</h3>
                  <div className="price">
                    <span className="price-value">{tier.price}</span>
                    {tier.price !== 'Custom' && <span className="price-period">/month</span>}
                  </div>
                  <p className="pricing-description">{tier.description}</p>
                </div>
                <div className="pricing-body">
                  <div className="platform-fee">
                    <span className="fee-label">Platform Fee:</span>
                    <span className="fee-value">{tier.platformFee}</span>
                  </div>
                  <ul className="pricing-features">
                    {tier.features.map((feature, idx) => (
                      <li key={idx}>
                        <span className="check-icon">✓</span>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="pricing-footer">
                  <button className={`pricing-cta ${tier.highlighted ? 'primary' : ''}`}>
                    {tier.ctaText}
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="pricing-note">
            <p>
              <strong>💡 Free Tier:</strong> Start with zero capital and 25% platform fee.
              Perfect for testing the waters and validating the model before scaling.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="cta-section">
        <div className="section-container">
          <div className="cta-content">
            <h2>Ready to Start Your Zero-Capital Business?</h2>
            <p>
              Join thousands of entrepreneurs making money without any upfront investment.
              Start free today and scale when you&apos;re ready.
            </p>
            <div className="cta-buttons">
              <button className="btn-primary large">Start Free Now</button>
              <button className="btn-secondary large" onClick={() => setShowPresentation(true)}>
                Watch Demo First
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-container">
          <div className="footer-brand">
            <div className="nav-logo">
              <span className="logo-icon">⚡</span>
              <span className="logo-text">ARBI</span>
            </div>
            <p>Zero-capital arbitrage platform. Start making money today.</p>
          </div>
          <div className="footer-links">
            <div className="footer-column">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#pricing">Pricing</a>
              <a href="#how-it-works">How It Works</a>
            </div>
            <div className="footer-column">
              <h4>Company</h4>
              <a href="#about">About</a>
              <a href="#careers">Careers</a>
              <a href="#contact">Contact</a>
            </div>
            <div className="footer-column">
              <h4>Legal</h4>
              <a href="#privacy">Privacy Policy</a>
              <a href="#terms">Terms of Service</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 ARBI. All rights reserved. Powered by Stripe Connect.</p>
          </div>
        </div>
      </footer>

      {/* Reveal.js Presentation Modal */}
      {showPresentation && (
        <div className="presentation-overlay">
          <button className="close-presentation" onClick={() => setShowPresentation(false)}>
            ✕
          </button>
          <div className="reveal" ref={presentationRef}>
            <div className="slides">
              <section>
                <h1>ARBI</h1>
                <h3>Zero-Capital Arbitrage Platform</h3>
                <p>The future of e-commerce arbitrage</p>
              </section>
              <section>
                <h2>The Problem</h2>
                <ul>
                  <li className="fragment">Traditional arbitrage needs $1,000-$5,000 capital</li>
                  <li className="fragment">You handle and store inventory</li>
                  <li className="fragment">High risk of unsold products</li>
                  <li className="fragment">7-14 day timeline to see profit</li>
                </ul>
              </section>
              <section>
                <h2>Our Solution</h2>
                <h3 className="fragment">Zero Capital Required</h3>
                <p className="fragment">Buyer pays YOU first → You buy from supplier → Ship direct to customer</p>
              </section>
              <section>
                <h2>How It Works</h2>
                <ol>
                  <li className="fragment">Find deal (AirPods $190 → $250)</li>
                  <li className="fragment">List on your marketplace</li>
                  <li className="fragment">Buyer pays $250 to you first</li>
                  <li className="fragment">Auto-purchase from supplier ($190)</li>
                  <li className="fragment">Direct ship to buyer</li>
                  <li className="fragment">Profit: $60 (never touched anything!)</li>
                </ol>
              </section>
              <section>
                <h2>Pricing Tiers</h2>
                <table style={{ fontSize: '0.7em', width: '100%' }}>
                  <thead>
                    <tr>
                      <th>Plan</th>
                      <th>Price</th>
                      <th>Platform Fee</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="fragment">
                      <td>Free</td>
                      <td>$0/mo</td>
                      <td>25% of sales</td>
                    </tr>
                    <tr className="fragment">
                      <td>Growth</td>
                      <td>$49/mo</td>
                      <td>15% of sales</td>
                    </tr>
                    <tr className="fragment">
                      <td>Pro</td>
                      <td>$149/mo</td>
                      <td>10% of sales</td>
                    </tr>
                    <tr className="fragment">
                      <td>Enterprise</td>
                      <td>Custom</td>
                      <td>Negotiable</td>
                    </tr>
                  </tbody>
                </table>
              </section>
              <section>
                <h2>Start Today</h2>
                <p>Zero capital. Zero risk. Pure profit.</p>
                <p className="fragment">🚀 Get started at arbi.cream.dev</p>
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
