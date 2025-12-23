// Arbitrage Engine Types

export interface Opportunity {
  id: string;
  type: OpportunityType;
  title: string;
  description: string;

  // Financial
  buyPrice: number;
  sellPrice: number;
  estimatedProfit: number;
  roi: number; // Return on Investment (percentage)
  buyCurrency?: string; // e.g. 'USD', 'CNY', 'EUR'
  sellCurrency?: string;

  // Risk
  confidence: number; // 0-100 score
  riskLevel: 'low' | 'medium' | 'high';
  volatility: number; // 0-100 score

  // Timing
  discoveredAt: Date;
  expiresAt?: Date;
  estimatedTimeToProfit: number; // days

  // Sources
  buySource: string;
  sellSource: string;
  sourceCountry?: string; // e.g. 'CN', 'US', 'DE'
  destinationCountry?: string;

  // Logistics
  shippingCost?: number;
  customsDuty?: number;
  customsInfo?: string;

  // Metadata
  category: string;
  productInfo?: ProductInfo;
  metadata: Record<string, unknown>;
}

export type OpportunityType =
  | 'ecommerce_arbitrage'
  | 'domain_flip'
  | 'crypto_arbitrage'
  | 'error_fare'
  | 'liquidation_auction'
  | 'nft_flip'
  | 'sports_betting'
  | 'options_pricing'
  | 'short_condor'
  | 'short_strangle'
  | 'short_straddle'
  | 'bearish_spread'
  | 'volatility_arbitrage';

export interface ProductInfo {
  asin?: string;
  upc?: string;
  sku?: string;
  title: string;
  brand?: string;
  category: string;
  imageUrl?: string;
  condition: 'new' | 'used' | 'refurbished';
  rank?: number; // Sales rank (lower is better)
  reviews?: {
    count: number;
    rating: number;
  };
}

export interface OpportunityAnalysis {
  opportunity: Opportunity;
  score: number; // 0-100
  shouldExecute: boolean;
  reasons: string[];
  warnings: string[];
  estimatedOutcome: {
    bestCase: number;
    worstCase: number;
    likelyCase: number;
  };
}

export interface UserBudgetSettings {
  dailyLimit: number;
  perOpportunityMax: number;
  monthlyLimit: number;
  reserveFund: number;
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  enabledStrategies: OpportunityType[];
  volatilityConfig?: VolatilityStrategyConfig;
}

export interface RiskAssessment {
  approved: boolean;
  budgetCheck: {
    passed: boolean;
    dailyRemaining: number;
    monthlyRemaining: number;
  };
  riskScore: number; // 0-100
  reasons: string[];
}

export interface TradeExecution {
  opportunityId: string;
  status: 'pending' | 'purchased' | 'listed' | 'sold' | 'failed';
  purchaseDetails?: {
    platform: string;
    price: number;
    transactionId: string;
    timestamp: Date;
  };
  listingDetails?: {
    platform: string;
    listingId: string;
    price: number;
    timestamp: Date;
  };
  saleDetails?: {
    soldPrice: number;
    fees: number;
    netProfit: number;
    timestamp: Date;
  };
  error?: string;
}

export interface ScoutConfig {
  enabled: boolean;
  scanInterval: number; // minutes
  sources: string[];
  filters?: {
    minProfit?: number;
    minROI?: number;
    categories?: string[];
    maxPrice?: number;
  };
}

export interface OpportunityScout {
  name: string;
  type: OpportunityType;
  scan(config: ScoutConfig): Promise<Opportunity[]>;
}

export interface MarketConditions {
  vixLevel: number; // VIX volatility index (0-100+)
  trend: 'bullish' | 'bearish' | 'neutral';
  volatilityState: 'low' | 'moderate' | 'high' | 'extreme';
  timestamp: Date;
}

export interface VolatilityStrategyConfig {
  enabledDuringHighVix: boolean; // Enable bearish/volatility strategies when VIX > threshold
  vixThreshold: number; // VIX level to enable volatility strategies (default: 25)
  maxVolatilityExposure: number; // Max % of budget for volatility strategies
}
