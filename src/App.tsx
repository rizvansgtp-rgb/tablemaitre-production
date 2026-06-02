import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import AuthScreen from './components/AuthScreen';
import StoreSelector from './components/StoreSelector';
import Layout from './components/Layout';
import FloorPlan from './components/FloorPlan';
import Reservations from './components/Reservations';
import Waitlist from './components/Waitlist';
import StaffManagement from './components/StaffManagement';
import Guests from './components/Guests';
import Reports from './components/Reports';
import HQ from './components/HQ';
import Settings from './components/Settings';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  Clock, 
  Calendar, 
  TrendingUp, 
  CheckCircle2, 
  AlertCircle,
  BarChart,
  Map,
  Sparkles,
  Loader2,
  Receipt,
  Brush
} from 'lucide-react';
import { cn } from './lib/utils';

function AIInsight({ storeContext }: { storeContext: any }) {
  const [insight, setInsight] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const generateInsight = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/gemini/insight", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          prompt: "Analyze the current store state and give a professional recommendation.",
          storeContext 
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to generate insight");
      }
      setInsight(data.insight);
    } catch (err: any) {
      console.error(err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-[#3ecf8e]/5 border border-[#3ecf8e]/20 rounded-2xl relative overflow-hidden group">
      <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
        <Sparkles size={40} className="text-[#3ecf8e]" />
      </div>
       <div className="flex items-center gap-3 mb-4">
          <div className="p-2 bg-[#3ecf8e]/10 rounded-lg">
             <TrendingUp size={16} className="text-[#3ecf8e]" />
          </div>
          <h4 className="text-[10px] font-bold text-white uppercase tracking-widest">AI Strategic Insights</h4>
       </div>
       <div className="min-h-[60px] flex flex-col justify-center">
         {loading ? (
            <div className="flex items-center gap-2 text-slate-500 font-mono text-xs">
              <Loader2 className="animate-spin" size={14} />
              Analyzing realtime telemetry...
            </div>
         ) : error ? (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <p className="text-[10px] text-red-400 leading-relaxed font-medium">
                {error}
              </p>
            </div>
         ) : insight ? (
            <motion.p 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }}
              className="text-xs text-slate-300 leading-relaxed font-medium"
            >
              {insight}
            </motion.p>
         ) : (
            <p className="text-xs text-slate-500 leading-relaxed font-mono">
              Aggregate demand is exceeding current capacity limits. Recommendation: Add more tables.
            </p>
         )}
       </div>
       <button 
        onClick={generateInsight}
        disabled={loading}
        className="mt-4 w-full py-2 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 hover:bg-[#3ecf8e]/20 text-[#3ecf8e] text-[9px] font-bold uppercase tracking-widest rounded-lg transition-all flex items-center justify-center gap-2"
       >
         {loading ? "Processing..." : "Generate Live Optimization Plan"}
       </button>
    </div>
  );
}

