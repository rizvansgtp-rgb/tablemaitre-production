import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  Grid2x2,
  CalendarDays,
  Users,
  UserCircle,
  BarChart3,
  Settings,
  LogOut,
  Bell,
  Search,
  Store,
  ChevronLeft,
  ChevronRight,
  Menu,
  RefreshCw,
  Timer,
} from 'lucide-react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';
import { getOfflineQueue, syncOfflineQueue } from '../lib/offlineQueue';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { profile, signOut, switchStore, stores } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isCollapsed, setIsCollapsed] = React.useState(activeTab === 'floor');
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (activeTab === 'floor') setIsCollapsed(true);
  }, [activeTab]);

  React.useEffect(() => {
    const updateQueueCount = () => setPendingSyncCount(getOfflineQueue().length);
    updateQueueCount();
    window.addEventListener('storage', updateQueueCount);
    const interval = setInterval(updateQueueCount, 3000);
    return () => {
      window.removeEventListener('storage', updateQueueCount);
      clearInterval(interval);
    };
  }, []);

  const handleManualSync = async () => {
    if (isSyncing) return;
    setIsSyncing(true);
    setSyncMessage('Transmitting...');
    try {
      const res = await syncOfflineQueue();
      setSyncMessage(res.errors.length > 0 ? `OK: ${res.success}, ERR: ${res.failed}` : 'All changes synchronized');
      setPendingSyncCount(getOfflineQueue().length);
      setTimeout(() => setSyncMessage(null), 3500);
    } catch (err) {
      console.error(err);
      setSyncMessage('Sync Failed');
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: 'dashboard',    icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'floor',        icon: Grid2x2,         label: 'Floor Plan' },
    { id: 'reservations', icon: CalendarDays,     label: 'Reservations' },
    { id: 'waitlist',     icon: Timer,            label: 'Wait Queue' },
    { id: 'guests',       icon: UserCircle,       label: 'Guests' },
    { id: 'reports',      icon: BarChart3,        label: 'Reports',              roles: ['owner', 'admin', 'manager'] },
    { id: 'staff',        icon: Users,            label: 'Staff Management',     roles: ['owner', 'admin', 'manager'] },
    { id: 'hq',           icon: Store,            label: 'Operations Dashboard', roles: ['owner', 'admin', 'manager'] },
    { id: 'settings',     icon: Settings,         label: 'Settings' },
  ];

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(profile?.role || 'waiter'));

  const userInitial = profile?.email?.charAt(0)?.toUpperCase() || '?';
  const activeStoreName = (() => {
    const dbStore = stores.find(s => s.id === profile?.active_store);
    return dbStore ? dbStore.name : `Store ${profile?.active_store || '—'}`;
  })();

  const currentTab = navItems.find(item => item.id === activeTab)?.label || activeTab;

  return (
    <div className="flex h-screen overflow-hidden" style={{ background: 'var(--bg-deep)', color: 'var(--text-primary)' }}>

      {/* ── SIDEBAR ──────────────────────────────────────────────── */}
      <aside
        className="flex flex-col z-20 transition-all duration-300 relative flex-shrink-0"
        style={{
          width: !isSidebarOpen ? 0 : isCollapsed ? 72 : 240,
          opacity: !isSidebarOpen ? 0 : 1,
          overflow: !isSidebarOpen ? 'hidden' : 'visible',
          background: 'var(--glass-2)',
          backdropFilter: 'blur(20px) saturate(1.4)',
          WebkitBackdropFilter: 'blur(20px) saturate(1.4)',
          borderRight: '1px solid var(--border-subtle)',
        }}
      >
        {/* Sidebar inner glow top */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0, height: 1,
          background: 'linear-gradient(90deg, transparent, rgba(62,207,142,0.15), transparent)',
          pointerEvents: 'none'
        }} />

        {/* Logo / Header */}
        <div style={{ padding: '20px 16px 16px' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="flex items-center justify-center font-bold text-sm flex-shrink-0"
                style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: 'linear-gradient(135deg, #3ecf8e 0%, #059669 100%)',
                  color: '#040d18',
                  boxShadow: '0 0 16px rgba(62,207,142,0.30), 0 2px 8px rgba(0,0,0,0.40)',
                }}
              >
                TM
              </div>
              {!isCollapsed && (
                <motion.div
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="min-w-0"
                >
                  <p className="font-bold text-sm truncate" style={{ color: 'var(--text-primary)', letterSpacing: '-0.02em' }}>
                    TableMaître
                  </p>
                  <p className="text-[9px] uppercase tracking-[0.18em]" style={{ color: 'var(--text-muted)' }}>
                    Operations
                  </p>
                </motion.div>
              )}
            </div>
            {!isCollapsed && (
              <button
                onClick={() => setIsCollapsed(true)}
                className="btn-icon"
                title="Collapse Sidebar"
              >
                <ChevronLeft size={14} />
              </button>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && (
            <div style={{
              fontSize: 9, fontWeight: 700, letterSpacing: '0.20em', textTransform: 'uppercase',
              color: 'var(--text-muted)', padding: '8px 8px 10px', display: 'block'
            }}>
              Navigation
            </div>
          )}

          {filteredNav.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                title={isCollapsed ? item.label : undefined}
                className="w-full flex items-center rounded-[10px] transition-all duration-150"
                style={{
                  gap: isCollapsed ? 0 : 10,
                  padding: isCollapsed ? '10px 0' : '9px 12px',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  fontSize: 13,
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? 'var(--color-emerald)' : 'var(--text-muted)',
                  background: isActive ? 'rgba(62,207,142,0.09)' : 'transparent',
                  border: `1px solid ${isActive ? 'rgba(62,207,142,0.18)' : 'transparent'}`,
                  fontFamily: 'inherit',
                  cursor: 'pointer',
                  textAlign: 'left',
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-secondary)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)';
                  }
                }}
              >
                <item.icon
                  size={16}
                  className="flex-shrink-0"
                  style={{
                    color: isActive ? 'var(--color-emerald)' : 'var(--text-muted)',
                    filter: isActive ? 'drop-shadow(0 0 6px rgba(62,207,142,0.50))' : 'none',
                    transition: 'all 150ms'
                  }}
                />
                {!isCollapsed && (
                  <span className="truncate flex-1">{item.label}</span>
                )}
                {!isCollapsed && isActive && (
                  <div style={{
                    width: 5, height: 5, borderRadius: '50%',
                    background: 'var(--color-emerald)',
                    boxShadow: '0 0 8px var(--color-emerald)',
                    flexShrink: 0
                  }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Bottom Profile Card */}
        <div style={{ padding: '12px 12px 16px', borderTop: '1px solid var(--border-subtle)' }}>
          <div
            style={{
              background: 'var(--bg-deep)',
              borderRadius: 12,
              padding: isCollapsed ? '12px 8px' : '12px 14px',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--neu-in)',
            }}
          >
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-3">
                <div
                  style={{
                    width: 32, height: 32, borderRadius: '50%',
                    background: 'rgba(62,207,142,0.12)',
                    border: '1px solid rgba(62,207,142,0.25)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: 'var(--color-emerald)',
                  }}
                  title={profile?.email || 'Profile'}
                >
                  {userInitial}
                </div>
                <button
                  onClick={() => signOut()}
                  title="Sign Out"
                  style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: 0, display: 'flex' }}
                  onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#f43f5e'}
                  onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', color: 'var(--text-muted)' }}>
                    Profile
                  </span>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: 'var(--color-emerald)',
                    boxShadow: '0 0 6px var(--color-emerald)',
                    display: 'inline-block',
                    animation: 'pulse 2s infinite'
                  }} />
                </div>
                <div className="flex items-center gap-2.5">
                  <div
                    style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: 'rgba(62,207,142,0.12)',
                      border: '1px solid rgba(62,207,142,0.25)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 13, fontWeight: 700, color: 'var(--color-emerald)',
                      flexShrink: 0,
                    }}
                  >
                    {userInitial}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', letterSpacing: '-0.02em' }} className="truncate">
                      {profile?.email?.split('@')[0] || 'User'}
                    </p>
                    <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--color-emerald)' }}>
                      {profile?.role || 'Guest'}
                    </p>
                  </div>
                  <button
                    onClick={() => signOut()}
                    title="Sign Out"
                    style={{ color: 'var(--text-muted)', cursor: 'pointer', background: 'none', border: 'none', padding: '4px', display: 'flex', borderRadius: 6 }}
                    onMouseEnter={(e) => (e.currentTarget as HTMLElement).style.color = '#f43f5e'}
                    onMouseLeave={(e) => (e.currentTarget as HTMLElement).style.color = 'var(--text-muted)'}
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* ── MAIN CONTENT ─────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative overflow-hidden">

        {/* Ambient orbs */}
        <div className="bg-orb bg-orb-emerald animate-orb-1"
          style={{ width: 600, height: 600, top: '-30%', right: '-20%', opacity: 0.6, zIndex: 0 }} />
        <div className="bg-orb bg-orb-indigo animate-orb-2"
          style={{ width: 500, height: 500, bottom: '-30%', left: '-15%', opacity: 0.5, zIndex: 0 }} />

        {/* ── HEADER ─────────────────────────────────────────────── */}
        <header
          className="flex items-center justify-between px-6 sticky top-0 z-10"
          style={{
            height: 60,
            background: 'rgba(7, 17, 31, 0.82)',
            backdropFilter: 'blur(20px) saturate(1.5)',
            WebkitBackdropFilter: 'blur(20px) saturate(1.5)',
            borderBottom: '1px solid var(--border-subtle)',
          }}
        >
          {/* Left: Breadcrumb + Controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="btn-icon"
              title={isSidebarOpen ? 'Hide Sidebar' : 'Show Sidebar'}
            >
              <Menu size={14} />
            </button>

            {isSidebarOpen && (
              <button
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="btn-icon"
                title={isCollapsed ? 'Expand Menu' : 'Collapse Menu'}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            )}

            <div className="flex items-center gap-1.5 ml-1" style={{ fontSize: 12 }}>
              <span style={{ color: 'var(--text-muted)' }}>Restaurant</span>
              <span style={{ color: 'var(--border-mid)' }}>/</span>

              {profile && profile.assigned_stores && profile.assigned_stores.length > 1 ? (
                <select
                  value={profile.active_store || ''}
                  onChange={(e) => switchStore(e.target.value)}
                  id="active-store-select"
                  style={{
                    background: 'rgba(0,0,0,0.40)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 7,
                    padding: '2px 8px',
                    fontSize: 11,
                    color: 'var(--text-primary)',
                    textTransform: 'uppercase',
                    fontFamily: 'var(--font-mono)',
                    letterSpacing: '0.08em',
                    outline: 'none',
                    cursor: 'pointer',
                  }}
                  onFocus={(e) => (e.currentTarget.style.borderColor = 'rgba(62,207,142,0.4)')}
                  onBlur={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
                >
                  {profile.assigned_stores
                    .filter(storeId => {
                      const isSpecial = storeId !== '0301' && storeId !== '0302';
                      return isSpecial ? stores.some(s => s.id === storeId) : true;
                    })
                    .map(storeId => {
                      const dbStore = stores.find(s => s.id === storeId);
                      return (
                        <option key={storeId} value={storeId} style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>
                          {dbStore ? dbStore.name : `Store ${storeId}`}
                        </option>
                      );
                    })}
                </select>
              ) : (
                <span style={{ color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  {activeStoreName}
                </span>
              )}

              <span style={{ color: 'var(--border-mid)' }}>/</span>
              <span style={{ color: 'var(--color-emerald)', fontWeight: 600 }}>{currentTab}</span>
            </div>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-3">
            {/* Search */}
            <div className="relative flex items-center" style={{ width: 220 }}>
              <Search size={13} style={{ position: 'absolute', left: 10, color: 'var(--text-muted)', pointerEvents: 'none' }} />
              <input
                type="text"
                placeholder="Quick search..."
                className="input-glass"
                style={{ paddingLeft: 32, paddingTop: 7, paddingBottom: 7, fontSize: 12 }}
              />
            </div>

            {/* Offline Sync Badge */}
            {pendingSyncCount > 0 && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5"
                style={{
                  padding: '5px 10px',
                  background: 'rgba(245,158,11,0.10)',
                  border: '1px solid rgba(245,158,11,0.25)',
                  borderRadius: 8,
                  color: '#f59e0b',
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: '0.10em',
                  textTransform: 'uppercase',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all 150ms',
                }}
                title="Pending offline changes"
              >
                <RefreshCw size={10} className={cn('flex-shrink-0', isSyncing && 'animate-spin')} />
                {isSyncing ? 'Syncing...' : `Sync (${pendingSyncCount})`}
              </button>
            )}

            {syncMessage && (
              <span style={{
                fontSize: 10, fontFamily: 'var(--font-mono)', color: '#6ee7b7',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                background: 'rgba(62,207,142,0.08)',
                border: '1px solid rgba(62,207,142,0.18)',
                padding: '4px 10px', borderRadius: 7,
              }}>
                {syncMessage}
              </span>
            )}

            {/* Notifications */}
            <button
              className="btn-icon relative"
              style={{ width: 34, height: 34 }}
            >
              <Bell size={15} />
              <div style={{
                position: 'absolute', top: 7, right: 7, width: 6, height: 6,
                borderRadius: '50%', background: 'var(--color-emerald)',
                boxShadow: '0 0 6px var(--color-emerald)'
              }} />
            </button>

            {/* Avatar */}
            <div
              style={{
                width: 32, height: 32, borderRadius: '50%',
                background: 'rgba(62,207,142,0.12)',
                border: '1px solid rgba(62,207,142,0.25)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 12, fontWeight: 700, color: 'var(--color-emerald)',
              }}
            >
              {userInitial}
            </div>
          </div>
        </header>

        {/* ── PAGE CONTENT ──────────────────────────────────────── */}
        <div
          className="flex-1 relative transition-all duration-300"
          style={activeTab === 'floor'
            ? { padding: 0, overflow: 'hidden', height: '100%', display: 'flex', flexDirection: 'column' }
            : { padding: '28px 32px', overflowY: 'auto' }
          }
        >
          <div style={{ position: 'relative', zIndex: 1 }}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
