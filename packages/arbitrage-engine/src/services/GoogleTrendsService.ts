import axios from 'axios';

/**
 * GoogleTrendsService
 * Fetches trending search topics and product keywords by region and category using Google Trends API.
 * Requires Google Cloud project with Trends API enabled and service account credentials.
 */
export class GoogleTrendsService {
  private apiKey: string;
  private baseUrl: string = 'https://trends.googleapis.com/v1beta';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.GOOGLE_TRENDS_API_KEY || '';
  }

  /**
   * Fetch trending searches for a specific region (country code, e.g., 'US', 'DE', 'CN')
   */
  async getTrendingSearches(region: string = 'US', category?: string): Promise<string[]> {
    const url = `${this.baseUrl}/trendingSearches`;
    const params: Record<string, string> = {
      region,
      key: this.apiKey
    };
    if (category) params['category'] = category;
    try {
      const res = await axios.get(url, { params });
      // Parse and return trending search queries
      return res.data?.trendingSearches?.map((item: any) => item.title) || [];
    } catch (error) {
      console.error('GoogleTrendsService error:', error);
      return [];
    }
  }

  /**
   * Fetch top trending product keywords for a region/category
   */
  async getTrendingProducts(region: string = 'US', category?: string): Promise<string[]> {
    // This is a stub. Google Trends API may require custom logic for product-specific trends.
    return this.getTrendingSearches(region, category);
  }
}
