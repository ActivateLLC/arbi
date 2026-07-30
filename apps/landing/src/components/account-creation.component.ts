import { Component, ChangeDetectionStrategy, signal, Output, EventEmitter, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-account-creation',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md">
      <!-- Progress Indicator -->
      <div class="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-[#00f0ff] text-black flex items-center justify-center text-xs font-bold">1</div>
          <span class="text-white text-sm font-mono">Account</span>
        </div>
        <div class="w-12 h-px bg-white/20"></div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center text-xs font-bold">2</div>
          <span class="text-white/40 text-sm font-mono">Payment</span>
        </div>
        <div class="w-12 h-px bg-white/20"></div>
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 rounded-full bg-white/10 text-white/40 flex items-center justify-center text-xs font-bold">3</div>
          <span class="text-white/40 text-sm font-mono">Setup</span>
        </div>
      </div>

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

          <!-- Header -->
          <div class="mb-8">
            <h2 class="text-3xl font-syne font-bold text-white mb-2 uppercase">
              Create Your <span class="text-[#00f0ff]">Account</span>
            </h2>
            <div class="h-0.5 w-12 bg-[#00f0ff] mb-4"></div>
            <p class="text-slate-400 text-sm">
              You're activating <span class="text-white font-bold">{{ selectedPlan() }}</span> plan
            </p>
          </div>

          @if (step() === 'email') {
            <!-- Step 1: Email -->
            <form (submit)="submitEmail($event)" class="space-y-6">
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
                <p class="text-xs text-slate-500">We'll send your trial details here</p>
              </div>

              <button
                type="submit"
                class="w-full py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
              >
                Continue
              </button>
            </form>
          }

          @if (step() === 'password') {
            <!-- Step 2: Password -->
            <form (submit)="submitPassword($event)" class="space-y-6">
              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Create Password
                </label>
                <input
                  type="password"
                  [(ngModel)]="password"
                  name="password"
                  required
                  minlength="8"
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm placeholder:text-slate-700"
                  placeholder="••••••••"
                  autofocus
                />
                <p class="text-xs text-slate-500">Minimum 8 characters</p>
              </div>

              <div class="flex gap-3">
                <button
                  type="button"
                  (click)="step.set('email')"
                  class="flex-1 py-4 bg-transparent border border-white/20 text-white font-bold text-sm uppercase tracking-widest hover:border-white/40 transition-all cyber-clip-sm"
                >
                  Back
                </button>
                <button
                  type="submit"
                  class="flex-1 py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)]"
                >
                  Create Account
                </button>
              </div>
            </form>
          }

          <!-- Trust Signals -->
          <div class="mt-8 pt-6 border-t border-white/10">
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
export class AccountCreationComponent {
  @Input() selectedPlan = signal('Pro');
  @Output() accountCreated = new EventEmitter<{email: string, password: string}>();
  @Output() close = new EventEmitter<void>();

  step = signal<'email' | 'password'>('email');
  email = '';
  password = '';

  submitEmail(event: Event) {
    event.preventDefault();
    if (this.email) {
      this.step.set('password');
    }
  }

  submitPassword(event: Event) {
    event.preventDefault();
    if (this.password) {
      this.accountCreated.emit({
        email: this.email,
        password: this.password
      });
    }
  }

  onClose() {
    this.close.emit();
  }
}
