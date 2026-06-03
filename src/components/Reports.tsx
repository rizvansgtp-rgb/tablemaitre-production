import React, { useState, useEffect } from 'react';
import { 
  BarChart as BarChartIcon, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Clock, 
  Calendar,
  Download,
  Filter,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Activity,
  CalendarDays,
  XCircle,
  CheckCircle2,
  Bookmark,
  Brush,
  Globe,
  Loader2,
  Receipt,
  AlertCircle
} from 'lucide-react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  AreaChart,
  Area
} from 'recharts';
import { cn } from '../lib/utils';
import { useAuth } from '../context/AuthContext';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { Reservation, Table, GuestCard } from '../types';

const PerformanceCard = ({ label, value, trend, isPositive, icon: Icon, color = "text-slate-500" }: any) => (
  <div className="p-4 rounded-xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm group hover:border-[#3ecf8e]/30 transition-all flex flex-col justify-between">
    <div className="flex items-center justify-between mb-2">
      <div className={cn("p-2 bg-slate-950 rounded-lg border border-slate-800", color)}>
        <Icon size={14} />
      </div>
      {trend && (
        <div className={cn(
          "flex items-center gap-0.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full font-mono",
          isPositive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"
        )}>
          {isPositive ? "+" : ""}{trend}
        </div>
      )}
    </div>
    <div>
      <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">{label}</p>
      <h3 className="text-xl font-bold text-white tracking-tight">{value}</h3>
    </div>
  </div>
);

