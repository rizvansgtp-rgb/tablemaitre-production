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
  ChevronDown,
  Timer,
  ChevronLeft,
  ChevronRight,
  Menu,
  RefreshCw
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
  const { profile, signOut, switchStore } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = React.useState(true);
  const [isCollapsed, setIsCollapsed] = React.useState(activeTab === 'floor'); // Auto collapse sidebar on first load of floor view to maximize width
  const [pendingSyncCount, setPendingSyncCount] = React.useState(0);
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [syncMessage, setSyncMessage] = React.useState<string | null>(null);

  // Sync side collapse behavior on floor view load, but allow users to expand/collapse
  React.useEffect(() => {
    if (activeTab === 'floor') {
      setIsCollapsed(true);
    }
  }, [activeTab]);

  React.useEffect(() => {
    const updateQueueCount = () => {
      setPendingSyncCount(getOfflineQueue().length);
    };
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
    setSyncMessage("Transmitting...");
    try {
      const res = await syncOfflineQueue();
      if (res.errors.length > 0) {
        setSyncMessage(`OK: ${res.success}, ERR: ${res.failed}`);
      } else {
        setSyncMessage(`All changes synchronized`);
      }
      setPendingSyncCount(getOfflineQueue().length);
      setTimeout(() => {
        setSyncMessage(null);
      }, 3500);
    } catch (err) {
      console.error(err);
      setSyncMessage("Sync Failed");
    } finally {
      setIsSyncing(false);
    }
  };

  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'floor', icon: Grid2x2, label: 'Floor Plan' },
    { id: 'reservations', icon: CalendarDays, label: 'Reservations' },
    { id: 'waitlist', icon: Timer, label: 'Waitlist' },
    { id: 'guests', icon: UserCircle, label: 'Guests' },
    { id: 'reports', icon: BarChart3, label: 'Reports', roles: ['owner', 'admin', 'manager'] },
    { id: 'staff', icon: Users, label: 'Staff', roles: ['owner', 'admin', 'manager'] },
    { id: 'hq', icon: Store, label: 'HQ View', roles: ['owner', 'admin', 'manager'] },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const filteredNav = navItems.filter(item => !item.roles || item.roles.includes(profile?.role || 'waiter'));

  return (
    <div className="flex h-screen bg-[#020617] text-slate-300 overflow-hidden selection:bg-[#3ecf8e]/30">
      {/* Sidebar */}
      <aside className={cn(
        "bg-[#0f172a]/50 border-r border-slate-800 flex flex-col z-20 transition-all duration-300",
        !isSidebarOpen ? "w-0 border-r-0 opacity-0 overflow-hidden" : isCollapsed ? "w-20" : "w-64"
      )}>
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-[#3ecf8e] rounded-lg flex items-center justify-center shadow-[0_0_15px_rgba(62,207,142,0.4)] text-[#020617] font-bold shrink-0">
                TM
              </div>
              {!isCollapsed && (
                <span className="font-bold text-white tracking-tight animate-fade-in truncate">TableMaître</span>
              )}
            </div>
            
            {!isCollapsed && (
              <button 
                onClick={() => setIsCollapsed(true)}
                className="p-1 rounded text-slate-500 hover:text-white hover:bg-slate-800 transition-all"
                title="Collapse Menu"
              >
                <ChevronLeft size={16} />
              </button>
            )}
          </div>
        </div>

        <nav className="flex-1 px-4 space-y-1">
          {!isCollapsed && (
            <div className="text-[10px] uppercase tracking-[0.2em] text-slate-500 font-semibold mb-4 ml-2 animate-fade-in">Navigation</div>
          )}
          {filteredNav.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-all group border",
                activeTab === item.id 
                  ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/20" 
                  : "text-slate-400 hover:text-white border-transparent hover:bg-slate-800/50",
                isCollapsed && "justify-center px-1"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <item.icon size={18} className={cn("transition-colors shrink-0", activeTab === item.id ? "text-[#3ecf8e]" : "text-slate-500 group-hover:text-slate-300")} />
              {!isCollapsed && (
                <span className="truncate">{item.label}</span>
              )}
              {!isCollapsed && activeTab === item.id && (
                 <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#3ecf8e] shadow-[0_0_8px_#3ecf8e]" />
              )}
            </button>
          ))}
        </nav>

        <div className="p-4 mt-auto border-t border-slate-800">
          <div className="bg-slate-900/50 rounded-xl p-3 border border-slate-800">
            {isCollapsed ? (
              <div className="flex flex-col items-center gap-4">
                <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[#3ecf8e]" title={profile?.email || 'Profile'}>
                  <UserCircle size={18} />
                </div>
                <button 
                  onClick={() => signOut()}
                  className="text-slate-600 hover:text-red-450 transition-colors"
                  title="Sign Out"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[10px] text-slate-500 uppercase tracking-widest font-semibold font-mono">Profile Status</span>
                  <span className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse"></span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-[#3ecf8e]">
                    <UserCircle size={18} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-mono text-white truncate tracking-tight">{profile?.email?.split('@')[0] || 'User'}</p>
                    <p className="text-[9px] text-[#3ecf8e] font-bold uppercase tracking-wider">{profile?.role || 'Guest'}</p>
                  </div>
                  <button 
                    onClick={() => signOut()}
                    className="text-slate-600 hover:text-red-400 transition-colors"
                    title="Sign Out"
                  >
                    <LogOut size={14} />
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col relative overflow-hidden">
        {/* Background Glow Effect */}
        <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#3ecf8e]/5 rounded-full blur-[120px] pointer-events-none" />

        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-[#020617]/80 backdrop-blur-md z-10 sticky top-0">
          <div className="flex items-center gap-3 text-sm animate-fade-in">
            <button 
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all mr-1 flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-sm hover:border-slate-700"
              title={isSidebarOpen ? "Hide Sidebar" : "Show Sidebar"}
            >
              <Menu size={14} />
            </button>
            
            {isSidebarOpen && (
              <button 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="p-1.5 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all mr-2 flex items-center justify-center cursor-pointer hover:bg-slate-800 shadow-sm hover:border-slate-700"
                title={isCollapsed ? "Expand Sidebar Menu" : "Collapse Sidebar Menu"}
              >
                {isCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
              </button>
            )}
            
            <span className="text-slate-500">Workspace</span>
            <span className="text-slate-700">/</span>
            {profile && profile.assigned_stores && profile.assigned_stores.length > 1 ? (
              <select
                value={profile.active_store || ''}
                onChange={(e) => switchStore(e.target.value)}
                className="bg-[#0f172a] border border-slate-800 rounded px-2 py-0.5 text-xs text-white uppercase font-mono tracking-wider focus:outline-none focus:border-[#3ecf8e] cursor-pointer"
                id="active-store-select"
              >
                {profile.assigned_stores.map((storeId) => (
                  <option key={storeId} value={storeId}>
                    Store {storeId}
                  </option>
                ))}
              </select>
            ) : (
              <span className="text-slate-500">Store {profile?.active_store}</span>
            )}
            <span className="text-slate-700">/</span>
            <span className="text-white font-medium capitalize">{activeTab}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative w-64 group flex items-center">
              <Search size={14} className="absolute left-3 text-slate-500 group-focus-within:text-[#3ecf8e] transition-colors" />
              <input 
                type="text" 
                placeholder="Quick search..." 
                className="w-full bg-[#0f172a]/50 border border-slate-800 rounded-lg pl-9 pr-4 py-1.5 text-xs text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all"
              />
            </div>

            {pendingSyncCount > 0 && (
              <button 
                onClick={handleManualSync}
                disabled={isSyncing}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-500 rounded-lg text-[9px] font-bold uppercase tracking-widest hover:bg-amber-500 hover:text-slate-950 transition-all cursor-pointer shadow-[0_0_15px_rgba(245,158,11,0.1)]"
                title="Pending offline modifications"
              >
                <RefreshCw size={10} className={cn("shrink-0", isSyncing && "animate-spin")} />
                {isSyncing ? "Syncing..." : `Sync Now (${pendingSyncCount})`}
              </button>
            )}
            
            {syncMessage && (
              <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-tighter bg-emerald-500/10 px-2.5 py-1 rounded border border-emerald-500/20">{syncMessage}</span>
            )}

            <button className="relative w-8 h-8 flex items-center justify-center bg-[#0f172a]/50 border border-slate-800 rounded-lg hover:border-slate-700 transition-all group">
              <Bell size={16} className="text-slate-400 group-hover:text-white" />
              <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-[#3ecf8e] rounded-full shadow-[0_0_5px_#3ecf8e]" />
            </button>
            
            <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-white uppercase overflow-hidden">
               {profile?.email?.charAt(0) || '?'}
            </div>
          </div>
        </header>

        {/* Dynamic Content - Full-page optimized layout layout wrapper */}
        <div className={cn(
          "flex-1 relative transition-all duration-300", 
          activeTab === 'floor' ? "p-0 overflow-hidden h-full flex flex-col" : "p-8 overflow-y-auto"
        )}>
          {children}
        </div>
      </main>
    </div>
  );
}
