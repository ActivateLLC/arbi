import React, { useState, useEffect, useCallback } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { PipelineVisualizer } from './components/PipelineVisualizer';
import { TerminalLog } from './components/TerminalLog';
import { RevenueChart } from './components/RevenueChart';
import { Dashboard } from './components/Dashboard';
import { MarketplaceStats } from './components/MarketplaceStats';
import { Opportunities } from './components/Opportunities';
import { SystemStatus, LogEntry, ChartDataPoint, PipelineStage } from './types';
import { generateSystemLogs } from './services/geminiService';
import { LayoutGrid, Settings, Wallet, Bell, Menu, Package, Search } from 'lucide-react';
import { v4 as uuidv4 } from 'uuid';

const App: React.FC = () => {
  // --- State ---
  const [activeTab, setActiveTab] = useState<'simulation' | 'opportunities' | 'marketplace'>('simulation');
  const [status, setStatus] = useState<SystemStatus>(SystemStatus.IDLE);
  const [dailySpend, setDailySpend] = useState<number>(500);
  const [riskTolerance, setRiskTolerance] = useState<number>(35);
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeStage, setActiveStage] = useState<PipelineStage | null>(null);
  const [totalProfit, setTotalProfit] = useState<number>(0);
  const [roi, setRoi] = useState<number>(0);
  
  // Mock Chart Data
  const [chartData, setChartData] = useState<ChartDataPoint[]>([]);

  // --- Effects ---

  // Initialization
  useEffect(() => {
    // Initial logs
    setLogs([
      { id: uuidv4(), timestamp: new Date().toLocaleTimeString(), category: 'SYSTEM', message: 'ArbiOS v4.2.0 initialized.' },
      { id: uuidv4(), timestamp: new Date().toLocaleTimeString(), category: 'SYSTEM', message: 'Waiting for user input...' },
    ]);

    // Initial Chart Data (Empty)
    const initialData = Array.from({ length: 10 }).map((_, i) => ({
      time: new Date(Date.now() - (10 - i) * 60000).toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'}),
      revenue: 0,
      spend: 0,
      profit: 0
    }));
    setChartData(initialData);
  }, []);

  // Simulation Loop
  useEffect(() => {
    if (status !== SystemStatus.ACTIVE) return;

    const runSimulation = async () => {
      // 1. Generate Logs
      const newLogs = await generateSystemLogs(Math.floor(Math.random() * 2) + 1);
      setLogs(prev => [...prev, ...newLogs].slice(-50)); // Keep last 50

      // 2. Update Stats
      const profitIncrement = Math.random() * 50 + 10;
      setTotalProfit(prev => prev + profitIncrement);
      setRoi(prev => Math.min(320, prev + (Math.random() * 5))); // Trend towards 300%

      // 3. Update Visualizer State (Cycle randomly)
      const stages = Object.values(PipelineStage);
      setActiveStage(stages[Math.floor(Math.random() * stages.length)]);

      // 4. Update Chart
      setChartData(prev => {
        const last = prev[prev.length - 1];
        const now = new Date();
        // Shift time slightly
        const newTime = now.toLocaleTimeString([], { hour: '2-digit', minute:'2-digit'});
        
        // Random walk for aesthetic chart
        const newSpend = dailySpend / 24 + (Math.random() * 20 - 10);
        const newProfit = newSpend * (riskTolerance > 50 ? 3.5 : 2.5) + (Math.random() * 50);

        const newPoint: ChartDataPoint = {
            time: newTime,
            revenue: newSpend + newProfit,
            spend: newSpend,
            profit: newProfit
        };

        return [...prev.slice(1), newPoint];
      });
    };

    const intervalId = setInterval(runSimulation, 3000); // Run every 3 seconds

    return () => clearInterval(intervalId);
  }, [status, dailySpend, riskTolerance]);

  // --- Handlers ---
  const handleToggleStatus = () => {
    if (status === SystemStatus.ACTIVE) {
      setStatus(SystemStatus.IDLE);
      setLogs(prev => [...prev, { id: uuidv4(), timestamp: new Date().toLocaleTimeString(), category: 'SYSTEM', message: 'Sequence aborted by user.' }]);
      setActiveStage(null);
    } else {
      setStatus(SystemStatus.ACTIVE);
      setLogs(prev => [...prev, { id: uuidv4(), timestamp: new Date().toLocaleTimeString(), category: 'SYSTEM', message: 'Authentication successful. Neural engine spooling up...' }]);
    }
  };

  return (
    <div className="min-h-screen flex text-slate-200 selection:bg-emerald-500/30">
      
      {/* Sidebar (Desktop) */}
      <aside className="hidden lg:flex w-64 flex-col border-r border-white/5 bg-slate-950/50 backdrop-blur-xl fixed h-full z-20">
        <div className="p-6 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-gradient-to-tr from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-cyan-500/20">A</div>
            <span className="text-xl font-bold tracking-tight text-white">Arbi</span>
          </div>
        </div>
        
        <nav className="flex-1 p-4 space-y-2">
          <NavItem
            icon={<LayoutGrid size={18} />}
            label="Simulation"
            active={activeTab === 'simulation'}
            onClick={() => setActiveTab('simulation')}
          />
          <NavItem
            icon={<Search size={18} />}
            label="Opportunities"
            active={activeTab === 'opportunities'}
            onClick={() => setActiveTab('opportunities')}
          />
          <NavItem
            icon={<Package size={18} />}
            label="Marketplace"
            active={activeTab === 'marketplace'}
            onClick={() => setActiveTab('marketplace')}
          />
          <NavItem icon={<Wallet size={18} />} label="Wallet" />
          <NavItem icon={<Bell size={18} />} label="Alerts" count={3} />
          <NavItem icon={<Settings size={18} />} label="Settings" />
        </nav>

        <div className="p-4 border-t border-white/5">
          <div className="bg-slate-900 rounded-xl p-4">
             <div className="text-xs text-slate-500 mb-1">Total Profit Balance</div>
             <div className="text-2xl font-mono text-emerald-400 font-bold">${totalProfit.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
             <div className="text-[10px] text-emerald-600 mt-1 flex items-center gap-1">
               <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
               Live Updates
             </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 lg:ml-64 p-4 md:p-8 overflow-x-hidden">
        
        {/* Header (Mobile) */}
        <header className="lg:hidden flex justify-between items-center mb-6">
           <div className="flex items-center gap-2 text-white font-bold text-lg">
             <img 
               src="/components/logo.svg" 
               alt="Arbi.ai Logo" 
               className="w-8 h-8 object-contain"
             />
             Arbi.ai
          </div>
          <Menu className="text-slate-400" />
        </header>

        {activeTab === 'simulation' ? (
          <>
            {/* Top Area: Controls & Live Stats */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 mb-8">
          <div className="xl:col-span-2">
             <ControlPanel 
               status={status}
               onToggleStatus={handleToggleStatus}
               dailySpend={dailySpend}
               setDailySpend={setDailySpend}
               riskTolerance={riskTolerance}
               setRiskTolerance={setRiskTolerance}
             />
          </div>
          
          <div className="bg-slate-900/50 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between shadow-xl">
             <div className="flex justify-between items-start">
               <div>
                 <h3 className="text-slate-400 text-sm font-medium">Real-time ROAS</h3>
                 <div className="text-3xl font-bold text-white mt-1 font-mono">
                   {status === SystemStatus.ACTIVE ? roi.toFixed(1) : '0.0'}%
                 </div>
               </div>
               <div className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold border border-emerald-500/20">
                 TARGET: 300%
               </div>
             </div>
             
             <div className="h-40 mt-4">
               <RevenueChart data={chartData} />
             </div>
             
             <div className="text-center mt-2 text-[10px] text-slate-500 uppercase tracking-widest">
               Output: Pure Profit
             </div>
          </div>
        </div>

        {/* Middle Area: Pipeline & Logs */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <PipelineVisualizer status={status} activeStage={activeStage} />
          </div>
          <div className="xl:col-span-1 h-full min-h-[300px]">
             <TerminalLog logs={logs} />
          </div>
        </div>
          </>
        ) : activeTab === 'opportunities' ? (
          <>
            {/* Opportunities Tab */}
            <Opportunities />
          </>
        ) : (
          <>
            {/* Real Marketplace Data */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Live Marketplace</h1>
              <p className="text-slate-400">Real-time data from your Arbi marketplace</p>
            </div>

            <MarketplaceStats />
          </>
        )}

      </main>
    </div>
  );
};

// Simple Nav Helper
const NavItem: React.FC<{ 
  icon: React.ReactNode, 
  label: string, 
  active?: boolean, 
  count?: number,
  onClick?: () => void 
}> = ({ icon, label, active, count, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
    active 
      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
      : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
  }`}>
    <div className="flex items-center gap-3">
      {icon}
      <span className="font-medium text-sm">{label}</span>
    </div>
    {count && (
      <span className="bg-emerald-500 text-slate-950 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
        {count}
      </span>
    )}
  </button>
);

export default App;