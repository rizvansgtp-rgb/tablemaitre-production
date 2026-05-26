import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Shield, Mail, Trash2, CheckCircle2, AlertCircle, Loader2, Store, Users, Clock, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Profile, UserRole } from '../types';
import { cn } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase';

export default function StaffManagement() {
  const { profile } = useAuth();
  const [staff, setStaff] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [form, setForm] = useState({
    email: '',
    role: 'waiter' as UserRole,
    stores: [] as string[]
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ALL_STORES = ['0301', '0302', '0303', '0304', '0305', '0306', '0307', '0308', '0309'];

  useEffect(() => {
    fetchStaff();
  }, []);

  async function fetchStaff() {
    setLoading(true);
    if (!isSupabaseConfigured) {
      const local = localStorage.getItem('table_maitre_staff');
      if (local) {
        setStaff(JSON.parse(local));
      } else {
        const seedStaff: Profile[] = [
          {
            id: 'staff-1',
            email: 'owner@maitre.com',
            role: 'owner',
            assigned_stores: ['0301', '0302', '0303'],
            active_store: '0301',
            created_at: new Date().toISOString()
          },
          {
            id: 'staff-2',
            email: 'manager@maitre.com',
            role: 'manager',
            assigned_stores: ['0301', '0302'],
            active_store: '0301',
            created_at: new Date().toISOString()
          },
          {
            id: 'staff-3',
            email: 'host@maitre.com',
            role: 'host',
            assigned_stores: ['0301'],
            active_store: '0301',
            created_at: new Date().toISOString()
          },
          {
            id: 'staff-4',
            email: 'waiter@maitre.com',
            role: 'waiter',
            assigned_stores: ['0301'],
            active_store: '0301',
            created_at: new Date().toISOString()
          }
        ];
        localStorage.setItem('table_maitre_staff', JSON.stringify(seedStaff));
        setStaff(seedStaff);
      }
      setLoading(false);
      return;
    }

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('role', { ascending: false });

      if (error) throw error;
      setStaff(data || []);
    } catch (err) {
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    if (!form.email) {
      setError("Worker email interface is required.");
      setSubmitting(false);
      return;
    }

    try {
      if (!isSupabaseConfigured) {
        const local = localStorage.getItem('table_maitre_staff') || '[]';
        const parsed = JSON.parse(local);
        const newMember: Profile = {
          id: `staff-${Date.now()}`,
          email: form.email,
          role: form.role,
          assigned_stores: form.stores.length > 0 ? form.stores : ['0301'],
          active_store: form.stores[0] || '0301',
          created_at: new Date().toISOString()
        };
        const updated = [...parsed, newMember];
        localStorage.setItem('table_maitre_staff', JSON.stringify(updated));
        setStaff(updated);
        setShowModal(false);
        setForm({ email: '', role: 'waiter', stores: [] });
      } else {
        const { error } = await supabase.from('profiles').insert([{
           id: `staff-${Date.now()}`,
           email: form.email,
           role: form.role,
           assigned_stores: form.stores.length > 0 ? form.stores : ['0301'],
           active_store: form.stores[0] || '0301'
        }]);
        if (error) throw error;
        await fetchStaff();
        setShowModal(false);
        setForm({ email: '', role: 'waiter', stores: [] });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const toggleStore = (storeId: string) => {
    setForm(prev => ({
      ...prev,
      stores: prev.stores.includes(storeId)
        ? prev.stores.filter(s => s !== storeId)
        : [...prev.stores, storeId]
    }));
  };

  const updateProfile = async (id: string, updates: Partial<Profile>) => {
    const updatedStaff = staff.map(member => member.id === id ? { ...member, ...updates } : member);
    setStaff(updatedStaff);

    if (!isSupabaseConfigured) {
      localStorage.setItem('table_maitre_staff', JSON.stringify(updatedStaff));
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleDeleteStaff = async (id: string) => {
    if (staff.length <= 1) {
      alert("Error: Active roster must maintain at least one admin profile.");
      return;
    }

    const updated = staff.filter(m => m.id !== id);
    setStaff(updated);

    if (!isSupabaseConfigured) {
      localStorage.setItem('table_maitre_staff', JSON.stringify(updated));
      return;
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .delete()
        .eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error(err);
    }
  };

  const filteredStaff = staff.filter(m => 
    m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    m.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3 text-slate-500 font-mono text-xs">
        <Loader2 className="animate-spin text-[#3ecf8e]" size={24} />
        Unlocking Roster Database...
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white tracking-tight">Personnel Intelligence</h2>
          <p className="text-slate-500 mt-1">Manage network roles, operational access, and shift assignments.</p>
        </div>
        <button 
          onClick={() => setShowModal(true)}
          className="bg-[#3ecf8e] text-[#020617] px-6 py-2.5 rounded text-[10px] uppercase tracking-[0.2em] font-bold hover:shadow-[0_0_20px_rgba(62,207,142,0.4)] transition-all flex items-center gap-2 cursor-pointer"
        >
          <UserPlus size={14} />
          Provision Access
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: 'Active Roster', value: staff.length, trend: '+2', color: 'text-[#3ecf8e]', icon: Users },
          { label: 'Network Admin', value: staff.filter(s => s.role === 'owner' || s.role === 'manager').length, trend: '0', color: 'text-blue-500', icon: Shield },
          { label: 'Shift Coverage', value: '98%', trend: '+4%', color: 'text-amber-500', icon: Clock },
        ].map((stat, i) => (
          <div key={i} className="p-4 rounded-2xl bg-slate-900/40 border border-slate-800/60 backdrop-blur-sm group hover:border-[#3ecf8e]/30 transition-all">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-none">{stat.label}</span>
              <stat.icon size={12} className="text-slate-700" />
            </div>
            <div className="flex items-end justify-between">
              <span className={cn("text-2xl font-bold text-white tracking-tight", i === 0 && "text-[#3ecf8e]")}>{stat.value}</span>
              <span className={cn("text-[9px] font-mono font-bold", stat.trend.startsWith('+') ? "text-green-500/80" : "text-slate-600")}>
                {stat.trend}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#0f172a]/30 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-sm">
        <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/40 flex items-center justify-between">
          <div className="flex items-center gap-4 flex-1 max-w-md">
            <div className="relative w-full">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-600" size={14} />
              <input 
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by identity or role..."
                className="w-full bg-[#020617]/50 border border-slate-800 rounded px-10 py-2 text-xs text-white placeholder-slate-700 focus:outline-none focus:border-[#3ecf8e]/30 focus:ring-1 focus:ring-[#3ecf8e]/20 transition-all font-mono"
              />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="p-2 text-slate-500 hover:text-white transition-colors">
              <Store size={16} />
            </button>
            <div className="w-px h-4 bg-slate-800 mx-2" />
            <span className="text-[9px] font-mono font-bold text-slate-600 uppercase tracking-widest">Displaying {filteredStaff.length} Entries</span>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-slate-800">
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-[#020617]/20">Identity Profile</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-[#020617]/20">Authority Level</th>
                <th className="text-left px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-[#020617]/20">Network Status</th>
                <th className="text-right px-6 py-4 text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] bg-[#020617]/20">Operational Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/50">
              {filteredStaff.map((member) => (
                <tr key={member.id} className="hover:bg-[#3ecf8e]/[0.02] transition-colors group">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-slate-900 border border-slate-800 rounded-lg flex items-center justify-center text-slate-500 group-hover:border-[#3ecf8e]/50 group-hover:text-[#3ecf8e] transition-all overflow-hidden relative shadow-lg">
                         <Shield size={20} />
                         <div className="absolute inset-x-0 bottom-0 h-1 bg-[#3ecf8e]/20" />
                      </div>
                      <div>
                        <div className="text-sm font-bold text-white tracking-tight font-mono">{member.email}</div>
                        <div className="text-[10px] font-mono text-slate-600 group-hover:text-slate-400 truncate max-w-[140px] uppercase tracking-tighter">ID: {member.id.split('-')[0]}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                     <div className="flex items-center gap-2">
                       <select 
                          value={member.role} 
                          onChange={(e) => updateProfile(member.id, { role: e.target.value as UserRole })}
                          className={cn(
                            "bg-[#020617] border border-slate-800 rounded text-[10px] font-mono font-bold uppercase tracking-widest px-2.5 py-1.5 focus:outline-none transition-all cursor-pointer",
                            member.role === 'owner' ? "text-[#3ecf8e] border-[#3ecf8e]/20 bg-[#3ecf8e]/10 shadow-[0_0_10px_rgba(62,207,142,0.05)]" : "text-slate-400"
                          )}
                        >
                          <option value="owner" className="bg-[#020617]">Owner</option>
                          <option value="manager" className="bg-[#020617]">Manager</option>
                          <option value="host" className="bg-[#020617]">Host</option>
                          <option value="waiter" className="bg-[#020617]">Waiter</option>
                        </select>
                     </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                       <div className="w-1.5 h-1.5 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.5)]" />
                       <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Synchronized</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="flex items-center gap-1">
                        {ALL_STORES.map(storeId => {
                          const hasAccess = member.assigned_stores.includes(storeId);
                          return (
                            <button
                              key={storeId}
                              onClick={() => {
                                const newStores = hasAccess 
                                  ? member.assigned_stores.filter(s => s !== storeId)
                                  : [...member.assigned_stores, storeId];
                                updateProfile(member.id, { assigned_stores: newStores });
                              }}
                              className={cn(
                                "w-6 h-6 rounded flex items-center justify-center text-[8px] font-bold transition-all border cursor-pointer font-mono",
                                hasAccess 
                                  ? "bg-[#3ecf8e]/20 text-[#3ecf8e] border-[#3ecf8e]/30" 
                                  : "bg-slate-900 text-slate-700 border-slate-800 hover:border-slate-700"
                              )}
                              title={`Store ${storeId}`}
                            >
                              {storeId.slice(-2)}
                            </button>
                          );
                        })}
                      </div>
                      <button 
                        onClick={() => handleDeleteStaff(member.id)}
                        className="text-slate-600 hover:text-red-500 p-2 transition-all hover:bg-slate-900 rounded border border-transparent hover:border-slate-800 cursor-pointer"
                        title="Delete Profile"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowModal(false)}
              className="absolute inset-0 bg-[#020617]/90 backdrop-blur-md"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#0f172a] border border-slate-800 rounded-2xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden"
            >
              <form onSubmit={handleSubmit} className="p-8 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#3ecf8e]/10 rounded-xl flex items-center justify-center text-[#3ecf8e] border border-[#3ecf8e]/20">
                    <UserPlus size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white tracking-tight">Provision Identity</h3>
                    <p className="text-xs text-slate-500 uppercase tracking-widest font-mono">Invite user to Enterprise Suite</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2 font-mono">Work Interface (Email)</label>
                    <input 
                      type="email" 
                      required
                      value={form.email}
                      onChange={(e) => setForm({ ...form, email: e.target.value })}
                      className="w-full bg-[#020617] border border-slate-800 rounded px-4 py-3 focus:outline-none focus:border-[#3ecf8e]/50 transition-all text-white font-mono text-sm"
                      placeholder="identity@tablemaitre.com"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 font-mono">Assign Authority</label>
                    <div className="grid grid-cols-4 gap-2">
                      {['waiter', 'host', 'manager', 'owner'].map((role) => (
                        <button
                          key={role}
                          type="button"
                          onClick={() => setForm({ ...form, role: role as UserRole })}
                          className={cn(
                            "py-2.5 rounded text-[10px] font-bold uppercase tracking-[0.2em] border transition-all font-mono cursor-pointer",
                            form.role === role 
                              ? "bg-[#3ecf8e] border-[#3ecf8e] text-[#020617] shadow-[0_0_15px_rgba(62,207,142,0.2)]" 
                              : "bg-[#020617] border-slate-800 text-slate-500 hover:border-slate-700"
                          )}
                        >
                          {role}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-3 font-mono">Spatial Access (Stores)</label>
                    <div className="flex flex-wrap gap-1.5">
                       {ALL_STORES.map(storeId => (
                        <button
                          key={storeId}
                          type="button"
                          onClick={() => toggleStore(storeId)}
                          className={cn(
                            "px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all border cursor-pointer",
                            form.stores.includes(storeId)
                              ? "bg-[#3ecf8e]/10 text-[#3ecf8e] border-[#3ecf8e]/30"
                              : "bg-[#020617] border-slate-800 text-slate-700 hover:border-slate-700"
                          )}
                        >
                           ST-{storeId}
                        </button>
                       ))}
                    </div>
                  </div>
                </div>

                {error && <p className="text-red-500 text-[10px] font-mono text-center uppercase tracking-widest">{error}</p>}

                <div className="flex gap-4 mt-8 pt-6 border-t border-slate-800/50">
                  <button 
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 py-3 px-6 bg-transparent text-slate-500 font-bold text-[10px] uppercase tracking-widest hover:text-white transition-all cursor-pointer"
                  >
                    Abort
                  </button>
                  <button 
                    type="submit"
                    disabled={submitting}
                    className="flex-[2] py-3 px-6 bg-[#3ecf8e] text-[#020617] font-bold rounded text-[10px] uppercase tracking-[0.2em] hover:shadow-[0_0_20px_rgba(62,207,142,0.3)] transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
                  >
                    {submitting ? 'Encrypting Payload...' : 'Initiate Provisioning'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
