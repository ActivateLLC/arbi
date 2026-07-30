import { Component, ChangeDetectionStrategy, Output, EventEmitter, signal, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { gsap } from 'gsap';

@Component({
  selector: 'app-onboarding-flow',
  standalone: true,
  imports: [CommonModule, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95 backdrop-blur-md">
      <!-- Progress Bar -->
      <div class="absolute top-8 left-0 right-0 px-20">
        <div class="max-w-2xl mx-auto">
          <div class="flex items-center justify-between mb-4">
            <div class="flex items-center flex-1">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold bg-[#00f0ff] text-black">
                <i class="ri-check-line text-lg"></i>
              </div>
              <div class="flex-1 h-px bg-white/10 mx-2">
                <div class="h-full bg-[#00f0ff] transition-all duration-500" [style.width]="currentStep() >= 1 ? '100%' : '0%'"></div>
              </div>
            </div>
            <div class="flex items-center flex-1">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" [ngClass]="{'bg-[#00f0ff] text-black': currentStep() > 1, 'bg-white text-black': currentStep() === 1, 'bg-white/10 text-white/40': currentStep() < 1}">
                {{ currentStep() > 1 ? '✓' : '2' }}
              </div>
              <div class="flex-1 h-px bg-white/10 mx-2">
                <div class="h-full bg-[#00f0ff] transition-all duration-500" [style.width]="currentStep() >= 2 ? '100%' : '0%'"></div>
              </div>
            </div>
            <div class="flex items-center">
              <div class="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold" [ngClass]="{'bg-[#00f0ff] text-black': currentStep() > 2, 'bg-white text-black': currentStep() === 2, 'bg-white/10 text-white/40': currentStep() < 2}">
                {{ currentStep() > 2 ? '✓' : '3' }}
              </div>
            </div>
          </div>
          <p class="text-center text-sm text-slate-400 font-mono">
            Step {{ currentStep() + 1 }} of {{ steps.length }}: {{ steps[currentStep()].title }}
          </p>
        </div>
      </div>

      <!-- Main Content -->
      <div class="relative bg-[#0a0a0a] border border-white/10 p-1 w-full max-w-2xl cyber-clip">
        <div class="bg-[#0a0a0a] p-12 cyber-clip">

          <!-- Step 1: Arbitrage Type -->
          <div class="step-content" *ngIf="currentStep() === 0">
              <h2 class="text-3xl font-syne font-bold text-white mb-4 uppercase">
                Select Your <span class="text-[#00f0ff]">Arbitrage Type</span>
              </h2>
              <p class="text-slate-400 mb-8">
                Choose your primary arbitrage strategy. You can change this later.
              </p>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button *ngFor="let type of arbitrageTypes" (click)="selectedArbitrageType.set(type.id)" class="p-6 border-2 transition-all cyber-clip-sm text-left group hover:border-[#00f0ff]/50" [ngClass]="{'border-[#00f0ff] bg-[#00f0ff]/5': selectedArbitrageType() === type.id, 'border-white/10': selectedArbitrageType() !== type.id}">
                  <i [class]="type.icon" class="text-4xl mb-4 block" [ngClass]="{'text-[#00f0ff]': selectedArbitrageType() === type.id, 'text-white': selectedArbitrageType() !== type.id}"></i>
                  <h3 class="text-white font-bold mb-2">{{ type.name }}</h3>
                  <p class="text-slate-400 text-sm">{{ type.desc }}</p>
                </button>
              </div>
          </div>

          <!-- Step 2: Risk Tolerance -->
          <div class="step-content" *ngIf="currentStep() === 1">
              <h2 class="text-3xl font-syne font-bold text-white mb-4 uppercase">
                Set Your <span class="text-[#00f0ff]">Risk Tolerance</span>
              </h2>
              <p class="text-slate-400 mb-8">
                How aggressive should the AI be when finding opportunities?
              </p>

              <div class="space-y-4">
                <button *ngFor="let risk of riskLevels" (click)="selectedRisk.set(risk.id)" class="w-full p-6 border-2 transition-all cyber-clip-sm text-left hover:border-[#00f0ff]/50" [ngClass]="{'border-[#00f0ff] bg-[#00f0ff]/5': selectedRisk() === risk.id, 'border-white/10': selectedRisk() !== risk.id}">
                  <div class="flex items-start justify-between">
                    <div>
                      <h3 class="text-white font-bold mb-2">{{ risk.name }}</h3>
                      <p class="text-slate-400 text-sm">{{ risk.desc }}</p>
                    </div>
                    <div class="px-3 py-1 bg-white/10 text-[#00f0ff] text-xs font-mono cyber-clip-sm">
                      {{ risk.minMargin }}% min margin
                    </div>
                  </div>
                </button>
              </div>
          </div>

          <!-- Step 3: Budget Limits -->
          <div class="step-content" *ngIf="currentStep() === 2">
              <h2 class="text-3xl font-syne font-bold text-white mb-4 uppercase">
                Set Your <span class="text-[#00f0ff]">Budget</span>
              </h2>
              <p class="text-slate-400 mb-8">
                Control how much the AI can spend per campaign and per day.
              </p>

              <div class="space-y-6">
                <div>
                  <label class="block text-sm text-white font-bold mb-3">
                    Max Spend Per Campaign
                  </label>
                  <div class="flex items-center gap-4">
                    <input
                      type="range"
                      [(ngModel)]="maxSpendPerCampaign"
                      min="10"
                      max="500"
                      step="10"
                      class="flex-1"
                    />
                    <div class="w-24 px-4 py-2 bg-slate-900/50 border border-white/10 text-center text-white font-mono cyber-clip-sm">
                      \${{ maxSpendPerCampaign }}
                    </div>
                  </div>
                </div>

                <div>
                  <label class="block text-sm text-white font-bold mb-3">
                    Max Daily Budget
                  </label>
                  <div class="flex items-center gap-4">
                    <input
                      type="range"
                      [(ngModel)]="maxDailyBudget"
                      min="50"
                      max="2000"
                      step="50"
                      class="flex-1"
                    />
                    <div class="w-24 px-4 py-2 bg-slate-900/50 border border-white/10 text-center text-white font-mono cyber-clip-sm">
                      \${{ maxDailyBudget }}
                    </div>
                  </div>
                </div>

                <div class="p-4 bg-[#00f0ff]/5 border border-[#00f0ff]/20 cyber-clip-sm">
                  <p class="text-sm text-slate-300">
                    <i class="ri-information-line text-[#00f0ff]"></i>
                    The AI will respect these limits. You can adjust anytime in settings.
                  </p>
                </div>
              </div>
          </div>

          <!-- Navigation -->
          <div class="flex gap-4 mt-12">
            <button
              *ngIf="currentStep() > 0"
              (click)="previousStep()"
              class="flex-1 py-4 bg-transparent border border-white/20 text-white font-bold text-sm uppercase tracking-widest hover:border-white/40 transition-all cyber-clip-sm"
            >
              Back
            </button>
            <button
              (click)="nextStep()"
              [disabled]="!canProceed()"
              class="flex-1 py-4 bg-[#00f0ff] text-black font-bold text-sm uppercase tracking-widest hover:bg-white transition-all cyber-clip-sm hover:shadow-[0_0_20px_rgba(0,240,255,0.4)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {{ currentStep() === steps.length - 1 ? 'Complete Setup' : 'Continue' }}
            </button>
          </div>

          <!-- Skip Option -->
          <button
            (click)="onSkip()"
            class="w-full mt-6 py-2 text-slate-400 hover:text-white text-xs uppercase tracking-widest transition-colors"
          >
            Skip Setup →
          </button>
        </div>
      </div>
    </div>
  `
})
export class OnboardingFlowComponent {
  @Output() complete = new EventEmitter<{
    arbitrageType: string;
    risk: string;
    maxSpendPerCampaign: number;
    maxDailyBudget: number;
  }>();
  @Output() skip = new EventEmitter<void>();

  currentStep = signal(0);

  steps = [
    { id: 1, title: 'Arbitrage Type' },
    { id: 2, title: 'Risk Tolerance' },
    { id: 3, title: 'Budget Limits' }
  ];

  arbitrageTypes = [
    { id: 'retail', name: 'Retail Arbitrage', desc: 'Buy low from retailers, sell high', icon: 'ri-store-line' },
    { id: 'online', name: 'Online Arbitrage', desc: 'Pure online-to-online flipping', icon: 'ri-shopping-cart-line' },
    { id: 'wholesale', name: 'Wholesale', desc: 'Bulk buying with volume discounts', icon: 'ri-box-3-line' },
    { id: 'clearance', name: 'Clearance Hunting', desc: 'Focus on clearance and liquidation', icon: 'ri-price-tag-3-line' }
  ];

  riskLevels = [
    { id: 'conservative', name: 'Conservative', desc: 'Safe bets only. Higher margins, slower velocity.', minMargin: 30 },
    { id: 'moderate', name: 'Moderate', desc: 'Balanced approach. Good margins, decent velocity.', minMargin: 20 },
    { id: 'aggressive', name: 'Aggressive', desc: 'Maximum velocity. Lower margins, high volume.', minMargin: 10 }
  ];

  selectedArbitrageType = signal('');
  selectedRisk = signal('');
  maxSpendPerCampaign = 100;
  maxDailyBudget = 500;

  nextStep() {
    if (this.currentStep() < this.steps.length - 1) {
      this.currentStep.set(this.currentStep() + 1);
    } else {
      this.complete.emit({
        arbitrageType: this.selectedArbitrageType(),
        risk: this.selectedRisk(),
        maxSpendPerCampaign: this.maxSpendPerCampaign,
        maxDailyBudget: this.maxDailyBudget
      });
    }
  }

  previousStep() {
    if (this.currentStep() > 0) {
      this.currentStep.set(this.currentStep() - 1);
    }
  }

  canProceed(): boolean {
    switch(this.currentStep()) {
      case 0: return !!this.selectedArbitrageType();
      case 1: return !!this.selectedRisk();
      case 2: return true;
      default: return false;
    }
  }

  onSkip() {
    this.skip.emit();
  }
}
