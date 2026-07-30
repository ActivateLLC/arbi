import React, { useEffect, useState } from 'react';
import { getMarketplaceStats, MarketplaceStats as Stats } from '../services/arbiService';
import { Package, TrendingUp, DollarSign, Percent } from 'lucide-react';

export const MarketplaceStats: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      setLoading(true);
      const data = await getMarketplaceStats();
      setStats(data);
      setLoading(false);
    };

    fetchStats();
    
    // Refresh every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 animate-pulse">
            <div className="h-4 bg-slate-700 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-700 rounded w-3/4"></div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <>
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
        {/* Total Products */}
        <StatCard
          icon={<Package size={20} />}
          label="Active Products"
          value={stats.activeListings.toString()}
          subtext={`${stats.totalListings} total`}
          color="emerald"
        />

        {/* Potential Revenue */}
        <StatCard
          icon={<DollarSign size={20} />}
          label="Potential Revenue"
          value={`$${stats.totalPotentialRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext="If all products sell"
          color="blue"
        />

        {/* Potential Profit */}
        <StatCard
          icon={<TrendingUp size={20} />}
          label="Potential Profit"
          value={`$${stats.totalPotentialProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext="Gross margin"
          color="violet"
        />

        {/* Average Margin */}
        <StatCard
          icon={<Percent size={20} />}
          label="Avg Margin"
          value={`$${stats.averageMargin.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
          subtext="Per product"
          color="amber"
        />
      </div>

      {/* Top Products */}
      <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 mb-8">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <TrendingUp size={18} className="text-emerald-400" />
          Top Profit Products
        </h3>

        <div className="space-y-3">
          {stats.topProducts.map((product, idx) => (
            <div 
              key={product.listingId}
              className="flex items-center justify-between p-4 bg-slate-800/50 rounded-xl border border-white/5 hover:border-emerald-500/30 transition-all"
            >
              <div className="flex items-center gap-4 flex-1">
                <div className="text-2xl font-bold text-slate-600">
                  #{idx + 1}
                </div>
                
                {product.productImages && product.productImages.length > 0 ? (
                  <img 
                    src={product.productImages[0]} 
                    alt={product.productTitle}
                    className="w-12 h-12 rounded-lg object-cover border border-white/10"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-lg bg-slate-700 flex items-center justify-center">
                    <Package size={20} className="text-slate-500" />
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-white truncate">
                    {product.productTitle}
                  </div>
                  <div className="text-xs text-slate-400">
                    ${product.productPrice?.toLocaleString()} • {product.productImages?.length || 0} images
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-lg font-bold text-emerald-400">
                  ${product.profitMargin?.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </div>
                <div className="text-xs text-slate-500">
                  profit
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

// Stat Card Component
const StatCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  subtext: string;
  color: 'emerald' | 'blue' | 'violet' | 'amber';
}> = ({ icon, label, value, subtext, color }) => {
  const colorClasses = {
    emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    blue: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    violet: 'bg-violet-500/10 text-violet-400 border-violet-500/20',
    amber: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  };

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 shadow-xl">
      <div className="flex items-start justify-between mb-4">
        <div className={`p-2 rounded-lg border ${colorClasses[color]}`}>
          {icon}
        </div>
      </div>

      <div>
        <div className="text-slate-400 text-sm font-medium mb-1">{label}</div>
        <div className="text-3xl font-bold text-white font-mono">{value}</div>
        <div className="text-xs text-slate-500 mt-1">{subtext}</div>
      </div>
    </div>
  );
};
