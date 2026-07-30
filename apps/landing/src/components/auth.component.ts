import { Component, ChangeDetectionStrategy, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { supabaseService } from '../services/supabase.service';

type AuthMode = 'login' | 'signup' | 'forgot-password';

@Component({
  selector: 'app-auth',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <!-- Main Content -->
      <div class="relative bg-[#0a0a0a] border border-[#00f0ff]/30 p-1 w-full max-w-md cyber-clip shadow-[0_0_50px_rgba(0,240,255,0.15)]">
        <div class="bg-[#0a0a0a] p-10 cyber-clip relative overflow-hidden">
          <!-- Close Button -->
          <button
            (click)="onClose()"
            class="absolute top-5 right-5 text-slate-500 hover:text-[#00f0ff] transition-colors"
          >
            <i class="ri-close-line text-2xl"></i>
          </button>

          <!-- LOGIN MODE -->
          <div *ngIf="mode() === 'login'">
            <div class="mb-8">
              <h2 class="text-3xl font-syne font-bold text-white mb-2 uppercase">
                Welcome <span class="text-[#00f0ff]">Back</span>
              </h2>
              <div class="h-0.5 w-12 bg-[#00f0ff] mb-4"></div>
              <p class="text-slate-400 text-sm">Sign in to your Arbi account</p>
            </div>

            <!-- Social Auth -->
            <div class="space-y-3 mb-6">
              <button
                type="button"
                (click)="socialLogin('google')"
                class="w-full py-3 bg-white text-black font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-100 transition-all cyber-clip-sm"
              >
                <i class="ri-google-fill text-lg"></i>
                Continue with Google
              </button>
              <button
                type="button"
                (click)="socialLogin('github')"
                class="w-full py-3 bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-700 transition-all cyber-clip-sm"
              >
                <i class="ri-github-fill text-lg"></i>
                Continue with GitHub
              </button>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage()" class="mb-4 p-4 bg-red-500/10 border border-red-500/20 cyber-clip-sm">
              <p class="text-sm text-red-400">
                <i class="ri-error-warning-line mr-2"></i>{{ errorMessage() }}
              </p>
            </div>

            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-white/10"></div>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-[#0a0a0a] px-2 text-slate-500">Or</span>
              </div>
            </div>

            <!-- Email/Password Login -->
            <form (submit)="submitLogin($event)" class="space-y-4">
              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Email Address
                </label>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm placeholder:text-slate-700"
                  placeholder="operator@arbi.com"
                  autofocus
                />
              </div>

              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Password
                </label>
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm placeholder:text-slate-700"
                  placeholder="••••••••"
                />
              </div>

              <div class="flex items-center justify-between text-sm">
                <label class="flex items-center gap-2 text-slate-400 cursor-pointer hover:text-white transition-colors">
                  <input
                    type="checkbox"
                    [(ngModel)]="rememberMe"
                    name="rememberMe"
                    class="w-4 h-4 bg-slate-900 border border-white/20 text-[#00f0ff] focus:ring-[#00f0ff]"
                  />
                  <span class="text-xs">Remember me</span>
                </label>
                <button
                  type="button"
                  (click)="mode.set('forgot-password')"
                  class="text-xs text-[#00f0ff] hover:text-white transition-colors"
                >
                  Forgot password?
                </button>
              </div>

              <button
                type="submit"
                [disabled]="loading()"
                class="w-full py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loading() ? 'Signing in...' : 'Sign In' }}
              </button>
            </form>

            <div class="mt-6 text-center">
              <p class="text-sm text-slate-400">
                Don't have an account?
                <button
                  type="button"
                  (click)="switchMode('signup')"
                  class="text-[#00f0ff] hover:text-white font-bold ml-1"
                >
                  Sign up
                </button>
              </p>
            </div>
          </div>

          <!-- SIGNUP MODE -->
          <div *ngIf="mode() === 'signup'">
            <div class="mb-8">
              <h2 class="text-3xl font-syne font-bold text-white mb-2 uppercase">
                Create <span class="text-[#00f0ff]">Account</span>
              </h2>
              <div class="h-0.5 w-12 bg-[#00f0ff] mb-4"></div>
              <p class="text-slate-400 text-sm" *ngIf="selectedPlan()">
                Activating <span class="text-white font-bold">{{ selectedPlan() }}</span> plan
              </p>
            </div>

            <!-- Social Auth -->
            <div class="space-y-3 mb-6">
              <button
                type="button"
                (click)="socialSignup('google')"
                class="w-full py-3 bg-white text-black font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-100 transition-all cyber-clip-sm"
              >
                <i class="ri-google-fill text-lg"></i>
                Sign up with Google
              </button>
              <button
                type="button"
                (click)="socialSignup('github')"
                class="w-full py-3 bg-slate-800 text-white font-bold text-sm flex items-center justify-center gap-3 hover:bg-slate-700 transition-all cyber-clip-sm"
              >
                <i class="ri-github-fill text-lg"></i>
                Sign up with GitHub
              </button>
            </div>

            <!-- Error Message -->
            <div *ngIf="errorMessage()" class="mb-4 p-4 bg-red-500/10 border border-red-500/20 cyber-clip-sm">
              <p class="text-sm text-red-400">
                <i class="ri-error-warning-line mr-2"></i>{{ errorMessage() }}
              </p>
            </div>

            <div class="relative my-6">
              <div class="absolute inset-0 flex items-center">
                <div class="w-full border-t border-white/10"></div>
              </div>
              <div class="relative flex justify-center text-xs uppercase">
                <span class="bg-[#0a0a0a] px-2 text-slate-500">Or</span>
              </div>
            </div>

            <!-- Email/Password Signup -->
            <form (submit)="submitSignup($event)" class="space-y-4">
              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Email Address
                </label>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm placeholder:text-slate-700"
                  placeholder="operator@arbi.com"
                  autofocus
                />
              </div>

              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Password
                </label>
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  minlength="8"
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm placeholder:text-slate-700"
                  placeholder="••••••••"
                />
                <p class="text-xs text-slate-500">Minimum 8 characters</p>
              </div>

              <label class="flex items-start gap-3 text-slate-400 cursor-pointer">
                <input
                  type="checkbox"
                  [(ngModel)]="agreedToTerms"
                  name="agreedToTerms"
                  required
                  class="mt-0.5 w-4 h-4 bg-slate-900 border border-white/20 text-[#00f0ff] focus:ring-[#00f0ff]"
                />
                <span class="text-xs leading-relaxed">
                  I agree to the <a href="#" class="text-[#00f0ff] hover:text-white">Terms of Service</a> and <a href="#" class="text-[#00f0ff] hover:text-white">Privacy Policy</a>
                </span>
              </label>

              <button
                type="submit"
                [disabled]="loading() || !agreedToTerms"
                class="w-full py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {{ loading() ? 'Creating Account...' : 'Create Account' }}
              </button>
            </form>

            <div class="mt-6 text-center">
              <p class="text-sm text-slate-400">
                Already have an account?
                <button
                  type="button"
                  (click)="switchMode('login')"
                  class="text-[#00f0ff] hover:text-white font-bold ml-1"
                >
                  Sign in
                </button>
              </p>
            </div>
          </div>

          <!-- FORGOT PASSWORD MODE -->
          <div *ngIf="mode() === 'forgot-password'">
            <div class="mb-8">
              <h2 class="text-3xl font-syne font-bold text-white mb-2 uppercase">
                Reset <span class="text-[#00f0ff]">Password</span>
              </h2>
              <div class="h-0.5 w-12 bg-[#00f0ff] mb-4"></div>
              <p class="text-slate-400 text-sm">
                Enter your email and we'll send you a reset link
              </p>
            </div>

            <form (submit)="submitForgotPassword($event)" class="space-y-4" *ngIf="!resetEmailSent()">
              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Email Address
                </label>
                <input
                  type="email"
                  [(ngModel)]="email"
                  name="email"
                  required
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm placeholder:text-slate-700"
                  placeholder="operator@arbi.com"
                  autofocus
                />
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  (click)="mode.set('login')"
                  class="flex-1 py-4 bg-transparent border border-white/20 text-white font-bold text-sm uppercase tracking-widest hover:border-white/40 transition-all cyber-clip-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  [disabled]="loading()"
                  class="flex-1 py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50"
                >
                  {{ loading() ? 'Sending...' : 'Send Link' }}
                </button>
              </div>
            </form>

            <!-- Success Message -->
            <div *ngIf="resetEmailSent()" class="space-y-6">
              <div class="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 cyber-clip-sm text-center">
                <i class="ri-mail-send-line text-4xl text-[#00f0ff] mb-3 block"></i>
                <p class="text-white font-bold mb-2">Check your email</p>
                <p class="text-sm text-slate-400">
                  We've sent a password reset link to <span class="text-white">{{ email }}</span>
                </p>
              </div>
              <button
                type="button"
                (click)="mode.set('login'); resetEmailSent.set(false)"
                class="w-full py-4 bg-transparent border border-white/20 text-white font-bold text-sm uppercase tracking-widest hover:border-white/40 transition-all cyber-clip-sm"
              >
                Back to Sign In
              </button>
            </div>
          </div>

          <!-- Trust Signals (shown on all modes except forgot password success) -->
          <div class="mt-8 pt-6 border-t border-white/10" *ngIf="mode() !== 'forgot-password' || !resetEmailSent()">
            <div class="flex items-center justify-center gap-6 text-[10px] text-slate-500 uppercase tracking-widest">
              <div class="flex items-center gap-2">
                <i class="ri-shield-check-line text-[#00f0ff]"></i>
                <span>Secure</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="ri-lock-line text-[#00f0ff]"></i>
                <span>Encrypted</span>
              </div>
              <div class="flex items-center gap-2">
                <i class="ri-time-line text-[#00f0ff]"></i>
                <span>30s Setup</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class AuthComponent {
  @Input() selectedPlan = signal<string | null>(null);
  @Input() initialMode = signal<AuthMode>('signup');

  @Output() authenticated = new EventEmitter<{email: string, password: string, method: 'email' | 'google' | 'github'}>();
  @Output() close = new EventEmitter<void>();

  mode = signal<AuthMode>('signup');
  email = '';
  password = '';
  rememberMe = false;
  agreedToTerms = false;
  loading = signal(false);
  resetEmailSent = signal(false);
  errorMessage = signal<string | null>(null);

  ngOnInit() {
    // Set initial mode based on input
    this.mode.set(this.initialMode());
  }

  switchMode(newMode: AuthMode) {
    this.mode.set(newMode);
    this.email = '';
    this.password = '';
    this.agreedToTerms = false;
    this.resetEmailSent.set(false);
  }

  async submitLogin(event: Event) {
    event.preventDefault();
    if (this.email && this.password) {
      this.loading.set(true);
      this.errorMessage.set(null);

      try {
        const { session, user } = await supabaseService.signIn(this.email, this.password);

        this.loading.set(false);
        this.authenticated.emit({
          email: user?.email || this.email,
          password: this.password,
          method: 'email'
        });
      } catch (error: any) {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'Failed to sign in. Please check your credentials.');
        console.error('Login error:', error);
      }
    }
  }

  async submitSignup(event: Event) {
    event.preventDefault();
    if (this.email && this.password && this.agreedToTerms) {
      this.loading.set(true);
      this.errorMessage.set(null);

      try {
        const { session, user } = await supabaseService.signUp(this.email, this.password);

        this.loading.set(false);

        // Check if email confirmation is required
        if (user && !session) {
          this.errorMessage.set('Please check your email to confirm your account.');
        } else {
          this.authenticated.emit({
            email: user?.email || this.email,
            password: this.password,
            method: 'email'
          });
        }
      } catch (error: any) {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'Failed to create account. Please try again.');
        console.error('Signup error:', error);
      }
    }
  }

  async submitForgotPassword(event: Event) {
    event.preventDefault();
    if (this.email) {
      this.loading.set(true);
      this.errorMessage.set(null);

      try {
        await supabaseService.resetPassword(this.email);

        this.loading.set(false);
        this.resetEmailSent.set(true);
      } catch (error: any) {
        this.loading.set(false);
        this.errorMessage.set(error.message || 'Failed to send reset email. Please try again.');
        console.error('Reset password error:', error);
      }
    }
  }

  async socialLogin(provider: 'google' | 'github') {
    this.loading.set(true);
    this.errorMessage.set(null);

    try {
      await supabaseService.signInWithOAuth(provider);
      // OAuth will redirect, so we don't need to emit here
      // The callback will be handled by the auth state listener
    } catch (error: any) {
      this.loading.set(false);
      this.errorMessage.set(error.message || `Failed to sign in with ${provider}. Please try again.`);
      console.error('OAuth login error:', error);
    }
  }

  async socialSignup(provider: 'google' | 'github') {
    // OAuth signup is the same as login
    await this.socialLogin(provider);
  }

  onClose() {
    this.close.emit();
  }
}
