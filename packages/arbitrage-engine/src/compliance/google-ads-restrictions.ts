/**
 * Google Ads Compliance - Automated AI Advertising Restrictions
 * 
 * Certain countries/regions have strict regulations on AI-generated ads
 * This config ensures we only run automated ads in compliant regions
 */

export interface AdComplianceRegion {
  country: string;
  countryCode: string;
  allowAutomatedAds: boolean;
  allowAIGeneratedContent: boolean;
  restrictions: string[];
  alternativeStrategy?: string;
}

/**
 * Google Ads Policy Compliance by Region
 * Last updated: December 2025
 */
export const GOOGLE_ADS_COMPLIANCE: AdComplianceRegion[] = [
  // UNRESTRICTED - Full automated AI ads allowed
  {
    country: 'United States',
    countryCode: 'US',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: [],
  },
  {
    country: 'Canada',
    countryCode: 'CA',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: [],
  },
  {
    country: 'United Kingdom',
    countryCode: 'GB',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['Must disclose AI-generated content'],
  },
  {
    country: 'Australia',
    countryCode: 'AU',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: [],
  },

  // RESTRICTED - Limited automated ads
  {
    country: 'Germany',
    countryCode: 'DE',
    allowAutomatedAds: true,
    allowAIGeneratedContent: false,
    restrictions: ['No AI-generated images', 'Human review required'],
    alternativeStrategy: 'Use manual ad creation with templates',
  },
  {
    country: 'France',
    countryCode: 'FR',
    allowAutomatedAds: true,
    allowAIGeneratedContent: false,
    restrictions: ['AI content must be labeled', 'Consumer protection laws apply'],
    alternativeStrategy: 'Use manual ad creation with templates',
  },
  {
    country: 'China',
    countryCode: 'CN',
    allowAutomatedAds: false,
    allowAIGeneratedContent: false,
    restrictions: ['Government approval required', 'Use Baidu Ads instead'],
    alternativeStrategy: 'Manual campaigns only, local partner required',
  },
  {
    country: 'Russia',
    countryCode: 'RU',
    allowAutomatedAds: false,
    allowAIGeneratedContent: false,
    restrictions: ['Use Yandex instead', 'Local regulations apply'],
    alternativeStrategy: 'Yandex.Direct manual campaigns',
  },

  // PARTIALLY RESTRICTED
  {
    country: 'Japan',
    countryCode: 'JP',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['AI disclosure required', 'Cultural sensitivity review needed'],
  },
  {
    country: 'South Korea',
    countryCode: 'KR',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['AI transparency required'],
  },
  {
    country: 'Singapore',
    countryCode: 'SG',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['PDPA compliance required'],
  },
  {
    country: 'United Arab Emirates',
    countryCode: 'AE',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['Cultural/religious content review required'],
  },
  {
    country: 'Brazil',
    countryCode: 'BR',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['LGPD privacy compliance required'],
  },
  {
    country: 'Mexico',
    countryCode: 'MX',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: [],
  },
  {
    country: 'India',
    countryCode: 'IN',
    allowAutomatedAds: true,
    allowAIGeneratedContent: true,
    restrictions: ['IT Act compliance required'],
  },
];

/**
 * Check if automated ads are allowed in a specific country
 */
export function canUseAutomatedAds(countryCode: string): boolean {
  const region = GOOGLE_ADS_COMPLIANCE.find(r => r.countryCode === countryCode);
  return region?.allowAutomatedAds ?? false; // Default deny if not in list
}

/**
 * Check if AI-generated content is allowed in ads
 */
export function canUseAIContent(countryCode: string): boolean {
  const region = GOOGLE_ADS_COMPLIANCE.find(r => r.countryCode === countryCode);
  return region?.allowAIGeneratedContent ?? false;
}

/**
 * Get restrictions for a specific country
 */
export function getAdRestrictions(countryCode: string): string[] {
  const region = GOOGLE_ADS_COMPLIANCE.find(r => r.countryCode === countryCode);
  return region?.restrictions ?? ['Country not in approved list - manual review required'];
}

/**
 * Get alternative strategy if automated ads not allowed
 */
export function getAlternativeStrategy(countryCode: string): string | undefined {
  const region = GOOGLE_ADS_COMPLIANCE.find(r => r.countryCode === countryCode);
  return region?.alternativeStrategy;
}

/**
 * Get list of all countries where automated ads are allowed
 */
export function getAutomatedAdsCountries(): string[] {
  return GOOGLE_ADS_COMPLIANCE
    .filter(r => r.allowAutomatedAds)
    .map(r => r.countryCode);
}
