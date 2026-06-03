import { Component, ChangeDetectionStrategy, signal, AfterViewInit, ViewChildren, QueryList, ElementRef, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-pricing',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-32 relative" id="pricing-section">
      <div class="max-w-7xl mx-auto px-6">
        
        <div class="text-center max-w-3xl mx-auto mb-24 opacity-0 section-header">
          <h2 class="text-5xl font-syne font-bold mb-6 text-white uppercase">Choose Your <span class="text-stroke-white text-transparent">Plan</span></h2>
          <p class="text-slate-400 mb-8">Automate arbitrage. Save time. Control risk.</p>
          
          <div class="inline-flex p-1 bg-slate-900/50 border border-white/10 cyber-clip-sm">
             <button (click)="annual.set(false)" class="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all" [class.bg-white]="!annual()" [class.text-black]="!annual()" [class.text-slate-500]="annual()">Monthly</button>
             <button (click)="annual.set(true)" class="px-6 py-2 text-xs font-bold uppercase tracking-widest transition-all" [class.bg-[#00f0ff]]="annual()" [class.text-black]="annual()" [class.text-slate-500]="!annual()">Annual (-17%)</button>
          </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8 items-stretch mb-24">
          
          @for (tier of tiers; track tier.name) {
            <div 
              #pricingCard
              class="pricing-card relative p-[1px] group opacity-0 translate-y-20 cyber-clip transition-transform duration-300 hover:-translate-y-2"
              [class.z-10]="tier.popular"
              [class.scale-105]="tier.popular"
            >
              <!-- Gradient Border -->
              <div class="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent cyber-clip"></div>
              @if(tier.popular) { <div class="absolute inset-0 bg-gradient-to-b from-[#00f0ff] to-[#7000ff] cyber-clip opacity-50 blur-md"></div> }

              <div class="relative h-full bg-[#0a0a0a] cyber-clip p-8 flex flex-col">
                @if (tier.popular) {
                  <div class="absolute top-0 right-0 bg-[#00f0ff] text-black text-[10px] font-bold uppercase px-4 py-1 cyber-clip-sm tracking-widest">Recommended</div>
                }

                <h3 class="text-2xl font-syne font-bold text-white mb-2 uppercase">{{ tier.name }}</h3>
                <p class="text-slate-500 text-xs mb-8 h-8">{{ tier.description }}</p>

                <div class="flex items-baseline gap-1 mb-8">
                  <span class="text-5xl font-bold text-white tracking-tighter">\${{ getPrice(tier.price) }}</span>
                  <span class="text-slate-500 text-xs uppercase">/ Mo</span>
                </div>

                <!-- Limits Grid -->
                <div class="grid grid-cols-2 gap-px bg-white/10 mb-8 border border-white/10">
                  <div class="bg-[#0a0a0a] p-3 text-center">
                    <div class="text-white font-bold text-sm">{{ tier.limits.opportunities }}</div>
                    <div class="text-[10px] text-slate-500 uppercase">Opps/Day</div>
                  </div>
                  <div class="bg-[#0a0a0a] p-3 text-center">
                    <div class="text-white font-bold text-sm">{{ tier.limits.calls }}</div>
                    <div class="text-[10px] text-slate-500 uppercase">Calls/Mo</div>
                  </div>
                </div>

                <ul class="space-y-4 mb-10 flex-1">
                  @for (feature of tier.features; track feature) {
                    <li class="flex items-start gap-3 text-sm text-slate-300">
                      <div class="w-1 h-1 bg-[#00f0ff] mt-2 box-content border border-[#00f0ff] shadow-[0_0_5px_#00f0ff]"></div>
                      <span class="text-xs uppercase tracking-wide">{{ feature }}</span>
                    </li>
                  }
                </ul>

                <div class="text-center mb-6">
                   <span class="text-[#00f0ff] font-bold text-xs uppercase tracking-widest border-b border-[#00f0ff]/30 pb-1">Est. ROI: {{ tier.roiText }}</span>
                </div>

                <button
                  (click)="onSelectPlan(tier)"
                  class="w-full py-4 font-bold text-sm uppercase tracking-widest cyber-clip-sm transition-all border group-hover:bg-white group-hover:text-black"
                  [class.bg-[#00f0ff]]="tier.popular"
                  [class.text-black]="tier.popular"
                  [class.border-transparent]="tier.popular"
                  [class.bg-transparent]="!tier.popular"
                  [class.text-white]="!tier.popular"
                  [class.border-white]="!tier.popular"
                >
                  {{ tier.cta }}
                </button>
              </div>
            </div>
          }
        </div>

        <!-- Risk Reversal / Guarantee Section -->
        <div class="max-w-4xl mx-auto border border-white/10 bg-white/5 p-8 md:p-12 cyber-clip relative overflow-hidden">
           <div class="absolute -right-10 -top-10 w-40 h-40 bg-[#00f0ff] blur-[100px] opacity-10"></div>
           
           <div class="flex flex-col md:flex-row items-center gap-8">
              <div class="w-24 h-24 flex-shrink-0 flex items-center justify-center border-2 border-[#00f0ff] text-[#00f0ff] rounded-full">
                 <i class="ri-shield-check-line text-5xl"></i>
              </div>
              <div>
                 <h3 class="text-2xl font-syne font-bold text-white uppercase mb-2">The "Profit-or-Free" Guarantee</h3>
                 <p class="text-slate-400 leading-relaxed text-sm mb-4">
                    We are mathematically confident in our algorithm. If you don't find at least <span class="text-white font-bold">10 profitable opportunities</span> in your first 30 days, we will refund 100% of your subscription. No questions asked.
                 </p>
                 <div class="text-[10px] text-slate-500 uppercase tracking-widest font-mono">
                    Protocol Safety: <span class="text-[#00f0ff]">Active</span>
                 </div>
              </div>
           </div>
        </div>

      </div>
    </section>
  `,
  styles: [`
    .text-stroke-white {
      -webkit-text-stroke: 1px rgba(255,255,255,0.5);
    }
  `]
})
export class PricingComponent implements AfterViewInit {
  @ViewChildren('pricingCard') pricingCards!: QueryList<ElementRef>;
  @Output() planSelected = new EventEmitter<{name: string, price: number, limits: string}>();
  annual = signal(false);

  tiers = [
    {
      name: 'Starter',
      price: 49,
      description: 'First-time arbitrage sellers',
      limits: { opportunities: '100', calls: '1K' },
      features: ['Web Scraper v1', 'Email Support', 'Manual Review', 'Forum Access'],
      roiText: '9x Yield',
      cta: 'Start Free Trial',
      whoItsFor: 'Perfect for testing the system'
    },
    {
      name: 'Pro',
      price: 97,
      popular: true,
      description: 'Proven sellers scaling revenue',
      limits: { opportunities: '500', calls: '10K' },
      features: ['Rainforest API', 'AI Profit Eval', 'Auto-Listing', 'Priority Support'],
      roiText: '31x Yield',
      cta: 'Start Pro Trial',
      whoItsFor: 'Most popular for growing sellers'
    },
    {
      name: 'Business',
      price: 197,
      description: 'Agencies & high-volume operations',
      limits: { opportunities: '∞', calls: '50K' },
      features: ['Voice Interface', 'Ad Automation', 'Auto-Trade Bot', 'Webhook API'],
      roiText: '76x Yield',
      cta: 'Talk to Sales',
      whoItsFor: 'Enterprise-grade automation'
    }
  ];

  ngAfterViewInit() {
    gsap.to('.section-header', {
      scrollTrigger: { trigger: '.section-header', start: 'top 80%' },
      opacity: 1, duration: 1
    });

    const cards = this.pricingCards.toArray().map(el => el.nativeElement);
    gsap.to(cards, {
      scrollTrigger: { trigger: cards[0], start: 'top 85%' },
      opacity: 1, y: 0, duration: 0.8, stagger: 0.2
    });
  }

  getPrice(basePrice: number): number {
    return this.annual() ? Math.floor(basePrice * 10 / 12) : basePrice;
  }

  onSelectPlan(tier: any) {
    this.planSelected.emit({
      name: tier.name,
      price: this.getPrice(tier.price),
      limits: `${tier.limits.opportunities} opportunities/day`
    });
  }
}