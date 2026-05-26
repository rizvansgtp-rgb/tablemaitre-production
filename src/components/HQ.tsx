import React from 'react';
import { 
  Globe, 
  MapPin, 
  TrendingUp, 
  AlertCircle, 
  BarChart2, 
  ArrowRight,
  Activity,
  Zap,
  Building2,
  Users
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

const storeData = [
  { id: '0301', location: 'Dubai International Financial Centre', revenue: '$14.2k', occupancy: 85, health: 'High', color: '#3ecf8e' },
  { id: '0302', location: 'Lounge NYC - Manhattan', revenue: '$9.8k', occupancy: 42, health: 'Stable', color: '#f59e0b' },
  { id: '0303', location: 'Singapore Marina Bay', revenue: '$11.5k', occupancy: 92, health: 'Peak', color: '#3b82f6' },
  { id: '0304', location: 'London Mayfair Executive', revenue: '$3.1k', occupancy: 12, health: 'Closed', color: '#64748b' },
];

export default function HQ() {
  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Global Command</h2>
          <p className="text-slate-500 mt-1">Unified telemetry across the entire restaurant network infrastructure.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] rounded text-[10px] font-bold font-mono tracking-widest uppercase">
            Network Status: Active
          </div>
          <div className="p-2.5 bg-slate-900 border border-slate-800 rounded-lg text-slate-500">
             <Globe size={18} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Global Network Revenue', value: '$38,600', sub: '+14% vs Yest', icon: Zap, color: 'text-yellow-500' },
           { label: 'Active Sessions', value: '412', sub: 'Across 4 nodes', icon: Activity, color: 'text-green-500' },
           { label: 'Network Health', value: '99.9%', sub: 'Latency: 14ms', icon: Globe, color: 'text-blue-500' },
         ].map((stat, i) => (
           <div key={i} className="p-6 rounded-2xl bg-slate-900/40 border border-slate-800 backdrop-blur-sm relative overflow-hidden group">
              <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
                <stat.icon size={64} />
              </div>
              <div className={cn("inline-flex p-2 rounded-lg bg-slate-950 border border-slate-800 mb-4", stat.color)}>
                 <stat.icon size={20} />
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
              <h3 className="text-3xl font-bold text-white mt-1">{stat.value}</h3>
              <p className="text-[10px] font-mono text-slate-600 mt-2">{stat.sub}</p>
           </div>
         ))}
      </div>

      <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
         <div className="px-8 py-6 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
               <Building2 size={16} className="text-[#3ecf8e]" />
               Store Performance Matrix
            </h3>
            <div className="flex gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" /> Online
               </div>
               <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-slate-600" /> Offline
               </div>
            </div>
         </div>
         
         <div className="divide-y divide-slate-800/50">
            {storeData.map((store) => (
              <div key={store.id} className="px-8 py-6 flex items-center gap-8 group hover:bg-[#3ecf8e]/[0.02] transition-colors">
                 <div className="w-14 h-14 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-600 group-hover:border-[#3ecf8e]/30 group-hover:text-[#3ecf8e] transition-all">
                    <MapPin size={24} />
                 </div>
                 
                 <div className="flex-1">
                    <div className="flex items-center gap-3">
                       <h4 className="text-md font-bold text-white tracking-tight">{store.location}</h4>
                       <span className="text-[9px] font-mono font-bold text-slate-600 uppercase">ST-{store.id}</span>
                    </div>
                    <div className="flex items-center gap-6 mt-2">
                       <div className="flex items-center gap-2">
                          <DollarSign size={10} className="text-slate-500" />
                          <span className="text-[11px] font-bold text-slate-300">{store.revenue}</span>
                       </div>
                       <div className="flex items-center gap-2">
                          <Users size={10} className="text-slate-500" />
                          <span className="text-[11px] font-bold text-slate-300">{store.occupancy}% Load</span>
                       </div>
                    </div>
                 </div>

                 <div className="w-48 space-y-2">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest leading-none">
                       <span className="text-slate-500">Node Intensity</span>
                       <span className="text-[#3ecf8e]">{store.occupancy}%</span>
                    </div>
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${store.occupancy}%` }}
                        className={cn(
                          "h-full",
                          store.occupancy > 80 ? "bg-[#3ecf8e] shadow-[0_0_10px_rgba(62,207,142,0.3)]" : "bg-slate-600"
                        )}
                       />
                    </div>
                 </div>

                 <div className="w-32 text-right">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-[9px] font-bold uppercase tracking-widest",
                      store.health === 'High' || store.health === 'Peak' ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20" :
                      store.health === 'Closed' ? "bg-slate-800 text-slate-500 border border-slate-700" :
                      "bg-amber-500/10 text-amber-500 border border-amber-500/20"
                    )}>
                      {store.health}
                    </span>
                 </div>

                 <button className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-600 hover:text-white hover:border-slate-700 transition-all opacity-0 group-hover:opacity-100">
                    <ArrowRight size={18} />
                 </button>
              </div>
            ))}
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
         <div className="p-6 bg-amber-500/5 border border-amber-500/20 rounded-2xl flex gap-4">
            <AlertCircle size={24} className="text-amber-500 shrink-0" />
            <div>
               <h4 className="text-sm font-bold text-amber-500 uppercase tracking-widest mb-1">Network Anomaly Detected</h4>
               <p className="text-xs text-amber-500/70 leading-relaxed font-medium">
                  London node ST-0304 is reporting below-nominal turnover for the 12:00 UTC cycle. Automated diagnostic indicates inventory synchronization delay.
               </p>
            </div>
         </div>
         <div className="p-6 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-2xl flex gap-4">
            <TrendingUp size={24} className="text-[#3ecf8e] shrink-0" />
            <div>
               <h4 className="text-sm font-bold text-[#3ecf8e] uppercase tracking-widest mb-1">Network Expansion Potential</h4>
               <p className="text-xs text-[#3ecf8e]/70 leading-relaxed font-medium">
                  Aggregate demand at Singapore ST-0303 is exceeding current capacity limits by 22% during peak dinner hours. Provisioning additional tables is recommended.
               </p>
            </div>
         </div>
      </div>
    </div>
  );
}

function DollarSign({ size, className }: any) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <line x1="12" y1="1" x2="12" y2="23"></line>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
    </svg>
  );
}
