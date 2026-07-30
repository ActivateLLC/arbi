import { Component, ChangeDetectionStrategy, signal, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { dataService, ActivityLog } from '../services/data.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="fixed inset-0 z-50 bg-black/95 backdrop-blur-md overflow-y-auto">
      <div class="min-h-screen p-6">
        <!-- Header -->
        <div class="max-w-7xl mx-auto mb-8">
          <div class="flex items-center justify-between">
            <div class="flex items-center gap-4">
              <div class="relative w-12 h-12 flex items-center justify-center">
                <div class="absolute inset-0 bg-[#00f0ff] rotate-45 scale-75"></div>
                <div class="absolute inset-0 border border-white rotate-45 scale-75"></div>
                <span class="relative z-10 font-syne font-bold text-black text-xl">A</span>
              </div>
              <div>
                <h1 class="text-2xl font-syne font-bold text-white uppercase">Dashboard</h1>
                <p class="text-xs text-slate-400 font-mono">{{ userEmail() }}</p>
              </div>
            </div>
            <div class="flex items-center gap-4">
              <button
                (click)="onClose()"
                class="px-6 py-2 bg-transparent border border-white/20 text-white font-bold text-xs uppercase tracking-widest hover:border-white/40 transition-all cyber-clip-sm"
              >
                Back to Site
              </button>
              <button
                (click)="onLogout()"
                class="px-6 py-2 bg-transparent border border-white/20 text-white font-bold text-xs uppercase tracking-widest hover:border-red-500/40 hover:text-red-400 transition-all cyber-clip-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>

        <div class="max-w-7xl mx-auto">
          <!-- Stats Grid -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div class="bg-[#0a0a0a] border border-white/10 p-6 cyber-clip-sm">
              <div class="flex items-center justify-between mb-4">
                <i class="ri-line-chart-line text-3xl text-[#00f0ff]"></i>
                <div class="px-3 py-1 bg-green-500/10 text-green-400 text-xs font-bold cyber-clip-sm">
                  +12.5%
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1 font-mono">\${{ totalProfit().toLocaleString() }}</div>
              <div class="text-xs text-slate-400 uppercase tracking-widest">Total Profit</div>
            </div>

            <div class="bg-[#0a0a0a] border border-white/10 p-6 cyber-clip-sm">
              <div class="flex items-center justify-between mb-4">
                <i class="ri-shopping-bag-3-line text-3xl text-[#00f0ff]"></i>
                <div class="px-3 py-1 bg-[#00f0ff]/10 text-[#00f0ff] text-xs font-bold cyber-clip-sm">
                  Live
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1 font-mono">{{ activeListings() }}</div>
              <div class="text-xs text-slate-400 uppercase tracking-widest">Active Listings</div>
            </div>

            <div class="bg-[#0a0a0a] border border-white/10 p-6 cyber-clip-sm">
              <div class="flex items-center justify-between mb-4">
                <i class="ri-flashlight-line text-3xl text-[#00f0ff]"></i>
                <div class="px-3 py-1 bg-yellow-500/10 text-yellow-400 text-xs font-bold cyber-clip-sm">
                  New
                </div>
              </div>
              <div class="text-3xl font-bold text-white mb-1 font-mono">{{ opportunities() }}</div>
              <div class="text-xs text-slate-400 uppercase tracking-widest">Opportunities Found</div>
            </div>
          </div>

          <!-- Quick Actions -->
          <div class="bg-[#0a0a0a] border border-white/10 p-8 cyber-clip-sm mb-8">
            <h2 class="text-xl font-syne font-bold text-white mb-6 uppercase">Quick Actions</h2>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button class="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all cyber-clip-sm text-left group">
                <i class="ri-search-eye-line text-2xl text-[#00f0ff] mb-3 block"></i>
                <div class="text-white font-bold mb-1">Find Products</div>
                <div class="text-xs text-slate-400">Scan for new opportunities</div>
              </button>

              <button class="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all cyber-clip-sm text-left group">
                <i class="ri-file-list-3-line text-2xl text-[#00f0ff] mb-3 block"></i>
                <div class="text-white font-bold mb-1">Create Listings</div>
                <div class="text-xs text-slate-400">Auto-generate listings</div>
              </button>

              <button class="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all cyber-clip-sm text-left group">
                <i class="ri-price-tag-3-line text-2xl text-[#00f0ff] mb-3 block"></i>
                <div class="text-white font-bold mb-1">Adjust Prices</div>
                <div class="text-xs text-slate-400">Optimize pricing strategy</div>
              </button>

              <button class="p-6 bg-[#00f0ff]/5 border border-[#00f0ff]/20 hover:border-[#00f0ff]/50 transition-all cyber-clip-sm text-left group">
                <i class="ri-settings-3-line text-2xl text-[#00f0ff] mb-3 block"></i>
                <div class="text-white font-bold mb-1">Settings</div>
                <div class="text-xs text-slate-400">Configure automation</div>
              </button>
            </div>
          </div>

          <!-- Recent Activity -->
          <div class="bg-[#0a0a0a] border border-white/10 p-8 cyber-clip-sm">
            <h2 class="text-xl font-syne font-bold text-white mb-6 uppercase">Recent Activity</h2>

            <!-- Loading State -->
            <div *ngIf="loading()" class="space-y-4">
              <div class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 cyber-clip-sm animate-pulse">
                <div class="w-12 h-12 bg-white/10 rounded-full"></div>
                <div class="flex-1">
                  <div class="h-4 bg-white/10 rounded mb-2 w-1/3"></div>
                  <div class="h-3 bg-white/10 rounded w-1/2"></div>
                </div>
              </div>
            </div>

            <!-- Error State -->
            <div *ngIf="error()" class="p-4 bg-red-500/10 border border-red-500/20 cyber-clip-sm">
              <p class="text-sm text-red-400">
                <i class="ri-error-warning-line mr-2"></i>{{ error() }}
              </p>
            </div>

            <!-- Empty State -->
            <div *ngIf="!loading() && !error() && activityLog().length === 0" class="text-center py-12">
              <i class="ri-inbox-line text-6xl text-slate-600 mb-4 block"></i>
              <p class="text-slate-400">No activity yet. Start discovering opportunities!</p>
            </div>

            <!-- Activity List -->
            <div *ngIf="!loading() && !error() && activityLog().length > 0" class="space-y-4">
              <div *ngFor="let activity of activityLog()" class="flex items-center gap-4 p-4 bg-white/5 border border-white/5 cyber-clip-sm">
                <div class="w-12 h-12 border rounded-full flex items-center justify-center" [ngClass]="getActivityIconBg(activity.activity_type)">
                  <i class="text-xl" [ngClass]="getActivityIcon(activity.activity_type)"></i>
                </div>
                <div class="flex-1">
                  <div class="text-white font-bold text-sm">{{ activity.title }}</div>
                  <div class="text-xs text-slate-400">{{ activity.description }}</div>
                </div>
                <div class="text-xs text-slate-500 font-mono">{{ getTimeAgo(activity.created_at || '') }}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `
})
export class DashboardComponent implements OnInit {
  @Input() userEmail = signal('user@arbi.com');
  @Output() logout = new EventEmitter<void>();
  @Output() close = new EventEmitter<void>();

  totalProfit = signal(0);
  activeListings = signal(0);
  opportunities = signal(0);
  activityLog = signal<ActivityLog[]>([]);
  loading = signal(true);
  error = signal<string | null>(null);

  async ngOnInit() {
    await this.loadDashboardData();
  }

  async loadDashboardData() {
    this.loading.set(true);
    this.error.set(null);

    try {
      // Load dashboard stats
      const stats = await dataService.getDashboardStats();
      this.totalProfit.set(stats.totalProfit);
      this.activeListings.set(stats.activeListings);
      this.opportunities.set(stats.opportunities);

      // Load recent activity
      const activity = await dataService.getActivityLog(4);
      this.activityLog.set(activity);

      this.loading.set(false);
    } catch (err: any) {
      console.error('Error loading dashboard data:', err);
      this.error.set(err.message || 'Failed to load dashboard data');
      this.loading.set(false);

      // Set default values if error
      this.totalProfit.set(0);
      this.activeListings.set(0);
      this.opportunities.set(0);
      this.activityLog.set([]);
    }
  }

  getActivityIcon(type: string): string {
    switch (type) {
      case 'listing_created': return 'ri-check-line text-green-400';
      case 'opportunity_found': return 'ri-flashlight-line text-[#00f0ff]';
      case 'sale_completed': return 'ri-shopping-cart-line text-blue-400';
      case 'price_updated': return 'ri-refresh-line text-purple-400';
      default: return 'ri-information-line text-slate-400';
    }
  }

  getActivityIconBg(type: string): string {
    switch (type) {
      case 'listing_created': return 'bg-green-500/10 border-green-500/20';
      case 'opportunity_found': return 'bg-[#00f0ff]/10 border-[#00f0ff]/20';
      case 'sale_completed': return 'bg-blue-500/10 border-blue-500/20';
      case 'price_updated': return 'bg-purple-500/10 border-purple-500/20';
      default: return 'bg-slate-500/10 border-slate-500/20';
    }
  }

  getTimeAgo(timestamp: string): string {
    const now = new Date();
    const time = new Date(timestamp);
    const diff = Math.floor((now.getTime() - time.getTime()) / 1000); // seconds

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  onLogout() {
    this.logout.emit();
  }

  onClose() {
    this.close.emit();
  }
}
