import React, { useState, useEffect } from 'react';
import { ArbitrageOpportunity } from '../types';
import { getArbitrageOpportunities, autoListOpportunity } from '../services/arbiService';
import { TrendingUp, DollarSign, Package, Target, Zap, X, RefreshCw, Filter } from 'lucide-react';

export const Opportunities: React.FC = () => {
  const [opportunities, setOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [filteredOpportunities, setFilteredOpportunities] = useState<ArbitrageOpportunity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(300000); // 5 min default

  // Filters
  const [minMargin, setMinMargin] = useState(15);
  const [maxPrice, setMaxPrice] = useState(500);
  const [showFilters, setShowFilters] = useState(false);

  // Action states
  const [processingIds, setProcessingIds] = useState<Set<string>>(new Set());
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Fetch opportunities
  const fetchOpportunities = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getArbitrageOpportunities();
      setOpportunities(data);
    } catch (err) {
      setError('Failed to fetch opportunities. Please try again.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchOpportunities();
  }, []);

  // Auto-refresh
  useEffect(() => {
    if (!autoRefresh) return;

    const intervalId = setInterval(fetchOpportunities, refreshInterval);
    return () => clearInterval(intervalId);
  }, [autoRefresh, refreshInterval]);

  // Apply filters
  useEffect(() => {
    const filtered = opportunities.filter(opp => {
      if (dismissedIds.has(opp.id)) return false;
      if (opp.profitMargin < minMargin) return false;
      if (opp.supplierPrice > maxPrice) return false;
      return true;
    });
    setFilteredOpportunities(filtered);
  }, [opportunities, minMargin, maxPrice, dismissedIds]);

  // Handle auto-list
  const handleAutoList = async (opportunity: ArbitrageOpportunity) => {
    setProcessingIds(prev => new Set(prev).add(opportunity.id));

    try {
      const result = await autoListOpportunity(opportunity);

      if (result.success) {
        setSuccessMessage(`Successfully listed: ${opportunity.productTitle}`);
        setDismissedIds(prev => new Set(prev).add(opportunity.id));

        // Clear success message after 5 seconds
        setTimeout(() => setSuccessMessage(null), 5000);
      } else {
        alert('Failed to create listing. Please try again.');
      }
    } catch (err) {
      alert('An error occurred. Please try again.');
      console.error(err);
    } finally {
      setProcessingIds(prev => {
        const next = new Set(prev);
        next.delete(opportunity.id);
        return next;
      });
    }
  };

  // Handle dismiss
  const handleDismiss = (id: string) => {
    setDismissedIds(prev => new Set(prev).add(id));
  };

  // Get score color
  const getScoreColor = (score?: number) => {
    if (!score) return 'text-slate-400';
    if (score >= 80) return 'text-emerald-400';
    if (score >= 60) return 'text-yellow-400';
    return 'text-orange-400';
  };

  // Get margin color
  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20';
    if (margin >= 15) return 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20';
    return 'bg-orange-500/10 text-orange-400 border-orange-500/20';
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Arbitrage Opportunities</h1>
          <p className="text-slate-400">
            {filteredOpportunities.length} opportunities found
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2"
          >
            <Filter size={18} />
            Filters
          </button>

          <button
            onClick={fetchOpportunities}
            disabled={loading}
            className="px-4 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all flex items-center gap-2 border border-emerald-500/20"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>

          <div className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              id="auto-refresh"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="w-4 h-4 rounded bg-slate-800 border-slate-600"
            />
            <label htmlFor="auto-refresh" className="text-slate-400">
              Auto-refresh
            </label>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="text-emerald-400">{successMessage}</span>
          </div>
          <button
            onClick={() => setSuccessMessage(null)}
            className="text-emerald-400 hover:text-emerald-300"
          >
            <X size={18} />
          </button>
        </div>
      )}

      {/* Filters Panel */}
      {showFilters && (
        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6">
          <h3 className="text-white font-semibold mb-4 flex items-center gap-2">
            <Filter size={18} />
            Filter Opportunities
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Min Profit Margin: {minMargin}%
              </label>
              <input
                type="range"
                min="5"
                max="50"
                value={minMargin}
                onChange={(e) => setMinMargin(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-sm text-slate-400 mb-2">
                Max Price: ${maxPrice}
              </label>
              <input
                type="range"
                min="100"
                max="1000"
                step="50"
                value={maxPrice}
                onChange={(e) => setMaxPrice(Number(e.target.value))}
                className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading && opportunities.length === 0 ? (
        <div className="flex items-center justify-center py-20">
          <div className="text-center">
            <RefreshCw size={48} className="text-emerald-500 animate-spin mb-4 mx-auto" />
            <p className="text-slate-400">Scanning for opportunities...</p>
          </div>
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-8 text-center">
          <p className="text-red-400 mb-4">{error}</p>
          <button
            onClick={fetchOpportunities}
            className="px-6 py-2 rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 transition-all"
          >
            Try Again
          </button>
        </div>
      ) : filteredOpportunities.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-12 text-center">
          <Package size={64} className="text-slate-600 mb-4 mx-auto" />
          <h3 className="text-xl font-semibold text-white mb-2">No opportunities found</h3>
          <p className="text-slate-400 mb-6">
            Try adjusting your filters or check back later
          </p>
          <button
            onClick={() => {
              setMinMargin(10);
              setMaxPrice(1000);
            }}
            className="px-6 py-2 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 transition-all border border-emerald-500/20"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        /* Opportunity Cards */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredOpportunities.map((opportunity) => (
            <OpportunityCard
              key={opportunity.id}
              opportunity={opportunity}
              isProcessing={processingIds.has(opportunity.id)}
              onAutoList={handleAutoList}
              onDismiss={handleDismiss}
              getScoreColor={getScoreColor}
              getMarginColor={getMarginColor}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// Opportunity Card Component
const OpportunityCard: React.FC<{
  opportunity: ArbitrageOpportunity;
  isProcessing: boolean;
  onAutoList: (opp: ArbitrageOpportunity) => void;
  onDismiss: (id: string) => void;
  getScoreColor: (score?: number) => string;
  getMarginColor: (margin: number) => string;
}> = ({ opportunity, isProcessing, onAutoList, onDismiss, getScoreColor, getMarginColor }) => {
  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 hover:border-emerald-500/30 transition-all group">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-white font-semibold text-lg mb-1 line-clamp-2">
            {opportunity.productTitle}
          </h3>
          <p className="text-sm text-slate-400">
            {opportunity.supplierPlatform} → Marketplace
          </p>
        </div>

        {opportunity.score !== undefined && (
          <div className="ml-4">
            <div className={`text-2xl font-bold font-mono ${getScoreColor(opportunity.score)}`}>
              {opportunity.score}
            </div>
            <div className="text-xs text-slate-500">Score</div>
          </div>
        )}
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-4 mb-4">
        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <DollarSign size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Supplier Cost</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${opportunity.supplierPrice.toFixed(2)}
          </div>
        </div>

        <div className="bg-slate-800/50 rounded-xl p-3">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp size={14} className="text-slate-400" />
            <span className="text-xs text-slate-400">Market Price</span>
          </div>
          <div className="text-xl font-bold text-white font-mono">
            ${opportunity.marketPrice.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Profit Banner */}
      <div className="bg-gradient-to-r from-emerald-500/10 to-emerald-500/5 border border-emerald-500/20 rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-xs text-emerald-400 mb-1">Estimated Profit</div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              ${opportunity.estimatedProfit.toFixed(2)}
            </div>
          </div>
          <div className={`px-3 py-1 rounded-lg border ${getMarginColor(opportunity.profitMargin)}`}>
            <div className="text-sm font-bold">{opportunity.profitMargin.toFixed(1)}%</div>
            <div className="text-xs opacity-75">margin</div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <button
          onClick={() => onAutoList(opportunity)}
          disabled={isProcessing}
          className="flex-1 px-4 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-semibold transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isProcessing ? (
            <>
              <RefreshCw size={18} className="animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Zap size={18} />
              Auto-List
            </>
          )}
        </button>

        <button
          onClick={() => window.open(opportunity.supplierUrl, '_blank')}
          className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-all flex items-center gap-2"
        >
          <Target size={18} />
          View
        </button>

        <button
          onClick={() => onDismiss(opportunity.id)}
          className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-red-500/20 text-slate-400 hover:text-red-400 transition-all"
        >
          <X size={18} />
        </button>
      </div>
    </div>
  );
};
