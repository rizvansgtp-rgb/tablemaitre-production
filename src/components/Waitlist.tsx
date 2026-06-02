import React, { useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Timer, 
  Plus, 
  Users, 
  Phone, 
  Trash2, 
  UserCircle, 
  Clock,
  ArrowRight,
  ChevronRight,
  AlertCircle,
  X,
  Edit3
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { WaitlistEntry, Table } from '../types';
import { cn } from '../lib/utils';
import { formatDistanceToNow } from 'date-fns';

export default function Waitlist() {
  const { profile } = useAuth();
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Add/Edit modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<WaitlistEntry | null>(null);
  const [guestName, setGuestName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [notes, setNotes] = useState('');

  // Seating modal state
  const [seatingEntry, setSeatingEntry] = useState<WaitlistEntry | null>(null);
  const [availableTables, setAvailableTables] = useState<Table[]>([]);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [loadingTables, setLoadingTables] = useState(false);

  useEffect(() => {
    if (profile?.active_store) {
      fetchWaitlist();
    }
  }, [profile?.active_store]);

  async function fetchWaitlist() {
    setLoading(true);
    try {
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('waitlist')
          .select('*')
          .eq('store_id', profile?.active_store)
          .eq('status', 'waiting')
          .order('created_at', { ascending: true });

        if (error) throw error;
        
        setEntries((data || []) as WaitlistEntry[]);
      } else {
        const local = localStorage.getItem('table_maitre_waitlist');
        if (local) {
          const parsed = JSON.parse(local);
          setEntries(parsed.filter((w: any) => w.store_id === profile?.active_store && w.status === 'waiting'));
        } else {
          setEntries(getDemoWaitlist());
        }
      }
    } catch (err) {
      console.error('Error fetching waitlist:', err);
    } finally {
      setLoading(false);
    }
  }

  function getDemoWaitlist(): WaitlistEntry[] {
    return [
      { id: 'w1', store_id: '0301', guest_name: 'James C.', phone: '555-0101', party_size: 2, status: 'waiting', created_at: new Date(Date.now() - 1000 * 60 * 25).toISOString(), notes: 'Window seat preference' },
      { id: 'w2', store_id: '0301', guest_name: 'Elena R.', phone: '555-0202', party_size: 4, status: 'waiting', created_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), notes: 'Birthday celebration' },
      { id: 'w3', store_id: '0301', guest_name: 'Marcus V.', phone: '555-0303', party_size: 2, status: 'waiting', created_at: new Date(Date.now() - 1000 * 60 * 5).toISOString(), notes: '' },
    ];
  }

  const handleAddClick = () => {
    setEditingEntry(null);
    setGuestName('');
    setPhone('');
    setPartySize(2);
    setNotes('');
    setIsModalOpen(true);
  };

  const handleEditClick = (entry: WaitlistEntry) => {
    setEditingEntry(entry);
    setGuestName(entry.guest_name);
    setPhone(entry.phone);
    setPartySize(entry.party_size);
    setNotes(entry.notes || '');
    setIsModalOpen(true);
  };

  const handleSubmitWaitlist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!guestName || !phone) return;

    const payload: any = {
      store_id: profile?.active_store || '0301',
      guest_name: guestName,
      phone,
      party_size: partySize,
      status: 'waiting',
      notes: notes || null
    };

    if (editingEntry) {
      // Edit Mode
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('waitlist')
            .update(payload)
            .eq('id', editingEntry.id)
            .select()
            .single();

          if (error) throw error;
          
          setEntries(prev => prev.map(w => w.id === editingEntry.id ? { ...w, ...payload } : w));
        } catch (err: any) {
          console.error("Failed to update wait queue entry:", err);
          alert(`Failed to update wait queue: ${err.message || err}`);
        }
      } else {
        const local = localStorage.getItem('table_maitre_waitlist');
        if (local) {
          const parsed = JSON.parse(local);
          const updated = parsed.map((w: any) => w.id === editingEntry.id ? { ...w, ...payload, notes } : w);
          localStorage.setItem('table_maitre_waitlist', JSON.stringify(updated));
          setEntries(updated.filter((w: any) => w.store_id === profile?.active_store && w.status === 'waiting'));
        }
      }
    } else {
      // Create Mode
      const tempId = `wait-${Date.now()}`;
      if (isSupabaseConfigured) {
        try {
          const { data, error } = await supabase
            .from('waitlist')
            .insert([payload])
            .select()
            .single();

          if (error) throw error;

          if (data) {
            setEntries(prev => [...prev, data as WaitlistEntry]);
          }
        } catch (err: any) {
          console.error("Failed to create wait queue entry:", err);
          alert(`Failed to add guest to wait queue: ${err.message || err}`);
        }
      } else {
        const newEntry = { ...payload, id: tempId, notes, created_at: new Date().toISOString() } as WaitlistEntry;
        const local = localStorage.getItem('table_maitre_waitlist') || '[]';
        const parsed = JSON.parse(local);
        parsed.push(newEntry);
        localStorage.setItem('table_maitre_waitlist', JSON.stringify(parsed));
        setEntries(prev => [...prev, newEntry]);
      }
    }

    setIsModalOpen(false);
    // Dispatch storage event to trigger dashboard update
    window.dispatchEvent(new Event('storage'));
  };

  const handleCancelWaitlist = async (id: string) => {
    if (confirm("Are you sure you want to cancel this guest from the wait queue?")) {
      if (isSupabaseConfigured) {
        try {
          const { error } = await supabase
            .from('waitlist')
            .update({ status: 'cancelled' })
            .eq('id', id);

          if (error) throw error;

          setEntries(prev => prev.filter(w => w.id !== id));
        } catch (err: any) {
          console.error("Failed to cancel wait queue entry:", err);
          alert(`Failed to cancel wait queue entry: ${err.message || err}`);
        }
      } else {
        const local = localStorage.getItem('table_maitre_waitlist');
        if (local) {
          const parsed = JSON.parse(local);
          const updated = parsed.map((w: any) => w.id === id ? { ...w, status: 'cancelled' } : w);
          localStorage.setItem('table_maitre_waitlist', JSON.stringify(updated));
          setEntries(updated.filter((w: any) => w.store_id === profile?.active_store && w.status === 'waiting'));
        }
      }
      // Dispatch storage event to trigger dashboard update
      window.dispatchEvent(new Event('storage'));
    }
  };

  const handleOpenSeating = async (entry: WaitlistEntry) => {
    setLoadingTables(true);
    try {
      let tablesList: Table[] = [];
      if (isSupabaseConfigured) {
        const { data, error } = await supabase
          .from('restaurant_tables')
          .select('*')
          .eq('store_id', profile?.active_store)
          .eq('status', 'available');

        if (error) throw error;
        tablesList = data || [];
      } else {
        const local = localStorage.getItem('table_maitre_tables');
        if (local) {
          const parsed = JSON.parse(local);
          tablesList = parsed.filter((t: any) => t.store_id === profile?.active_store && t.status === 'available');
        }
      }

      if (tablesList.length === 0) {
        alert("No open tables. Please open/clear a table first.");
        return;
      }

      setAvailableTables(tablesList);
      setSeatingEntry(entry);
      setSelectedTableId('');
    } catch (err: any) {
      console.error("Failed to load available tables:", err);
      alert(`Error loading tables: ${err.message || err}`);
    } finally {
      setLoadingTables(false);
    }
  };

  const handleConfirmSeating = async () => {
    if (!seatingEntry || !selectedTableId) return;

    if (isSupabaseConfigured) {
      try {
        // Step 1: Update waitlist entry status to 'seated'
        const { error: wlError } = await supabase
          .from('waitlist')
          .update({ status: 'seated' })
          .eq('id', seatingEntry.id);
        if (wlError) throw wlError;

        // Step 2: Update selected table status to 'occupied'
        const { error: tblError } = await supabase
          .from('restaurant_tables')
          .update({
            status: 'occupied',
            guest_count: seatingEntry.party_size,
            reservation_name: seatingEntry.guest_name,
            seated_at: new Date().toISOString()
          })
          .eq('id', selectedTableId);

        if (tblError) {
          // Rollback step 1
          await supabase.from('waitlist').update({ status: 'waiting' }).eq('id', seatingEntry.id);
          throw tblError;
        }

        // Both updates succeeded
        setEntries(prev => prev.filter(e => e.id !== seatingEntry.id));
        setSeatingEntry(null);
        setSelectedTableId('');
        alert("Guest seated successfully!");
      } catch (err: any) {
        console.error("Seating failed:", err);
        alert(`Failed to seat guest: ${err.message || err}`);
      }
    } else {
      // Local cache offline mode
      const localWl = localStorage.getItem('table_maitre_waitlist');
      if (localWl) {
        const parsed = JSON.parse(localWl);
        const updated = parsed.map((w: any) => w.id === seatingEntry.id ? { ...w, status: 'seated' } : w);
        localStorage.setItem('table_maitre_waitlist', JSON.stringify(updated));
        setEntries(updated.filter((w: any) => w.store_id === profile?.active_store && w.status === 'waiting'));
      }

      const localTables = localStorage.getItem('table_maitre_tables');
      if (localTables) {
        const parsed = JSON.parse(localTables);
        const updated = parsed.map((t: any) => t.id === selectedTableId ? {
          ...t,
          status: 'occupied',
          guest_count: seatingEntry.party_size,
          reservation_name: seatingEntry.guest_name,
          seated_at: new Date().toISOString()
        } : t);
        localStorage.setItem('table_maitre_tables', JSON.stringify(updated));
      }

      setEntries(prev => prev.filter(e => e.id !== seatingEntry.id));
      setSeatingEntry(null);
      setSelectedTableId('');
    }

    // Dispatch storage event to trigger dashboard update
    window.dispatchEvent(new Event('storage'));
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Wait Queue</h2>
          <p className="text-slate-500 mt-1">Live management of the restaurant wait queue.</p>
        </div>
        <button 
          onClick={handleAddClick}
          className="bg-[#3ecf8e] text-[#020617] px-6 py-2.5 rounded text-[10px] uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all flex items-center gap-2 cursor-pointer font-mono"
        >
          <Plus size={14} />
          Add Walk-In
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
           {entries.map((entry, i) => (
             <motion.div
               layout
               key={entry.id}
               initial={{ opacity: 0, y: 10 }}
               animate={{ opacity: 1, y: 0 }}
               className="bg-slate-900/40 border border-slate-800 rounded-xl p-5 flex items-center gap-6 group hover:border-[#3ecf8e]/30 transition-all backdrop-blur-sm"
             >
                <div className="w-12 h-12 bg-[#020617] rounded-lg border border-slate-800 flex items-center justify-center text-[#3ecf8e] shadow-lg">
                  <div className="text-center font-mono">
                    <p className="text-[14px] font-black leading-none">{entry.party_size}</p>
                    <p className="text-[8px] uppercase tracking-tighter text-slate-500 font-bold">Seats</p>
                  </div>
                </div>

                <div className="flex-1">
                  <h3 className="text-sm font-bold text-white tracking-tight">{entry.guest_name}</h3>
                  <div className="flex flex-wrap items-center gap-4 mt-1.5 font-mono text-[10px] text-slate-500">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-slate-600" />
                      Waiting {formatDistanceToNow(new Date(entry.created_at))}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={10} className="text-slate-600" />
                      {entry.phone}
                    </div>
                  </div>
                  {entry.notes && (
                    <p className="mt-2 text-[10px] text-amber-500 font-mono bg-amber-500/5 px-2.5 py-1 rounded inline-block border border-amber-500/10">
                      📝 {entry.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-3">
                   <button 
                     onClick={() => handleOpenSeating(entry)}
                     className="px-4 py-2 bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/30 rounded text-[10px] font-bold uppercase tracking-widest hover:bg-[#3ecf8e] hover:text-[#020617] transition-all flex items-center gap-2 cursor-pointer font-mono"
                   >
                     <ArrowRight size={12} />
                     Seat Guest
                   </button>
                   <button 
                     onClick={() => handleEditClick(entry)}
                     className="p-2 text-slate-600 hover:text-[#3ecf8e] transition-colors cursor-pointer"
                     title="Edit Details"
                   >
                     <Edit3 size={16} />
                   </button>
                   <button 
                     onClick={() => handleCancelWaitlist(entry.id)}
                     className="p-2 text-slate-600 hover:text-red-400 transition-colors cursor-pointer"
                     title="Cancel"
                   >
                     <Trash2 size={16} />
                   </button>
                </div>
             </motion.div>
           ))}

           {entries.length === 0 && (
             <div className="py-20 text-center bg-slate-900/20 border border-dashed border-slate-800 rounded-3xl backdrop-blur-sm">
                <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-800 mx-auto mb-4 border border-slate-800">
                  <Timer size={32} />
                </div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest">Queue Is Depleted</p>
                <p className="text-xs text-slate-700 mt-2">All walk-ins have been provisioned.</p>
             </div>
           )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
             <div className="flex items-center justify-between mb-8">
               <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em]">Queue Analytics</h3>
               <div className="w-2 h-2 rounded-full bg-[#3ecf8e] animate-pulse shadow-[0_0_8px_#3ecf8e]" />
             </div>
             <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Average Wait</span>
                  <span className="text-xl font-bold text-white tracking-tight">18<span className="text-xs font-mono text-[#3ecf8e]">min</span></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Queue Status</span>
                  <span className="text-[10px] font-bold text-[#3ecf8e] border border-[#3ecf8e]/30 px-2 py-0.5 rounded bg-[#3ecf8e]/10">NOMINAL</span>
                </div>
                <div className="pt-4 border-t border-slate-800">
                   <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">Intensity Profile</p>
                   <div className="flex items-end gap-1 h-12">
                      {[15, 30, 45, 80, 60, 40, 30, 50, 90].map((h, i) => (
                        <div 
                          key={i} 
                          className={cn("flex-1 rounded-sm", i === 8 ? "bg-[#3ecf8e] shadow-[0_0_8px_rgba(62,207,142,0.3)]" : "bg-slate-800")} 
                          style={{ height: `${h}%` }}
                        />
                      ))}
                   </div>
                </div>
             </div>
          </div>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-4 flex gap-4">
             <AlertCircle size={20} className="text-red-500 shrink-0" />
             <div>
                <p className="text-[10px] font-bold text-slate-300 uppercase tracking-widest leading-none mb-1">Queue Breach</p>
                <p className="text-[10px] text-slate-500 leading-relaxed font-mono">
                  Wait times exceeding 45 minutes detected for party size 4+. Action recommended.
                </p>
             </div>
          </div>
        </div>
      </div>

      {/* Add / Edit Guest Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl z-10 p-6 flex flex-col relative max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-[#3ecf8e] tracking-widest uppercase font-mono">
                  {editingEntry ? 'Modify Queue Details' : 'Add Walk-In Workspace'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <form onSubmit={handleSubmitWaitlist} className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Guest Name</label>
                  <input 
                    type="text" 
                    required
                    placeholder="E.g., Pierre Gasly"
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Contact Phone</label>
                  <input 
                    type="text" 
                    required
                    placeholder="+971 50 123 4567"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Pax</label>
                  <input 
                    type="number" 
                    required
                    min={1}
                    value={partySize}
                    onChange={(e) => setPartySize(parseInt(e.target.value) || 2)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Queue Notes</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="E.g., high chair needed, outdoor preference, waiting at bar..."
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] h-20 resize-none font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#3ecf8e] text-[#020617] font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer font-mono"
                >
                  {editingEntry ? 'Apply Changes' : 'Add Walk-In'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Seating Table Selection Modal */}
      <AnimatePresence>
        {seatingEntry && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            {/* Backdrop */}
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSeatingEntry(null)}
              className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            {/* Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl z-10 p-6 flex flex-col relative max-h-[80vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-[#3ecf8e] tracking-widest uppercase font-mono">
                  Seat Guest
                </h3>
                <button 
                  onClick={() => setSeatingEntry(null)}
                  className="p-1.5 text-slate-500 hover:text-white rounded-lg hover:bg-slate-900 transition-all cursor-pointer"
                >
                  <X size={16} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 font-mono space-y-1.5 uppercase">
                  <div>Guest: <span className="text-white font-bold">{seatingEntry.guest_name}</span></div>
                  <div>Pax: <span className="text-[#3ecf8e] font-black">{seatingEntry.party_size} Pax</span></div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Select Open Table</label>
                  <select 
                    value={selectedTableId}
                    onChange={(e) => setSelectedTableId(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono font-bold uppercase"
                  >
                    <option value="">Choose Open Table...</option>
                    {availableTables.map(t => (
                      <option key={t.id} value={t.id}>
                        Table {t.number} (Cap {t.capacity})
                      </option>
                    ))}
                  </select>
                </div>

                <button 
                  type="button"
                  disabled={!selectedTableId}
                  onClick={handleConfirmSeating}
                  className="w-full bg-[#3ecf8e] text-[#020617] font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50 disabled:hover:brightness-100 disabled:active:scale-100 font-mono"
                >
                  Confirm Seating
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
