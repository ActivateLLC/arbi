import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-payment-checkout',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <!-- Progress Indicator -->
      <div class="absolute top-8 left-1/2 -translate-x-1/2 flex items-center gap-4 z-10">
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
      <div class="relative w-full max-w-4xl my-20">
        <div class="grid md:grid-cols-[1fr,400px] gap-6">

          <!-- Left: Payment Form -->
          <div class="bg-[#0a0a0a] border border-white/10 p-8 cyber-clip">
            <h2 class="text-2xl font-syne font-bold text-white mb-6 uppercase">
              Payment <span class="text-[#00f0ff]">Details</span>
            </h2>

            <form (submit)="submitPayment($event)" class="space-y-6">
              <!-- Card Number -->
              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Card Number
                </label>
                <div class="relative">
                  <input
                    type="text"
                    [(ngModel)]="cardNumber"
                    name="cardNumber"
                    required
                    placeholder="4242 4242 4242 4242"
                    class="w-full bg-slate-900/50 border border-white/10 p-4 pr-12 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm"
                  />
                  <div class="absolute right-4 top-1/2 -translate-y-1/2 flex gap-2">
                    <i class="ri-mastercard-line text-xl text-slate-600"></i>
                    <i class="ri-visa-line text-xl text-slate-600"></i>
                  </div>
                </div>
              </div>

              <div class="grid grid-cols-2 gap-4">
                <!-- Expiry -->
                <div class="space-y-2">
                  <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                    Expiry Date
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="expiry"
                    name="expiry"
                    required
                    placeholder="MM / YY"
                    class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm"
                  />
                </div>

                <!-- CVC -->
                <div class="space-y-2">
                  <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                    CVC
                  </label>
                  <input
                    type="text"
                    [(ngModel)]="cvc"
                    name="cvc"
                    required
                    placeholder="123"
                    class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm"
                  />
                </div>
              </div>

              <!-- Billing Address -->
              <div class="space-y-2">
                <label class="block text-[10px] text-[#00f0ff] uppercase tracking-widest font-bold">
                  Billing Address
                </label>
                <input
                  type="text"
                  [(ngModel)]="billingAddress"
                  name="billingAddress"
                  required
                  placeholder="123 Main St, City, State, ZIP"
                  class="w-full bg-slate-900/50 border border-white/10 p-4 text-white focus:border-[#00f0ff] focus:bg-slate-900 focus:outline-none transition-all font-mono text-sm"
                />
              </div>

              <!-- Terms Checkbox -->
              <div class="flex items-start gap-3 p-4 bg-slate-900/30 border border-white/10 cyber-clip-sm">
                <input
                  type="checkbox"
                  [(ngModel)]="agreedToTerms"
                  name="terms"
                  required
                  class="mt-1 w-4 h-4 accent-[#00f0ff]"
                  id="terms"
                />
                <label for="terms" class="text-xs text-slate-400 leading-relaxed">
                  I agree to the <a href="#" class="text-[#00f0ff] hover:underline">Terms of Service</a> and <a href="#" class="text-[#00f0ff] hover:underline">Privacy Policy</a>. I understand I won't be charged until my 14-day trial ends.
                </label>
              </div>

              <!-- Submit Button -->
              <button
                type="submit"
                [disabled]="processing()"
                class="w-full py-5 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
              >
                @if (processing()) {
                  <span class="flex items-center justify-center gap-2">
                    <i class="ri-loader-4-line animate-spin"></i>
                    Processing...
                  </span>
                } @else {
                  <span>Start 14-Day Free Trial</span>
                }
              </button>

              <!-- Security Badge -->
              <div class="flex items-center justify-center gap-4 text-[10px] text-slate-500 uppercase tracking-widest">
                <div class="flex items-center gap-2">
                  <i class="ri-lock-line text-[#00f0ff]"></i>
                  <span>256-bit Encryption</span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="ri-shield-check-line text-[#00f0ff]"></i>
                  <span>PCI Compliant</span>
                </div>
              </div>
            </form>
          </div>

          <!-- Right: Order Summary -->
          <div class="bg-[#0a0a0a] border border-[#00f0ff]/30 p-6 cyber-clip h-fit sticky top-24">
            <h3 class="text-lg font-syne font-bold text-white mb-6 uppercase">
              Order Summary
            </h3>

            <!-- Plan Details -->
            <div class="space-y-4 mb-6">
              <div class="flex items-start justify-between">
                <div>
                  <p class="text-white font-bold">{{ planName() }}</p>
                  <p class="text-xs text-slate-500">Billed {{ billingCycle() }}</p>
                </div>
                <p class="text-white font-bold">\${{ planPrice() }}</p>
              </div>

              <div class="space-y-2 text-xs text-slate-400">
                <div class="flex items-center gap-2">
                  <i class="ri-check-line text-[#00f0ff]"></i>
                  <span>{{ planLimits() }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="ri-check-line text-[#00f0ff]"></i>
                  <span>AI-powered automation</span>
                </div>
                <div class="flex items-center gap-2">
                  <i class="ri-check-line text-[#00f0ff]"></i>
                  <span>Priority support</span>
                </div>
              </div>
            </div>

            <div class="border-t border-white/10 pt-4 mb-6">
              <div class="flex justify-between text-sm mb-2">
                <span class="text-slate-400">Subtotal</span>
                <span class="text-white">\${{ planPrice() }}</span>
              </div>
              <div class="flex justify-between text-sm mb-4">
                <span class="text-slate-400">Tax</span>
                <span class="text-white">\$0.00</span>
              </div>
              <div class="flex justify-between items-center pt-4 border-t border-white/10">
                <span class="text-white font-bold">Due Today</span>
                <div class="text-right">
                  <p class="text-2xl font-bold text-[#00f0ff]">\$0.00</p>
                  <p class="text-xs text-slate-500">14-day free trial</p>
                </div>
              </div>
            </div>

            <!-- Guarantee Badge -->
            <div class="p-4 bg-[#00f0ff]/5 border border-[#00f0ff]/20 cyber-clip-sm">
              <div class="flex items-start gap-3">
                <i class="ri-shield-check-line text-xl text-[#00f0ff]"></i>
                <div>
                  <p class="text-white text-sm font-bold mb-1">Money-Back Guarantee</p>
                  <p class="text-xs text-slate-400">Cancel anytime. No questions asked.</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>
    </div>
  `
})
export class PaymentCheckoutComponent {
  @Input() planName = signal('Pro');
  @Input() planPrice = signal(97);
  @Input() planLimits = signal('500 opportunities/day');
  @Input() billingCycle = signal('monthly');
  @Output() paymentComplete = new EventEmitter<void>();

  cardNumber = '';
  expiry = '';
  cvc = '';
  billingAddress = '';
  agreedToTerms = false;
  processing = signal(false);

  submitPayment(event: Event) {
    event.preventDefault();

    if (!this.agreedToTerms) {
      return;
    }

    this.processing.set(true);

    // Simulate payment processing
    setTimeout(() => {
      this.processing.set(false);
      this.paymentComplete.emit();
    }, 2000);
  }
}
