import { Component, ChangeDetectionStrategy, AfterViewInit, ViewChild, ElementRef, PLATFORM_ID, Inject } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import * as THREE from 'three';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-automation-flow',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="relative min-h-screen py-32 overflow-hidden bg-black" id="automation-flow">
      <!-- Three.js Canvas -->
      <canvas #threeCanvas class="absolute inset-0 w-full h-full"></canvas>

      <!-- Gradient Overlays -->
      <div class="absolute inset-0 bg-gradient-to-b from-black via-transparent to-black pointer-events-none"></div>
      <div class="absolute inset-0 bg-gradient-to-r from-[#00f0ff]/5 via-transparent to-[#7000ff]/5 pointer-events-none"></div>

      <div class="max-w-[1800px] mx-auto px-6 relative z-10">
        <!-- Section Header -->
        <div class="text-center mb-32 section-header opacity-0">
          <div class="inline-block mb-4 px-6 py-2 border border-[#00f0ff]/30 bg-[#00f0ff]/5 text-[#00f0ff] text-xs uppercase tracking-widest font-mono">
            The Automation Advantage
          </div>
          <h2 class="text-5xl md:text-7xl font-syne font-bold text-white uppercase mb-6">
            You <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">Relax</span>, AI <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#7000ff] to-[#00f0ff]">Works</span>
          </h2>
          <p class="text-slate-400 text-xl max-w-3xl mx-auto">
            From product discovery to fulfillment, Arbi's AI handles everything.
          </p>
        </div>

        <!-- Split Screen Flow -->
        <div class="grid lg:grid-cols-2 gap-16 lg:gap-24 items-start">

          <!-- LEFT: You Do (Minimal) -->
          <div class="you-section opacity-0">
            <div class="sticky top-32">
              <div class="mb-12">
                <div class="inline-flex items-center gap-3 mb-6">
                  <div class="w-3 h-3 rounded-full bg-slate-600 animate-pulse"></div>
                  <h3 class="text-3xl md:text-4xl font-syne font-bold text-slate-400 uppercase">You Do</h3>
                </div>
                <p class="text-slate-500 text-sm">3 simple actions. That's it.</p>
              </div>

              <div class="space-y-6">
                @for(step of youSteps; track step.num; let i = $index) {
                  <div class="you-step group opacity-0 translate-x-[-50px]">
                    <div class="flex items-start gap-6 p-6 bg-slate-900/30 border border-slate-800/50 hover:border-slate-700 transition-all duration-300">
                      <div class="flex-shrink-0 w-12 h-12 rounded-full bg-slate-800/50 flex items-center justify-center text-slate-500 font-mono text-sm border border-slate-700/50">
                        {{ step.num }}
                      </div>
                      <div>
                        <h4 class="text-xl font-syne font-bold text-slate-300 mb-2">{{ step.title }}</h4>
                        <p class="text-slate-500 text-sm leading-relaxed">{{ step.desc }}</p>
                      </div>
                    </div>
                  </div>
                }
              </div>

              <!-- Simple Checkmark -->
              <div class="mt-12 flex items-center gap-4 simple-done opacity-0">
                <div class="w-16 h-16 rounded-full bg-slate-800/50 border-2 border-slate-700 flex items-center justify-center">
                  <i class="ri-check-line text-3xl text-slate-500"></i>
                </div>
                <div>
                  <p class="text-slate-400 font-mono text-sm">Your work:</p>
                  <p class="text-2xl font-bold text-slate-300">Done.</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Vertical Divider -->
          <div class="hidden lg:block absolute left-1/2 top-0 bottom-0 w-px overflow-hidden">
            <div class="divider-line absolute top-0 w-full h-0 bg-gradient-to-b from-transparent via-[#00f0ff] to-transparent"></div>
            <div class="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-[#00f0ff] shadow-[0_0_20px_rgba(0,240,255,0.6)] animate-pulse"></div>
          </div>

          <!-- RIGHT: AI Does (Complex) -->
          <div class="ai-section opacity-0">
            <div class="mb-12">
              <div class="inline-flex items-center gap-3 mb-6">
                <div class="w-3 h-3 rounded-full bg-[#00f0ff] animate-pulse shadow-[0_0_20px_rgba(0,240,255,0.6)]"></div>
                <h3 class="text-3xl md:text-4xl font-syne font-bold text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff] uppercase">AI Does</h3>
              </div>
              <p class="text-slate-400 text-sm">Infinite parallel operations. 24/7/365.</p>
            </div>

            <div class="space-y-6">
              @for(step of aiSteps; track step.num; let i = $index) {
                <div class="ai-step group opacity-0 translate-x-[50px]">
                  <div class="relative p-8 bg-gradient-to-br from-[#0a0a0a] to-[#0f0520] border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all duration-500 cyber-clip overflow-hidden">
                    <!-- Animated Background Glow -->
                    <div class="absolute inset-0 bg-gradient-to-br from-[#00f0ff]/0 via-[#00f0ff]/5 to-[#7000ff]/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"></div>

                    <!-- Scanline Effect -->
                    <div class="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-500 pointer-events-none" style="background: repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,240,255,0.03) 2px, rgba(0,240,255,0.03) 4px);"></div>

                    <div class="relative flex items-start gap-6">
                      <div class="flex-shrink-0 w-16 h-16 rounded-full bg-gradient-to-br from-[#00f0ff]/20 to-[#7000ff]/20 flex items-center justify-center text-[#00f0ff] font-mono text-lg border border-[#00f0ff]/30 group-hover:shadow-[0_0_30px_rgba(0,240,255,0.4)] transition-all duration-500">
                        <i [class]="step.icon" class="text-2xl"></i>
                      </div>
                      <div class="flex-1">
                        <div class="flex items-center gap-3 mb-3">
                          <h4 class="text-xl font-syne font-bold text-white">{{ step.title }}</h4>
                          <div class="flex gap-1">
                            @for(dot of [1,2,3]; track dot) {
                              <div class="w-1.5 h-1.5 rounded-full bg-[#00f0ff] opacity-50 group-hover:opacity-100 transition-opacity" [style.animation-delay]="dot * 200 + 'ms'"></div>
                            }
                          </div>
                        </div>
                        <p class="text-slate-300 text-sm leading-relaxed mb-4">{{ step.desc }}</p>

                        <!-- Activity Indicator -->
                        <div class="flex items-center gap-2 text-[#00f0ff] text-xs font-mono uppercase tracking-wider">
                          <div class="w-2 h-2 rounded-full bg-[#00f0ff] animate-pulse"></div>
                          <span>{{ step.status }}</span>
                        </div>
                      </div>
                    </div>

                    <!-- Connection Line to Next Step -->
                    @if(i < aiSteps.length - 1) {
                      <div class="absolute bottom-0 left-14 w-px h-6 bg-gradient-to-b from-[#00f0ff]/50 to-transparent"></div>
                    }
                  </div>
                </div>
              }
            </div>

            <!-- Profit Output -->
            <div class="mt-12 profit-output opacity-0 scale-90">
              <div class="relative p-10 bg-gradient-to-br from-[#00f0ff]/10 via-[#7000ff]/10 to-transparent border-2 border-[#00f0ff] cyber-clip overflow-hidden">
                <div class="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,240,255,0.15),transparent_70%)] animate-pulse"></div>

                <div class="relative">
                  <div class="flex items-center gap-4 mb-4">
                    <i class="ri-bank-line text-4xl text-[#00f0ff]"></i>
                    <div>
                      <p class="text-[#00f0ff] font-mono text-sm uppercase tracking-wider">Output</p>
                      <p class="text-3xl font-bold text-white">Pure Profit</p>
                    </div>
                  </div>
                  <p class="text-slate-300 text-sm">Automated arbitrage margins deposited to your account. Zero manual intervention.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  `,
  styles: [`
    .cyber-clip {
      clip-path: polygon(0 0, calc(100% - 12px) 0, 100% 12px, 100% 100%, 12px 100%, 0 calc(100% - 12px));
    }

    @keyframes pulse-dot {
      0%, 100% { opacity: 0.3; transform: scale(1); }
      50% { opacity: 1; transform: scale(1.3); }
    }

    .ai-step:hover [class*="w-1"] {
      animation: pulse-dot 1s ease-in-out infinite;
    }
  `]
})
export class AutomationFlowComponent implements AfterViewInit {
  @ViewChild('threeCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private scene!: THREE.Scene;
  private camera!: THREE.PerspectiveCamera;
  private renderer!: THREE.WebGLRenderer;
  private particles!: THREE.Points;
  private connectionLines!: THREE.LineSegments;

  youSteps = [
    { num: 1, title: 'Turn It On', desc: 'Click "Activate". Set your daily spend limit and risk tolerance.' },
    { num: 2, title: 'Set Limits', desc: 'Configure max budget per campaign. AI respects your boundaries.' },
    { num: 3, title: 'Walk Away', desc: 'Close your laptop. Go live your life. Seriously.' }
  ];

  aiSteps = [
    {
      num: 1,
      icon: 'ri-search-eye-line',
      title: 'Find Products',
      desc: 'AI scans 13+ retailers every 60 seconds. Analyzes 10,000+ products/hour for arbitrage opportunities.',
      status: 'Scanning Now'
    },
    {
      num: 2,
      icon: 'ri-file-list-3-line',
      title: 'Create Listings',
      desc: 'Auto-generates SEO-optimized product pages with checkout. No store needed. Pure arbitrage infrastructure.',
      status: 'Generating Pages'
    },
    {
      num: 3,
      icon: 'ri-movie-2-line',
      title: 'Generate Ads',
      desc: 'Converts product images into professional video ads in 30 seconds. 3-5x better conversion than static.',
      status: 'Rendering Videos'
    },
    {
      num: 4,
      icon: 'ri-rocket-2-line',
      title: 'Run Campaigns',
      desc: 'Deploys ads across YouTube, Google, TikTok, Facebook, Instagram. Multi-platform domination on autopilot.',
      status: 'Campaigns Live'
    },
    {
      num: 5,
      icon: 'ri-line-chart-line',
      title: 'Optimize ROI',
      desc: 'Real-time budget shifts, targeting refinement, creative rotation. Target: 300% ROAS while you sleep.',
      status: 'Optimizing 24/7'
    },
    {
      num: 6,
      icon: 'ri-truck-line',
      title: 'Fulfill Orders',
      desc: 'Customer buys → AI purchases from source → Ships direct → Uploads tracking. You pocket the margin. Zero inventory.',
      status: 'Processing Orders'
    }
  ];

  constructor(@Inject(PLATFORM_ID) private platformId: Object) {}

  ngAfterViewInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.initThreeJS();
      this.initAnimations();
      this.animate();
    }
  }

  private initThreeJS() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    // Scene
    this.scene = new THREE.Scene();

    // Camera
    this.camera = new THREE.PerspectiveCamera(75, rect.width / rect.height, 0.1, 1000);
    this.camera.position.z = 50;

    // Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true
    });
    this.renderer.setSize(rect.width, rect.height);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create Particles
    this.createParticleField();
    this.createConnectionLines();

    // Handle Resize
    window.addEventListener('resize', () => this.onResize());
  }

  private createParticleField() {
    const particleCount = 2000;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    const sizes = new Float32Array(particleCount);

    const color1 = new THREE.Color(0x00f0ff);
    const color2 = new THREE.Color(0x7000ff);

    for (let i = 0; i < particleCount; i++) {
      // Positions - create two clusters (left and right)
      const side = Math.random() > 0.5 ? 1 : -1;
      positions[i * 3] = side * (Math.random() * 40 + 20);
      positions[i * 3 + 1] = (Math.random() - 0.5) * 100;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 50;

      // Colors - gradient between cyan and purple
      const color = side > 0 ? color1 : color2;
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;

      // Sizes
      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const material = new THREE.PointsMaterial({
      size: 2,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  private createConnectionLines() {
    const lineCount = 100;
    const positions = new Float32Array(lineCount * 2 * 3);
    const colors = new Float32Array(lineCount * 2 * 3);

    const color = new THREE.Color(0x00f0ff);

    for (let i = 0; i < lineCount; i++) {
      const baseIndex = i * 6;

      // Random line between left and right sides
      positions[baseIndex] = -(Math.random() * 20 + 10);
      positions[baseIndex + 1] = (Math.random() - 0.5) * 80;
      positions[baseIndex + 2] = (Math.random() - 0.5) * 40;

      positions[baseIndex + 3] = Math.random() * 20 + 10;
      positions[baseIndex + 4] = (Math.random() - 0.5) * 80;
      positions[baseIndex + 5] = (Math.random() - 0.5) * 40;

      // Colors
      for (let j = 0; j < 2; j++) {
        colors[baseIndex + j * 3] = color.r;
        colors[baseIndex + j * 3 + 1] = color.g;
        colors[baseIndex + j * 3 + 2] = color.b;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.1,
      blending: THREE.AdditiveBlending
    });

    this.connectionLines = new THREE.LineSegments(geometry, material);
    this.scene.add(this.connectionLines);
  }

  private animate() {
    requestAnimationFrame(() => this.animate());

    // Rotate particles slowly
    if (this.particles) {
      this.particles.rotation.y += 0.0005;
      this.particles.rotation.x += 0.0002;
    }

    // Rotate connection lines
    if (this.connectionLines) {
      this.connectionLines.rotation.y -= 0.0003;
    }

    // Pulse particle opacity
    const time = Date.now() * 0.001;
    if (this.particles.material instanceof THREE.PointsMaterial) {
      this.particles.material.opacity = 0.4 + Math.sin(time) * 0.2;
    }

    this.renderer.render(this.scene, this.camera);
  }

  private onResize() {
    const canvas = this.canvasRef.nativeElement;
    const rect = canvas.getBoundingClientRect();

    this.camera.aspect = rect.width / rect.height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(rect.width, rect.height);
  }

  private initAnimations() {
    // Section Header
    gsap.to('.section-header', {
      scrollTrigger: {
        trigger: '.section-header',
        start: 'top 80%'
      },
      opacity: 1,
      y: 0,
      duration: 1,
      ease: 'power2.out'
    });

    // You Section
    gsap.to('.you-section', {
      scrollTrigger: {
        trigger: '.you-section',
        start: 'top 75%'
      },
      opacity: 1,
      x: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    // You Steps (staggered)
    gsap.to('.you-step', {
      scrollTrigger: {
        trigger: '.you-section',
        start: 'top 70%'
      },
      opacity: 1,
      x: 0,
      duration: 0.6,
      stagger: 0.15,
      ease: 'power2.out'
    });

    // Simple Done
    gsap.to('.simple-done', {
      scrollTrigger: {
        trigger: '.simple-done',
        start: 'top 80%'
      },
      opacity: 1,
      scale: 1,
      duration: 0.8,
      ease: 'back.out(1.7)'
    });

    // Divider Line
    gsap.to('.divider-line', {
      scrollTrigger: {
        trigger: '.ai-section',
        start: 'top 75%',
        end: 'bottom 25%',
        scrub: 1
      },
      height: '100%',
      ease: 'none'
    });

    // AI Section
    gsap.to('.ai-section', {
      scrollTrigger: {
        trigger: '.ai-section',
        start: 'top 75%'
      },
      opacity: 1,
      x: 0,
      duration: 0.8,
      ease: 'power2.out'
    });

    // AI Steps (staggered)
    gsap.to('.ai-step', {
      scrollTrigger: {
        trigger: '.ai-section',
        start: 'top 70%'
      },
      opacity: 1,
      x: 0,
      duration: 0.6,
      stagger: 0.2,
      ease: 'power2.out'
    });

    // Profit Output
    gsap.to('.profit-output', {
      scrollTrigger: {
        trigger: '.profit-output',
        start: 'top 80%'
      },
      opacity: 1,
      scale: 1,
      duration: 1,
      ease: 'back.out(1.4)'
    });
  }
}