const getLocalDateString = (d: Date = new Date()) => {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

export default function Reports() {
  const { profile, stores } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [guests, setGuests] = useState<GuestCard[]>([]);
  const [waitlist, setWaitlist] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const allowedStores = (profile?.assigned_stores || []).filter(storeId => {
    const isSpecialStore = storeId !== '0301' && storeId !== '0302';
    if (isSpecialStore) {
      return stores.some(s => s.id === storeId);
    }
    return true;
  }).map(storeId => {
    const dbStore = stores.find(s => s.id === storeId);
    return {
      id: storeId,
      name: dbStore ? dbStore.name : `Store ${storeId}`
    };
  });

  const allowedStoreIds = allowedStores.map(s => s.id);

  // Filters State
  const [activeStore, setActiveStore] = useState(profile?.active_store || '0301');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('ThisMonth'); // Today, Tomorrow, Yesterday, Last7D, ThisMonth, AllTime

  useEffect(() => {
    fetchTelemetry();
  }, []);

  useEffect(() => {
    if (profile?.active_store) {
      setActiveStore(profile.active_store);
    }
  }, [profile?.active_store]);

  async function fetchTelemetry() {
    setLoading(true);
    try {
      // Load Reservations
      let resData: Reservation[] = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('reservations').select('*');
        if (data) resData = data;
      } else {
        const local = localStorage.getItem('table_maitre_reservations');
        if (local) resData = JSON.parse(local);
      }
      setReservations(resData);

      // Load Tables
      let tableData: Table[] = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('restaurant_tables').select('*');
        if (data) tableData = data;
      } else {
        const local = localStorage.getItem('table_maitre_tables');
        if (local) tableData = JSON.parse(local);
      }
      setTables(tableData);

      // Load Guests
      let guestData: GuestCard[] = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('guests').select('*');
        if (data) guestData = data;
      } else {
        const local = localStorage.getItem('table_maitre_guests');
        if (local) guestData = JSON.parse(local);
      }
      setGuests(guestData);

      // Load Waitlist
      let waitlistData: any[] = [];
      if (isSupabaseConfigured) {
        const { data } = await supabase.from('waitlist').select('*');
        if (data) waitlistData = data;
      } else {
        const local = localStorage.getItem('table_maitre_waitlist');
        if (local) waitlistData = JSON.parse(local);
      }
      setWaitlist(waitlistData);

    } catch (err) {
      console.error("Error loading telemetry for reports:", err);
    } finally {
      setLoading(false);
    }
  }

  // Filter computation using accurate locale dates
  const filteredRes = reservations.filter(res => {
    // 1. Branch/Store Filter
    if (activeStore !== 'AllBranches') {
      if (res.store_id !== activeStore) return false;
    } else {
      if (!allowedStoreIds.includes(res.store_id)) return false;
    }

    // 2. Status Filter
    if (statusFilter !== 'All' && res.status !== statusFilter.toLowerCase()) {
      return false;
    }

    // 3. Date Filters
    const localNow = new Date();
    const resDateStr = res.datetime.split('T')[0];

    const todayStr = getLocalDateString(localNow);
    
    const tomorrow = new Date();
    tomorrow.setDate(localNow.getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);

    const yesterday = new Date();
    yesterday.setDate(localNow.getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);

    if (dateFilter === 'Today' && resDateStr !== todayStr) return false;
    if (dateFilter === 'Tomorrow' && resDateStr !== tomorrowStr) return false;
    if (dateFilter === 'Yesterday' && resDateStr !== yesterdayStr) return false;
    
    if (dateFilter === 'Last7D') {
      const resTime = new Date(res.datetime).getTime();
      const diffDays = (localNow.getTime() - resTime) / (1000 * 60 * 60 * 24);
      if (diffDays < 0 || diffDays > 7) return false;
    }

    if (dateFilter === 'ThisMonth') {
      const resDate = new Date(res.datetime);
      const isCurrentMonth = resDate.getMonth() === localNow.getMonth() && resDate.getFullYear() === localNow.getFullYear();
      if (!isCurrentMonth) return false;
    }

    return true;
  });

  const activeStoreTables = tables.filter(t => {
    if (activeStore !== 'AllBranches') {
      return t.store_id === activeStore;
    }
    return allowedStoreIds.includes(t.store_id);
  });

  // METRICS CALCULATIONS
  // Today reservations
  const todayReservationsTotal = reservations.filter(r => {
    const todayStr = getLocalDateString(new Date());
    return r.datetime.split('T')[0] === todayStr && (activeStore === 'AllBranches' || r.store_id === activeStore);
  }).length;

  // Tomorrow reservations
  const tomorrowReservationsTotal = reservations.filter(r => {
    const tomorrow = new Date();
    tomorrow.setDate(new Date().getDate() + 1);
    const tomorrowStr = getLocalDateString(tomorrow);
    return r.datetime.split('T')[0] === tomorrowStr && (activeStore === 'AllBranches' || r.store_id === activeStore);
  }).length;

  // Yesterday reservations
  const yesterdayReservationsTotal = reservations.filter(r => {
    const yesterday = new Date();
    yesterday.setDate(new Date().getDate() - 1);
    const yesterdayStr = getLocalDateString(yesterday);
    return r.datetime.split('T')[0] === yesterdayStr && (activeStore === 'AllBranches' || r.store_id === activeStore);
  }).length;

  // Adults counter
  const totalAdults = filteredRes.reduce((sum, r) => sum + (r.adults ?? r.party_size ?? 0), 0);

  // Kids counter
  const totalKids = filteredRes.reduce((sum, r) => sum + (r.kids ?? 0), 0);

  // Total pax: Adults + Kids equals total cover pax!
  const totalPax = totalAdults + totalKids;

  // Walk-ins
  const walkinsCount = filteredRes.filter(r => r.source === 'walk-in' || r.notes?.toLowerCase().includes('walkin')).length;

  // Cancellations
  const cancelledReservations = filteredRes.filter(r => r.status === 'cancelled').length;

  // No-shows
  const noShows = filteredRes.filter(r => r.status === 'no-show').length;

  // Completed
  const completedReservations = filteredRes.filter(r => r.status === 'completed').length;

  // Table diagnostics
  const occupiedTables = activeStoreTables.filter(t => t.status === 'occupied').length;
  const availableTables = activeStoreTables.filter(t => t.status === 'available').length;
  const reservedTables = activeStoreTables.filter(t => t.status === 'reserved').length;
  const cleaningTables = activeStoreTables.filter(t => t.status === 'cleaning').length;
  const billingTables = activeStoreTables.filter(t => t.status === 'billing').length;
  
  // Wait Queue
  const activeWaitQueue = waitlist.filter(w => (activeStore === 'AllBranches' || w.store_id === activeStore) && w.status === 'waiting').length;

  // Table occupancy percentage
  const totalTablesCount = activeStoreTables.length;
  const tableOccupancyPercent = totalTablesCount > 0 
    ? Math.round(((occupiedTables + billingTables) / totalTablesCount) * 100) 
    : 0;

  // CSV Exporter
  const exportCSV = () => {
    const headers = ['ReservationID', 'StoreID', 'GuestName', 'Phone', 'Adults', 'Kids', 'TotalPax', 'Datetime', 'Status', 'Notes'];
    const rows = filteredRes.map(r => [
      r.id,
      r.store_id,
      r.guest_name,
      r.phone,
      r.adults ?? r.party_size ?? 0,
      r.kids ?? 0,
      (r.adults ?? r.party_size ?? 0) + (r.kids ?? 0),
      r.datetime,
      r.status,
      r.notes ?? ''
    ]);

    const csvContent = [headers.join(','), ...rows.map(row => row.map(val => `"${val}"`).join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `TableMaitre_Report_${activeStore}_${getLocalDateString(new Date())}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Branch statistics payload
  const branchData = allowedStores.map(st => {
    return {
      storeId: st.id,
      storeName: st.name,
      bookings: reservations.filter(r => r.store_id === st.id).length,
      capacity: tables.filter(t => t.store_id === st.id).reduce((s, t) => s + t.capacity, 0)
    };
  });

  // Guest nationality breakdown
  const nationalitiesBreakdown: { [key: string]: number } = {};
  guests.forEach(g => {
    if (g.nationality) {
      const nat = g.nationality;
      nationalitiesBreakdown[nat] = (nationalitiesBreakdown[nat] || 0) + 1;
    }
  });
  const nationalityChartData = Object.entries(nationalitiesBreakdown).map(([name, count]) => ({ name, count }));

  // Hourly demand statistics
  const hourlyCounts = Array.from({ length: 12 }).map((_, idx) => {
    const hour = 12 + idx; // 12:00 to 23:00
    const count = filteredRes.filter(r => {
      const hStr = new Date(r.datetime).getHours();
      return hStr === hour;
    }).length;
    return { name: `${hour}h`, load: count };
  });

  return (
    <div className="space-y-6 pb-20 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h2 className="page-title">Restaurant Performance Reports</h2>
          <p className="page-subtitle">Detailed summaries of reservations, tables, and waitlist activity.</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={exportCSV}
            className="bg-slate-900 border border-slate-800 text-slate-400 px-4 py-2 rounded text-[10px] uppercase tracking-widest font-bold hover:text-white transition-all flex items-center gap-2 cursor-pointer shadow-sm"
          >
            <Download size={12} />
            Export CSV
          </button>
          
          <button 
             onClick={fetchTelemetry}
             disabled={loading}
             className="px-4 py-2.5 bg-slate-900 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-white rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 cursor-pointer shadow-xl"
          >
             {loading ? <Loader2 size={12} className="animate-spin" /> : <Activity size={12} />}
             Refresh Reports
          </button>
        </div>
      </div>

      {/* FILTER CONTROL PANEL */}
      <div className="bg-slate-900/40 p-4 border border-slate-800 rounded-xl grid grid-cols-1 md:grid-cols-3 gap-4 backdrop-blur-sm">
        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Active Branch</label>
          <select 
            value={activeStore} 
            onChange={(e) => setActiveStore(e.target.value)}
            className="w-full bg-[#020617] border border-slate-800 rounded px-3 py-1.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-[#3ecf8e]"
          >
            <option value="AllBranches">All Branches (Global Network)</option>
            {allowedStores.map(st => <option key={st.id} value={st.id}>{st.name}</option>)}
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Reservation Status</label>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="w-full bg-[#020617] border border-slate-800 rounded px-3 py-1.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-[#3ecf8e]"
          >
            <option value="All">All Bookings</option>
            <option value="Booked">Booked</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Seated">Seated</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="No-show">No-show</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Date Range</label>
          <div className="flex flex-wrap gap-1">
            {['AllTime', 'Today', 'Tomorrow', 'Yesterday', 'Last7D', 'ThisMonth'].map((timeOpt) => {
              const labelMap: Record<string, string> = {
                AllTime: 'ALL TIME',
                Today: 'TODAY',
                Tomorrow: 'TOMORROW',
                Yesterday: 'YESTERDAY',
                Last7D: 'LAST 7 DAYS',
                ThisMonth: 'THIS MONTH'
              };
              return (
                <button
                  key={timeOpt}
                  onClick={() => setDateFilter(timeOpt)}
                  className={cn(
                    "flex-1 min-w-[70px] py-1.5 border rounded text-[9px] font-bold uppercase tracking-wider font-mono",
                    dateFilter === timeOpt 
                      ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30" 
                      : "bg-[#020617]/50 border-slate-800 text-slate-500 hover:text-slate-350"
                  )}
                >
                  {labelMap[timeOpt] || timeOpt}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-96 flex flex-col items-center justify-center gap-3">
          <Loader2 className="animate-spin text-[#3ecf8e]" size={36} />
          <p className="text-slate-500 font-mono text-xs uppercase tracking-widest">Aggregating reports...</p>
        </div>
      ) : (
        <>
          {/* Reservation Summary Section */}
          <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] border-b border-slate-800 pb-3 flex items-center gap-2">
              <CalendarDays size={14} className="text-[#3ecf8e]" />
              Reservation Summary
            </h3>

            {filteredRes.length === 0 ? (
              <div className="py-12 text-center text-slate-500 bg-[#020617]/50 border border-slate-800/80 border-dashed rounded-xl font-mono text-xs">
                No reservations found for this period.
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  <PerformanceCard label="Total Covers" value={totalPax} icon={Users} color="text-[#3ecf8e]" />
                  <PerformanceCard label="Adult Pax" value={totalAdults} icon={Users} color="text-[#3ecf8e]" />
                  <PerformanceCard label="Kids Pax" value={totalKids} icon={Users} color="text-pink-400" />
                  <PerformanceCard label="Walk-ins" value={walkinsCount} icon={User} color="text-amber-400" />
                  <PerformanceCard label="Cancelled" value={cancelledReservations} icon={XCircle} color="text-red-400" />
                  <PerformanceCard label="No-shows" value={noShows} icon={XCircle} color="text-red-500" />
                  <PerformanceCard label="Completed" value={completedReservations} icon={CheckCircle2} color="text-green-400" />
                  <PerformanceCard label="Today Bookings" value={todayReservationsTotal} icon={Bookmark} color="text-blue-400" />
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  {/* Left Charts - Hourly Reservation Load */}
                  <div className="lg:col-span-2 space-y-8">
                    <div className="glass-card" style={{ padding: 24, height: 380, display: 'flex', flexDirection: 'column' }}>
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" />
                          Hourly Reservation Load
                        </h3>
                        <span className="text-[10px] font-mono font-bold text-slate-500 uppercase">Covers/Hour</span>
                      </div>
                      <div className="flex-1 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={hourlyCounts}>
                            <defs>
                              <linearGradient id="colorLoad" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3ecf8e" stopOpacity={0.25}/>
                                <stop offset="95%" stopColor="#3ecf8e" stopOpacity={0}/>
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                            <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} allowDecimals={false} />
                            <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }} />
                            <Area type="monotone" dataKey="load" stroke="#3ecf8e" fillOpacity={1} fill="url(#colorLoad)" strokeWidth={2} />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  </div>

                  {/* Right Panel - Guest Nationalities Report */}
                  <div className="space-y-8">
                    <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl p-6 shadow-2xl h-[380px] flex flex-col">
                      <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <Globe size={14} className="text-[#3ecf8e]" />
                        Guest Profiles
                      </h3>
                      <div className="flex-1 w-full flex items-center justify-center">
                        {nationalityChartData.length > 0 ? (
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={nationalityChartData}>
                              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                              <XAxis dataKey="name" stroke="#475569" fontSize={10} tickLine={false} />
                              <YAxis stroke="#475569" fontSize={10} tickLine={false} allowDecimals={false} />
                              <Tooltip contentStyle={{ backgroundColor: '#020617', border: '1px solid #1e293b', borderRadius: '8px', fontSize: '10px' }} />
                              <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={20} />
                            </BarChart>
                          </ResponsiveContainer>
                        ) : (
                          <p className="text-[10px] text-slate-500 font-mono uppercase text-center py-8">No guest profile data</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Table Utilization Section */}
          <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] border-b border-slate-800 pb-3 flex items-center gap-2">
              <TrendingUp size={14} className="text-[#3ecf8e]" />
              Table Utilization
            </h3>
            
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <PerformanceCard label="Open Tables" value={availableTables} icon={CheckCircle2} color="text-green-500" />
              <PerformanceCard label="Seated Tables" value={occupiedTables} icon={Bookmark} color="text-[#3ecf8e]" />
              <PerformanceCard label="Reserved Tables" value={reservedTables} icon={Clock} color="text-blue-400" />
              <PerformanceCard label="Billing Tables" value={billingTables} icon={Receipt} color="text-yellow-400" />
              <PerformanceCard label="Cleaning Tables" value={cleaningTables} icon={Brush} color="text-cyan-400" />
            </div>

            <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                  Live Floor Table Occupancy Rate
                </h3>
                <span className="text-[#3ecf8e] font-mono text-xs font-bold">{tableOccupancyPercent}%</span>
              </div>
              <div className="h-2 bg-slate-950 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${tableOccupancyPercent}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-[#3ecf8e] shadow-[0_0_10px_rgba(62,207,142,0.4)]"
                />
              </div>
              <p className="text-[10px] text-slate-500 font-mono uppercase mt-3">
                Active branch has {occupiedTables + billingTables} occupied/billing tables of {totalTablesCount} total tables.
              </p>
            </div>
          </div>

          {/* Wait Queue Summary Section */}
          <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6">
            <h3 className="text-sm font-bold text-white uppercase tracking-[0.2em] border-b border-slate-800 pb-3 flex items-center gap-2">
              <Users size={14} className="text-amber-500" />
              Wait Queue Summary
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-[#020617]/50 border border-slate-800 flex flex-col justify-between min-h-[140px]">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Parties in Queue</p>
                <h3 className="text-3xl font-black text-amber-500">{activeWaitQueue}</h3>
                <p className="text-[9px] font-mono text-slate-600 uppercase mt-2">Active waiting guests</p>
              </div>

              <div className="md:col-span-2 p-6 rounded-2xl bg-[#020617]/50 border border-slate-800 flex flex-col justify-center">
                <p className="text-xs text-slate-400 leading-relaxed font-mono">
                  Waitlist metrics are generated from the active walk-in registry. Seat parties directly from the Waitlist panel to clear queue occupancy.
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
