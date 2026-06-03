import React from 'react';
import { Search, Globe, Video, Megaphone, TrendingUp, PackageCheck } from 'lucide-react';
import { PipelineStage, SystemStatus } from '../types';

interface PipelineVisualizerProps {
  status: SystemStatus;
  activeStage: PipelineStage | null;
}

const StageCard: React.FC<{
  icon: React.ReactNode;
  title: string;
  description: string;
  subtext: string;
  isActive: boolean;
  isSystemActive: boolean;
  color: string;
}> = ({ icon, title, description, subtext, isActive, isSystemActive, color }) => {
  
  const borderColor = isActive ? color : 'border-white/5';
  const bgGradient = isActive ? `bg-gradient-to-b from-${color.split('-')[1]}-500/10 to-transparent` : 'bg-slate-900/40';
  const iconColor = isActive ? color.replace('border', 'text') : 'text-slate-600';

  return (
    <div className={`relative p-5 rounded-xl border ${borderColor} ${bgGradient} backdrop-blur-sm transition-all duration-500 overflow-hidden group`}>
      {isActive && (
        <div className="absolute inset-0 bg-white/5 animate-pulse" />
      )}
      
      <div className="relative z-10 flex flex-col h-full justify-between">
        <div className="flex justify-between items-start mb-4">
          <div className={`p-3 rounded-lg bg-slate-950 border border-white/10 ${iconColor} transition-colors duration-300`}>
            {icon}
          </div>
          {isActive && (
             <div className="flex space-x-1">
                <span className={`w-1.5 h-1.5 rounded-full ${iconColor.replace('text', 'bg')} animate-bounce`} style={{ animationDelay: '0ms' }}></span>
                <span className={`w-1.5 h-1.5 rounded-full ${iconColor.replace('text', 'bg')} animate-bounce`} style={{ animationDelay: '150ms' }}></span>
                <span className={`w-1.5 h-1.5 rounded-full ${iconColor.replace('text', 'bg')} animate-bounce`} style={{ animationDelay: '300ms' }}></span>
             </div>
          )}
        </div>
        
        <div>
          <h3 className={`text-base font-semibold ${isActive ? 'text-white' : 'text-slate-400'} mb-1`}>{title}</h3>
          <p className="text-xs text-slate-500 leading-relaxed mb-3 h-8 overflow-hidden">{description}</p>
          <div className={`text-[10px] font-mono uppercase tracking-wider ${isActive ? 'text-emerald-400' : 'text-slate-700'}`}>
            {isActive ? subtext : isSystemActive ? 'Waiting...' : 'Idle'}
          </div>
        </div>
      </div>
    </div>
  );
};

export const PipelineVisualizer: React.FC<PipelineVisualizerProps> = ({ status, activeStage }) => {
  const isSystemActive = status === SystemStatus.ACTIVE;

  const stages = [
    {
      id: PipelineStage.FIND_PRODUCTS,
      icon: <Search size={20} />,
      title: "Find Products",
      desc: "Scans 13+ retailers every 60s. 10,000+ products/hr.",
      activeText: "SCANNING RETAILERS...",
      color: "border-blue-500",
    },
    {
      id: PipelineStage.CREATE_LISTINGS,
      icon: <Globe size={20} />,
      title: "Create Listings",
      desc: "Auto-generates SEO pages with checkout.",
      activeText: "GENERATING PAGES...",
      color: "border-indigo-500",
    },
    {
      id: PipelineStage.GENERATE_ADS,
      icon: <Video size={20} />,
      title: "Generate Ads",
      desc: "Converts images to video ads in 30s.",
      activeText: "RENDERING VIDEOS...",
      color: "border-violet-500",
    },
    {
      id: PipelineStage.RUN_CAMPAIGNS,
      icon: <Megaphone size={20} />,
      title: "Run Campaigns",
      desc: "Deploys to YT, TikTok, Meta automatically.",
      activeText: "CAMPAIGNS LIVE...",
      color: "border-fuchsia-500",
    },
    {
      id: PipelineStage.OPTIMIZE_ROI,
      icon: <TrendingUp size={20} />,
      title: "Optimize ROI",
      desc: "Real-time budget shifts. Target: 300% ROAS.",
      activeText: "OPTIMIZING 24/7...",
      color: "border-pink-500",
    },
    {
      id: PipelineStage.FULFILL_ORDERS,
      icon: <PackageCheck size={20} />,
      title: "Fulfill Orders",
      desc: "Auto-purchase & ship. Zero inventory.",
      activeText: "PROCESSING ORDERS...",
      color: "border-emerald-500",
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">AI Does</h2>
        <div className="flex items-center gap-2">
           <span className={`w-2 h-2 rounded-full ${isSystemActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-700'}`}></span>
           <span className="text-xs text-slate-400 font-mono">{isSystemActive ? 'INFINITE PARALLEL OPS' : 'OFFLINE'}</span>
        </div>
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {stages.map((stage) => (
          <StageCard
            key={stage.id}
            icon={stage.icon}
            title={stage.title}
            description={stage.desc}
            subtext={stage.activeText}
            isActive={isSystemActive && (activeStage === stage.id || Math.random() > 0.7)} // Random activity for visual flare if system active
            isSystemActive={isSystemActive}
            color={stage.color}
          />
        ))}
      </div>
    </div>
  );
};