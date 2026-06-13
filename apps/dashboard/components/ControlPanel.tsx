import React from 'react';
import { Play, Pause, ShieldAlert, DollarSign, Activity } from 'lucide-react';
import { SystemStatus } from '../types';

interface ControlPanelProps {
  status: SystemStatus;
  onToggleStatus: () => void;
  dailySpend: number;
  setDailySpend: (val: number) => void;
  riskTolerance: number;
  setRiskTolerance: (val: number) => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  status,
  onToggleStatus,
  dailySpend,
  setDailySpend,
  riskTolerance,
  setRiskTolerance
}) => {
  const isActive = status === SystemStatus.ACTIVE;

  return (
    <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col gap-6 shadow-xl">
      <div className="flex items-center justify-between border-b border-white/5 pb-4">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-500/20 text-xs text-indigo-400 font-mono border border-indigo-500/30">1</span>
            Turn It On
          </h2>
          <p className="text-slate-400 text-sm mt-1">Activate the neural core.</p>
        </div>
        <button
          onClick={onToggleStatus}
          className={`relative group px-8 py-3 rounded-xl font-bold transition-all duration-300 flex items-center gap-2 ${
            isActive 
              ? 'bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.2)]' 
              : 'bg-emerald-500 text-slate-950 hover:bg-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.4)]'
          }`}
        >
          {isActive ? <Pause size={18} /> : <Play size={18} fill="currentColor" />}
          {isActive ? 'DEACTIVATE' : 'ACTIVATE'}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Daily Limit */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-400 font-mono border border-indigo-500/30">2</span>
              Daily Spend Limit
            </label>
            <span className="font-mono text-emerald-400 bg-emerald-950/30 px-2 py-0.5 rounded text-sm border border-emerald-900">
              ${dailySpend.toLocaleString()}
            </span>
          </div>
          <div className="relative h-12 bg-slate-950 rounded-lg border border-white/10 flex items-center px-4 group focus-within:border-emerald-500/50 transition-colors">
            <DollarSign size={16} className="text-slate-500 mr-2 group-focus-within:text-emerald-500" />
            <input
              type="number"
              value={dailySpend}
              onChange={(e) => setDailySpend(Number(e.target.value))}
              disabled={isActive}
              className="bg-transparent w-full outline-none text-white font-mono disabled:opacity-50"
            />
          </div>
        </div>

        {/* Risk Tolerance */}
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-300 flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-500/20 text-[10px] text-indigo-400 font-mono border border-indigo-500/30">3</span>
              Risk Tolerance
            </label>
            <span className={`font-mono px-2 py-0.5 rounded text-sm border ${
              riskTolerance > 70 ? 'text-red-400 bg-red-950/30 border-red-900' : 
              riskTolerance > 40 ? 'text-yellow-400 bg-yellow-950/30 border-yellow-900' :
              'text-blue-400 bg-blue-950/30 border-blue-900'
            }`}>
              {riskTolerance}%
            </span>
          </div>
          <div className="h-12 flex items-center px-1">
            <input
              type="range"
              min="1"
              max="100"
              value={riskTolerance}
              onChange={(e) => setRiskTolerance(Number(e.target.value))}
              disabled={isActive}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 disabled:opacity-50"
            />
          </div>
          <div className="flex justify-between text-[10px] uppercase tracking-wider text-slate-500 font-medium">
            <span>Conservative</span>
            <span>Aggressive</span>
          </div>
        </div>
      </div>
      
      {isActive && (
         <div className="flex items-center gap-3 bg-emerald-500/5 border border-emerald-500/20 p-3 rounded-lg animate-pulse">
            <Activity size={16} className="text-emerald-400" />
            <span className="text-xs text-emerald-300 font-mono uppercase tracking-widest">
              System Running • AI Autonomous Mode Engaged
            </span>
         </div>
      )}
    </div>
  );
};