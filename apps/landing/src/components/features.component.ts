import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChildren, ViewChild, QueryList, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-features',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="py-32 relative z-10 overflow-hidden" id="features-section">
      <!-- Connection Lines Canvas -->
      <canvas #connectionCanvas class="absolute inset-0 w-full h-full pointer-events-none opacity-30"></canvas>

      <div class="max-w-7xl mx-auto px-6 relative z-10">

        <div class="mb-20 feature-header opacity-0">
          <h2 class="text-4xl md:text-5xl font-syne font-bold text-white uppercase mb-4">The <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">Arsenal</span></h2>
          <div class="h-1 w-20 bg-gradient-to-r from-[#00f0ff] to-[#7000ff] mb-6"></div>
          <p class="text-slate-400 max-w-2xl font-light text-lg">
             Nine AI systems working in parallel. Each one designed to give you an unfair advantage over every other seller.
          </p>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" style="perspective: 1000px;">
           @for(feature of features; track feature.title; let i = $index) {
             <div
               #featureCard
               class="feature-card group relative bg-[#0a0a0a] border border-white/10 p-8 cyber-clip hover:border-[#00f0ff]/50 transition-all duration-500 opacity-0"
               [attr.data-index]="i"
               (mouseenter)="onCardHover($event, i)"
               (mousemove)="onCardMouseMove($event)"
               (mouseleave)="onCardLeave($event)"
               style="transform-style: preserve-3d;"
             >
                <!-- Animated Border -->
                <div class="card-border-top absolute top-0 left-0 h-px bg-gradient-to-r from-transparent via-[#00f0ff] to-transparent w-0 opacity-0"></div>
                <div class="card-border-right absolute top-0 right-0 w-px bg-gradient-to-b from-transparent via-[#00f0ff] to-transparent h-0 opacity-0"></div>
                <div class="card-border-bottom absolute bottom-0 right-0 h-px bg-gradient-to-l from-transparent via-[#00f0ff] to-transparent w-0 opacity-0"></div>
                <div class="card-border-left absolute bottom-0 left-0 w-px bg-gradient-to-t from-transparent via-[#00f0ff] to-transparent h-0 opacity-0"></div>

                <!-- Hover Glow -->
                <div class="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"></div>

                <!-- Scan Line Effect -->
                <div class="scanline absolute inset-0 opacity-0 pointer-events-none overflow-hidden">
                  <div class="absolute w-full h-px bg-gradient-to-r from-transparent via-[#00f0ff]/50 to-transparent -translate-y-full"></div>
                </div>

                <!-- Content -->
                <div class="relative" style="transform: translateZ(20px);">
                  <div class="w-14 h-14 mb-8 flex items-center justify-center border border-[#00f0ff]/30 bg-[#00f0ff]/5 text-[#00f0ff] cyber-clip-sm group-hover:bg-[#00f0ff] group-hover:text-black transition-all duration-300 group-hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] group-hover:scale-110">
                    <i [class]="feature.icon" class="text-2xl"></i>
                  </div>

                  <h3 class="text-xl font-syne font-bold text-white mb-3 uppercase group-hover:text-[#00f0ff] transition-colors tracking-wide">{{ feature.title }}</h3>
                  <p class="text-slate-400 text-sm leading-relaxed mb-8 font-mono border-l border-white/10 pl-4 group-hover:border-[#00f0ff] transition-colors">{{ feature.desc }}</p>

                  <div class="flex items-center justify-between mt-auto">
                     <div class="flex items-center gap-2 text-[10px] uppercase tracking-widest text-slate-600 group-hover:text-[#00f0ff] transition-colors">
                        <span>Status: Online</span>
                        <div class="w-1.5 h-1.5 rounded-full bg-[#00f0ff] animate-pulse"></div>
                     </div>
                     <i class="ri-arrow-right-line text-slate-700 group-hover:text-[#00f0ff] -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300"></i>
                  </div>
                </div>

                <!-- Corner Accents -->
                <div class="corner-accent absolute top-2 right-2 w-6 h-6 border-t border-r border-[#00f0ff]/0 group-hover:border-[#00f0ff]/50 transition-all duration-300"></div>
                <div class="corner-accent absolute bottom-2 left-2 w-6 h-6 border-b border-l border-[#00f0ff]/0 group-hover:border-[#00f0ff]/50 transition-all duration-300"></div>
             </div>
           }
        </div>
      </div>
    </section>
  `
})
export class FeaturesComponent implements AfterViewInit {
  @ViewChildren('featureCard') featureCards!: QueryList<ElementRef>;
  @ViewChild('connectionCanvas') connectionCanvas!: ElementRef<HTMLCanvasElement>;

  private ctx!: CanvasRenderingContext2D | null;
  private hoveredCard: number | null = null;
  private animationFrameId: number = 0;

  features = [
    // Core Arbitrage Intelligence
    {
      title: 'Profit Oracle',
      desc: 'Stop guessing. Our AI predicts exactly how fast an item will sell and your exact profit margin before you buy.',
      icon: 'ri-brain-line'
    },
    {
      title: 'Omni-Scanner',
      desc: 'Be everywhere at once. Arbi scans Walmart, Target, and 12+ other retailers simultaneously while you sleep.',
      icon: 'ri-radar-line'
    },
    {
      title: 'Zero-Touch Listing',
      desc: 'We automate the boring stuff. One click creates SEO-optimized Amazon listings, images, and pricing strategies.',
      icon: 'ri-robot-2-line'
    },

    // AI Video Ad Automation
    {
      title: 'Video Ad Engine',
      desc: 'AI generates professional video ads from product images in 30 seconds. Videos convert 3-5x better than static. Zero editing skills.',
      icon: 'ri-movie-2-line'
    },
    {
      title: 'Omni-Deploy',
      desc: 'One product → Six platforms. YouTube, Google Search, Display, TikTok, Facebook, Instagram. Ads point to auto-generated product pages with checkout.',
      icon: 'ri-global-line'
    },
    {
      title: '24/7 Optimizer',
      desc: 'AI never sleeps. Real-time budget adjustments. Auto-targeting refinement. Creative rotation. Target: 300% ROAS while you\'re offline.',
      icon: 'ri-cpu-line'
    },
    {
      title: 'Ghost Checkout',
      desc: 'Order comes in? AI buys it for you via guest checkout on Amazon/Walmart/eBay. Ships direct to customer. Tracking uploaded. You pocket the margin. Zero inventory.',
      icon: 'ri-truck-line'
    },

    // Control & Full Automation
    {
      title: 'Hey Arbi',
      desc: 'Manage your empire hands-free. "Hey Arbi, show me today\'s profit." It\'s like having a hedge fund manager in your pocket.',
      icon: 'ri-mic-2-line'
    },
    {
      title: 'Passive Mode',
      desc: 'The Holy Grail. Set your risk tolerance and let the bot buy, list, advertise, and fulfill 24/7. Wake up to new balances.',
      icon: 'ri-cpu-line'
    }
  ];

  ngAfterViewInit() {
    this.initCanvas();
    this.initHeaderAnimation();
    this.initCardAnimations();
    this.drawConnectionLines();
  }

  private initCanvas() {
    const canvas = this.connectionCanvas.nativeElement;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width;
    canvas.height = rect.height;
    this.ctx = canvas.getContext('2d');

    // Redraw on resize
    window.addEventListener('resize', () => {
      const newRect = canvas.getBoundingClientRect();
      canvas.width = newRect.width;
      canvas.height = newRect.height;
      this.drawConnectionLines();
    });
  }

  private initHeaderAnimation() {
    gsap.to('.feature-header', {
      scrollTrigger: {
        trigger: '.feature-header',
        start: 'top 85%'
      },
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power2.out'
    });
  }

  private initCardAnimations() {
    const cards = this.featureCards.toArray().map(el => el.nativeElement);

    cards.forEach((card, index) => {
      // Determine entrance direction based on position
      const col = index % 3;
      const row = Math.floor(index / 3);

      let startX = 0;
      let startY = 100;
      let rotation = 0;

      // Different entrance animations based on position
      if (col === 0) {
        startX = -100;
        rotation = -15;
      } else if (col === 2) {
        startX = 100;
        rotation = 15;
      }

      // Set initial state
      gsap.set(card, {
        opacity: 0,
        x: startX,
        y: startY,
        rotationY: rotation,
        rotationX: 10
      });

      // Animate in on scroll
      gsap.to(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top 85%',
          end: 'top 50%',
          toggleActions: 'play none none reverse'
        },
        opacity: 1,
        x: 0,
        y: 0,
        rotationY: 0,
        rotationX: 0,
        duration: 1,
        delay: (index % 3) * 0.15,
        ease: 'power3.out',
        onComplete: () => {
          this.animateBorders(card, index);
          this.animateScanline(card);
        }
      });

      // Parallax effect on scroll
      gsap.to(card, {
        scrollTrigger: {
          trigger: card,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        },
        y: (index % 2 === 0) ? -30 : -50,
        ease: 'none'
      });
    });
  }

  private animateBorders(card: HTMLElement, index: number) {
    const borders = [
      card.querySelector('.card-border-top'),
      card.querySelector('.card-border-right'),
      card.querySelector('.card-border-bottom'),
      card.querySelector('.card-border-left')
    ];

    const timeline = gsap.timeline({ delay: index * 0.1 });

    borders.forEach((border, i) => {
      if (border) {
        const isHorizontal = i % 2 === 0;
        timeline.to(border, {
          [isHorizontal ? 'width' : 'height']: '100%',
          opacity: 1,
          duration: 0.6,
          ease: 'power2.inOut'
        }, i * 0.15);
      }
    });
  }

  private animateScanline(card: HTMLElement) {
    const scanline = card.querySelector('.scanline');
    if (!scanline) return;

    gsap.to(scanline, { opacity: 1, duration: 0.3 });

    gsap.to(scanline.children[0], {
      y: '100vh',
      duration: 2,
      ease: 'none',
      repeat: -1,
      repeatDelay: 3
    });
  }

  private drawConnectionLines() {
    if (!this.ctx) return;

    const canvas = this.connectionCanvas.nativeElement;
    const cards = this.featureCards.toArray().map(el => el.nativeElement);

    const animate = () => {
      if (!this.ctx) return;

      this.ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw connections between adjacent cards
      for (let i = 0; i < cards.length; i++) {
        const card = cards[i];
        const rect = card.getBoundingClientRect();
        const canvasRect = canvas.getBoundingClientRect();

        const centerX = rect.left - canvasRect.left + rect.width / 2;
        const centerY = rect.top - canvasRect.top + rect.height / 2;

        // Connect to next card in row
        if ((i + 1) % 3 !== 0 && i + 1 < cards.length) {
          const nextCard = cards[i + 1];
          const nextRect = nextCard.getBoundingClientRect();
          const nextX = nextRect.left - canvasRect.left + nextRect.width / 2;
          const nextY = nextRect.top - canvasRect.top + nextRect.height / 2;

          this.drawLine(centerX, centerY, nextX, nextY, i === this.hoveredCard || i + 1 === this.hoveredCard);
        }

        // Connect to card below
        if (i + 3 < cards.length) {
          const belowCard = cards[i + 3];
          const belowRect = belowCard.getBoundingClientRect();
          const belowX = belowRect.left - canvasRect.left + belowRect.width / 2;
          const belowY = belowRect.top - canvasRect.top + belowRect.height / 2;

          this.drawLine(centerX, centerY, belowX, belowY, i === this.hoveredCard || i + 3 === this.hoveredCard);
        }
      }

      this.animationFrameId = requestAnimationFrame(animate);
    };

    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }

    animate();
  }

  private drawLine(x1: number, y1: number, x2: number, y2: number, highlighted: boolean) {
    if (!this.ctx) return;

    const gradient = this.ctx.createLinearGradient(x1, y1, x2, y2);

    if (highlighted) {
      gradient.addColorStop(0, 'rgba(0, 240, 255, 0.3)');
      gradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.6)');
      gradient.addColorStop(1, 'rgba(0, 240, 255, 0.3)');
      this.ctx.lineWidth = 2;
    } else {
      gradient.addColorStop(0, 'rgba(0, 240, 255, 0.05)');
      gradient.addColorStop(0.5, 'rgba(0, 240, 255, 0.1)');
      gradient.addColorStop(1, 'rgba(0, 240, 255, 0.05)');
      this.ctx.lineWidth = 1;
    }

    this.ctx.strokeStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
  }

  onCardHover(event: MouseEvent, index: number) {
    this.hoveredCard = index;
    const card = event.currentTarget as HTMLElement;

    gsap.to(card, {
      scale: 1.05,
      z: 50,
      duration: 0.4,
      ease: 'power2.out'
    });
  }

  onCardMouseMove(event: MouseEvent) {
    const card = event.currentTarget as HTMLElement;
    const rect = card.getBoundingClientRect();

    // Calculate mouse position relative to card center
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;

    // Calculate rotation (max 15 degrees)
    const rotateX = -(y / rect.height) * 20;
    const rotateY = (x / rect.width) * 20;

    gsap.to(card, {
      rotationX: rotateX,
      rotationY: rotateY,
      duration: 0.3,
      ease: 'power2.out'
    });
  }

  onCardLeave(event: MouseEvent) {
    this.hoveredCard = null;
    const card = event.currentTarget as HTMLElement;

    gsap.to(card, {
      scale: 1,
      z: 0,
      rotationX: 0,
      rotationY: 0,
      duration: 0.5,
      ease: 'power2.out'
    });
  }

  @HostListener('window:beforeunload')
  ngOnDestroy() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}