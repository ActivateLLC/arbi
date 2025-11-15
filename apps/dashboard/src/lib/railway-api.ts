/**
 * Railway API Client for ARBI Autonomous Arbitrage System
 * Connects the dashboard to the backend running on Railway
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export interface OpportunityFilter {
  minScore?: number;
  status?: string;
  limit?: number;
}

export interface AutonomousConfig {
  minScore: number;
  minROI: number;
  minProfit: number;
  maxPrice: number;
  categories?: string[];
  scanInterval: number;
  autoBuyEnabled: boolean;
  autoBuyScore?: number;
  dailyBudget?: number;
}

export interface Product {
  id: string;
  title: string;
  price: number;
  imageUrl?: string;
  url: string;
  condition: string;
  seller: {
    username: string;
    feedbackScore: number;
    feedbackPercentage: number;
  };
}

export interface Profit {
  sourcePrice: number;
  targetPrice: number;
  netProfit: number;
  profitMargin: number;
  roi: number;
  totalCost: number;
  totalRevenue: number;
}

export interface Score {
  score: number;
  tier: 'excellent' | 'high' | 'medium' | 'low';
  confidence: number;
  reasoning: string[];
  greenFlags: string[];
  redFlags: string[];
}

export interface Opportunity {
  id: string;
  product: Product;
  profit: Profit;
  score: Score;
  foundAt: string;
  expiresAt: string;
  status: string;
}

export interface OpportunitiesResponse {
  total: number;
  opportunities: Opportunity[];
}

export interface SystemStatus {
  status: 'running' | 'stopped';
  config: AutonomousConfig;
  stats: {
    totalScans: number;
    totalOpportunities: number;
    avgScore: number;
    highScoreCount: number;
  };
  uptime: number;
}

export interface Stats {
  totalScans: number;
  totalOpportunities: number;
  avgScore: number;
  highScoreCount: number;
  isRunning: boolean;
  config: AutonomousConfig;
  distribution: {
    byTier: {
      excellent: number;
      high: number;
      medium: number;
      low: number;
    };
    byProfit: {
      under10: number;
      from10to20: number;
      from20to50: number;
      over50: number;
    };
  };
}

/**
 * Autonomous Arbitrage API Client
 */
export const autonomousApi = {
  /**
   * Get system status
   */
  async getStatus(): Promise<SystemStatus> {
    const response = await fetch(`${API_URL}/api/autonomous/status`);
    if (!response.ok) {
      throw new Error(`Failed to get status: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Start autonomous scanning
   */
  async start(config?: Partial<AutonomousConfig>): Promise<{
    success: boolean;
    message: string;
    initialOpportunities: number;
    config: AutonomousConfig;
  }> {
    const response = await fetch(`${API_URL}/api/autonomous/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ config }),
    });
    if (!response.ok) {
      throw new Error(`Failed to start system: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Stop autonomous scanning
   */
  async stop(): Promise<{
    success: boolean;
    message: string;
    finalStats: any;
  }> {
    const response = await fetch(`${API_URL}/api/autonomous/stop`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to stop system: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get opportunities
   */
  async getOpportunities(filters?: OpportunityFilter): Promise<OpportunitiesResponse> {
    const params = new URLSearchParams();
    if (filters?.minScore) params.append('minScore', filters.minScore.toString());
    if (filters?.status) params.append('status', filters.status);
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const url = `${API_URL}/api/autonomous/opportunities${params.toString() ? '?' + params.toString() : ''}`;
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to get opportunities: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get detailed statistics
   */
  async getStats(): Promise<Stats> {
    const response = await fetch(`${API_URL}/api/autonomous/stats`);
    if (!response.ok) {
      throw new Error(`Failed to get stats: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Update configuration
   */
  async updateConfig(config: Partial<AutonomousConfig>): Promise<{
    success: boolean;
    message: string;
    config: AutonomousConfig;
    note: string;
  }> {
    const response = await fetch(`${API_URL}/api/autonomous/config`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    if (!response.ok) {
      throw new Error(`Failed to update config: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Get current configuration
   */
  async getConfig(): Promise<AutonomousConfig> {
    const response = await fetch(`${API_URL}/api/autonomous/config`);
    if (!response.ok) {
      throw new Error(`Failed to get config: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Trigger manual scan
   */
  async scanNow(): Promise<{
    success: boolean;
    message: string;
    opportunitiesFound: number;
    stats: any;
    opportunities: Opportunity[];
  }> {
    const response = await fetch(`${API_URL}/api/autonomous/scan-now`, {
      method: 'POST',
    });
    if (!response.ok) {
      throw new Error(`Failed to trigger scan: ${response.statusText}`);
    }
    return response.json();
  },

  /**
   * Clear all opportunities
   */
  async clearOpportunities(): Promise<{
    success: boolean;
    message: string;
  }> {
    const response = await fetch(`${API_URL}/api/autonomous/opportunities`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      throw new Error(`Failed to clear opportunities: ${response.statusText}`);
    }
    return response.json();
  },
};

/**
 * Format currency
 */
export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

/**
 * Format percentage
 */
export function formatPercentage(value: number): string {
  return `${value.toFixed(2)}%`;
}

/**
 * Get score color
 */
export function getScoreColor(score: number): string {
  if (score >= 90) return 'text-green-600 dark:text-green-400';
  if (score >= 80) return 'text-blue-600 dark:text-blue-400';
  if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
  return 'text-gray-600 dark:text-gray-400';
}

/**
 * Get tier badge color
 */
export function getTierBadgeColor(tier: string): string {
  switch (tier) {
    case 'excellent':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
    case 'high':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
  }
}
