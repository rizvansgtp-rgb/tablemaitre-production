import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, ChevronRight, LogOut, Loader2, RefreshCw } from 'lucide-react';
import { motion } from 'motion/react';

export default function StoreSelector() {
  const { profile, signOut, refreshProfile, loading, stores } = useAuth();
  const [loadingStore, setLoadingStore] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center">
        <Loader2 className="w-12 h-12 text-[#3ecf8e] animate-spin mb-4" />
        <p className="text-[#3ecf8e] font-bold uppercase tracking-widest text-[10px]">Syncing Profile Data</p>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6">
        <div className="bg-red-500/10 border border-red-500/30 p-8 rounded-3xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-500/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <Building2 className="text-red-500" size={32} />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Profile Not Found</h2>
          <p className="text-slate-400 text-sm mb-6 leading-relaxed">
            We couldn't retrieve your operational profile. This might be due to a synchronization delay or an incorrect database record.
          </p>
          
          <div className="bg-[#020617] p-4 rounded-xl border border-slate-800 text-left mb-8 space-y-2">
            <p className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Diagnostic Info</p>
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-600">User Email:</span>
              <span className="text-[10px] text-slate-400 font-mono">{useAuth().user?.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[10px] text-slate-600">Context ID:</span>
              <span className="text-[10px] text-slate-400 font-mono truncate ml-4" title={useAuth().user?.id}>{useAuth().user?.id?.substring(0, 12)}...</span>
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <button 
              onClick={() => refreshProfile()}
              className="w-full py-3 bg-[#3ecf8e] text-[#020617] rounded-xl font-bold uppercase tracking-widest text-[10px] hover:bg-[#3ecf8e]/90 transition-all flex items-center justify-center gap-2"
            >
              <RefreshCw size={14} className={loadingStore ? "animate-spin" : ""} />
              Force Retry Sync
            </button>
            <button 
              onClick={() => signOut()}
              className="w-full py-3 bg-slate-900 text-slate-400 rounded-xl font-bold uppercase tracking-widest text-[10px] border border-slate-800 hover:text-white transition-all"
            >
              Sign Out & Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignedStores = (profile?.assigned_stores || []).filter(storeId => {
    const isSpecialStore = storeId !== '0301' && storeId !== '0302';
    if (isSpecialStore) {
      return stores.some(s => s.id === storeId);
    }
    return true;
  }).map(storeId => {
    const dbStore = stores.find(s => s.id === storeId);
    return {
      id: storeId,
      name: dbStore ? dbStore.name : `Store ${storeId}`,
      address: dbStore?.location || 'Local Venue'
    };
  });

  const selectStore = async (storeId: string) => {
    if (!profile) return;
    setLoadingStore(storeId);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ active_store: storeId })
        .eq('id', profile.id);

      if (error) throw error;
      await refreshProfile();
    } catch (err) {
      console.error('Error selecting store:', err);
    } finally {
      setLoadingStore(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col items-center justify-center p-6 relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-[-10%] right-[-10%] w-[600px] h-[600px] bg-[#3ecf8e]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-[#3ecf8e]/3 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-2xl relative z-10"
      >
        <div className="flex items-center justify-between mb-12">
          <div>
            <h1 className="text-4xl font-bold text-white mb-2 tracking-tight">Select Location</h1>
            <p className="text-slate-500 font-medium">Welcome, <span className="text-[#3ecf8e] font-mono">{profile.email}</span>. Choose a primary venue.</p>
          </div>
          <button 
            onClick={() => signOut()}
            className="p-3 text-slate-500 hover:text-white hover:bg-slate-900 rounded-xl transition-all border border-transparent hover:border-slate-800 shadow-xl"
            title="Sign Out"
          >
            <LogOut size={20} />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assignedStores.length > 0 ? (
            assignedStores.map((store) => (
              <button
                key={store.id}
                onClick={() => selectStore(store.id)}
                disabled={loadingStore !== null}
                className="group relative bg-[#0f172a]/40 border border-slate-800 p-6 rounded-2xl text-left hover:border-[#3ecf8e]/30 hover:bg-[#0f172a]/60 transition-all duration-500 overflow-hidden backdrop-blur-sm"
              >
                <div className="flex items-start justify-between">
                  <div className="p-3 bg-slate-900 rounded-xl group-hover:bg-[#3ecf8e]/10 group-hover:text-[#3ecf8e] transition-colors border border-slate-800">
                    <Building2 size={24} />
                  </div>
                  {loadingStore === store.id ? (
                    <Loader2 className="animate-spin text-[#3ecf8e]" size={18} />
                  ) : (
                    <ChevronRight className="text-slate-700 group-hover:translate-x-1 transition-transform group-hover:text-[#3ecf8e]" />
                  )}
                </div>
                <div className="mt-6">
                  <span className="text-[10px] font-bold text-[#3ecf8e] uppercase tracking-[0.2em] leading-none mb-2 block">STORE IDENTIFIER: {store.id}</span>
                  <h3 className="text-xl font-bold text-white mt-1 group-hover:text-[#3ecf8e] transition-colors">{store.name}</h3>
                  <p className="text-sm text-slate-500 mt-2 font-mono">{store.address}</p>
                </div>
                {/* Subtle highlight effect */}
                <div className="absolute inset-x-0 bottom-0 h-[1px] bg-gradient-to-r from-transparent via-[#3ecf8e]/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))
          ) : (
            <div className="col-span-full py-20 text-center bg-[#0f172a]/20 border border-dashed border-slate-800 rounded-3xl backdrop-blur-sm">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center text-slate-700 mx-auto mb-4 border border-slate-800">
                <Building2 size={32} />
              </div>
              <p className="text-slate-400 font-bold uppercase tracking-widest text-xs mb-2">No stores assigned</p>
              <p className="text-sm text-slate-600 max-w-xs mx-auto">Please contact system administrator to grant venue permissions.</p>
            </div>
          )}
        </div>

        <p className="mt-12 text-center text-slate-600 text-[10px] uppercase tracking-[0.22em] font-bold">
          TableMaître Enterprise Suite &bull; V4 Revision
        </p>
      </motion.div>
    </div>
  );
}
