import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  Star, 
  History, 
  AlertCircle, 
  ChevronRight,
  Filter,
  Plus,
  Tag,
  X,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase';
import { GuestCard } from '../types';

export default function Guests() {
  const [guests, setGuests] = useState<GuestCard[]>([]);
  const [search, setSearch] = useState('');
  const [selectedGuest, setSelectedGuest] = useState<GuestCard | null>(null);

  // Modal Panel & Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingGuest, setEditingGuest] = useState<GuestCard | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [isVip, setIsVip] = useState(false);
  const [preferencesStr, setPreferencesStr] = useState('');
  const [notes, setNotes] = useState('');
  const [nationality, setNationality] = useState('');

  useEffect(() => {
    loadGuests();
  }, []);

  const loadGuests = async () => {
    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('table_maitre_guests');
      if (local) {
        const parsed = JSON.parse(local);
        if (parsed.length > 0) {
          setGuests(parsed);
          return;
        }
      }

      // Default seed guests
      const seed = [
        {
          id: 'g1',
          name: 'Julianne Moore',
          email: 'j.moore@client.com',
          phone: '+1 212 555 0198',
          total_visits: 14,
          last_visit: '2026-05-10',
          preferences: ['Window Seat', 'Still Water', 'Sparkling Wine'],
          is_vip: true,
          notes: 'Founder of Moore Group. Prefers Table 12.'
        },
        {
          id: 'g2',
          name: 'Robert Stark',
          email: 'r.stark@winter.io',
          phone: '+44 20 7946 0101',
          total_visits: 5,
          last_visit: '2026-05-12',
          preferences: ['Steak Rare', 'Quiet Table'],
          is_vip: false,
          notes: 'Prefers dining at 8 PM exactly.'
        },
        {
          id: 'g3',
          name: 'Elena Gilbert',
          email: 'elena.g@mystic.com',
          phone: '+1 404 555 0122',
          total_visits: 22,
          last_visit: '2026-05-14',
          preferences: ['Vegan Option', 'Outdoor Seating'],
          is_vip: true,
          notes: 'Severe nut allergy. Always verify with kitchen.'
        }
      ];
      localStorage.setItem('table_maitre_guests', JSON.stringify(seed));
      setGuests(seed);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('guests')
        .select('*')
        .order('name', { ascending: true });
      
      if (error) throw error;
      
      const mapped: GuestCard[] = (data || []).map(g => ({
        id: g.id,
        name: g.name,
        email: g.email || '',
        phone: g.phone || '',
        total_visits: g.visit_count ?? 1,
        last_visit: g.created_at ? g.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
        preferences: g.preferences || [],
        is_vip: g.is_vip ?? false,
        notes: g.notes || undefined,
        nationality: g.nationality || 'SG',
        allergies: g.allergies || []
      }));
      setGuests(mapped);
    } catch (err) {
      console.error('Error fetching guests from Supabase:', err);
    }
  };

  const saveGuests = (updatedList: GuestCard[]) => {
    setGuests(updatedList);
    localStorage.setItem('table_maitre_guests', JSON.stringify(updatedList));
    if (selectedGuest) {
      const refreshed = updatedList.find(g => g.id === selectedGuest.id);
      if (refreshed) setSelectedGuest(refreshed);
    }
  };

  const handleRegisterClick = () => {
    setEditingGuest(null);
    setName('');
    setEmail('');
    setPhone('');
    setIsVip(false);
    setPreferencesStr('');
    setNotes('');
    setNationality('SG');
    setIsModalOpen(true);
  };

  const handleUpdateClick = (profile: GuestCard) => {
    setEditingGuest(profile);
    setName(profile.name);
    setEmail(profile.email);
    setPhone(profile.phone);
    setIsVip(profile.is_vip);
    setPreferencesStr(profile.preferences.join(', '));
    setNotes(profile.notes || '');
    setNationality(profile.nationality || 'SG');
    setIsModalOpen(true);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) return;

    // Duplicate contact verification
    const isPhoneDuplicate = guests.some(g =>
      g.id !== editingGuest?.id &&
      g.phone.trim().replace(/\s+/g, '') === phone.trim().replace(/\s+/g, '')
    );
    if (isPhoneDuplicate) {
      alert("Registration Conflict: A guest profile with this phone number is already registered.");
      return;
    }

    const prefs = preferencesStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    const payload: any = {
      name,
      email: email || `${name.toLowerCase().replace(/\s+/g, '')}@maitredemo.com`,
      phone,
      is_vip: isVip,
      preferences: prefs,
      notes: notes || null,
      nationality: nationality || 'SG',
      allergies: editingGuest?.allergies || []
    };

    if (editingGuest) {
      // Edit
      const previousGuests = [...guests];
      const updatedList = guests.map(g => g.id === editingGuest.id ? {
        ...g,
        ...payload,
        id: editingGuest.id
      } : g);
      setGuests(updatedList);
      setIsModalOpen(false);

      if (!isSupabaseConfigured) {
        localStorage.setItem('table_maitre_guests', JSON.stringify(updatedList));
        if (selectedGuest?.id === editingGuest.id) {
          const refreshed = updatedList.find(g => g.id === selectedGuest.id);
          if (refreshed) setSelectedGuest(refreshed);
        }
      } else {
        try {
          const dbPayload = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            is_vip: payload.is_vip,
            preferences: payload.preferences,
            notes: payload.notes,
            nationality: payload.nationality,
            allergies: payload.allergies
          };
          const { error } = await supabase
            .from('guests')
            .update(dbPayload)
            .eq('id', editingGuest.id);
          if (error) {
            console.error('Error updating guest:', error);
            alert(`Failed to update guest in database: ${error.message}`);
            setGuests(previousGuests);
          } else {
            // Update selected guest if it is the editing one
            const updatedGuest = updatedList.find(g => g.id === editingGuest.id);
            if (updatedGuest && selectedGuest?.id === editingGuest.id) {
              setSelectedGuest(updatedGuest);
            }
          }
        } catch (err: any) {
          console.error(err);
          alert(`Failed to update guest: ${err.message || err}`);
          setGuests(previousGuests);
        }
      }
    } else {
      // Create new
      const tempId = `g-${Date.now()}`;
      const newGuest: GuestCard = {
        id: tempId,
        name,
        email: payload.email,
        phone,
        total_visits: 1,
        last_visit: new Date().toISOString().split('T')[0],
        preferences: prefs,
        is_vip: isVip,
        notes: notes || undefined,
        nationality: nationality
      };

      setGuests(prev => [...prev, newGuest]);
      setSelectedGuest(newGuest);
      setIsModalOpen(false);

      if (!isSupabaseConfigured) {
        const existing = localStorage.getItem('table_maitre_guests') || '[]';
        const parsed = JSON.parse(existing);
        localStorage.setItem('table_maitre_guests', JSON.stringify([...parsed, newGuest]));
      } else {
        try {
          const dbPayload = {
            name: payload.name,
            email: payload.email,
            phone: payload.phone,
            is_vip: payload.is_vip,
            preferences: payload.preferences,
            notes: payload.notes,
            nationality: payload.nationality,
            allergies: payload.allergies,
            visit_count: 1
          };
          const { data, error } = await supabase
            .from('guests')
            .insert([dbPayload])
            .select()
            .single();

          if (error) {
            console.error('Error inserting guest:', error);
            alert(`Failed to register guest in database: ${error.message}`);
            setGuests(prev => prev.filter(g => g.id !== tempId));
            setSelectedGuest(null);
          } else if (data) {
            const mapped: GuestCard = {
              id: data.id,
              name: data.name,
              email: data.email || '',
              phone: data.phone || '',
              total_visits: data.visit_count ?? 1,
              last_visit: data.created_at ? data.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
              preferences: data.preferences || [],
              is_vip: data.is_vip ?? false,
              notes: data.notes || undefined,
              nationality: data.nationality || 'SG',
              allergies: data.allergies || []
            };
            setGuests(prev => prev.map(g => g.id === tempId ? mapped : g));
            setSelectedGuest(mapped);
          }
        } catch (err: any) {
          console.error(err);
          alert(`Failed to register guest: ${err.message || err}`);
          setGuests(prev => prev.filter(g => g.id !== tempId));
          setSelectedGuest(null);
        }
      }
    }
  };

  const filtered = guests.filter(g => 
    g.name.toLowerCase().includes(search.toLowerCase()) || 
    g.email.toLowerCase().includes(search.toLowerCase()) ||
    g.phone.includes(search)
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Guest CRM</h2>
          <p className="text-slate-500 mt-1">High-fidelity guest loyalty and preference tracking.</p>
        </div>
        <button 
          onClick={handleRegisterClick}
          className="bg-[#3ecf8e] text-[#020617] px-6 py-2.5 rounded text-[10px] uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all flex items-center gap-2 cursor-pointer"
        >
          <Plus size={14} />
          Register Profile
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 space-y-4">
           <div className="relative">
              <Search size={14} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
              <input 
                type="text" 
                placeholder="Query database for identity (Name, Email, Phone)..." 
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-[#020617]/50 border border-slate-800 rounded-xl px-12 py-3 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#3ecf8e]/30 transition-all font-mono shadow-inner border-slate-800/80"
              />
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filtered.map((guest, i) => (
                <motion.div
                  key={guest.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedGuest(guest)}
                  className={cn(
                    "group relative p-5 bg-slate-900/40 border border-slate-800 rounded-2xl cursor-pointer transition-all hover:bg-slate-900/60 overflow-hidden",
                    selectedGuest?.id === guest.id ? "border-[#3ecf8e]/50 bg-[#3ecf8e]/5" : "hover:border-slate-700"
                  )}
                >
                  <div className="flex items-start justify-between mb-4">
                    <div className="w-12 h-12 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center text-slate-600 group-hover:text-[#3ecf8e] transition-colors">
                      {guest.is_vip ? <Star size={24} className="fill-[#3ecf8e]/20 text-[#3ecf8e]" /> : <User size={24} />}
                    </div>
                    {guest.is_vip && (
                      <span className="px-2 py-0.5 bg-[#3ecf8e]/10 border border-[#3ecf8e]/20 rounded text-[8px] font-bold text-[#3ecf8e] uppercase tracking-widest font-mono">LOYALTY ELITE</span>
                    )}
                  </div>
                  
                  <h3 className="text-lg font-bold text-white tracking-tight">{guest.name}</h3>
                  <p className="text-[10px] font-mono text-slate-500 mt-1 uppercase tracking-tighter">{guest.email}</p>
                  
                  <div className="mt-6 flex items-center justify-between border-t border-slate-800/50 pt-4">
                    <div className="flex gap-4">
                       <div className="text-center">
                          <p className="text-[9px] font-bold text-slate-600 uppercase">Visits</p>
                          <p className="text-sm font-bold text-white">{guest.total_visits}</p>
                       </div>
                       <div className="text-center">
                          <p className="text-[9px] font-bold text-slate-600 uppercase">Last Appr.</p>
                          <p className="text-sm font-bold text-white font-mono">{guest.last_visit.split('-').slice(1).join('/') || 'New'}</p>
                       </div>
                    </div>
                    <ChevronRight size={16} className="text-slate-700 group-hover:translate-x-1 transition-transform" />
                  </div>
                  
                  {/* Background decoration */}
                  {selectedGuest?.id === guest.id && (
                    <div className="absolute top-0 right-0 p-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-[#3ecf8e]" />
                    </div>
                  )}
                </motion.div>
              ))}
           </div>
        </div>

        <div className="space-y-6">
           <AnimatePresence mode="wait">
              {selectedGuest ? (
                <motion.div
                  key={selectedGuest.id}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  className="bg-[#0f172a]/80 border border-slate-800 rounded-2xl p-6 shadow-2xl backdrop-blur-md sticky top-6"
                >
                   <div className="flex items-center gap-4 mb-8">
                      <div className="w-16 h-16 bg-[#020617] rounded-2xl border border-slate-800 flex items-center justify-center text-[#3ecf8e]">
                         <User size={32} />
                      </div>
                      <div>
                         <h3 className="text-xl font-bold text-white tracking-tight">{selectedGuest.name}</h3>
                         <p className="text-[10px] font-mono font-bold text-slate-500 uppercase tracking-widest mt-1">Status: {selectedGuest.is_vip ? 'VIP PROTECTED' : 'STANDARD'}</p>
                      </div>
                   </div>

                   <div className="space-y-8">
                     <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4">Contact Decryption</p>
                        <div className="space-y-3">
                           <div className="flex items-center gap-3 p-3 bg-[#020617]/50 rounded-lg border border-slate-800/50">
                              <Mail size={14} className="text-slate-600" />
                              <span className="text-xs text-slate-400 font-mono">{selectedGuest.email}</span>
                           </div>
                           <div className="flex items-center gap-3 p-3 bg-[#020617]/50 rounded-lg border border-slate-800/50">
                              <Phone size={14} className="text-slate-600" />
                              <span className="text-xs text-slate-400 font-mono">{selectedGuest.phone}</span>
                           </div>
                        </div>
                     </div>

                     <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 font-mono">Preferences & Toggles</p>
                        <div className="flex flex-wrap gap-2">
                           {selectedGuest.preferences.length === 0 ? (
                             <span className="text-slate-600 font-mono text-[10px] uppercase">No specified preferences.</span>
                           ) : (
                             selectedGuest.preferences.map(pref => (
                              <span key={pref} className="px-3 py-1 bg-slate-900 border border-slate-800 rounded text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">{pref}</span>
                             ))
                           )}
                        </div>
                     </div>

                     {selectedGuest.notes && (
                       <div>
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3">Service Directives</p>
                          <div className="p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl flex gap-3">
                             <AlertCircle size={14} className="text-amber-500 shrink-0 mt-0.5" />
                             <p className="text-xs text-amber-500/80 leading-relaxed font-semibold font-mono">{selectedGuest.notes}</p>
                          </div>
                       </div>
                     )}

                     <div>
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-4 flex items-center gap-1.5 font-mono select-none">
                           <History size={12} className="text-[#3ecf8e]" />
                           Guest Check-In Visit History
                        </p>
                        <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                           {(() => {
                              const localReservationsRaw = localStorage.getItem('table_maitre_reservations');
                              let matchedRes: any[] = [];
                              if (localReservationsRaw) {
                                 const all = JSON.parse(localReservationsRaw);
                                 matchedRes = all.filter((r: any) => r.phone?.trim() === selectedGuest.phone?.trim());
                              }
                              if (matchedRes.length === 0) {
                                 return <div className="p-3 text-center text-slate-600 text-[10px] uppercase tracking-wider border border-slate-800 border-dashed rounded font-mono select-none">No linked reservations found.</div>;
                              }
                              return matchedRes.map((historyRes) => (
                                 <div key={historyRes.id} className="p-2.5 bg-[#020617]/50 border border-slate-800 rounded font-mono text-[9px] flex items-center justify-between">
                                    <div>
                                       <p className="text-white font-bold">{new Date(historyRes.datetime).toLocaleDateString()}</p>
                                       <p className="text-slate-500 mt-0.5">Store ST-{historyRes.store_id} • {historyRes.party_size} Pax</p>
                                    </div>
                                    <span className={cn(
                                       "px-1.5 py-0.5 rounded text-[8px] font-bold uppercase",
                                       historyRes.status === 'completed' || historyRes.status === 'seated'
                                         ? "bg-emerald-400/10 text-emerald-400"
                                         : "bg-slate-800 text-slate-500"
                                    )}>
                                       {historyRes.status}
                                    </span>
                                 </div>
                              ));
                           })()}
                        </div>
                     </div>

                     <div className="pt-6 border-t border-slate-800 grid grid-cols-2 gap-3">
                        <button 
                          onClick={() => handleUpdateClick(selectedGuest)}
                          className="py-3 bg-slate-900 border border-slate-800 text-slate-400 rounded text-[9px] font-bold uppercase tracking-widest hover:text-white transition-all cursor-pointer hover:bg-slate-800"
                        >
                           Update Profile
                        </button>
                        <button className="py-3 bg-[#3ecf8e]/10 border border-[#3ecf8e]/30 text-[#3ecf8e] rounded text-[9px] font-bold uppercase tracking-widest hover:bg-[#3ecf8e] hover:text-[#020617] transition-all cursor-not-allowed opacity-50">
                           Instant Book
                        </button>
                     </div>
                   </div>
                </motion.div>
              ) : (
                <div className="bg-[#020617]/20 border border-slate-800 border-dashed rounded-2xl flex flex-col items-center justify-center p-12 text-center h-[520px]">
                   <div className="w-16 h-16 bg-slate-950 rounded-2xl flex items-center justify-center text-slate-800 mb-6 border border-slate-800">
                     <Tag size={32} />
                   </div>
                   <h3 className="text-xs font-bold text-slate-600 uppercase tracking-[0.2em] mb-2">Initialize Profile Focus</h3>
                   <p className="text-[10px] text-slate-700 max-w-xs font-mono uppercase tracking-tighter">Select an identity from the database to view deep guest analytics and service history.</p>
                </div>
              )}
           </AnimatePresence>
        </div>
      </div>

      {/* Guest registration dialog modal */}
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

            {/* Content box */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-[#0b0f19] border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl z-10 p-6 flex flex-col relative"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-black text-[#3ecf8e] tracking-widest uppercase font-mono">
                  {editingGuest ? 'Modify Loyalty Identity' : 'Register Guest Identity'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)}
                  className="p-1.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition-all cursor-pointer hover:bg-slate-800"
                >
                  <X size={14} />
                </button>
              </div>

              <form onSubmit={handleSubmitProfile} className="space-y-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Guest Full Name</label>
                  <input 
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="E.g., Julianne Moore"
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Email Address</label>
                    <input 
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="e.g., j.moore@client.com"
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Contact Number</label>
                    <input 
                      type="text"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="e.g., +1 212 555 0198"
                      className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 bg-slate-900/40 border border-slate-800/80 rounded-xl">
                  <input
                    type="checkbox"
                    id="isVipCheck"
                    checked={isVip}
                    onChange={(e) => setIsVip(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-800 text-[#3ecf8e] focus:ring-0 cursor-pointer"
                  />
                  <label htmlFor="isVipCheck" className="text-xs font-bold text-slate-300 font-mono tracking-wide cursor-pointer flex items-center gap-1.5 select-none">
                    ⭐ Classify as VIP Premium Member
                  </label>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Nationality Profile</label>
                  <select
                    value={nationality}
                    onChange={(e) => setNationality(e.target.value)}
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                  >
                    <option value="SG">Local HQ</option>
                    <option value="US">United States (US)</option>
                    <option value="UK">United Kingdom (UK)</option>
                    <option value="EU">European Union (EU)</option>
                    <option value="JP">Japan (JP)</option>
                    <option value="CN">China (CN)</option>
                    <option value="IN">India (IN)</option>
                    <option value="AU">Australia (AU)</option>
                    <option value="Other">Other / International</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Service Preferences (Comma-separated)</label>
                  <input 
                    type="text"
                    value={preferencesStr}
                    onChange={(e) => setPreferencesStr(e.target.value)}
                    placeholder="E.g., Window Seat, Still Water, Vegan Option"
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 font-mono">Internal Service Directives</label>
                  <textarea 
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add special comments, allergies, company designations..."
                    className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-[#3ecf8e] h-20 resize-none font-mono"
                  />
                </div>

                <button 
                  type="submit"
                  className="w-full bg-[#3ecf8e] text-[#020617] font-bold py-3.5 rounded-xl text-xs uppercase tracking-widest hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer font-mono"
                >
                  {editingGuest ? 'Update Guest Profile' : 'Commit Identity Profile'}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
