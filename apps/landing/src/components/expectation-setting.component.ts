import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-expectation-setting',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <!-- Progress Indicator -->
      <div class="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-[#00f0ff] text-black flex items-center justify-center text-xs font-bold">
            <i class="ri-check-line text-lg"></i>
          </div>
          <span class="text-white text-sm font-mono">Account</span>
        </div>
        <div class="w-12 h-px bg-[#00f0ff]"></div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-[#00f0ff] text-black flex items-center justify-center text-xs font-bold">2</div>
          <span class="text-white text-sm font-mono">Payment</span>
        </div>
        <div class="w-12 h-px bg-white/20"></div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center text-xs font-bold">3</div>
          <span class="text-white/40 text-sm font-mono">Setup</span>
        </div>
      </div>

      <!-- Main Content -->
      <div class="relative bg-[#0a0a0a] border border-[#00f0ff]/30 p-1 w-full max-w-lg cyber-clip shadow-[0_0_50px_rgba(0,240,255,0.15)]">
        <div class="bg-[#0a0a0a] p-10 cyber-clip relative overflow-hidden">
          <!-- Header -->
          <div class="mb-8 text-center">
            <div class="w-20 h-20 mx-auto mb-6 rounded-full bg-[#00f0ff]/10 border-2 border-[#00f0ff] flex items-center justify-center">
              <i class="ri-check-line text-4xl text-[#00f0ff]"></i>
            </div>
            <h2 class="text-3xl font-syne font-bold text-white mb-2 uppercase">
              Account <span class="text-[#00f0ff]">Created</span>
            </h2>
            <div class="h-0.5 w-12 bg-[#00f0ff] mb-4 mx-auto"></div>
            <p class="text-slate-400 text-sm">
              {{ email() }}
            </p>
          </div>

          <!-- Checklist -->
          <div class="space-y-4 mb-8">
            <div class="checklist-item flex items-center gap-4 p-4 bg-slate-900/30 border border-white/10 cyber-clip-sm opacity-0">
              <div class="w-6 h-6 rounded-full bg-[#00f0ff] flex items-center justify-center flex-shrink-0">
                <i class="ri-check-line text-black text-sm"></i>
              </div>
              <div>
                <p class="text-white font-bold text-sm">Account Created</p>
                <p class="text-slate-500 text-xs">{{ email() }}</p>
              </div>
            </div>

            <div class="checklist-item flex items-center gap-4 p-4 bg-slate-900/30 border border-white/10 cyber-clip-sm opacity-0">
              <div class="w-6 h-6 rounded-full bg-[#00f0ff] flex items-center justify-center flex-shrink-0">
                <i class="ri-check-line text-black text-sm"></i>
              </div>
              <div>
                <p class="text-white font-bold text-sm">Trial Activated</p>
                <p class="text-slate-500 text-xs">14 days free, then \${{ planPrice() }}/mo</p>
              </div>
            </div>

            <div class="checklist-item flex items-center gap-4 p-4 bg-slate-900/30 border border-[#00f0ff]/30 cyber-clip-sm opacity-0">
              <div class="w-6 h-6 rounded-full border-2 border-[#00f0ff] flex items-center justify-center flex-shrink-0">
                <div class="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse"></div>
              </div>
              <div>
                <p class="text-white font-bold text-sm">Payment Next</p>
                <p class="text-slate-500 text-xs">Secure checkout</p>
              </div>
            </div>
          </div>

          <!-- Reassurance -->
          <div class="mb-8 p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 cyber-clip-sm">
            <div class="flex items-start gap-4">
              <i class="ri-information-line text-2xl text-[#00f0ff]"></i>
              <div>
                <p class="text-white text-sm font-bold mb-2">What happens next?</p>
                <ul class="space-y-2 text-xs text-slate-400">
                  <li class="flex items-start gap-2">
                    <span class="text-[#00f0ff]">•</span>
                    <span>You won't be charged until your 14-day trial ends</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-[#00f0ff]">•</span>
                    <span>Cancel anytime in settings (no questions asked)</span>
                  </li>
                  <li class="flex items-start gap-2">
                    <span class="text-[#00f0ff]">•</span>
                    <span>100% money-back guarantee if you don't profit</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <button
            (click)="onContinue()"
            class="w-full py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
          >
            Continue to Payment
          </button>

          <!-- Security Badge -->
          <div class="mt-6 flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest">
            <div class="flex items-center gap-2">
              <i class="ri-lock-line text-[#00f0ff]"></i>
              <span>256-bit SSL</span>
            </div>
            <div class="flex items-center gap-2">
              <i class="ri-bank-card-line text-[#00f0ff]"></i>
              <span>Stripe Secure</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class ExpectationSettingComponent implements AfterViewInit {
  @Input() email = signal('');
  @Input() planPrice = signal(97);
  @Output() continue = new EventEmitter<void>();

  ngAfterViewInit() {
    // Animate checklist items
    gsap.to('.checklist-item', {
      opacity: 1,
      y: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power2.out'
    });
  }

  onContinue() {
    this.continue.emit();
  }
}
