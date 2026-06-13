import { Component, ChangeDetectionStrategy, AfterViewInit, ElementRef, ViewChild, signal, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeroComponent } from './components/hero.component';
import { AutomationFlowComponent } from './components/automation-flow.component';
import { PricingComponent } from './components/pricing.component';
import { RoiCalculatorComponent } from './components/roi-calculator.component';
import { ComparisonComponent } from './components/comparison.component';
import { AuthComponent } from './components/auth.component';
import { ExpectationSettingComponent } from './components/expectation-setting.component';
import { PaymentCheckoutComponent } from './components/payment-checkout.component';
import { SuccessCelebrationComponent } from './components/success-celebration.component';
import { OnboardingFlowComponent } from './components/onboarding-flow.component';
import { DashboardComponent } from './components/dashboard.component';
import { supabaseService } from './services/supabase.service';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [CommonModule, HeroComponent, AutomationFlowComponent, PricingComponent, RoiCalculatorComponent, ComparisonComponent, AuthComponent, ExpectationSettingComponent, PaymentCheckoutComponent, SuccessCelebrationComponent, OnboardingFlowComponent, DashboardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="relative min-h-screen w-full selection:bg-[#00f0ff] selection:text-black">
      
      <!-- Noise Overlay -->
      <div class="noise-bg"></div>

      <!-- Cyber Grid Background -->
      <div class="fixed inset-0 w-full h-full -z-10 bg-[#030014]">
        <div class="absolute inset-0 bg-[linear-gradient(rgba(18,18,18,0)_1px,transparent_1px),linear-gradient(90deg,rgba(18,18,18,0)_1px,transparent_1px)] bg-[size:40px_40px] opacity-20" style="background-image: linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px);"></div>
        <div class="absolute top-0 left-0 w-full h-[500px] bg-gradient-to-b from-[#7000ff]/10 to-transparent blur-[100px]"></div>
        <div class="absolute bottom-0 right-0 w-full h-[500px] bg-gradient-to-t from-[#00f0ff]/10 to-transparent blur-[100px]"></div>
      </div>

      <!-- Navigation -->
      <nav #nav class="fixed top-0 w-full z-40 transition-all duration-300 pt-6 px-6">
        <div class="max-w-7xl mx-auto h-20 flex items-center justify-between cyber-clip-sm bg-black/40 backdrop-blur-md border border-white/10 px-8">
          
          <div class="flex items-center gap-3 cursor-pointer group">
            <div class="relative w-10 h-10 flex items-center justify-center">
               <div class="absolute inset-0 bg-[#00f0ff] rotate-45 scale-75 group-hover:rotate-90 transition-transform duration-500"></div>
               <div class="absolute inset-0 border border-white rotate-45 scale-75"></div>
               <span class="relative z-10 font-syne font-bold text-black text-lg">A</span>
            </div>
            <span class="text-2xl font-bold tracking-tight text-white font-syne">ARBI</span>
          </div>

          <div class="hidden md:flex items-center gap-10 text-sm font-semibold tracking-wide text-slate-400">
            <a href="#features" class="hover:text-[#00f0ff] hover:text-glow transition-all uppercase text-[11px] tracking-[0.2em]">Features</a>
            <a href="#calculator" class="hover:text-[#00f0ff] hover:text-glow transition-all uppercase text-[11px] tracking-[0.2em]">Calculator</a>
            <a href="#pricing" class="hover:text-[#00f0ff] hover:text-glow transition-all uppercase text-[11px] tracking-[0.2em]">Pricing</a>
          </div>

          <button
            *ngIf="!isLoggedIn()"
            (click)="openLoginModal()"
            class="hidden md:block px-8 py-3 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-[#00f0ff] transition-colors cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
          >
            Sign In
          </button>
          <button
            *ngIf="isLoggedIn()"
            (click)="showDashboard()"
            class="hidden md:block px-8 py-3 bg-[#00f0ff] text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
          >
            Dashboard
          </button>

          <!-- Mobile Menu Button -->
          <button
            (click)="toggleMobileMenu()"
            class="md:hidden w-10 h-10 flex flex-col items-center justify-center gap-1.5 hover:opacity-70 transition-opacity"
            aria-label="Toggle menu"
          >
            <span class="w-6 h-0.5 bg-white transition-all" [class.rotate-45]="isMobileMenuOpen()" [class.translate-y-2]="isMobileMenuOpen()"></span>
            <span class="w-6 h-0.5 bg-white transition-all" [class.opacity-0]="isMobileMenuOpen()"></span>
            <span class="w-6 h-0.5 bg-white transition-all" [class.-rotate-45]="isMobileMenuOpen()" [class.-translate-y-2]="isMobileMenuOpen()"></span>
          </button>
        </div>

        <!-- Mobile Menu -->
        @if (isMobileMenuOpen()) {
          <div class="md:hidden absolute top-full left-0 w-full mt-2 px-6">
            <div class="bg-black/95 backdrop-blur-md border border-white/10 cyber-clip-sm p-6">
              <div class="flex flex-col gap-6">
                <a href="#features" (click)="closeMobileMenu()" class="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00f0ff] transition-all uppercase tracking-[0.2em] py-2">Features</a>
                <a href="#calculator" (click)="closeMobileMenu()" class="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00f0ff] transition-all uppercase tracking-[0.2em] py-2">Calculator</a>
                <a href="#pricing" (click)="closeMobileMenu()" class="text-sm font-semibold tracking-wide text-slate-400 hover:text-[#00f0ff] transition-all uppercase tracking-[0.2em] py-2">Pricing</a>
                <button
                  *ngIf="!isLoggedIn()"
                  (click)="openLoginModal(); closeMobileMenu()"
                  class="w-full px-6 py-3 bg-white text-black font-bold text-xs uppercase tracking-widest hover:bg-[#00f0ff] transition-colors cyber-clip-sm mt-2"
                >
                  Sign In
                </button>
                <button
                  *ngIf="isLoggedIn()"
                  (click)="showDashboard(); closeMobileMenu()"
                  class="w-full px-6 py-3 bg-[#00f0ff] text-black font-bold text-xs uppercase tracking-widest hover:bg-white transition-colors cyber-clip-sm mt-2"
                >
                  Dashboard
                </button>
              </div>
            </div>
          </div>
        }
      </nav>

      <main class="relative z-10">
        <app-hero></app-hero>

        <!-- Automation Flow -->
        <app-automation-flow></app-automation-flow>

        <div id="features">
          <!-- Comparison is technically part of the feature set/validation -->
          <app-comparison></app-comparison>
        </div>

        <div id="calculator">
          <app-roi-calculator></app-roi-calculator>
        </div>

        <div id="pricing">
          <app-pricing (planSelected)="startSubscriptionFlow($event.name, $event.price, $event.limits)"></app-pricing>
        </div>
      </main>

      <footer class="border-t border-white/5 bg-black pt-20 pb-10 mt-20 relative">
        <div class="max-w-7xl mx-auto px-6">
          <div class="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 border-b border-white/5 pb-12">
             <div>
                <h2 class="text-5xl font-syne font-bold text-white mb-2">READY TO <span class="text-transparent bg-clip-text bg-gradient-to-r from-[#00f0ff] to-[#7000ff]">DOMINATE?</span></h2>
             </div>
             <button (click)="isLoggedIn() ? showDashboard() : openLoginModal()" class="px-10 py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-colors cyber-clip">
                {{ isLoggedIn() ? 'Go to Dashboard' : 'Get Started' }}
             </button>
          </div>
          
          <div class="py-8 flex flex-col md:flex-row justify-between items-center text-xs text-slate-500 uppercase tracking-widest">
            <p>&copy; {{ currentYear }} Arbi Systems. Protocol v2.0</p>
            <div class="flex gap-8">
              <a href="#" class="hover:text-white transition-colors">Privacy</a>
              <a href="#" class="hover:text-white transition-colors">Terms</a>
            </div>
          </div>
        </div>
      </footer>

      <!-- Auth Modal (Login/Signup) -->
      @if (authMode() !== null) {
        <app-auth
          [selectedPlan]="selectedPlan"
          [initialMode]="authMode"
          (authenticated)="onAuthenticated($event)"
          (close)="closeAuthModal()"
        />
      }

      <!-- Dashboard -->
      @if (showDashboardView()) {
        <app-dashboard
          [userEmail]="userEmail"
          (logout)="onLogout()"
          (close)="closeDashboard()"
        />
      }

      <!-- Subscription Flow Modals -->

      @if (subscriptionFlow() === 'expectation-setting') {
        <app-expectation-setting
          [email]="userEmail"
          [planPrice]="selectedPlanPrice"
          (continue)="onExpectationContinue()"
        />
      }

      @if (subscriptionFlow() === 'payment-checkout') {
        <app-payment-checkout
          [planName]="selectedPlan"
          [planPrice]="selectedPlanPrice"
          [planLimits]="selectedPlanLimits"
          [billingCycle]="billingCycle"
          (paymentComplete)="onPaymentComplete()"
        />
      }

      @if (subscriptionFlow() === 'success') {
        <app-success-celebration
          (beginSetup)="onBeginSetup()"
          (skip)="onSkipOnboarding()"
        />
      }

      @if (subscriptionFlow() === 'onboarding') {
        <app-onboarding-flow
          (complete)="onOnboardingComplete($event)"
          (skip)="onSkipOnboarding()"
        />
      }
    </div>
  `
})
export class AppComponent implements OnInit, AfterViewInit {
  currentYear = new Date().getFullYear();
  isMobileMenuOpen = signal(false);
  @ViewChild('nav') nav!: ElementRef;

  // User auth state
  isLoggedIn = signal(false);
  userEmail = signal('');
  userPassword = '';
  authMode = signal<'login' | 'signup' | null>(null);
  showDashboardView = signal(false);

  // Subscription flow state
  subscriptionFlow = signal<'expectation-setting' | 'payment-checkout' | 'success' | 'onboarding' | null>(null);
  selectedPlan = signal<string | null>(null);
  selectedPlanPrice = signal(97);
  selectedPlanLimits = signal('500 opportunities/day');
  billingCycle = signal('monthly');

  async ngOnInit() {
    // Check for existing session
    try {
      const session = await supabaseService.getSession();
      if (session?.user) {
        this.isLoggedIn.set(true);
        this.userEmail.set(session.user.email || '');
      }
    } catch (error) {
      console.error('Error checking session:', error);
    }

    // Listen for auth state changes
    supabaseService.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.isLoggedIn.set(true);
        this.userEmail.set(session.user.email || '');
        this.closeAuthModal();

        // If user was signing up from pricing, continue to payment flow
        if (this.selectedPlan() !== null) {
          this.subscriptionFlow.set('expectation-setting');
        } else {
          // Just logged in, show dashboard
          this.showDashboardView.set(true);
        }
      } else if (event === 'SIGNED_OUT') {
        this.isLoggedIn.set(false);
        this.userEmail.set('');
      }
    });
  }

  ngAfterViewInit() {
    // Optimize ScrollTrigger with scrub for smooth performance
    ScrollTrigger.create({
      start: 'top -100',
      end: 'top -200',
      scrub: 0.5, // Add scrub for smoother, GPU-accelerated animation
      onEnter: () => {
        gsap.to(this.nav.nativeElement, {
          y: -10,
          scale: 0.98,
          duration: 0.3,
          force3D: true, // Force GPU acceleration
          ease: 'power2.out'
        });
      },
      onLeaveBack: () => {
        gsap.to(this.nav.nativeElement, {
          y: 0,
          scale: 1,
          duration: 0.3,
          force3D: true,
          ease: 'power2.out'
        });
      }
    });

    // Smooth scroll configuration
    ScrollTrigger.config({
      autoRefreshEvents: 'visibilitychange,DOMContentLoaded,load',
      ignoreMobileResize: true
    });
  }

  openLoginModal() {
    this.authMode.set('login');
    document.body.style.overflow = 'hidden';
  }

  openSignupModal(plan: string | null = null) {
    this.selectedPlan.set(plan);
    this.authMode.set('signup');
    document.body.style.overflow = 'hidden';
  }

  closeAuthModal() {
    this.authMode.set(null);
    this.selectedPlan.set(null);
    document.body.style.overflow = '';
  }

  onAuthenticated(data: {email: string, password: string, method: 'email' | 'google' | 'github'}) {
    this.userEmail.set(data.email);
    this.userPassword = data.password;
    this.isLoggedIn.set(true);
    this.closeAuthModal();

    // If user was signing up from pricing, continue to payment flow
    if (this.selectedPlan() !== null) {
      this.subscriptionFlow.set('expectation-setting');
    } else {
      // Just logged in, show dashboard
      this.showDashboardView.set(true);
    }
  }

  async onLogout() {
    try {
      await supabaseService.signOut();
      this.isLoggedIn.set(false);
      this.userEmail.set('');
      this.userPassword = '';
      this.closeDashboard();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  }

  showDashboard() {
    this.showDashboardView.set(true);
    document.body.style.overflow = 'hidden';
  }

  closeDashboard() {
    this.showDashboardView.set(false);
    document.body.style.overflow = '';
  }

  toggleMobileMenu() {
    this.isMobileMenuOpen.set(!this.isMobileMenuOpen());
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  // Start subscription flow - triggered by pricing CTAs
  startSubscriptionFlow(plan: string, price: number, limits: string) {
    this.selectedPlanPrice.set(price);
    this.selectedPlanLimits.set(limits);

    if (this.isLoggedIn()) {
      // User already logged in, skip to payment
      this.selectedPlan.set(plan);
      this.subscriptionFlow.set('expectation-setting');
      document.body.style.overflow = 'hidden';
    } else {
      // User not logged in, open signup modal
      this.openSignupModal(plan);
    }
  }

  closeSubscriptionFlow() {
    this.subscriptionFlow.set(null);
    this.selectedPlan.set(null);
    document.body.style.overflow = '';
  }

  onExpectationContinue() {
    this.subscriptionFlow.set('payment-checkout');
  }

  onPaymentComplete() {
    this.subscriptionFlow.set('success');
  }

  onBeginSetup() {
    this.subscriptionFlow.set('onboarding');
  }

  onSkipOnboarding() {
    this.closeSubscriptionFlow();
    this.showDashboard();
  }

  onOnboardingComplete(data: any) {
    console.log('Onboarding data:', data);
    this.closeSubscriptionFlow();
    this.showDashboard();
  }
}