import { supabaseService } from './supabase.service';

export interface Opportunity {
  id?: number;
  user_id?: string;
  product_name: string;
  source_retailer: string;
  source_price: number;
  target_platform: string;
  target_price: number;
  profit_margin: number;
  roi_percentage: number;
  image_url?: string;
  product_url?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Listing {
  id?: number;
  user_id?: string;
  opportunity_id?: number;
  product_name: string;
  listing_platform: string;
  listing_price: number;
  quantity?: number;
  status?: string;
  views?: number;
  sales?: number;
  revenue?: number;
  created_at?: string;
  updated_at?: string;
}

export interface UserSettings {
  user_id?: string;
  arbitrage_type?: string;
  risk_tolerance?: string;
  max_spend_per_campaign?: number;
  max_daily_budget?: number;
  min_profit_margin?: number;
  auto_listing_enabled?: boolean;
  auto_pricing_enabled?: boolean;
}

export interface ActivityLog {
  id?: number;
  user_id?: string;
  activity_type: string;
  title: string;
  description?: string;
  metadata?: any;
  created_at?: string;
}

class DataService {
  private static instance: DataService;

  private constructor() {}

  public static getInstance(): DataService {
    if (!DataService.instance) {
      DataService.instance = new DataService();
    }
    return DataService.instance;
  }

  // ============================================
  // Opportunities
  // ============================================
  async getOpportunities() {
    const { data, error } = await supabaseService.supabase
      .from('opportunities')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Opportunity[];
  }

  async getOpportunityById(id: number) {
    const { data, error } = await supabaseService.supabase
      .from('opportunities')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data as Opportunity;
  }

  async createOpportunity(opportunity: Opportunity) {
    const user = await supabaseService.getUser();

    const { data, error } = await supabaseService.supabase
      .from('opportunities')
      .insert([{ ...opportunity, user_id: user?.id }])
      .select()
      .single();

    if (error) throw error;
    return data as Opportunity;
  }

  async updateOpportunity(id: number, updates: Partial<Opportunity>) {
    const { data, error } = await supabaseService.supabase
      .from('opportunities')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Opportunity;
  }

  async deleteOpportunity(id: number) {
    const { error } = await supabaseService.supabase
      .from('opportunities')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ============================================
  // Listings
  // ============================================
  async getListings() {
    const { data, error } = await supabaseService.supabase
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Listing[];
  }

  async getActiveListings() {
    const { data, error } = await supabaseService.supabase
      .from('listings')
      .select('*')
      .eq('status', 'active')
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as Listing[];
  }

  async createListing(listing: Listing) {
    const user = await supabaseService.getUser();

    const { data, error } = await supabaseService.supabase
      .from('listings')
      .insert([{ ...listing, user_id: user?.id }])
      .select()
      .single();

    if (error) throw error;
    return data as Listing;
  }

  async updateListing(id: number, updates: Partial<Listing>) {
    const { data, error } = await supabaseService.supabase
      .from('listings')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data as Listing;
  }

  // ============================================
  // User Settings
  // ============================================
  async getUserSettings() {
    const user = await supabaseService.getUser();

    const { data, error } = await supabaseService.supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', user?.id)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows
    return data as UserSettings | null;
  }

  async upsertUserSettings(settings: UserSettings) {
    const user = await supabaseService.getUser();

    const { data, error } = await supabaseService.supabase
      .from('user_settings')
      .upsert([{ ...settings, user_id: user?.id }])
      .select()
      .single();

    if (error) throw error;
    return data as UserSettings;
  }

  // ============================================
  // Activity Log
  // ============================================
  async getActivityLog(limit: number = 10) {
    const { data, error } = await supabaseService.supabase
      .from('activity_log')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data as ActivityLog[];
  }

  async logActivity(activity: ActivityLog) {
    const user = await supabaseService.getUser();

    const { data, error } = await supabaseService.supabase
      .from('activity_log')
      .insert([{ ...activity, user_id: user?.id }])
      .select()
      .single();

    if (error) throw error;
    return data as ActivityLog;
  }

  // ============================================
  // Dashboard Stats
  // ============================================
  async getDashboardStats() {
    const user = await supabaseService.getUser();

    // Get total profit from listings
    const { data: listings, error: listingsError } = await supabaseService.supabase
      .from('listings')
      .select('revenue, sales')
      .eq('user_id', user?.id);

    if (listingsError) throw listingsError;

    const totalProfit = listings?.reduce((sum, listing) => sum + (listing.revenue || 0), 0) || 0;
    const totalSales = listings?.reduce((sum, listing) => sum + (listing.sales || 0), 0) || 0;

    // Get active listings count
    const { count: activeListingsCount, error: activeError } = await supabaseService.supabase
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('status', 'active');

    if (activeError) throw activeError;

    // Get opportunities count
    const { count: opportunitiesCount, error: oppsError } = await supabaseService.supabase
      .from('opportunities')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user?.id)
      .eq('status', 'active');

    if (oppsError) throw oppsError;

    return {
      totalProfit: Math.round(totalProfit),
      totalSales,
      activeListings: activeListingsCount || 0,
      opportunities: opportunitiesCount || 0
    };
  }
}

export const dataService = DataService.getInstance();
