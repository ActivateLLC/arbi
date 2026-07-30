import { Component, ChangeDetectionStrategy, Output, EventEmitter, AfterViewInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';

@Component({
  selector: 'app-success-celebration',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <!-- Confetti Effect (CSS) -->
      <div class="confetti-container absolute inset-0 pointer-events-none overflow-hidden">
        @for(i of confettiArray; track i) {
          <div class="confetti" [style.left.%]="i * 10" [style.animation-delay.s]="i * 0.1"></div>
        }
      </div>

      <!-- Main Content -->
      <div class="relative bg-[#0a0a0a] border-2 border-[#00f0ff] p-1 w-full max-w-lg cyber-clip shadow-[0_0_80px_rgba(0,240,255,0.4)]">
        <div class="bg-[#0a0a0a] p-12 cyber-clip relative overflow-hidden">
          <!-- Animated Glow -->
          <div class="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/10 via-transparent to-[#7000ff]/10 animate-pulse"></div>

          <!-- Success Icon -->
          <div class="success-icon relative mb-8 text-center opacity-0 scale-0">
            <div class="w-32 h-32 mx-auto rounded-full bg-gradient-to-br from-[#00f0ff] to-[#7000ff] flex items-center justify-center relative">
              <div class="absolute inset-0 rounded-full bg-gradient-to-br from-[#00f0ff] to-[#7000ff] animate-ping opacity-75"></div>
              <i class="ri-check-line text-6xl text-black relative z-10"></i>
            </div>
          </div>

          <!-- Header -->
          <div class="text-center mb-8 opacity-0 header-content">
            <h2 class="text-4xl font-syne font-bold text-white mb-4 uppercase">
              Welcome to <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">ARBI</span>
            </h2>
            <p class="text-slate-400 text-lg mb-2">
              Your account is activated!
            </p>
            <p class="text-[#00f0ff] text-sm font-mono">
              Trial ends in 14 days
            </p>
          </div>

          <!-- Quick Stats -->
          <div class="grid grid-cols-3 gap-4 mb-8 opacity-0 stats-content">
            <div class="text-center p-4 bg-slate-900/30 border border-white/10 cyber-clip-sm">
              <p class="text-2xl font-bold text-[#00f0ff]">14</p>
              <p class="text-[10px] text-slate-500 uppercase tracking-widest">Days Free</p>
            </div>
            <div class="text-center p-4 bg-slate-900/30 border border-white/10 cyber-clip-sm">
              <p class="text-2xl font-bold text-[#00f0ff]">∞</p>
              <p class="text-[10px] text-slate-500 uppercase tracking-widest">Opportunities</p>
            </div>
            <div class="text-center p-4 bg-slate-900/30 border border-white/10 cyber-clip-sm">
              <p class="text-2xl font-bold text-[#00f0ff]">24/7</p>
              <p class="text-[10px] text-slate-500 uppercase tracking-widest">AI Active</p>
            </div>
          </div>

          <!-- Next Steps -->
          <div class="mb-8 opacity-0 next-steps-content">
            <p class="text-white font-bold text-sm mb-4 uppercase tracking-wide">Your Next Steps:</p>
            <div class="space-y-3">
              <div class="flex items-start gap-3 p-3 bg-[#00f0ff]/5 border border-[#00f0ff]/20 cyber-clip-sm">
                <div class="w-6 h-6 rounded-full bg-[#00f0ff] text-black flex items-center justify-center flex-shrink-0 text-xs font-bold">1</div>
                <div>
                  <p class="text-white text-sm font-bold">Connect Your Source</p>
                  <p class="text-slate-400 text-xs">Link your preferred retailer feeds</p>
                </div>
              </div>
              <div class="flex items-start gap-3 p-3 bg-slate-900/20 border border-white/10 cyber-clip-sm">
                <div class="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">2</div>
                <div>
                  <p class="text-white text-sm font-bold">Set Your Limits</p>
                  <p class="text-slate-400 text-xs">Configure risk tolerance & budgets</p>
                </div>
              </div>
              <div class="flex items-start gap-3 p-3 bg-slate-900/20 border border-white/10 cyber-clip-sm">
                <div class="w-6 h-6 rounded-full bg-white/10 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">3</div>
                <div>
                  <p class="text-white text-sm font-bold">Run First Scan</p>
                  <p class="text-slate-400 text-xs">Watch AI find profitable opportunities</p>
                </div>
              </div>
            </div>
          </div>

          <!-- CTA -->
          <button
            (click)="onBeginSetup()"
            class="w-full py-5 bg-gradient-to-r from-[#00f0ff] to-[#7000ff] text-black font-bold text-sm uppercase tracking-widest hover:shadow-[0_0_30px_rgba(0,240,255,0.6)] transition-all cyber-clip opacity-0 cta-button"
          >
            Begin Setup (30 seconds)
          </button>

          <!-- Skip Option -->
          <button
            (click)="onSkip()"
            class="w-full mt-4 py-3 text-slate-400 hover:text-white text-xs uppercase tracking-widest transition-colors opacity-0 skip-button"
          >
            Skip for now →
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .confetti {
      position: absolute;
      width: 10px;
      height: 10px;
      background: linear-gradient(45deg, #00f0ff, #7000ff);
      top: -10px;
      animation: fall 3s linear infinite;
    }

    @keyframes fall {
      to {
        transform: translateY(100vh) rotate(360deg);
        opacity: 0;
      }
    }
  `]
})
export class SuccessCelebrationComponent implements AfterViewInit {
  @Output() beginSetup = new EventEmitter<void>();
  @Output() skip = new EventEmitter<void>();

  confettiArray = Array.from({length: 50}, (_, i) => i);

  ngAfterViewInit() {
    // Success icon animation
    gsap.to('.success-icon', {
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: 'back.out(1.7)',
      delay: 0.2
    });

    // Header content
    gsap.to('.header-content', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.6
    });

    // Stats
    gsap.to('.stats-content', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 0.9
    });

    // Next steps
    gsap.to('.next-steps-content', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 1.2
    });

    // CTA button
    gsap.to('.cta-button', {
      opacity: 1,
      y: 0,
      duration: 0.8,
      ease: 'power2.out',
      delay: 1.5
    });

    // Skip button
    gsap.to('.skip-button', {
      opacity: 1,
      duration: 0.6,
      delay: 1.8
    });
  }

  onBeginSetup() {
    this.beginSetup.emit();
  }

  onSkip() {
    this.skip.emit();
  }
}
