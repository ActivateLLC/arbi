export enum SystemStatus {
  IDLE = 'IDLE',
  ACTIVE = 'ACTIVE',
  PAUSED = 'PAUSED',
}

export interface LogEntry {
  id: string;
  timestamp: string;
  category: 'SCAN' | 'LIST' | 'AD' | 'CAMPAIGN' | 'ROI' | 'FULFILL' | 'SYSTEM';
  message: string;
}

export interface ChartDataPoint {
  time: string;
  revenue: number;
  spend: number;
  profit: number;
}

export interface DashboardState {
  status: SystemStatus;
  dailySpendLimit: number;
  riskTolerance: number; // 1-100
  totalRevenue: number;
  activeListings: number;
  roas: number;
}

export enum PipelineStage {
  FIND_PRODUCTS = 'FIND_PRODUCTS',
  CREATE_LISTINGS = 'CREATE_LISTINGS',
  GENERATE_ADS = 'GENERATE_ADS',
  RUN_CAMPAIGNS = 'RUN_CAMPAIGNS',
  OPTIMIZE_ROI = 'OPTIMIZE_ROI',
  FULFILL_ORDERS = 'FULFILL_ORDERS',
}

export interface ArbitrageOpportunity {
  id: string;
  productTitle: string;
  productUrl: string;
  supplierUrl: string;
  supplierPlatform: string;
  supplierPrice: number;
  marketPrice: number;
  estimatedProfit: number;
  profitMargin: number;
  score?: number; // 0-100 scoring
  imageUrl?: string;
  category?: string;
  inStock?: boolean;
  createdAt?: string;
}