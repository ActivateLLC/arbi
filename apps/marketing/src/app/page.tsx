import Link from 'next/link';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Navigation */}
      <nav className="border-b border-slate-700/50 bg-slate-900/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">A</span>
              </div>
              <span className="text-2xl font-bold text-white">ARBI</span>
              <span className="px-2 py-0.5 text-xs font-semibold bg-primary-500/20 text-primary-400 rounded-full border border-primary-500/30">
                BETA
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="#pricing" className="text-slate-300 hover:text-white transition">
                Pricing
              </Link>
              <Link href="#features" className="text-slate-300 hover:text-white transition">
                Features
              </Link>
              <Link
                href="/signup"
                className="px-4 py-2 bg-primary-600 hover:bg-primary-500 text-white rounded-lg font-medium transition"
              >
                Get Early Access
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-20 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center space-x-2 px-4 py-2 bg-primary-500/10 border border-primary-500/30 rounded-full mb-8">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-primary-500"></span>
            </span>
            <span className="text-sm font-medium text-primary-400">Now Accepting Beta Users</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
            Make $10K+/Month
            <br />
            <span className="bg-gradient-to-r from-primary-400 to-primary-600 bg-clip-text text-transparent">
              With ZERO Capital
            </span>
          </h1>

          <p className="text-xl sm:text-2xl text-slate-300 mb-8 max-w-3xl mx-auto">
            Automated arbitrage platform that finds profitable products, creates listings,
            and helps you flip them—without buying anything upfront.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 mb-12">
            <Link
              href="/signup"
              className="w-full sm:w-auto px-8 py-4 bg-primary-600 hover:bg-primary-500 text-white text-lg font-semibold rounded-lg transition shadow-lg shadow-primary-500/50"
            >
              Start Free Beta Trial
            </Link>
            <Link
              href="#how-it-works"
              className="w-full sm:w-auto px-8 py-4 bg-slate-800 hover:bg-slate-700 text-white text-lg font-semibold rounded-lg transition border border-slate-700"
            >
              Watch Demo
            </Link>
          </div>

          <div className="flex items-center justify-center space-x-8 text-sm text-slate-400">
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>No upfront capital needed</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Fully automated</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>Cancel anytime</span>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof */}
      <section className="py-12 border-y border-slate-700/50 bg-slate-800/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            <div>
              <div className="text-4xl font-bold text-white mb-2">$2.3M+</div>
              <div className="text-sm text-slate-400">Profit Generated</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">15K+</div>
              <div className="text-sm text-slate-400">Products Flipped</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">10+</div>
              <div className="text-sm text-slate-400">Platforms Supported</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-white mb-2">$0</div>
              <div className="text-sm text-slate-400">Capital Required</div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              How Zero-Capital Arbitrage Works
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Make money flipping products without ever touching them or investing a dollar
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-primary-500/50 transition">
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-primary-400">1</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Find Opportunities</h3>
              <p className="text-slate-300">
                ARBI scans eBay, Amazon, Walmart, and 10+ platforms every 15 minutes to find products
                priced lower on one platform than another.
              </p>
              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div className="text-sm text-slate-400 mb-2">Example:</div>
                <div className="flex items-center justify-between">
                  <span className="text-green-400">eBay: $50</span>
                  <span className="text-slate-500">→</span>
                  <span className="text-primary-400">Amazon: $90</span>
                </div>
                <div className="text-sm text-green-400 font-semibold mt-2">Profit: $22 (44% ROI)</div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-primary-500/50 transition">
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-primary-400">2</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Create Listings</h3>
              <p className="text-slate-300">
                System automatically extracts product photos, downloads them, and creates
                professional listings on your destination platform. No manual work.
              </p>
              <div className="mt-6 space-y-3">
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Auto photo extraction</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Optimized descriptions</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-300">
                  <svg className="w-5 h-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Competitive pricing</span>
                </div>
              </div>
            </div>

            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8 hover:border-primary-500/50 transition">
              <div className="w-12 h-12 bg-primary-500/20 rounded-xl flex items-center justify-center mb-6">
                <span className="text-2xl font-bold text-primary-400">3</span>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Profit Automatically</h3>
              <p className="text-slate-300">
                When a customer buys, you purchase from the source platform and ship directly
                to them. Zero handling, zero inventory, zero capital.
              </p>
              <div className="mt-6 p-4 bg-slate-900/50 rounded-lg border border-slate-700/50">
                <div className="text-sm space-y-2">
                  <div className="flex justify-between text-slate-300">
                    <span>Customer pays:</span>
                    <span className="text-green-400">+$90</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>You buy from source:</span>
                    <span className="text-red-400">-$50</span>
                  </div>
                  <div className="flex justify-between text-slate-300">
                    <span>Platform fees:</span>
                    <span className="text-red-400">-$18</span>
                  </div>
                  <div className="border-t border-slate-700 pt-2 flex justify-between font-semibold">
                    <span className="text-white">Net profit:</span>
                    <span className="text-green-400">$22</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-800/30">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Professional arbitrage tools that give you an unfair advantage
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              {
                title: 'Multi-Platform Scanning',
                description: 'Automatically scans eBay, Amazon, Walmart, and 10+ platforms every 15 minutes for price gaps',
                icon: '🔍'
              },
              {
                title: 'Auto Photo Extraction',
                description: 'Downloads product photos and uploads to CDN for fast, reliable listing creation',
                icon: '📸'
              },
              {
                title: 'Availability Monitoring',
                description: 'Checks source items every 15 min to prevent overselling and maintain 5-star ratings',
                icon: '⚡'
              },
              {
                title: 'Auto-Listing Creation',
                description: 'Creates professional listings on eBay and Amazon with one click',
                icon: '🚀'
              },
              {
                title: 'Profit Calculator',
                description: 'Accounts for all fees, shipping, and costs to show real net profit',
                icon: '💰'
              },
              {
                title: 'Real-Time Alerts',
                description: 'Get notified via email/SMS when high-profit opportunities are found',
                icon: '🔔'
              }
            ].map((feature, index) => (
              <div key={index} className="bg-slate-800/50 border border-slate-700 rounded-xl p-6 hover:border-primary-500/50 transition">
                <div className="text-4xl mb-4">{feature.icon}</div>
                <h3 className="text-xl font-bold text-white mb-2">{feature.title}</h3>
                <p className="text-slate-300">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-slate-300 max-w-2xl mx-auto">
              Choose the plan that fits your arbitrage goals
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {/* Starter */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Starter</h3>
                <div className="text-5xl font-bold text-white mb-2">$49</div>
                <div className="text-slate-400">per month</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Up to 25 active listings</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Opportunity scanner</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Availability monitoring</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Email alerts</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Basic support</span>
                </li>
              </ul>
              <Link href="/signup?plan=starter" className="block w-full py-3 px-6 text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition">
                Start Free Beta
              </Link>
            </div>

            {/* Professional - Highlighted */}
            <div className="bg-gradient-to-br from-primary-600 to-primary-700 border-2 border-primary-500 rounded-2xl p-8 relative">
              <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                <span className="px-4 py-1 bg-primary-400 text-white text-sm font-bold rounded-full">
                  MOST POPULAR
                </span>
              </div>
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Professional</h3>
                <div className="text-5xl font-bold text-white mb-2">$149</div>
                <div className="text-primary-100">per month</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white font-medium">Everything in Starter</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">Up to 100 active listings</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">Auto photo extraction</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">Auto-listing on eBay</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-white flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-white">Priority support</span>
                </li>
              </ul>
              <Link href="/signup?plan=professional" className="block w-full py-3 px-6 text-center bg-white hover:bg-slate-100 text-primary-600 font-semibold rounded-lg transition">
                Start Free Beta
              </Link>
            </div>

            {/* Business */}
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl p-8">
              <div className="text-center mb-8">
                <h3 className="text-2xl font-bold text-white mb-2">Business</h3>
                <div className="text-5xl font-bold text-white mb-2">$399</div>
                <div className="text-slate-400">per month</div>
              </div>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300 font-medium">Everything in Professional</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Up to 500 active listings</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Amazon auto-listing</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">API access</span>
                </li>
                <li className="flex items-start space-x-3">
                  <svg className="w-6 h-6 text-green-500 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span className="text-slate-300">Dedicated support</span>
                </li>
              </ul>
              <Link href="/signup?plan=business" className="block w-full py-3 px-6 text-center bg-slate-700 hover:bg-slate-600 text-white font-semibold rounded-lg transition">
                Start Free Beta
              </Link>
            </div>
          </div>

          <div className="text-center mt-12">
            <p className="text-slate-400">
              All plans include a 14-day free trial. No credit card required for beta.
            </p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-gradient-to-r from-primary-600 to-primary-700">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl sm:text-5xl font-bold text-white mb-6">
            Ready to Start Making Money?
          </h2>
          <p className="text-xl text-primary-100 mb-8">
            Join the beta and get early access to the platform that's changing e-commerce arbitrage
          </p>
          <Link
            href="/signup"
            className="inline-block px-8 py-4 bg-white hover:bg-slate-100 text-primary-600 text-lg font-semibold rounded-lg transition shadow-lg"
          >
            Start Free Beta Trial
          </Link>
          <p className="mt-4 text-sm text-primary-100">
            Limited spots available • No credit card required
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-700/50 bg-slate-900/50 py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold text-lg">A</span>
                </div>
                <span className="text-xl font-bold text-white">ARBI</span>
              </div>
              <p className="text-slate-400 text-sm">
                Zero-capital arbitrage automation platform
              </p>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="#features" className="text-slate-400 hover:text-white transition">Features</Link></li>
                <li><Link href="#pricing" className="text-slate-400 hover:text-white transition">Pricing</Link></li>
                <li><Link href="#how-it-works" className="text-slate-400 hover:text-white transition">How It Works</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/about" className="text-slate-400 hover:text-white transition">About</Link></li>
                <li><Link href="/blog" className="text-slate-400 hover:text-white transition">Blog</Link></li>
                <li><Link href="/contact" className="text-slate-400 hover:text-white transition">Contact</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li><Link href="/privacy" className="text-slate-400 hover:text-white transition">Privacy</Link></li>
                <li><Link href="/terms" className="text-slate-400 hover:text-white transition">Terms</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700/50 pt-8 text-center text-sm text-slate-400">
            <p>&copy; 2024 ARBI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
