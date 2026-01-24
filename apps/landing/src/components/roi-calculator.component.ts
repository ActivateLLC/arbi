import { Component, computed, signal, ChangeDetectionStrategy, ViewChild, ElementRef, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';

@Component({
  selector: 'app-roi-calculator',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-32 relative">
      <div class="max-w-6xl mx-auto px-6">
        
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-20 items-center">
          
          <!-- Controls -->
          <div>
            <h2 class="text-3xl sm:text-4xl md:text-5xl font-syne font-bold mb-4 sm:mb-6 text-white uppercase">Revenue <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">Calculator</span></h2>
            <p class="text-sm sm:text-base text-slate-400 mb-8 sm:mb-12 font-light border-l border-[#00f0ff] pl-4 sm:pl-6 py-2">
              See your potential monthly revenue. Higher tiers unlock more campaigns and higher profit-per-sale caps powered by AI optimization.
            </p>

            <!-- Slider 1 -->
            <div class="mb-12">
              <div class="flex justify-between mb-4 font-mono text-xs uppercase tracking-widest">
                <label class="text-[#00f0ff]">Active Campaigns/Day</label>
                <span class="text-white">{{ tradesPerDay() }} CAMPAIGNS</span>
              </div>
              <div class="relative h-10 flex items-center">
                <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-slate-900 w-full cyber-clip-sm pointer-events-none">
                  <div class="absolute top-0 left-0 h-full bg-[#00f0ff] transition-all duration-75" [style.width.%]="(tradesPerDay() / maxTradesPerDay()) * 100"></div>
                </div>
                <input
                  type="range" min="1" [attr.max]="maxTradesPerDay()" step="1"
                  [ngModel]="tradesPerDay()" (ngModelChange)="updateTrades($event)"
                  class="slider-input absolute inset-0 w-full h-full cursor-pointer z-10 appearance-none bg-transparent"
                >
                <div class="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white border-2 border-[#00f0ff] pointer-events-none transition-all duration-75" [style.left]="'calc(' + ((tradesPerDay() / maxTradesPerDay()) * 100) + '% - 8px)'"></div>
              </div>
            </div>

            <!-- Slider 2 -->
            <div class="mb-12">
              <div class="flex justify-between mb-4 font-mono text-xs uppercase tracking-widest">
                <label class="text-[#7000ff]">Avg. Profit / Sale</label>
                <span class="text-white">\${{ profitPerTrade() }}</span>
              </div>
              <div class="relative h-10 flex items-center">
                <div class="absolute inset-x-0 top-1/2 -translate-y-1/2 h-2 bg-slate-900 w-full cyber-clip-sm pointer-events-none">
                  <div class="absolute top-0 left-0 h-full bg-[#7000ff] transition-all duration-75" [style.width.%]="(profitPerTrade() / maxProfitPerTrade()) * 100"></div>
                </div>
                <input
                  type="range" min="5" [attr.max]="maxProfitPerTrade()" step="1"
                  [ngModel]="profitPerTrade()" (ngModelChange)="updateProfit($event)"
                  class="slider-input absolute inset-0 w-full h-full cursor-pointer z-10 appearance-none bg-transparent"
                >
                <div class="absolute top-1/2 -translate-y-1/2 w-4 h-8 bg-white border-2 border-[#7000ff] pointer-events-none transition-all duration-75" [style.left]="'calc(' + ((profitPerTrade() / maxProfitPerTrade()) * 100) + '% - 8px)'"></div>
              </div>
            </div>

            <!-- Tiers -->
            <div class="flex gap-2">
              @for(plan of plans; track plan.name) {
                <button 
                  (click)="selectPlan(plan)"
                  class="flex-1 py-4 text-xs font-bold uppercase tracking-widest cyber-clip-sm transition-all duration-300 border"
                  [class.bg-[#00f0ff]]="selectedPlan().name === plan.name"
                  [class.text-black]="selectedPlan().name === plan.name"
                  [class.border-transparent]="selectedPlan().name === plan.name"
                  [class.bg-transparent]="selectedPlan().name !== plan.name"
                  [class.text-slate-500]="selectedPlan().name !== plan.name"
                  [class.border-slate-800]="selectedPlan().name !== plan.name"
                  [class.hover:border-slate-600]="selectedPlan().name !== plan.name"
                >
                  {{ plan.name }}
                </button>
              }
            </div>

          </div>

          <!-- Result Hologram -->
          <div #resultCard class="relative">
             <div class="absolute inset-0 bg-gradient-to-tr from-[#00f0ff] to-[#7000ff] blur-[60px] opacity-20"></div>
             
             <div class="relative bg-black/80 border border-[#00f0ff]/30 p-10 cyber-clip">
                <div class="absolute top-0 right-0 p-4">
                   <div class="w-16 h-16 border-t-2 border-r-2 border-[#00f0ff] rounded-tr-3xl opacity-50"></div>
                </div>
                <div class="absolute bottom-0 left-0 p-4">
                   <div class="w-16 h-16 border-b-2 border-l-2 border-[#7000ff] rounded-bl-3xl opacity-50"></div>
                </div>

                <div class="text-center">
                  <h3 class="text-[#00f0ff] font-mono text-xs uppercase tracking-[0.3em] mb-6 sm:mb-8">Est. Net Monthly Yield</h3>

                  <div class="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-syne font-bold text-white mb-2 text-glow">
                    \${{ monthlyNetProfit() | number }}
                  </div>

                  <p class="text-slate-500 font-mono text-xs mb-8 sm:mb-10">Subscription adjusted</p>

                  <div class="grid grid-cols-2 gap-8 border-t border-white/10 pt-8">
                    <div>
                       <div class="text-3xl font-bold text-white">{{ roi() }}x</div>
                       <div class="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Multiplier</div>
                    </div>
                    <div>
                       <div class="text-3xl font-bold text-white">\${{ monthlyGrossProfit() | number }}</div>
                       <div class="text-[10px] text-slate-500 uppercase tracking-widest mt-1">Gross Rev</div>
                    </div>
                  </div>
                </div>
             </div>
          </div>

        </div>
      </div>
    </section>
  `,
  styles: [`
    .slider-input {
      -webkit-appearance: none;
      appearance: none;
    }
    .slider-input::-webkit-slider-thumb {
      -webkit-appearance: none;
      appearance: none;
      width: 16px;
      height: 40px;
      background: transparent;
      cursor: pointer;
      border: none;
    }
    .slider-input::-moz-range-thumb {
      width: 16px;
      height: 40px;
      background: transparent;
      cursor: pointer;
      border: none;
    }
    .slider-input::-webkit-slider-runnable-track {
      height: 40px;
      background: transparent;
    }
    .slider-input::-moz-range-track {
      height: 40px;
      background: transparent;
    }
  `]
})
export class RoiCalculatorComponent implements AfterViewInit {
  @ViewChild('resultCard') resultCard!: ElementRef;

  tradesPerDay = signal(5);
  profitPerTrade = signal(20);
  maxTradesPerDay = signal(30);
  maxProfitPerTrade = signal(50);

  plans = [
    { name: 'Starter', price: 49, tradesPerDay: 8, profitPerTrade: 25, maxTradesPerDay: 20, maxProfitPerTrade: 40 },
    { name: 'Pro', price: 97, tradesPerDay: 16, profitPerTrade: 35, maxTradesPerDay: 35, maxProfitPerTrade: 60 },
    { name: 'Business', price: 197, tradesPerDay: 24, profitPerTrade: 50, maxTradesPerDay: 50, maxProfitPerTrade: 100 },
  ];

  selectedPlan = signal(this.plans[1]); 

  monthlyGrossProfit = computed(() => this.tradesPerDay() * this.profitPerTrade() * 30);
  monthlyNetProfit = computed(() => this.monthlyGrossProfit() - this.selectedPlan().price);
  roi = computed(() => {
    const cost = this.selectedPlan().price;
    if (cost === 0) return 0;
    return (this.monthlyNetProfit() / cost).toFixed(1);
  });

  ngAfterViewInit() {
    gsap.to(this.resultCard.nativeElement, {
      y: -15,
      duration: 4,
      repeat: -1,
      yoyo: true,
      ease: 'sine.inOut'
    });
  }

  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      this.audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioCtx;
  }

  triggerHaptic(pattern: number | number[] = 5) {
    // 1. Vibration
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(pattern);
    }

    // 2. Sound (Haptic Audio)
    const ctx = this.getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc.connect(gain);
      gain.connect(ctx.destination);

      const isHeavy = Array.isArray(pattern) || pattern > 20;

      if (isHeavy) {
        // "Harder" sound - lower pitch, square wave, longer
        osc.type = 'square';
        osc.frequency.setValueAtTime(150, ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(40, ctx.currentTime + 0.1);
        
        gain.gain.setValueAtTime(0.15, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.1);
      } else {
        // Light "tick"
        osc.type = 'sine';
        osc.frequency.setValueAtTime(800, ctx.currentTime);
        
        gain.gain.setValueAtTime(0.05, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.03);
        
        osc.start();
        osc.stop(ctx.currentTime + 0.03);
      }
    }
  }

  selectPlan(plan: any) {
    this.selectedPlan.set(plan);
    this.maxTradesPerDay.set(plan.maxTradesPerDay);
    this.maxProfitPerTrade.set(plan.maxProfitPerTrade);
    this.tradesPerDay.set(plan.tradesPerDay);
    this.profitPerTrade.set(plan.profitPerTrade);
    this.triggerHaptic([40, 30, 40]); // Harder vibration pattern
  }

  updateTrades(val: number | string) {
    const newVal = Number(val);
    if (newVal !== this.tradesPerDay()) {
      this.tradesPerDay.set(newVal);
      this.triggerHaptic(10); // Slightly stronger tick
    }
  }

  updateProfit(val: number | string) {
    const newVal = Number(val);
    if (newVal !== this.profitPerTrade()) {
      this.profitPerTrade.set(newVal);
      this.triggerHaptic(10); // Slightly stronger tick
    }
  }
}