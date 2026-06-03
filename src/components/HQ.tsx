import React, { useState, useEffect } from 'react';
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
  Users,
  Loader2,
  Bookmark,
  Clock,
  Receipt,
  Brush,
  CheckCircle2
} from 'lucide-react';
import { motion } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

const getLocalDateString = (d: Date = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function HQ() {
  const { profile, stores } = useAuth();
  const [tables, setTables] = useState<any[]>([]);
  const [reservations, setReservations] = useState<any[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Default active store to view
  const [selectedStoreId, setSelectedStoreId] = useState(profile?.active_store || '');

  useEffect(() => {
    if (profile?.active_store && !selectedStoreId) {
      setSelectedStoreId(profile.active_store);
    }
  }, [profile?.active_store]);

  useEffect(() => {
    if (profile?.assigned_stores) {
      fetchHQData();
    }
  }, [profile?.assigned_stores]);

  async function fetchHQData() {
    setLoading(true);
    setError(null);
    try {
      const assignedIds = profile?.assigned_stores || [];
      if (assignedIds.length === 0) {
        setLoading(false);
        return;
      }

      if (isSupabaseConfigured) {
        const { data: tablesData, error: tablesError } = await supabase
          .from('restaurant_tables')
          .select('*')
          .in('store_id', assignedIds);
        if (tablesError) throw tablesError;

        const { data: resData, error: resError } = await supabase
          .from('reservations')
          .select('*')
          .in('store_id', assignedIds);
        if (resError) throw resError;

        const { data: wlData, error: wlError } = await supabase
          .from('waitlist')
          .select('*')
          .in('store_id', assignedIds);
        if (wlError) throw wlError;

        setTables(tablesData || []);
        setReservations(resData || []);
        setWaitlist(wlData || []);
      } else {
        const localTables = localStorage.getItem('table_maitre_tables');
        const localReservations = localStorage.getItem('table_maitre_reservations');
        const localWaitlist = localStorage.getItem('table_maitre_waitlist');

        const parsedTables = localTables ? JSON.parse(localTables) : [];
        const parsedRes = localReservations ? JSON.parse(localReservations) : [];
        const parsedWl = localWaitlist ? JSON.parse(localWaitlist) : [];

        setTables(parsedTables.filter((t: any) => assignedIds.includes(t.store_id)));
        setReservations(parsedRes.filter((r: any) => assignedIds.includes(r.store_id)));
        setWaitlist(parsedWl.filter((w: any) => assignedIds.includes(w.store_id)));
      }
    } catch (err: any) {
      console.error("HQ data fetch failed:", err);
      setError("Unable to load operations dashboard.");
    } finally {
      setLoading(false);
    }
  }

  const assignedStores = (profile?.assigned_stores || []).filter(storeId => {
    const isSpecialStore = storeId !== '0301' && storeId !== '0302';
    if (isSpecialStore) {
      return stores.some(s => s.id === storeId);
    }
    return true;
  }).map(storeId => {
    const dbStore = stores.find(s => s.id === storeId);
    const storeTables = tables.filter(t => t.store_id === storeId);
    const occupiedCount = storeTables.filter(t => t.status === 'occupied' || t.status === 'billing').length;
    const totalCount = storeTables.length;
    const occupancy = totalCount > 0 ? Math.round((occupiedCount / totalCount) * 100) : 0;

    return {
      id: storeId,
      name: dbStore ? dbStore.name : `Store ${storeId}`,
      location: dbStore ? (dbStore.location || dbStore.name) : `Branch ${storeId}`,
      occupancy,
      totalTables: totalCount,
      activeBookings: reservations.filter(r => r.store_id === storeId && r.status !== 'cancelled').length
    };
  });

  const activeStoreId = selectedStoreId || profile?.active_store || profile?.assigned_stores?.[0] || '0301';
  const activeStoreTables = tables.filter(t => t.store_id === activeStoreId);
  const activeStoreReservations = reservations.filter(r => r.store_id === activeStoreId);
  const activeStoreWaitlist = waitlist.filter(w => w.store_id === activeStoreId);

  // Metrics for active store
  const openTablesCount = activeStoreTables.filter(t => t.status === 'available').length;
  const seatedTablesCount = activeStoreTables.filter(t => t.status === 'occupied').length;
  const reservedTablesCount = activeStoreTables.filter(t => t.status === 'reserved').length;
  const billingTablesCount = activeStoreTables.filter(t => t.status === 'billing').length;
  const cleaningTablesCount = activeStoreTables.filter(t => t.status === 'cleaning').length;
  
  const waitQueueCount = activeStoreWaitlist.filter(w => w.status === 'waiting').length;

  const todayStr = getLocalDateString(new Date());
  const todayReservationsCount = activeStoreReservations.filter(r => r.datetime.split('T')[0] === todayStr && r.status !== 'cancelled').length;

  const totalActivity = activeStoreTables.length + activeStoreReservations.length + activeStoreWaitlist.length;

  if (loading) {
    return (
      <div className="h-96 flex flex-col items-center justify-center gap-3">
        <Loader2 className="animate-spin text-[#3ecf8e]" size={36} />
        <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Loading operations dashboard...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 rounded-2xl bg-red-950/20 border border-red-500/20 text-center space-y-4">
        <AlertCircle size={40} className="text-red-500 mx-auto animate-pulse" />
        <h3 className="text-md font-bold text-red-500 uppercase tracking-widest">Dashboard Error</h3>
        <p className="text-xs text-red-400 font-mono">{error}</p>
      </div>
    );
  }

  if (assignedStores.length === 0) {
    return (
      <div className="p-12 text-center text-slate-500 bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl">
        No assigned stores found for this profile.
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="page-title">Operations Dashboard</h2>
          <p className="page-subtitle">Unified metrics across the assigned restaurant branches.</p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={activeStoreId}
            onChange={(e) => setSelectedStoreId(e.target.value)}
            className="bg-[#0f172a] border border-slate-800 text-[10px] text-slate-300 font-bold uppercase tracking-wider px-3 py-2 rounded-lg cursor-pointer outline-none focus:border-[#3ecf8e]/40 transition-colors"
          >
            {assignedStores.map(store => (
              <option key={store.id} value={store.id}>
                {store.name}
              </option>
            ))}
          </select>
          <div className="p-2 bg-slate-900 border border-slate-800 rounded-lg text-[#3ecf8e]">
            <Globe size={18} />
          </div>
        </div>
      </div>

      {totalActivity === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl">
          No operational activity found for this store.
        </div>
      ) : (
        <>
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
            {[
              { label: 'Open Tables', value: openTablesCount, icon: CheckCircle2, color: 'text-green-500' },
              { label: 'Seated Tables', value: seatedTablesCount, icon: Bookmark, color: 'text-[#3ecf8e]' },
              { label: 'Reserved Tables', value: reservedTablesCount, icon: Clock, color: 'text-blue-400' },
              { label: 'Billing Tables', value: billingTablesCount, icon: Receipt, color: 'text-yellow-500' },
              { label: 'Cleaning Tables', value: cleaningTablesCount, icon: Brush, color: 'text-cyan-400' },
              { label: 'Wait Queue', value: waitQueueCount, icon: AlertCircle, color: 'text-amber-500' },
              { label: 'Today Reservations', value: todayReservationsCount, icon: Activity, color: 'text-indigo-400' }
            ].map((stat, i) => (
              <div key={i} className="p-4 rounded-xl bg-[#0f172a]/40 border border-slate-800/80 backdrop-blur-sm relative overflow-hidden group hover:border-[#3ecf8e]/35 transition-all">
                <div className="absolute top-0 right-0 p-3 opacity-[0.02] group-hover:opacity-[0.06] transition-opacity">
                  <stat.icon size={48} />
                </div>
                <div className={cn("inline-flex p-1.5 rounded-lg bg-slate-950 border border-slate-800 mb-3", stat.color)}>
                  <stat.icon size={14} />
                </div>
                <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">{stat.label}</p>
                <h3 className="text-xl font-bold text-white mt-0.5">{stat.value}</h3>
              </div>
            ))}
          </div>

          {/* Alerts Section */}
          {(billingTablesCount > 0 || cleaningTablesCount > 0 || waitQueueCount > 0) && (
            <div className="space-y-3">
              <h4 className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest">Active Alerts</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {billingTablesCount > 0 && (
                  <div className="p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl flex gap-3 items-start">
                    <Receipt size={16} className="text-yellow-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-yellow-500 uppercase tracking-wider block">Billing Tables Active</span>
                      <span className="text-[10px] text-yellow-500/70 font-medium">{billingTablesCount} tables requesting checkout.</span>
                    </div>
                  </div>
                )}
                {cleaningTablesCount > 0 && (
                  <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex gap-3 items-start">
                    <Brush size={16} className="text-cyan-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Cleaning Pending</span>
                      <span className="text-[10px] text-cyan-400/70 font-medium">{cleaningTablesCount} tables require immediate sanitation.</span>
                    </div>
                  </div>
                )}
                {waitQueueCount > 0 && (
                  <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3 items-start">
                    <AlertCircle size={16} className="text-amber-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-500 uppercase tracking-wider block">Wait Queue Active</span>
                      <span className="text-[10px] text-amber-500/70 font-medium">{waitQueueCount} parties currently in the wait queue.</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Store Matrix */}
          <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl">
            <div className="px-8 py-5 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
              <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-3">
                <Building2 size={16} className="text-[#3ecf8e]" />
                Store Performance Matrix
              </h3>
              <div className="flex gap-4 text-[9px] font-bold text-slate-500 uppercase tracking-widest">
                <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" /> Online
                </div>
              </div>
            </div>
            
            <div className="divide-y divide-slate-800/50">
              {assignedStores.map((store) => (
                <div key={store.id} className="px-8 py-5 flex items-center gap-8 group hover:bg-[#3ecf8e]/[0.02] transition-colors">
                  <div className="w-12 h-12 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-center text-slate-650 group-hover:border-[#3ecf8e]/35 group-hover:text-[#3ecf8e] transition-all">
                    <MapPin size={20} />
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h4 className="text-sm font-bold text-white tracking-tight">{store.location}</h4>
                      <span className="text-[8px] font-mono font-bold text-slate-600 uppercase">ST-{store.id}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-1 font-mono text-[9px] text-slate-500">
                      <span>Tables: {store.totalTables}</span>
                      <span>Bookings: {store.activeBookings}</span>
                    </div>
                  </div>

                  <div className="w-48 space-y-2">
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-widest leading-none">
                      <span className="text-slate-500">Live Occupancy</span>
                      <span className="text-[#3ecf8e]">{store.occupancy}%</span>
                    </div>
                    <div className="h-1 bg-slate-900 rounded-full overflow-hidden">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${store.occupancy}%` }}
                        className={cn(
                          "h-full",
                          store.occupancy > 75 ? "bg-[#3ecf8e] shadow-[0_0_10px_rgba(62,207,142,0.3)]" : "bg-slate-600"
                        )}
                      />
                    </div>
                  </div>

                  <div className="w-24 text-right">
                    <span className="px-2.5 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20">
                      Active
                    </span>
                  </div>

                  <button 
                    onClick={() => setSelectedStoreId(store.id)}
                    className="p-2 bg-slate-950 border border-slate-800 rounded-xl text-slate-600 hover:text-white hover:border-slate-700 transition-all opacity-0 group-hover:opacity-100"
                  >
                    <ArrowRight size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
