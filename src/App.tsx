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
    <div className="glass-card-accent" style={{ padding: 22, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 12, right: 12, opacity: 0.07, pointerEvents: 'none' }}>
        <Sparkles size={48} style={{ color: 'var(--color-emerald)' }} />
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <div style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.20)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <TrendingUp size={14} style={{ color: 'var(--color-emerald)' }} />
        </div>
        <h4 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)' }}>
          AI Strategic Insights
        </h4>
      </div>
      <div style={{ minHeight: 60, display: 'flex', flexDirection: 'column', justifyContent: 'center', marginBottom: 14 }}>
        {loading ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', fontSize: 11 }}>
            <Loader2 className="animate-spin" size={13} />
            Analyzing realtime data...
          </div>
        ) : error ? (
          <div className="alert-danger" style={{ padding: '10px 12px' }}>
            <p style={{ fontSize: 11 }}>{error}</p>
          </div>
        ) : insight ? (
          <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ fontSize: 12, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
            {insight}
          </motion.p>
        ) : (
          <p style={{ fontSize: 12, color: 'var(--text-muted)', lineHeight: 1.7, fontFamily: 'var(--font-mono)' }}>
            Aggregate demand exceeds capacity limits. Recommendation: Add more tables.
          </p>
        )}
      </div>
      <button onClick={generateInsight} disabled={loading} className="btn-ghost w-full" style={{ fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase', borderColor: 'rgba(62,207,142,0.18)', color: 'var(--color-emerald)' }}>
        {loading ? 'Processing...' : 'Generate Optimization Plan'}
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
    { label: 'Open Tables',     value: statsData.available.value, total: statsData.available.total, icon: CheckCircle2, accent: '#3ecf8e', accentDim: 'rgba(62,207,142,0.12)',  barColor: '#3ecf8e' },
    { label: 'Seated Tables',  value: statsData.occupied.value,  total: statsData.occupied.total,  icon: Users,        accent: '#f43f5e', accentDim: 'rgba(244,63,94,0.12)',   barColor: '#f43f5e' },
    { label: 'Reserved Tables',value: statsData.reserved.value,  total: statsData.reserved.total,  icon: Clock,        accent: '#f59e0b', accentDim: 'rgba(245,158,11,0.12)', barColor: '#f59e0b' },
    { label: 'Billing Tables', value: statsData.billing.value,   total: statsData.billing.total,   icon: Receipt,      accent: '#8b5cf6', accentDim: 'rgba(139,92,246,0.12)',  barColor: '#8b5cf6' },
    { label: 'Cleaning Tables',value: statsData.cleaning.value,  total: statsData.cleaning.total,  icon: Brush,        accent: '#06b6d4', accentDim: 'rgba(6,182,212,0.12)',   barColor: '#06b6d4' },
    { label: 'Wait Queue',     value: statsData.waitlist.value,  total: statsData.waitlist.total,  icon: AlertCircle,  accent: '#6366f1', accentDim: 'rgba(99,102,241,0.12)',  barColor: '#6366f1' },
  ];

  const storeContext = {
    storeId: profile?.active_store,
    occupancy: statsData.occupied.value,
    totalTables: statsData.available.total,
    waitlist: statsData.waitlist.value,
    sections: sectionsOccupancy.map(s => s.name)
  };

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* Dashboard Header */}
      <div className="flex items-end justify-between" style={{ marginBottom: 28 }}>
        <div>
          <div className="page-header" style={{ marginBottom: 0 }}>
            <h2 className="page-title" style={{ fontSize: 26 }}>Executive Overview</h2>
            <p className="page-subtitle">Live restaurant network metrics and store operations.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="chip" style={{ fontFamily: 'var(--font-mono)' }}>Store: {profile?.active_store || 'N/A'}</span>
          <span className="chip" style={{ fontFamily: 'var(--font-mono)' }}>Dinner Shift</span>
          <span style={{
            padding: '4px 12px', borderRadius: 8, fontSize: 10, fontWeight: 700,
            fontFamily: 'var(--font-mono)', textTransform: 'uppercase', letterSpacing: '0.12em',
            background: 'rgba(62,207,142,0.10)', border: '1px solid rgba(62,207,142,0.20)', color: 'var(--color-emerald)'
          }}>
            ● Live
          </span>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4" style={{ marginBottom: 28 }}>
        {stats.map((stat, i) => (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.07 }}
            key={stat.label}
            className="stat-card"
          >
            {/* Top accent bar */}
            <div className="stat-card-accent-bar" style={{ background: `linear-gradient(90deg, ${stat.accent}, ${stat.accent}88)` }} />

            <div className="flex items-start justify-between" style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-muted)', lineHeight: 1.3 }}>
                {stat.label}
              </div>
              <div className="stat-icon" style={{ background: stat.accentDim, width: 28, height: 28, borderRadius: 8 }}>
                <stat.icon size={14} style={{ color: stat.accent }} />
              </div>
            </div>

            <div className="flex items-baseline justify-between" style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', color: stat.accent, lineHeight: 1 }}>
                {stat.value}
              </div>
              <div style={{ fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                /{stat.total}
              </div>
            </div>

            <div className="progress-track">
              <motion.div
                className="progress-fill"
                initial={{ width: 0 }}
                animate={{ width: stat.total > 0 ? `${Math.min(100, (stat.value / stat.total) * 100)}%` : '0%' }}
                transition={{ delay: i * 0.07 + 0.2, duration: 0.7 }}
                style={{
                  background: `linear-gradient(90deg, ${stat.barColor}, ${stat.barColor}cc)`,
                  boxShadow: `0 0 8px ${stat.barColor}55`
                }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Charts column */}
        <div className="xl:col-span-2" style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Hourly Occupancy Chart */}
          <div className="glass-card" style={{ padding: 24, height: 340, display: 'flex', flexDirection: 'column' }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--color-emerald)', display: 'inline-block', boxShadow: '0 0 8px var(--color-emerald)' }} />
                Hourly Occupancy
              </h3>
              <div className="flex gap-1.5">
                <button style={{ padding: '3px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: 'rgba(62,207,142,0.12)', border: '1px solid rgba(62,207,142,0.22)', color: 'var(--color-emerald)', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>6HR</button>
                <button style={{ padding: '3px 10px', borderRadius: 6, fontSize: 9, fontWeight: 700, background: 'transparent', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)', cursor: 'pointer', fontFamily: 'var(--font-mono)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>12HR</button>
              </div>
            </div>
            <div style={{ flex: 1, display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', padding: '0 8px 8px', gap: 6 }}>
              {[40, 60, 80, 70, 90, 50, 40, 20, 60, 95, 80, 50].map((h, i) => (
                <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, flex: 1, position: 'relative' }}
                  className="group"
                >
                  <motion.div
                    initial={{ height: 0 }}
                    animate={{ height: `${h}%` }}
                    transition={{ delay: i * 0.05 + 0.3, duration: 0.6 }}
                    style={{
                      width: '100%', maxWidth: 16, borderRadius: 4,
                      background: h > 80
                        ? 'linear-gradient(180deg, #3ecf8e, #059669)'
                        : h > 50
                          ? 'linear-gradient(180deg, rgba(62,207,142,0.55), rgba(62,207,142,0.30))'
                          : 'rgba(255,255,255,0.05)',
                      boxShadow: h > 80 ? '0 0 12px rgba(62,207,142,0.30)' : 'none',
                    }}
                  />
                  <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>{12 + i}h</span>
                </div>
              ))}
            </div>
          </div>

          {/* Section Occupancy */}
          <div className="glass-card" style={{ padding: 24 }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b', display: 'inline-block', boxShadow: '0 0 8px #f59e0b' }} />
                Section Occupancy
              </h3>
              <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.12em', background: 'rgba(62,207,142,0.10)', border: '1px solid rgba(62,207,142,0.18)', color: 'var(--color-emerald)' }}>
                Real-time
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {sectionsOccupancy.map((section) => (
                <div key={section.name}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)' }}>{section.name}</span>
                    <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
                      <span style={{ fontSize: 10, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{section.seats} seats</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: section.percentage > 80 ? '#3ecf8e' : 'var(--text-secondary)' }}>{section.percentage}%</span>
                    </div>
                  </div>
                  <div className="progress-track">
                    <motion.div
                      className="progress-fill"
                      initial={{ width: 0 }}
                      animate={{ width: `${section.percentage}%` }}
                      transition={{ duration: 0.8 }}
                      style={{
                        background: section.percentage > 80
                          ? 'linear-gradient(90deg, #3ecf8e, #059669)'
                          : 'linear-gradient(90deg, rgba(62,207,142,0.50), rgba(62,207,142,0.30))',
                        boxShadow: section.percentage > 80 ? '0 0 10px rgba(62,207,142,0.30)' : 'none',
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right column: Feed + AI */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          {/* Operation Feed */}
          <div className="glass-card" style={{ padding: 22, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Clock size={14} style={{ color: 'var(--color-emerald)' }} />
              <h3 style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-secondary)' }}>
                Operation Feed
              </h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {feedActivities.map((act, i) => (
                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.08 }}
                  key={act.id}
                  className="data-row"
                  style={{ cursor: 'pointer' }}
                >
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: 'var(--bg-deep)', border: '1px solid var(--border-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                  }}>
                    <act.icon size={13} style={{ color: act.color.includes('blue') ? '#60a5fa' : act.color.includes('amber') ? '#f59e0b' : act.color.includes('green') ? '#22c55e' : 'var(--color-emerald)' }} />
                  </div>
                  <div style={{ minWidth: 0, flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.guest}</span>
                      <span style={{ fontSize: 9, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)', flexShrink: 0 }}>{act.time}</span>
                    </div>
                    <p style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{act.desc}</p>
                  </div>
                </motion.div>
              ))}
              <button className="btn-ghost w-full" style={{ marginTop: 10, fontSize: 10, letterSpacing: '0.10em', textTransform: 'uppercase' }}>
                View All Logs
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
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      textAlign: 'center', padding: 48, border: '1px dashed var(--border-subtle)', borderRadius: 20,
      background: 'rgba(7,17,31,0.40)'
    }}>
      <div style={{
        width: 64, height: 64, borderRadius: 18, marginBottom: 20,
        background: 'rgba(62,207,142,0.08)', border: '1px solid rgba(62,207,142,0.15)',
        display: 'flex', alignItems: 'center', justifyContent: 'center'
      }}>
        <BarChart size={30} style={{ color: 'var(--color-emerald)', opacity: 0.7 }} />
      </div>
      <h2 style={{ fontSize: 22, fontWeight: 700, letterSpacing: '-0.03em', marginBottom: 10 }}>{name} Module</h2>
      <p style={{ maxWidth: 360, color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 28 }}>
        This component is being initialized for your live Supabase environment.
        Stay tuned for real-time guest tracking and inventory integration.
      </p>
      <button className="btn-primary" style={{ textTransform: 'uppercase', letterSpacing: '0.10em' }}>
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
      <div style={{ minHeight: '100vh', background: 'var(--bg-deep)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20 }}>
        <div style={{
          width: 56, height: 56, borderRadius: 16,
          background: 'linear-gradient(135deg, #3ecf8e 0%, #059669 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#040d18', fontWeight: 700, fontSize: 20,
          boxShadow: '0 0 32px rgba(62,207,142,0.35), 0 4px 16px rgba(0,0,0,0.4)',
        }}>
          TM
        </div>
        <div style={{ width: 40, height: 40, border: '2px solid rgba(62,207,142,0.12)', borderTop: '2px solid #3ecf8e', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
        <p style={{ color: 'var(--color-emerald)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em', fontSize: 10 }}>Initializing TableMaître Suite</p>
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
        <div style={{
          height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: 48, textAlign: 'center', border: '1px dashed rgba(244,63,94,0.20)',
          borderRadius: 20, background: 'rgba(244,63,94,0.03)'
        }}>
          <div style={{
            width: 60, height: 60, borderRadius: '50%', marginBottom: 20,
            background: 'rgba(244,63,94,0.10)', border: '1px solid rgba(244,63,94,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 20px rgba(244,63,94,0.15)'
          }}>
            <AlertCircle size={26} style={{ color: '#f43f5e' }} />
          </div>
          <h3 style={{ fontSize: 13, fontWeight: 800, letterSpacing: '0.16em', textTransform: 'uppercase', color: '#f43f5e', fontFamily: 'var(--font-mono)', marginBottom: 10 }}>
            Access Denied
          </h3>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 320, lineHeight: 1.6 }}>
            Your role <strong style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>({profile?.role})</strong> does not have permission to access this panel. Contact your manager or owner.
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
