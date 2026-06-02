import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Plus, 
  Search, 
  Calendar, 
  Users, 
  Phone, 
  MessageSquare, 
  CheckCircle2, 
  Clock, 
  XCircle,
  MoreVertical,
  Filter,
  User,
  Edit3,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Reservation } from '../types';
import { cn } from '../lib/utils';
import { format } from 'date-fns';
import { isSupabaseConfigured } from '../lib/supabase';
import { addToOfflineQueue } from '../lib/offlineQueue';

export default function Reservations() {
  const { profile } = useAuth();
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');

  // Creation/Editing Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRes, setEditingRes] = useState<Reservation | null>(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [adults, setAdults] = useState(2);
  const [kids, setKids] = useState(0);
  const [tableId, setTableId] = useState('');
  const [date, setDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [time, setTime] = useState('19:00');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Reservation['status']>('booked');
  const [tablesList, setTablesList] = useState<any[]>([]);

  useEffect(() => {
    if (profile?.active_store) {
      fetchReservations();
      
      // Load tables list for dropdown
      if (isSupabaseConfigured) {
        (async () => {
          try {
            const { data } = await supabase.from('restaurant_tables').select('*').eq('store_id', profile.active_store);
            setTablesList(data || []);
          } catch (err) {
            console.error("Error fetching tables list:", err);
          }
        })();
      } else {
        const local = localStorage.getItem('table_maitre_tables');
        if (local) {
          const parsed = JSON.parse(local);
          setTablesList(parsed.filter((t: any) => t.store_id === profile.active_store));
        }
      }
    }
  }, [profile?.active_store]);

  async function fetchReservations() {
    try {
      if (!isSupabaseConfigured) {
        const local = localStorage.getItem('table_maitre_reservations');
        if (local) {
          const parsed = JSON.parse(local);
          const filtered = parsed.filter((r: any) => r.store_id === profile?.active_store);
          if (filtered.length > 0) {
            setReservations(filtered);
            setLoading(false);
            return;
          }
        }
        const demo = getDemoReservations();
        let allRes = [];
        const existingRaw = localStorage.getItem('table_maitre_reservations');
        if (existingRaw) {
          allRes = JSON.parse(existingRaw);
          allRes = allRes.filter((r: any) => r.store_id !== (profile?.active_store || '0301'));
        }
        allRes = [...allRes, ...demo];
        localStorage.setItem('table_maitre_reservations', JSON.stringify(allRes));
        setReservations(demo);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('reservations')
        .select('*')
        .eq('store_id', profile?.active_store)
        .order('datetime', { ascending: true });

      if (error) throw error;
      console.log("[DEBUG Reservations] fetchReservations got data JSON:", JSON.stringify(data));
      setReservations(data || []);
    } catch (err) {
      console.error('Error fetching reservations:', err);
      setReservations(getDemoReservations());
    } finally {
      setLoading(false);
    }
  }

  function getDemoReservations(): Reservation[] {
    const names = ['Alex Rivers', 'Jordan Smith', 'Sarah Dev', 'Michael Roberts', 'Kyle Hudson'];
    return names.map((name, i) => ({
      id: `res-${i}`,
      store_id: profile?.active_store || '0301',
      guest_name: name,
      phone: '+971 50 123 456' + i,
      party_size: [2, 4, 2, 6, 4][i],
      datetime: new Date(Date.now() + (i * 1000 * 60 * 60 * (i + 1))).toISOString(),
      status: ['booked', 'confirmed', 'confirmed', 'booked', 'seated'][i] as any,
      notes: i === 2 ? 'Allergy: Peanuts' : undefined
    }));
  }

  const applyTableUpdates = async (
    targetTableId: string | null,
    tableUpdates: any,
    oldTableIdToClear: string | null,
    oldGuestName?: string
  ) => {
    let oldTableUpdates: any = null;
    if (oldTableIdToClear) {
      const oldTbl = tablesList.find(t => t.id === oldTableIdToClear);
      if (oldTbl && oldTbl.reservation_name === (oldGuestName || name)) {
        oldTableUpdates = {
          status: oldTbl.status === 'occupied' || oldTbl.status === 'billing' ? 'cleaning' : 'available',
          reservation_name: null,
          guest_count: null,
          seated_at: null
        };
      }
    }

    // 1. Local Cache Updates
    if (!isSupabaseConfigured) {
      const existingTables = localStorage.getItem('table_maitre_tables');
      if (existingTables) {
        let parsed = JSON.parse(existingTables);
        parsed = parsed.map((item: any) => {
          if (targetTableId && item.id === targetTableId && tableUpdates) {
            return { ...item, ...tableUpdates };
          }
          if (oldTableIdToClear && item.id === oldTableIdToClear && oldTableUpdates) {
            return { ...item, ...oldTableUpdates };
          }
          return item;
        });
        localStorage.setItem('table_maitre_tables', JSON.stringify(parsed));
        setTablesList(parsed.filter((t: any) => t.store_id === profile?.active_store));
      }
      return;
    }

    // 2. Supabase + Offline Queue updates
    try {
      if (targetTableId && tableUpdates) {
        addToOfflineQueue('update', 'restaurant_tables', { id: targetTableId, ...tableUpdates });
        await supabase.from('restaurant_tables').update(tableUpdates).eq('id', targetTableId);
      }
      if (oldTableIdToClear && oldTableUpdates) {
        addToOfflineQueue('update', 'restaurant_tables', { id: oldTableIdToClear, ...oldTableUpdates });
        await supabase.from('restaurant_tables').update(oldTableUpdates).eq('id', oldTableIdToClear);
      }
      
      // Refresh tablesList
      const { data: updatedTables } = await supabase
        .from('restaurant_tables')
        .select('*')
        .eq('store_id', profile?.active_store);
      setTablesList(updatedTables || []);
    } catch (err) {
      console.error('Failed to sync tables in background:', err);
    }
  };

  const updateStatus = async (id: string, status: Reservation['status']) => {
    const resItem = reservations.find(r => r.id === id);
    if (!resItem) return;

    if (status === 'seated' && !resItem.table_id) {
      alert("Validation Error: Please assign a table to this reservation before seating.");
      return;
    }

    const previousReservations = [...reservations];
    const updatedRes = reservations.map(r => r.id === id ? { ...r, status } : r);
    setReservations(updatedRes);

    // Prepare table updates
    let tableUpdates: any = null;
    let targetTableId: string | null = null;
    let oldTableIdToClear: string | null = null;

    if (status === 'seated' && resItem.table_id) {
      targetTableId = resItem.table_id;
      tableUpdates = {
        status: 'occupied',
        guest_count: resItem.party_size,
        reservation_name: resItem.guest_name,
        seated_at: new Date().toISOString()
      };
    } else if (status === 'cancelled' && resItem.table_id) {
      oldTableIdToClear = resItem.table_id;
    }

    if (!isSupabaseConfigured) {
      const existing = localStorage.getItem('table_maitre_reservations');
      if (existing) {
        const parsed = JSON.parse(existing);
        const updatedAll = parsed.map((item: any) => item.id === id ? { ...item, status } : item);
        localStorage.setItem('table_maitre_reservations', JSON.stringify(updatedAll));
      }
      await applyTableUpdates(targetTableId, tableUpdates, oldTableIdToClear, resItem.guest_name);
      return;
    }

    try {
      addToOfflineQueue('update', 'reservations', { id, status });
      const { error } = await supabase
        .from('reservations')
        .update({ status })
        .eq('id', id);
      if (error) throw error;

      await applyTableUpdates(targetTableId, tableUpdates, oldTableIdToClear, resItem.guest_name);
    } catch (err: any) {
      console.error('Unexpected error:', err);
      alert(`Failed to update status: ${err.message || err}`);
      setReservations(previousReservations);
    }
  };

  const handleCreateNewClick = () => {
    setEditingRes(null);
    setName('');
    setPhone('');
    setPartySize(2);
    setAdults(2);
    setKids(0);
    setTableId('');
    setDate(format(new Date(), 'yyyy-MM-dd'));
    setTime('19:00');
    setNotes('');
    setStatus('booked');
    setIsModalOpen(true);
  };

  const handleEditClick = (res: Reservation) => {
    setEditingRes(res);
    setName(res.guest_name);
    setPhone(res.phone);
    setPartySize(res.party_size);
    setAdults(res.adults || res.party_size || 2);
    setKids(res.kids || 0);
    setTableId(res.table_id || '');
    setDate(format(new Date(res.datetime), 'yyyy-MM-dd'));
    setTime(format(new Date(res.datetime), 'HH:mm'));
    setNotes(res.notes || '');
    setStatus(res.status);
    setIsModalOpen(true);
  };

  const handleSubmitBooking = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    const computedPartySize = adults + kids;
    if (computedPartySize < 1) {
      alert("Validation Error: Total PAX size must be at least 1 (adults + kids).");
      return;
    }

    if (status === 'seated' && !tableId) {
      alert("Validation Error: Please assign a table to this reservation before seating.");
      return;
    }

    // 1. Duplicate passenger/guest check on same date
    const isGuestDuplicate = reservations.some(r => 
      r.id !== editingRes?.id &&
      r.status !== 'cancelled' &&
      r.guest_name.toLowerCase().trim() === name.toLowerCase().trim() &&
      r.phone.trim() === phone.trim() &&
      r.datetime.startsWith(date)
    );
    if (isGuestDuplicate) {
      alert("Booking Conflict: A reservation already exists for this guest name and contact number on this date.");
      return;
    }

    // 2. Double reservation table slot collision verification (+/- 2 hrs window)
    if (tableId) {
      const selectedTime = new Date(`${date}T${time}:00`).getTime();
      const hasTimeOverlap = reservations.some(r => {
        if (r.id === editingRes?.id || r.table_id !== tableId || r.status === 'cancelled') return false;
        const existingTime = new Date(r.datetime).getTime();
        const diffHours = Math.abs(selectedTime - existingTime) / (1000 * 60 * 60);
        return diffHours < 2;
      });
      if (hasTimeOverlap) {
        alert("Table Allocation Conflict: This table is already reserved within a 2-hour window of this slot. Please choose another table or time.");
        return;
      }
    }

    const combinedDateTime = new Date(`${date}T${time}:00`).toISOString();

    const newRes: any = {
      store_id: profile?.active_store || '0301',
      guest_name: name,
      phone,
      party_size: computedPartySize,
      adults,
      kids,
      table_id: tableId || null,
      datetime: combinedDateTime,
      status: status,
      notes: notes || null
    };

    let targetTableId: string | null = null;
    let tableUpdates: any = null;
    let oldTableIdToClear: string | null = null;

    if (status === 'seated' && tableId) {
      targetTableId = tableId;
      tableUpdates = {
        status: 'occupied',
        guest_count: computedPartySize,
        reservation_name: name,
        seated_at: new Date().toISOString()
      };
      if (editingRes && editingRes.table_id && editingRes.table_id !== tableId) {
        oldTableIdToClear = editingRes.table_id;
      }
    } else if (status === 'cancelled' && editingRes?.table_id) {
      oldTableIdToClear = editingRes.table_id;
    } else if (editingRes && editingRes.table_id && editingRes.table_id !== tableId) {
      oldTableIdToClear = editingRes.table_id;
    }

    if (editingRes) {
      // Edit mode
      const previousReservations = [...reservations];
      const updatedList = reservations.map(r => r.id === editingRes.id ? { ...r, ...newRes, id: editingRes.id } : r);
      setReservations(updatedList);
      setIsModalOpen(false);
      setEditingRes(null);

      if (!isSupabaseConfigured) {
        const existing = localStorage.getItem('table_maitre_reservations');
        if (existing) {
          const parsed = JSON.parse(existing);
          const updatedAll = parsed.map((item: any) => item.id === editingRes.id ? { ...item, ...newRes } : item);
          localStorage.setItem('table_maitre_reservations', JSON.stringify(updatedAll));
        }
        await applyTableUpdates(targetTableId, tableUpdates, oldTableIdToClear, editingRes.guest_name);
      } else {
        try {
          const dbPayload = { ...newRes };
          delete dbPayload.adults;
          delete dbPayload.kids;
          addToOfflineQueue('update', 'reservations', { id: editingRes.id, ...dbPayload });
          const { error } = await supabase
            .from('reservations')
            .update(dbPayload)
            .eq('id', editingRes.id);
          if (error) {
            console.error('Error updating booking:', error);
            alert(`Failed to update reservation in database: ${error.message}`);
            setReservations(previousReservations);
          } else {
            await applyTableUpdates(targetTableId, tableUpdates, oldTableIdToClear, editingRes.guest_name);
          }
        } catch (err: any) {
          console.error(err);
          alert(`Failed to update reservation: ${err.message || err}`);
          setReservations(previousReservations);
        }
      }
    } else {
      // Create mode
      const tempId = `res-${Date.now()}`;
      const savedRes = { ...newRes, id: tempId } as Reservation;
      console.log("[DEBUG Reservations] Creating new reservation:", JSON.stringify(savedRes));
      setReservations(prev => [...prev, savedRes]);
      setIsModalOpen(false);

      if (!isSupabaseConfigured) {
        console.log("[DEBUG Reservations] Supabase not configured. Using local cache.");
        const existing = localStorage.getItem('table_maitre_reservations') || '[]';
        const parsed = JSON.parse(existing);
        localStorage.setItem('table_maitre_reservations', JSON.stringify([...parsed, savedRes]));
        await applyTableUpdates(targetTableId, tableUpdates, oldTableIdToClear);
      } else {
        console.log("[DEBUG Reservations] Supabase is configured. Inserting reservation into DB:", JSON.stringify(newRes));
        try {
          const dbPayload = { ...newRes };
          delete dbPayload.adults;
          delete dbPayload.kids;
          
          const { data, error } = await supabase
            .from('reservations')
            .insert([dbPayload])
            .select()
            .single();
          if (error) {
            console.error('[DEBUG Reservations] Error inserting booking:', error);
            alert(`Failed to create reservation in database: ${error.message}`);
            setReservations(prev => prev.filter(r => r.id !== tempId));
          } else if (data) {
            console.log("[DEBUG Reservations] Reservation inserted successfully, data:", JSON.stringify(data));
            const mapped = {
              ...data,
              adults: newRes.adults,
              kids: newRes.kids
            };
            setReservations(prev => prev.map(r => r.id === tempId ? mapped : r));
            await applyTableUpdates(targetTableId, tableUpdates, oldTableIdToClear);
          }
        } catch(err: any) {
          console.error('[DEBUG Reservations] Exception caught in insert:', err);
          alert(`Failed to create reservation: ${err.message || err}`);
          setReservations(prev => prev.filter(r => r.id !== tempId));
        }
      }
    }
  };

  const filtered = reservations.filter(r => {
    const matchesSearch = r.guest_name.toLowerCase().includes(search.toLowerCase()) || 
                          r.phone.includes(search);
    const matchesStatus = statusFilter === 'All' || r.status === statusFilter.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Reservation Intel</h2>
          <p className="text-slate-500 mt-1">Manage network bookings and guest arrivals.</p>
        </div>
        <button 
          onClick={handleCreateNewClick}
          className="bg-[#3ecf8e] text-[#020617] px-6 py-2.5 rounded text-[10px] uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={14} />
          Create Booking
        </button>
      </div>

      <div className="flex items-center gap-4 bg-slate-900/30 p-2 border border-slate-800 rounded-xl backdrop-blur-sm">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input 
            type="text" 
            placeholder="Search by name or contact..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-[#020617]/50 border border-slate-800 rounded px-10 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#3ecf8e]/30 transition-all font-mono"
          />
        </div>
        <div className="flex gap-1 h-full">
          {['All', 'Booked', 'Confirmed', 'Seated'].map(status => (
            <button 
              key={status}
              onClick={() => setStatusFilter(status)}
              className={cn(
                "px-4 rounded text-[9px] font-bold uppercase tracking-widest transition-all cursor-pointer border",
                statusFilter === status 
                  ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30" 
                  : "text-slate-500 hover:text-slate-300 border-transparent"
              )}
            >
              {status}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
        <div className="xl:col-span-3 space-y-3">
          {filtered.length === 0 ? (
            <div className="p-12 text-center text-slate-600 bg-slate-900/10 border border-slate-800 border-dashed rounded-2xl">
              No matching reservations found for current store selection.
            </div>
          ) : (
            filtered.map((res, i) => (
              <motion.div 
                layout
                key={res.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="group bg-slate-900/40 border border-slate-800/60 rounded-xl p-4 flex items-center gap-6 hover:border-[#3ecf8e]/30 transition-all backdrop-blur-sm"
              >
                <div className="w-12 h-12 bg-[#020617] rounded-lg border border-slate-800 flex flex-col items-center justify-center text-slate-500">
                  <span className="text-[10px] font-bold uppercase tracking-tight">{format(new Date(res.datetime), 'MMM')}</span>
                  <span className="text-sm font-bold text-white">{format(new Date(res.datetime), 'dd')}</span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-bold text-white tracking-tight">{res.guest_name}</h3>
                    <span className={cn(
                      "px-2 py-0.5 rounded text-[8px] font-bold uppercase tracking-widest",
                      res.status === 'confirmed' ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20" :
                      res.status === 'seated' ? "bg-amber-500/10 text-amber-500 border border-amber-500/20" :
                      "bg-slate-800 text-slate-500 border border-slate-700"
                    )}>
                      {res.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 font-mono text-[10px] text-slate-600">
                    <div className="flex items-center gap-1.5">
                      <Clock size={10} className="text-slate-700" />
                      {format(new Date(res.datetime), 'HH:mm')}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Users size={10} className="text-slate-700" />
                      {res.party_size}P
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone size={10} className="text-slate-700" />
                      {res.phone}
                    </div>
                  </div>
                  {res.notes && (
                    <p className="mt-2 text-[10px] text-amber-500 font-mono bg-amber-500/5 px-2.5 py-1 rounded inline-block border border-amber-500/10">
                      📝 {res.notes}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button 
                    onClick={() => handleEditClick(res)}
                    className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-400 hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 transition-all cursor-pointer"
                    title="Edit/Update Attributes"
                  >
                    <Edit3 size={16} />
                  </button>
                  <button 
                    onClick={() => updateStatus(res.id, 'confirmed')}
                    className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-600 hover:text-[#3ecf8e] hover:border-[#3ecf8e]/30 transition-all cursor-pointer"
                    title="Confirm"
                  >
                    <CheckCircle2 size={16} />
                  </button>
                  <button 
                    onClick={() => updateStatus(res.id, 'seated')}
                    className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-600 hover:text-amber-500 hover:border-amber-500/30 transition-all cursor-pointer"
                    title="Seat"
                  >
                    <Users size={16} />
                  </button>
                  <button 
                    onClick={() => updateStatus(res.id, 'cancelled')}
                    className="p-2 bg-slate-950 border border-slate-800 rounded text-slate-600 hover:text-red-500 hover:border-red-500/30 transition-all cursor-pointer"
                    title="Cancel"
                  >
                    <XCircle size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 shadow-2xl">
            <h3 className="text-xs font-bold text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
              <Calendar size={14} className="text-[#3ecf8e]" />
              Evening Forecast
            </h3>
            <div className="space-y-4">
               {[
                 { label: '8:00 PM', value: 8, intensity: 'High' },
                 { label: '9:00 PM', value: 12, intensity: 'Peak' },
                 { label: '10:00 PM', value: 5, intensity: 'Low' },
               ].map(row => (
                 <div key={row.label} className="space-y-2">
                    <div className="flex justify-between text-[10px] font-bold uppercase tracking-widest">
                      <span className="text-slate-500">{row.label}</span>
                      <span className={cn(row.intensity === 'Peak' ? "text-[#3ecf8e]" : "text-slate-400")}>{row.value} Covers</span>
                    </div>
                    <div className="h-1 bg-slate-950 rounded-full overflow-hidden">
                       <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${(row.value / 15) * 100}%` }}
                        className={cn("h-full", row.intensity === 'Peak' ? "bg-[#3ecf8e]" : "bg-slate-600")}
                       />
                    </div>
                 </div>
               ))}
            </div>
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 relative overflow-hidden group">
            <div className="absolute -right-4 -top-4 opacity-5 group-hover:scale-110 transition-transform">
               <MessageSquare size={80} />
            </div>
            <p className="text-[10px] font-bold text-[#3ecf8e] uppercase tracking-[0.2em] mb-2">Automated Notifications</p>
            <p className="text-xs text-slate-500 leading-relaxed font-mono">
              Live identity verification and booking confirmations are synchronized via Twilio SMTP protocols.
            </p>
          </div>
        </div>
      </div>

      {/* Persistent Create/Edit Booking Modal Panel */}
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

            {/* Form Modal Box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl z-10 p-6 flex flex-col relative max-h-[90vh]"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-[#3ecf8e] tracking-widest uppercase font-mono">
                  {editingRes ? 'Modify Booking Details' : 'Reserve Table Workspace'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer hover:bg-slate-800"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmitBooking} className="space-y-4 overflow-y-auto pr-1">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Guest Full Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Charles Leclerc"
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Mobile Contact Phone</label>
                  <input 
                    type="text"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+971 50 123 4567"
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Adult Count</label>
                      <span className="text-[9px] font-mono text-slate-500 font-bold">MIN: 1</span>
                    </div>
                    <input 
                      type="number"
                      required
                      min={1}
                      max={40}
                      value={adults}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setAdults(Math.max(1, val));
                      }}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest font-mono">Child Count</label>
                      <span className="text-[9px] font-mono text-slate-500 font-bold">MIN: 0</span>
                    </div>
                    <input 
                      type="number"
                      required
                      min={0}
                      max={20}
                      value={kids}
                      onChange={(e) => {
                        const val = parseInt(e.target.value) || 0;
                        setKids(Math.max(0, val));
                      }}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                    />
                  </div>
                </div>

                <div className="p-3 bg-slate-950/40 rounded-xl border border-slate-800/80 text-[10px] text-slate-400 font-mono flex items-center justify-between uppercase">
                  <span>Computed Party Size:</span>
                  <span className="text-[#3ecf8e] font-black tracking-wider">{adults + kids} Covers</span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Assign Table</label>
                    <select 
                      value={tableId}
                      onChange={(e) => setTableId(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                    >
                      <option value="">Unassigned / Walkin</option>
                      {tablesList.map(t => (
                        <option key={t.id} value={t.id}>
                          Table {t.number || t.name} (Cap {t.capacity})
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Booking Status</label>
                    <select 
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-[#3ecf8e] focus:outline-none focus:border-[#3ecf8e] uppercase font-bold font-mono"
                    >
                      <option value="booked">Booked</option>
                      <option value="confirmed">Confirmed</option>
                      <option value="seated">Seated</option>
                      <option value="completed">Completed</option>
                      <option value="no-show">No-Show</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Arrival Date</label>
                    <input 
                      type="date"
                      required
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Arrival Time</label>
                    <input 
                      type="time"
                      required
                      value={time}
                      onChange={(e) => setTime(e.target.value)}
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Dietary / Notes Accent</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Allergies, preferences, birthday, table location requests..."
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] h-20 resize-none font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#3ecf8e] text-[#020617] font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer font-mono"
                >
                  {editingRes ? 'Apply Modifications' : 'Commit Booking'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
