import React, { useState } from 'react';
import { 
  Settings as SettingsIcon, 
  Building2, 
  Palette, 
  Bell, 
  Shield, 
  Globe, 
  Save, 
  RefreshCw,
  LogOut,
  ChevronRight,
  Database,
  Lock,
  Smartphone,
  CreditCard,
  Zap,
  Check,
  Activity
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { cn } from '../lib/utils';
import { getOfflineQueue, clearOfflineQueue, syncOfflineQueue } from '../lib/offlineQueue';
import { isSupabaseConfigured } from '../lib/supabase';

export default function Settings() {
  const { profile, signOut } = useAuth();
  const [activeTab, setActiveTab] = useState('general');

  const SettingSection = ({ title, description, children, icon: Icon }: any) => (
    <div className="bg-slate-900/40 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="p-6 border-b border-slate-800 bg-slate-900/20 flex items-center gap-4">
        <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800 text-[#3ecf8e]">
          <Icon size={20} />
        </div>
        <div>
          <h3 className="text-sm font-bold text-white uppercase tracking-widest">{title}</h3>
          <p className="text-xs text-slate-500 mt-0.5">{description}</p>
        </div>
      </div>
      <div className="p-6 space-y-6">
        {children}
      </div>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="page-title">System Configuration</h2>
          <p className="page-subtitle">Manage restaurant preferences, security protocols, and store metadata.</p>
        </div>
        <button className="bg-[#3ecf8e] text-[#020617] px-6 py-2.5 rounded text-[10px] uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all flex items-center gap-2">
          <Save size={14} />
          Commit Changes
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        <div className="space-y-1">
          {[
            { id: 'general', label: 'General Info', icon: Building2 },
            { id: 'billing', label: 'Billing & Plan', icon: CreditCard },
            { id: 'security', label: 'Identity & Access', icon: Shield },
            { id: 'appearance', label: 'Visual Interface', icon: Palette },
            { id: 'notifications', label: 'Event Protocol', icon: Bell },
            { id: 'database', label: 'Sync Status', icon: Database },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all text-left",
                activeTab === tab.id 
                  ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20" 
                  : "text-slate-500 hover:text-white hover:bg-slate-900"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
              {activeTab === tab.id && <ChevronRight size={14} className="ml-auto" />}
            </button>
          ))}
          <div className="pt-4 mt-4 border-t border-slate-800">
             <button 
              onClick={() => signOut()}
              className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest text-red-500 hover:bg-red-500/10 transition-all"
             >
                <LogOut size={16} />
                Terminate Session
             </button>
          </div>
        </div>

        <div className="lg:col-span-3 space-y-8">
          {activeTab === 'general' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
              <SettingSection title="Venue Metadata" description="Primary operational identifiers for this business node." icon={Building2}>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Store Name</label>
                       <input 
                        type="text" 
                        defaultValue="TableMaître DIFC Executive"
                        className="w-full bg-[#020617] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3ecf8e]/50 font-mono"
                       />
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Node Identifier</label>
                       <input 
                        type="text" 
                        disabled
                        defaultValue={profile?.active_store}
                        className="w-full bg-[#020617]/50 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-600 focus:outline-none font-mono"
                       />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Operational Physical Address</label>
                    <textarea 
                      rows={3}
                      defaultValue="DIFC Gate Village 10, Level 2, Dubai, UAE"
                      className="w-full bg-[#020617] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3ecf8e]/50 font-mono resize-none"
                    />
                 </div>
              </SettingSection>

              <SettingSection title="Regional Parameters" description="Locale, currency, and temporal synchronization." icon={Globe}>
                 <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Timezone Epoch</label>
                       <select className="w-full bg-[#020617] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3ecf8e]/50 font-mono">
                          <option>UTC+04:00 (Dubai)</option>
                          <option>UTC+00:00 (GMT)</option>
                          <option>UTC-05:00 (EST)</option>
                       </select>
                    </div>
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest ml-1">Currency Symbol</label>
                       <select className="w-full bg-[#020617] border border-slate-800 rounded-lg px-4 py-3 text-sm text-white focus:outline-none focus:border-[#3ecf8e]/50 font-mono">
                          <option>AED (United Arab Emirates Dirham)</option>
                          <option>USD (United States Dollar)</option>
                          <option>GBP (British Pound Sterling)</option>
                       </select>
                    </div>
                 </div>
              </SettingSection>
            </motion.div>
          )}

          {activeTab === 'billing' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <SettingSection title="Current Subscription" description="Manage your SaaS tier and billing cycles." icon={CreditCard}>
                  <div className="p-6 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-2xl relative overflow-hidden">
                     <div className="absolute top-0 right-0 p-6 opacity-10">
                        <Zap size={60} className="text-[#3ecf8e]" />
                     </div>
                     <div className="flex items-center gap-4 mb-6">
                        <div className="px-3 py-1 bg-[#3ecf8e] text-[#020617] rounded text-[10px] font-bold uppercase tracking-widest">Enterprise Pro</div>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">Renews in 12 days</span>
                     </div>
                     <h4 className="text-2xl font-bold text-white mb-2">$499.00 <span className="text-sm font-normal text-slate-500">/ month</span></h4>
                     <p className="text-xs text-slate-400 mb-8">Unlimited store nodes, AI strategic analysis, and priority sync status.</p>
                     
                     <div className="grid grid-cols-2 gap-4 mb-8">
                        {['99.9% SLI Guarantee', 'Advanced AI Insights', 'Unlimited Staff', 'Multi-Store Access'].map(feature => (
                          <div key={feature} className="flex items-center gap-2 text-[10px] font-bold text-slate-300 uppercase tracking-tight">
                             <div className="w-4 h-4 rounded-full bg-[#3ecf8e]/20 flex items-center justify-center text-[#3ecf8e]">
                                <Check size={10} />
                             </div>
                             {feature}
                          </div>
                        ))}
                     </div>

                     <div className="flex gap-4">
                        <button className="flex-1 bg-slate-900 border border-slate-800 text-white px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:border-slate-700 transition-all">Manage Payment Methods</button>
                        <button className="flex-1 bg-[#3ecf8e] text-[#020617] px-6 py-3 rounded-xl text-[10px] font-bold uppercase tracking-widest hover:shadow-[0_0_20px_rgba(62,207,142,0.3)] transition-all">Change Plan</button>
                     </div>
                  </div>
               </SettingSection>

               <SettingSection title="Usage Metrics" description="Node consumption and API throughput." icon={Activity}>
                  <div className="space-y-6">
                     {[
                       { label: 'Active Store Nodes', used: 4, total: 'Unlimited', percentage: 20 },
                       { label: 'Monthly AI Computes', used: 1242, total: 5000, percentage: 25 },
                       { label: 'Sync Logs Storage', used: '1.2 GB', total: '10 GB', percentage: 12 },
                     ].map(metric => (
                       <div key={metric.label} className="space-y-2">
                          <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                             <span className="text-slate-500">{metric.label}</span>
                             <span className="text-white">{metric.used} / {metric.total}</span>
                          </div>
                          <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                             <motion.div 
                              initial={{ width: 0 }}
                              animate={{ width: `${metric.percentage}%` }}
                              className="h-full bg-[#3ecf8e] shadow-[0_0_10px_rgba(62,207,142,0.3)]"
                             />
                          </div>
                       </div>
                     ))}
                  </div>
               </SettingSection>
            </motion.div>
          )}

          {activeTab === 'security' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <SettingSection title="Operational Authority" description="Manage identity verification and access tokens." icon={Lock}>
                  <div className="p-4 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-xl flex items-center justify-between">
                     <div className="flex items-center gap-4">
                        <div className="w-10 h-10 bg-[#020617] rounded-lg border border-slate-800 flex items-center justify-center text-[#3ecf8e]">
                           <Smartphone size={20} />
                        </div>
                        <div>
                           <p className="text-xs font-bold text-white tracking-tight">Two-Factor Authentication</p>
                           <p className="text-[10px] text-slate-500 font-mono uppercase">Highly Recommended</p>
                        </div>
                     </div>
                     <button className="px-4 py-2 bg-[#3ecf8e] text-[#020617] rounded text-[10px] font-bold uppercase tracking-widest">Enable</button>
                  </div>
                  <div className="space-y-4">
                     <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Access Roles</p>
                     <div className="grid grid-cols-2 gap-3">
                        {['Owner', 'Manager', 'Staff'].map(role => (
                          <div key={role} className="p-3 bg-[#020617]/50 border border-slate-800 rounded flex items-center justify-between">
                             <span className="text-xs font-bold text-white">{role}</span>
                             <span className="w-2 h-2 rounded-full bg-[#3ecf8e] shadow-[0_0_5px_#3ecf8e]" />
                          </div>
                        ))}
                     </div>
                  </div>
               </SettingSection>

               <SettingSection title="Sync Status" description="Last successful synchronization status." icon={RefreshCw}>
                  <div className="bg-[#020617] border border-slate-800 rounded divide-y divide-slate-800/50 overflow-hidden">
                     {[
                       { event: 'Database Snapshot', timestamp: '2 mins ago', status: 'OK' },
                       { event: 'Floor Plan Sync', timestamp: '14 mins ago', status: 'OK' },
                       { event: 'Staff Permissions Update', timestamp: '1 hour ago', status: 'PENDING' },
                     ].map(log => (
                       <div key={log.event} className="px-4 py-3 flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{log.event}</span>
                          <div className="flex items-center gap-4">
                             <span className="text-[10px] font-mono text-slate-600">{log.timestamp}</span>
                             <span className={cn("text-[9px] font-bold px-1.5 py-0.5 rounded", log.status === 'OK' ? "bg-green-500/10 text-green-500" : "bg-amber-500/10 text-amber-500")}>{log.status}</span>
                          </div>
                       </div>
                     ))}
                  </div>
               </SettingSection>
            </motion.div>
          )}

          {activeTab === 'appearance' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <SettingSection title="Visual Interface" description="Customize accessibility and theme shaders." icon={Palette}>
                  <div className="grid grid-cols-3 gap-6">
                     {[
                       { id: 'carbon', label: 'Carbon Dark', colors: ['bg-[#020617]', 'bg-[#3ecf8e]'] },
                       { id: 'titanium', label: 'Titanium Light', colors: ['bg-slate-100', 'bg-blue-600'] },
                       { id: 'royal', label: 'Royal Obsidian', colors: ['bg-[#1a1a1a]', 'bg-gold-500'] },
                     ].map(theme => (
                       <button 
                        key={theme.id}
                        className={cn(
                          "p-4 border rounded-2xl transition-all text-left group",
                          theme.id === 'carbon' ? "border-[#3ecf8e] bg-[#3ecf8e]/5" : "border-slate-800 bg-slate-900/20 hover:border-slate-700"
                        )}
                       >
                          <div className="flex gap-1 mb-4">
                             {theme.colors.map((c, j) => <div key={j} className={cn("w-6 h-6 rounded-md", c)} />)}
                          </div>
                          <p className="text-[10px] font-bold text-white uppercase tracking-widest">{theme.label}</p>
                          {theme.id === 'carbon' && <p className="text-[8px] text-[#3ecf8e] font-mono uppercase mt-1">Active</p>}
                       </button>
                     ))}
                  </div>
               </SettingSection>
            </motion.div>
          )}

          {activeTab === 'database' && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
               <SettingSection title="Offline Sync Status" description="Overview of pending operations synchronized when internet connectivity is established." icon={Database}>
                  <div className="p-5 rounded-2xl bg-[#3ecf8e]/5 border border-[#3ecf8e]/20">
                     <div className="flex items-center justify-between mb-4">
                        <span className="text-xs font-bold text-white uppercase tracking-wider font-mono">Sync Status</span>
                        <div className="flex items-center gap-2">
                           <button 
                             onClick={() => {
                               clearOfflineQueue();
                               alert("Offline database queue wiped successfully.");
                               window.dispatchEvent(new Event('storage'));
                             }}
                             className="px-3 py-1.5 bg-slate-900 border border-slate-800 text-slate-400 hover:text-white rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                           >
                              Clear Queue
                           </button>
                           <button 
                             onClick={async () => {
                               const res = await syncOfflineQueue();
                               alert(`Synchronized! Success: ${res.success}, Fail: ${res.failed}`);
                               window.dispatchEvent(new Event('storage'));
                             }}
                             className="px-3 py-1.5 bg-[#3ecf8e] text-[#020617] rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer"
                           >
                              Force Sync
                           </button>
                        </div>
                     </div>
                     <p className="text-xs text-slate-400 leading-relaxed font-mono">
                        Tables state are buffered inside LocalStorage when cloud API nodes fail to handshake. When connectivity resumes, TableMaître synchronizes queued transactions back sequentially.
                     </p>
                  </div>

                  <div className="bg-[#020617] border border-slate-800 rounded divide-y divide-slate-800/50 max-h-60 overflow-y-auto font-mono text-xs">
                     {getOfflineQueue().length === 0 ? (
                        <div className="p-6 text-center text-slate-600 uppercase tracking-widest">No pending offline logs. System completely synchronized.</div>
                     ) : (
                        getOfflineQueue().map(item => (
                           <div key={item.id} className="p-3 flex items-center justify-between hover:bg-white/[0.01]">
                              <div>
                                 <span className={cn(
                                   "px-1.5 py-0.5 rounded text-[8px] font-bold mr-2 uppercase",
                                   item.action === 'insert' ? "bg-green-500/10 text-green-500" :
                                   item.action === 'update' ? "bg-blue-500/10 text-blue-500" : "bg-red-500/10 text-red-550"
                                 )}>{item.action}</span>
                                 <span className="text-slate-300">{item.table}</span>
                              </div>
                              <span className="text-slate-500 text-[10px]">{new Date(item.timestamp).toLocaleTimeString()}</span>
                           </div>
                        ))
                     )}
                  </div>
               </SettingSection>

               <SettingSection title="Network Topology & Protocols" description="Operational endpoints of database servers." icon={Activity}>
                  <div className="space-y-4 font-mono text-xs">
                     <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 flex justify-between">
                        <span className="text-slate-500">Cloud Node Mode</span>
                        <span className={cn("font-bold uppercase tracking-wider", isSupabaseConfigured ? "text-[#3ecf8e]" : "text-amber-500")}>
                           {isSupabaseConfigured ? "CLOUD-CONNECTED (SUPABASE)" : "OFFLINE FALLBACK MODE (LOCALSTORAGE)"}
                        </span>
                     </div>
                     <div className="p-4 bg-slate-950/50 rounded-lg border border-slate-800 flex justify-between">
                        <span className="text-slate-500">Service Status</span>
                        <span className="text-green-400 font-bold uppercase tracking-wider flex items-center gap-1.5">
                           <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                           Operational
                        </span>
                     </div>
                  </div>
               </SettingSection>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}
