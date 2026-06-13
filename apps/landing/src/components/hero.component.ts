import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef, signal, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-hero',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative pt-40 pb-32 min-h-screen flex items-center justify-center overflow-hidden">
      
      <!-- Decorative Lines -->
      <div class="absolute top-0 left-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>
      <div class="absolute top-0 right-1/4 w-[1px] h-full bg-gradient-to-b from-transparent via-white/10 to-transparent"></div>

      <div class="max-w-7xl mx-auto px-4 sm:px-6 relative z-10 w-full">
        <div class="flex flex-col items-center text-center">
          
          <!-- Scarcity/Status Badge -->
          <div #badge class="opacity-0 translate-y-4 mb-8">
             <div class="inline-flex items-center gap-3 px-6 py-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 backdrop-blur-md cyber-clip-sm">
                <div class="w-2 h-2 bg-[#00f0ff] animate-pulse shadow-[0_0_10px_#00f0ff]"></div>
                <span class="text-[#00f0ff] text-xs font-bold tracking-[0.2em] uppercase">High Demand: Server Load 89%</span>
             </div>
          </div>

          <!-- Headline: "The Unfair Advantage" Trigger -->
          <h1 #headline class="text-[2.5rem] xs:text-5xl sm:text-6xl md:text-7xl lg:text-9xl font-extrabold tracking-tight sm:tracking-tighter mb-8 leading-[0.9] text-white uppercase font-syne mix-blend-lighten px-2">
            <div class="overflow-hidden"><span class="block text-stroke-white">YOUR UNFAIR</span></div>
            <div class="overflow-visible relative">
               <span class="block text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] via-white to-[#7000ff] pb-4 filter drop-shadow-[0_0_30px_rgba(0,240,255,0.3)]">
                 ADVANTAGE
               </span>
            </div>
          </h1>

          <!-- Subheadline: "Manual is Dead" Trigger -->
          <p #subtext class="opacity-0 translate-y-4 text-base md:text-xl text-slate-400 max-w-2xl mb-8 leading-relaxed px-4 font-light">
            Manual trading is obsolete. While your competitors sleep, <span class="text-white font-bold">Arbi executes.</span>
            Secure your position in the algorithmic economy.
          </p>

          <div #subtext2 class="opacity-0 translate-y-4 mb-10 flex items-center justify-center gap-4 text-xs font-mono text-slate-500 uppercase tracking-widest">
            <span class="flex items-center gap-2"><i class="ri-checkbox-circle-line text-[#00f0ff]"></i> No Code Required</span>
            <span class="flex items-center gap-2"><i class="ri-checkbox-circle-line text-[#00f0ff]"></i> 100% Automated</span>
          </div>

          <!-- CTAs -->
          <div #btns class="opacity-0 translate-y-4 flex flex-col sm:flex-row items-center gap-6 w-full sm:w-auto px-4">
            <button class="w-full sm:w-auto group relative px-10 py-5 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip shadow-[0_0_30px_rgba(0,240,255,0.4)] hover:shadow-[0_0_50px_rgba(0,240,255,0.6)] hover:-translate-y-1">
              <span class="relative z-10">Start Profiting</span>
              <div class="absolute inset-0 bg-white opacity-0 group-hover:opacity-100 transition-opacity mix-blend-overlay"></div>
            </button>
            <button class="w-full sm:w-auto px-10 py-5 bg-transparent border border-white/20 text-white font-bold text-sm uppercase tracking-widest hover:bg-white/5 transition-all cyber-clip hover:border-[#00f0ff]/50 hover:text-[#00f0ff]">
              Watch Demo
            </button>
          </div>

          <!-- Social Proof / FOMO Ticker -->
          <div #statsContainer class="mt-24 w-full max-w-3xl border border-white/20 bg-black/80 backdrop-blur-md cyber-clip p-1">
             <div class="bg-white/5 p-3 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center gap-2 sm:gap-4 overflow-hidden relative">
                <div class="text-xs sm:text-sm text-[#00f0ff] font-bold uppercase tracking-widest whitespace-nowrap z-10 bg-black/20 w-full sm:w-auto border-b sm:border-b-0 sm:border-r border-white/10 pb-2 sm:pb-0 sm:pr-4">Live Activity:</div>
                <div class="h-6 overflow-hidden w-full relative">
                   <div #tickerWrapper class="ticker-wrapper absolute top-0 left-0 w-full">
                      @for(tick of tickerItems; track $index) {
                        <div class="h-6 flex items-center gap-2 text-xs sm:text-sm font-mono text-slate-300 w-full">
                           <span class="text-[#00f0ff] whitespace-nowrap">USR_{{tick.user}}</span>
                           <span class="hidden xs:inline text-slate-500">found</span>
                           <span class="text-white font-bold truncate max-w-[100px] sm:max-w-none">{{tick.item}}</span>
                           <span class="text-[#7000ff] font-bold whitespace-nowrap">+\${{tick.profit}}</span>
                           <span class="text-slate-500 text-[10px] sm:text-xs ml-auto whitespace-nowrap">{{tick.time}} ago</span>
                        </div>
                      }
                   </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  `,
  styles: [`
    .text-stroke-white {
      -webkit-text-stroke: 1px rgba(255,255,255,0.3);
      color: transparent;
    }
  `]
})
export class HeroComponent implements AfterViewInit, OnDestroy {
  @ViewChild('badge') badge!: ElementRef;
  @ViewChild('headline') headline!: ElementRef;
  @ViewChild('subtext') subtext!: ElementRef;
  @ViewChild('subtext2') subtext2!: ElementRef;
  @ViewChild('btns') btns!: ElementRef;
  @ViewChild('statsContainer') statsContainer!: ElementRef;
  @ViewChild('tickerWrapper') tickerWrapper!: ElementRef;

  tickerItems = [
    { user: '8821', item: 'Lego Star Wars', profit: '42.50', time: '2s' },
    { user: '3391', item: 'Sony XM5', profit: '89.10', time: '5s' },
    { user: '1102', item: 'Nike Dunk Low', profit: '35.00', time: '12s' },
    { user: '9928', item: 'KitchenAid Mixer', profit: '112.00', time: '18s' },
    { user: '4452', item: 'Dyson Airwrap', profit: '76.40', time: '24s' },
  ];

  intervalId: any;

  ngAfterViewInit() {
    const tl = gsap.timeline({
      defaults: {
        ease: 'power4.out',
        force3D: true // Force GPU acceleration for all animations
      }
    });

    // 1. Badge
    tl.to(this.badge.nativeElement, { opacity: 1, y: 0, duration: 1 });

    // 2. Headline - optimize with force3D
    const spans = this.headline.nativeElement.querySelectorAll('span.block');
    tl.from(spans, {
      y: 150,
      opacity: 0,
      duration: 1.5,
      stagger: 0.1,
      skewY: 5,
      force3D: true
    }, "-=0.5");

    // 3. Subtext
    tl.to(this.subtext.nativeElement, { opacity: 1, y: 0, duration: 1 }, "-=1");

    // 3.5 Subtext 2
    tl.to(this.subtext2.nativeElement, { opacity: 1, y: 0, duration: 1 }, "-=0.8");

    // 4. Buttons
    tl.to(this.btns.nativeElement, { opacity: 1, y: 0, duration: 1 }, "-=0.8");

    // 5. Stats/Ticker
    tl.from(this.statsContainer.nativeElement, { opacity: 0, y: 50, duration: 1 }, "-=0.5");

    // Animate Ticker
    this.startTicker();
  }

  startTicker() {
    const itemHeight = 24; // 24px (h-6)
    let currentIndex = 0;

    this.intervalId = setInterval(() => {
      const nextIndex = (currentIndex + 1) % this.tickerItems.length;

      gsap.to(this.tickerWrapper.nativeElement, {
        y: -nextIndex * itemHeight,
        duration: 0.6,
        ease: 'power2.inOut',
        force3D: true, // GPU acceleration for smooth ticker
        onComplete: () => {
          currentIndex = nextIndex;
        }
      });
    }, 3000);
  }

  ngOnDestroy() {
    if (this.intervalId) clearInterval(this.intervalId);
  }
}