function Dashboard() {
  const { profile } = useAuth();
  const [statsData, setStatsData] = useState({
    available: { value: 12, total: 20 },
    occupied: { value: 8, total: 20 },
    reserved: { value: 5, total: 15 },
    billing: { value: 0, total: 20 },
    cleaning: { value: 0, total: 20 },
    waitlist: { value: 3, total: 10 }
  });
  const [sectionsOccupancy, setSectionsOccupancy] = useState<Array<{ name: string, seats: number, percentage: number }>>([
    { name: 'Indoor Main', seats: 24, percentage: 85 },
    { name: 'Outdoor Terrace', seats: 16, percentage: 45 },
    { name: 'VIP Lounge', seats: 8, percentage: 90 },
    { name: 'Garden Area', seats: 20, percentage: 20 }
  ]);
  const [feedActivities, setFeedActivities] = useState<any[]>([
    { id: 'act-1', type: 'checkin', guest: 'Michael S.', time: '2m ago', desc: 'Party of 4 seated in Terrace Section', icon: Map, color: 'text-blue-400' },
    { id: 'act-2', type: 'booking', guest: 'Sarah L.', time: '14m ago', desc: 'Digital reservation confirmed for 20:30', icon: Calendar, color: 'text-[#3ecf8e]' },
    { id: 'act-3', type: 'alert', guest: 'Wait Queue Breach', time: '22m ago', desc: 'Avg wait time for 2P exceeded 45m limit', icon: AlertCircle, color: 'text-amber-500' },
    { id: 'act-4', type: 'payment', guest: 'Table 14', time: '35m ago', desc: 'Final check encrypted and processed successfully', icon: TrendingUp, color: 'text-green-500' }
  ]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const fetchDashboardData = async () => {
      const activeStore = profile?.active_store || '0301';
      if (!isSupabaseConfigured) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        // 1. Fetch tables
        const { data: tables, error: tablesError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('store_id', activeStore);

        if (tablesError) throw tablesError;

        const tableList = tables || [];
        const totalTablesCount = tableList.length;
        const availableCount = tableList.filter(t => t.status === 'available').length;
        const occupiedCount = tableList.filter(t => t.status === 'occupied').length;
        const billingCount = tableList.filter(t => t.status === 'billing').length;
        const cleaningCount = tableList.filter(t => t.status === 'cleaning').length;

        // 2. Fetch reservations
        const { count: reservedCount, error: resError } = await supabase
          .from('reservations')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', activeStore)
          .in('status', ['booked', 'confirmed']);

        if (resError) throw resError;

        // 3. Fetch waitlist
        const { count: waitlistCount, error: wlError } = await supabase
          .from('waitlist')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', activeStore)
          .eq('status', 'waiting');

        if (wlError) throw wlError;

        // Calculate dynamic capacities
        const totalTablesVal = totalTablesCount || 20;
        const reservedVal = reservedCount || 0;
        const waitlistVal = waitlistCount || 0;

        // 4. Fetch sections
        const { data: sections, error: sectionsError } = await supabase
          .from('sections')
          .select('*')
          .eq('store_id', activeStore);

        if (sectionsError) throw sectionsError;

        const sectionList = sections || [];
        const occupancy = sectionList.map(sec => {
          const secTables = tableList.filter(t => t.section_id === sec.id);
          const totalSeats = secTables.reduce((sum, t) => sum + (t.capacity || 0), 0);
          const occupiedTables = secTables.filter(t => t.status === 'occupied' || t.status === 'billing');
          const occupiedSeats = occupiedTables.reduce((sum, t) => sum + (t.guest_count || t.capacity || 0), 0);
          const percentage = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;
          return {
            name: sec.name,
            seats: totalSeats,
            percentage: Math.min(100, percentage)
          };
        });

        // 5. Fetch recent activity logs
        const { data: logs, error: logsError } = await supabase
          .from('activity_logs')
          .select('*')
          .eq('store_id', activeStore)
          .order('created_at', { ascending: false })
          .limit(4);

        let mappedActivities = [];
        if (logs && logs.length > 0) {
          const mapIcon = (type: string) => {
            if (type.toLowerCase().includes('table')) return Map;
            if (type.toLowerCase().includes('res')) return Calendar;
            if (type.toLowerCase().includes('waitlist')) return AlertCircle;
            return TrendingUp;
          };
          const mapColor = (type: string) => {
            if (type.toLowerCase().includes('table')) return 'text-blue-400';
            if (type.toLowerCase().includes('res')) return 'text-[#3ecf8e]';
            if (type.toLowerCase().includes('waitlist')) return 'text-amber-500';
            return 'text-green-500';
          };
          const formatTime = (dateStr: string) => {
            const diffMs = Date.now() - new Date(dateStr).getTime();
            const diffMins = Math.floor(diffMs / 1000 / 60);
            if (diffMins < 1) return 'now';
            if (diffMins < 60) return `${diffMins}m ago`;
            const hrs = Math.floor(diffMins / 60);
            if (hrs < 24) return `${hrs}h ago`;
            return new Date(dateStr).toLocaleDateString();
          };

          mappedActivities = logs.map((log: any) => ({
            id: log.id,
            type: log.entity_type,
            guest: log.entity_type === 'restaurant_tables' || log.entity_type === 'table' ? `Table ${log.entity_id || ''}` : (log.entity_type || 'System'),
            time: formatTime(log.created_at),
            desc: `${log.action}: ${log.details || ''}`,
            icon: mapIcon(log.entity_type),
            color: mapColor(log.entity_type)
          }));
        }

        if (active) {
          setStatsData({
            available: { value: availableCount, total: totalTablesVal },
            occupied: { value: occupiedCount, total: totalTablesVal },
            reserved: { value: reservedVal, total: Math.max(15, reservedVal) },
            billing: { value: billingCount, total: totalTablesVal },
            cleaning: { value: cleaningCount, total: totalTablesVal },
            waitlist: { value: waitlistVal, total: Math.max(10, waitlistVal) }
          });
          if (occupancy.length > 0) {
            setSectionsOccupancy(occupancy);
          }
          if (mappedActivities.length > 0) {
            setFeedActivities(mappedActivities);
          }
        }
      } catch (err) {
        console.error('Error fetching dashboard data:', err);
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    fetchDashboardData();
    return () => {
      active = false;
    };
  }, [profile?.active_store]);

  const stats = [
    { label: 'Open Tables', value: statsData.available.value, total: statsData.available.total, icon: CheckCircle2, color: 'text-green-500', bg: 'bg-green-500/10', barColor: 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' },
    { label: 'Seated Tables', value: statsData.occupied.value, total: statsData.occupied.total, icon: Users, color: 'text-[#3ecf8e]', bg: 'bg-[#3ecf8e]/10', barColor: 'bg-[#3ecf8e] shadow-[0_0_10px_rgba(62,207,142,0.5)]' },
    { label: 'Reserved Tables', value: statsData.reserved.value, total: statsData.reserved.total, icon: Clock, color: 'text-blue-500', bg: 'bg-blue-500/10', barColor: 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' },
    { label: 'Billing Tables', value: statsData.billing.value, total: statsData.billing.total, icon: Receipt, color: 'text-yellow-500', bg: 'bg-yellow-500/10', barColor: 'bg-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.5)]' },
    { label: 'Cleaning Tables', value: statsData.cleaning.value, total: statsData.cleaning.total, icon: Brush, color: 'text-cyan-500', bg: 'bg-cyan-500/10', barColor: 'bg-cyan-500 shadow-[0_0_10px_rgba(6,182,212,0.5)]' },
    { label: 'Wait Queue', value: statsData.waitlist.value, total: statsData.waitlist.total, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10', barColor: 'bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)]' },
  ];

  const storeContext = {
    storeId: profile?.active_store,
    occupancy: statsData.occupied.value,
    totalTables: statsData.available.total,
    waitlist: statsData.waitlist.value,
    sections: sectionsOccupancy.map(s => s.name)
  };

  return (
    <div className="space-y-8 pb-10">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Executive Overview</h2>
          <p className="text-slate-400 mt-1">Live restaurant network metrics and store operations.</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex gap-2">
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Store: {profile?.active_store || 'N/A'}</div>
            <div className="px-3 py-1.5 bg-slate-900 border border-slate-800 rounded text-[10px] font-mono text-slate-400 uppercase tracking-widest font-bold">Shift: Dinner</div>
          </div>
          <div className="px-4 py-1.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 text-[#3ecf8e] rounded text-xs font-bold font-mono">
            LIVE SYNC ACTIVE
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((stat, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            key={stat.label}
            className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm group hover:border-[#3ecf8e]/30 transition-all"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-none">{stat.label}</div>
              <div className={cn("w-1.5 h-1.5 rounded-full shadow-[0_0_8px_currentColor]", stat.color)} />
            </div>
            <div className="flex items-baseline justify-between">
              <div className={cn("text-3xl font-bold tracking-tight", stat.label === 'Seated Tables' ? "text-[#3ecf8e]" : "text-white")}>{stat.value}</div>
              <div className="text-[10px] font-mono text-slate-500 uppercase">Cap: {stat.total}</div>
            </div>
             <div className="mt-4 h-1 bg-slate-800 rounded-full overflow-hidden">
               <motion.div 
                initial={{ width: 0 }}
                animate={{ width: stat.total > 0 ? `${(stat.value / stat.total) * 100}%` : '0%' }}
                className={cn("h-full", stat.barColor)} 
               />
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-8">
          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 relative overflow-hidden h-[400px] shadow-2xl flex flex-col">
             <div className="flex items-center justify-between mb-8">
                <h3 className="text-sm font-bold text-white uppercase tracking-widest flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" />
                  Hourly Occupancy
                </h3>
                <div className="flex gap-2">
                  <button className="px-2 py-0.5 rounded bg-slate-800 text-[9px] font-bold text-white border border-slate-700">6HR</button>
                  <button className="px-2 py-0.5 rounded bg-slate-950 text-[9px] font-bold text-slate-500 border border-slate-800">12HR</button>
                </div>
             </div>
             <div className="flex-1 flex items-end justify-between px-4 pb-4">
                {[40, 60, 80, 70, 90, 50, 40, 20, 60, 95, 80, 50].map((h, i) => (
                  <div key={i} className="flex flex-col items-center gap-4 group flex-1">
                     <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: `${h}%` }}
                      className={cn(
                        "w-3 rounded transition-all relative",
                        h > 80 ? "bg-[#3ecf8e] shadow-[0_0_15px_rgba(62,207,142,0.3)]" : h > 50 ? "bg-[#3ecf8e]/60" : "bg-slate-800"
                      )}
                     >
                       <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-[#020617] text-[10px] font-mono font-bold px-1.5 py-0.5 rounded border border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity text-[#3ecf8e]">
                          {h}%
                       </div>
                     </motion.div>
                     <span className="text-[9px] font-mono text-slate-600 group-hover:text-[#3ecf8e] transition-colors">
                        {12 + i}h
                     </span>
                  </div>
                ))}
             </div>
          </div>

          <div className="bg-slate-900/30 border border-slate-800 rounded-2xl p-8 shadow-2xl">
            <div className="flex items-center justify-between mb-8 text-sm font-bold text-white uppercase tracking-widest">
              <div className="flex items-center gap-2">
                 <div className="w-1.5 h-1.5 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]" />
                 Section Occupancy
              </div>
              <div className="px-2 py-0.5 rounded-full bg-[#3ecf8e]/20 text-[#3ecf8e] text-[9px]">REAL-TIME</div>
            </div>
            <div className="space-y-6 pb-4">
              {sectionsOccupancy.map((section) => (
                <div key={section.name} className="space-y-3">
                  <div className="grid grid-cols-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    <span className="col-span-2 text-slate-200">{section.name}</span>
                    <span className="text-right">{ section.seats } Seats</span>
                    <span className="text-right text-[#3ecf8e]">{section.percentage}%</span>
                  </div>
                  <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                     <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${section.percentage}%` }}
                      className={cn(
                        "h-full shadow-[0_0_10px_rgba(62,207,142,0.5)]",
                        section.percentage > 80 ? "bg-[#3ecf8e]" : "bg-slate-600"
                      )}
                     />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Clock size={14} className="text-[#3ecf8e]" />
              Operation Feed
            </h3>
            <div className="space-y-4">
               {feedActivities.map((act, i) => (
                 <motion.div 
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  key={act.id} 
                  className="flex gap-4 p-3 rounded-xl hover:bg-white/[0.02] transition-colors group cursor-pointer"
                 >
                    <div className={cn("w-8 h-8 rounded-lg bg-[#020617] border border-slate-800 flex items-center justify-center shrink-0 group-hover:border-[#3ecf8e]/30 transition-all", act.color)}>
                       <act.icon size={14} />
                    </div>
                    <div className="min-w-0">
                       <div className="flex items-center justify-between gap-2">
                          <span className="text-[10px] font-bold text-white truncate">{act.guest}</span>
                          <span className="text-[9px] font-mono text-slate-600 shrink-0">{act.time}</span>
                       </div>
                       <p className="text-[10px] text-slate-500 leading-tight mt-1 truncate">{act.desc}</p>
                    </div>
                 </motion.div>
               ))}
               <button className="w-full py-2 mt-2 bg-slate-950 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-500 uppercase tracking-widest hover:text-white transition-all">
                  View Comprehensive Logs
               </button>
            </div>
          </div>

          <AIInsight storeContext={storeContext} />
        </div>
      </div>
    </div>
  );
}

function Placeholder({ name }: { name: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center bg-[#0f172a]/20 border border-slate-800 rounded-2xl border-dashed p-10 text-center shadow-inner">
       <div className="w-20 h-20 bg-[#0f172a] rounded-3xl flex items-center justify-center text-slate-700 mb-6 border border-slate-800 shadow-[0_0_20px_rgba(62,207,142,0.05)]">
          <BarChart size={40} className="text-[#3ecf8e]/40" />
       </div>
       <h2 className="text-2xl font-bold text-white mb-2 tracking-tight">{name} Module</h2>
       <p className="max-w-md text-slate-500 text-sm leading-relaxed mb-8">
         This component is currently being initialized for your live Supabase environment. 
         Stay tuned for real-time guest tracking and inventory integration.
       </p>
       <button className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/40 text-[#3ecf8e] px-8 py-3 rounded-lg font-bold hover:bg-[#3ecf8e] hover:text-[#020617] transition-all active:scale-95 shadow-[0_0_15px_rgba(62,207,142,0.1)] uppercase tracking-widest text-[10px]">
         Request Module Access
       </button>
    </div>
  );
}

function MainApp() {
  const { user, profile, loading } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <div className="w-16 h-16 border-2 border-[#3ecf8e]/10 border-t-[#3ecf8e] rounded-full animate-spin mb-6" />
        <p className="text-[#3ecf8e] font-bold uppercase tracking-[0.3em] text-[10px] animate-pulse">Initializing TableMaître Suite</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreen />;
  }

  if (!profile?.active_store) {
    return <StoreSelector />;
  }

  const renderContent = () => {
    // Role privilege guards for admin-only pages
    const isAdmin = profile?.role === 'owner' || profile?.role === 'admin' || profile?.role === 'manager';
    const isRestricted = ['staff', 'reports', 'hq'].includes(activeTab);

    if (isRestricted && !isAdmin) {
      return (
        <div className="h-full flex flex-col items-center justify-center p-8 bg-slate-950/20 border border-slate-800/80 rounded-2xl border-dashed">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 rounded-full flex items-center justify-center text-red-500 mb-6 shadow-[0_0_15px_rgba(239,68,68,0.2)]">
            <AlertCircle size={28} />
          </div>
          <h3 className="text-sm font-black tracking-widest text-red-500 uppercase font-mono">⛔ Access Denied</h3>
          <p className="text-[10px] text-slate-500 max-w-xs text-center mt-2 leading-relaxed uppercase tracking-tighter font-mono">
            Your staff credential privilege ({profile?.role}) is not authorized to decapsulate this panel. Please contact the general owner or manager.
          </p>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'floor': return <FloorPlan />;
      case 'staff': return <StaffManagement />;
      case 'reservations': return <Reservations />;
      case 'waitlist': return <Waitlist />;
      case 'guests': return <Guests />;
      case 'reports': return <Reports />;
      case 'hq': return <HQ />;
      case 'settings': return <Settings />;
      default: return <Dashboard />;
    }
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
       <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 5 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -5 }}
            transition={{ duration: 0.2 }}
            className="h-full"
          >
            {renderContent()}
          </motion.div>
       </AnimatePresence>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
