'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  autonomousApi,
  type Opportunity,
  formatCurrency,
  formatPercentage,
  getScoreColor,
  getTierBadgeColor
} from '@/lib/railway-api';
import { ExternalLink, RefreshCw, TrendingUp } from 'lucide-react';

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<Opportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchOpportunities = async () => {
    try {
      setRefreshing(true);
      setError(null);
      const data = await autonomousApi.getOpportunities({ limit: 50 });
      setOpportunities(data.opportunities);
    } catch (err: any) {
      setError(err.message || 'Failed to fetch opportunities');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchOpportunities();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchOpportunities, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <RefreshCw className="w-12 h-12 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-destructive">Error</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={fetchOpportunities} className="w-full">
              <RefreshCw className="w-4 h-4 mr-2" />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Live Opportunities</h1>
          <p className="text-muted-foreground">
            {opportunities.length} active arbitrage opportunities found
          </p>
        </div>
        <Button onClick={fetchOpportunities} disabled={refreshing} variant="outline">
          <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Opportunities Grid */}
      {opportunities.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center min-h-[300px] text-center">
            <TrendingUp className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-xl font-semibold mb-2">No Opportunities Found</h3>
            <p className="text-muted-foreground mb-4">
              The system is scanning for profitable deals. Check back in a few minutes.
            </p>
            <Button onClick={fetchOpportunities}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Scan Now
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((opp) => (
            <Card key={opp.id} className="overflow-hidden hover:shadow-lg transition-shadow">
              {/* Product Image */}
              {opp.product.imageUrl && (
                <div className="aspect-video w-full overflow-hidden bg-muted">
                  <img
                    src={opp.product.imageUrl}
                    alt={opp.product.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <Badge className={getTierBadgeColor(opp.score.tier)}>
                    {opp.score.tier.toUpperCase()}
                  </Badge>
                  <span className={`text-2xl font-bold ${getScoreColor(opp.score.score)}`}>
                    {opp.score.score}
                  </span>
                </div>
                <CardTitle className="line-clamp-2 text-base">
                  {opp.product.title}
                </CardTitle>
                <CardDescription className="text-xs">
                  {opp.product.seller.username} ({opp.product.seller.feedbackPercentage}% • {opp.product.seller.feedbackScore})
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-3">
                {/* Profit Metrics */}
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <p className="text-muted-foreground text-xs">Net Profit</p>
                    <p className="font-bold text-green-600">{formatCurrency(opp.profit.netProfit)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">ROI</p>
                    <p className="font-bold">{formatPercentage(opp.profit.roi)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Buy Price</p>
                    <p className="font-semibold">{formatCurrency(opp.profit.sourcePrice)}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-xs">Sell Price</p>
                    <p className="font-semibold">{formatCurrency(opp.profit.targetPrice)}</p>
                  </div>
                </div>

                {/* Green Flags */}
                {opp.score.greenFlags.length > 0 && (
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-green-600">Advantages:</p>
                    <ul className="text-xs text-muted-foreground space-y-0.5">
                      {opp.score.greenFlags.slice(0, 2).map((flag, i) => (
                        <li key={i} className="flex items-start">
                          <span className="text-green-600 mr-1">✓</span>
                          <span className="flex-1">{flag}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                  <Button asChild variant="default" size="sm" className="flex-1">
                    <a href={opp.product.url} target="_blank" rel="noopener noreferrer">
                      <ExternalLink className="w-3 h-3 mr-1" />
                      View on eBay
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
