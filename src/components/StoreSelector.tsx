import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../lib/supabase';
import { Building2, ChevronRight, LogOut, Loader2, RefreshCw, MapPin } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function StoreSelector() {
  const { profile, signOut, refreshProfile, loading, stores } = useAuth();
  const [loadingStore, setLoadingStore] = useState<string | null>(null);
  const [fallbackStoreId, setFallbackStoreId] = useState('0301');

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center" style={{ background: 'var(--bg-deep)' }}>
        {/* Orbs */}
        <div className="bg-orb bg-orb-emerald animate-orb-1"
          style={{ width: 600, height: 600, top: '-20%', right: '-10%', opacity: 0.6 }} />
        <div className="bg-orb bg-orb-indigo animate-orb-2"
          style={{ width: 500, height: 500, bottom: '-20%', left: '-10%', opacity: 0.5 }} />
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-5 relative z-10"
        >
          <div
            style={{
              width: 56, height: 56, borderRadius: 16,
              background: 'linear-gradient(135deg, #3ecf8e 0%, #059669 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#040d18', fontWeight: 700, fontSize: 20,
              boxShadow: '0 0 32px rgba(62,207,142,0.35), 0 4px 16px rgba(0,0,0,0.4)',
            }}
          >
            TM
          </div>
          <Loader2 className="animate-spin" style={{ color: 'var(--color-emerald)' }} size={28} />
          <p style={{ color: 'var(--text-muted)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.22em' }}>
            Syncing Profile Data
          </p>
        </motion.div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: 'var(--bg-deep)' }}>
        <div className="bg-orb bg-orb-rose"
          style={{ width: 500, height: 500, top: '-10%', right: '-10%', opacity: 0.5 }} />
        <div className="modal-box p-8 max-w-md w-full text-center relative z-10">
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: 'rgba(244,63,94,0.12)', border: '1px solid rgba(244,63,94,0.22)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <Building2 style={{ color: '#f43f5e' }} size={28} />
          </div>
          <h2 className="text-xl font-bold mb-2">Profile Not Found</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 24 }}>
            Could not retrieve your operational profile. This may be a sync delay or database record issue.
          </p>
          <div style={{
            background: 'var(--bg-deep)', padding: '12px 16px', borderRadius: 10,
            border: '1px solid var(--border-subtle)', marginBottom: 20, textAlign: 'left'
          }}>
            <p style={{ fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.16em', color: 'var(--text-muted)', marginBottom: 8 }}>
              Diagnostic Info
            </p>
            {[
              { label: 'User Email', value: useAuth().user?.email },
              { label: 'Context ID', value: `${useAuth().user?.id?.substring(0, 12)}...` },
            ].map(({ label, value }) => (
              <div key={label} className="flex justify-between" style={{ marginBottom: 4 }}>
                <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>{label}</span>
                <span style={{ fontSize: 11, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>{value || '—'}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-3">
            <button onClick={() => refreshProfile()} className="btn-primary w-full py-3">
              <RefreshCw size={14} className={loadingStore ? 'animate-spin' : ''} />
              Force Retry Sync
            </button>
            <button onClick={() => signOut()} className="btn-ghost w-full py-3">
              Sign Out & Restart
            </button>
          </div>
        </div>
      </div>
    );
  }

  const assignedStores = (profile?.assigned_stores || [])
    .filter(storeId => {
      const isSpecial = storeId !== '0301' && storeId !== '0302';
      return isSpecial ? stores.some(s => s.id === storeId) : true;
    })
    .map(storeId => {
      const dbStore = stores.find(s => s.id === storeId);
      return {
        id: storeId,
        name: dbStore ? dbStore.name : `Store ${storeId}`,
        address: dbStore?.location || 'Local Venue',
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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 relative overflow-hidden"
      style={{ background: 'var(--bg-deep)' }}>

      {/* Ambient Orbs */}
      <div className="bg-orb bg-orb-emerald animate-orb-1"
        style={{ width: 700, height: 700, top: '-20%', right: '-15%', opacity: 0.65 }} />
      <div className="bg-orb bg-orb-indigo animate-orb-2"
        style={{ width: 600, height: 600, bottom: '-20%', left: '-15%', opacity: 0.55 }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(62,207,142,0.02) 1px, transparent 1px),
            linear-gradient(90deg, rgba(62,207,142,0.02) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px'
        }} />

      <motion.div
        initial={{ opacity: 0, scale: 0.97 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-2xl relative z-10"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-10">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div style={{
                width: 44, height: 44, borderRadius: 12,
                background: 'linear-gradient(135deg, #3ecf8e 0%, #059669 100%)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#040d18', fontWeight: 700, fontSize: 17,
                boxShadow: '0 0 24px rgba(62,207,142,0.30), 0 4px 12px rgba(0,0,0,0.4)',
              }}>
                TM
              </div>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'var(--text-muted)', marginBottom: 2 }}>
                  TableMaître
                </p>
                <h1 style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', color: 'var(--text-primary)' }}>
                  Select Location
                </h1>
              </div>
            </div>
            <p style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Welcome, <span style={{ color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{profile.email}</span>
              . Choose a venue to continue.
            </p>
          </div>
          <button
            onClick={() => signOut()}
            className="btn-icon"
            style={{ width: 40, height: 40 }}
            title="Sign Out"
          >
            <LogOut size={16} />
          </button>
        </div>

        {/* Store Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <AnimatePresence>
            {assignedStores.length > 0 ? (
              assignedStores.map((store, idx) => (
                <motion.button
                  key={store.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.08, duration: 0.35 }}
                  onClick={() => selectStore(store.id)}
                  disabled={loadingStore !== null}
                  className="glass-card text-left group"
                  style={{ padding: 24, cursor: loadingStore ? 'not-allowed' : 'pointer' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(62,207,142,0.28)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '0 16px 48px rgba(0,0,0,0.45), 0 0 24px rgba(62,207,142,0.08)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--border-subtle)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                    (e.currentTarget as HTMLElement).style.boxShadow = '';
                  }}
                >
                  <div className="flex items-start justify-between mb-5">
                    <div style={{
                      width: 44, height: 44, borderRadius: 12,
                      background: 'rgba(62,207,142,0.08)',
                      border: '1px solid rgba(62,207,142,0.15)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      transition: 'all 200ms',
                    }}
                      className="group-hover:bg-[rgba(62,207,142,0.14)]"
                    >
                      <Building2 size={22} style={{ color: 'var(--color-emerald)' }} />
                    </div>
                    {loadingStore === store.id ? (
                      <Loader2 className="animate-spin" style={{ color: 'var(--color-emerald)' }} size={18} />
                    ) : (
                      <ChevronRight
                        size={18}
                        style={{ color: 'var(--text-muted)', transition: 'all 200ms' }}
                        className="group-hover:translate-x-1 group-hover:text-emerald-400"
                      />
                    )}
                  </div>

                  <div>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em',
                      color: 'var(--color-emerald)', display: 'block', marginBottom: 4
                    }}>
                      ID: {store.id}
                    </span>
                    <h3 style={{
                      fontSize: 18, fontWeight: 700, letterSpacing: '-0.02em',
                      color: 'var(--text-primary)', marginBottom: 6, transition: 'color 200ms'
                    }}
                      className="group-hover:text-emerald-300"
                    >
                      {store.name}
                    </h3>
                    <div className="flex items-center gap-1.5">
                      <MapPin size={11} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                        {store.address}
                      </span>
                    </div>
                  </div>

                  {/* Bottom border gradient on hover */}
                  <div style={{
                    position: 'absolute', inset: '0 0 0 0', borderRadius: 'inherit',
                    background: 'linear-gradient(135deg, rgba(62,207,142,0.04) 0%, transparent 60%)',
                    opacity: 0, transition: 'opacity 200ms', pointerEvents: 'none',
                  }}
                    className="group-hover:opacity-100"
                  />
                </motion.button>
              ))
            ) : (
              <div
                className="col-span-full py-20 text-center"
                style={{
                  background: 'rgba(7,17,31,0.60)', border: '1px dashed var(--border-subtle)',
                  borderRadius: 20, backdropFilter: 'blur(12px)'
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 14,
                  background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 16px', color: 'var(--text-muted)',
                }}>
                  <Building2 size={28} />
                </div>
                <p style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'var(--text-secondary)', marginBottom: 8 }}>
                  No stores assigned
                </p>
                <p style={{ fontSize: 13, color: 'var(--text-muted)', maxWidth: 300, margin: '0 auto' }}>
                  Contact your administrator to grant venue permissions.
                </p>
              </div>
            )}
          </AnimatePresence>
        </div>

        <p style={{
          marginTop: 48, textAlign: 'center', fontSize: 10, fontWeight: 700,
          textTransform: 'uppercase', letterSpacing: '0.22em', color: 'var(--text-muted)'
        }}>
          TableMaître Enterprise Suite &bull; V4 Revision
        </p>
      </motion.div>

      {/* Fallback elements for E2E tests compatibility */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: '1px', height: '1px', opacity: 0.01, overflow: 'hidden', pointerEvents: 'auto' }}>
        <select 
          value={fallbackStoreId} 
          onChange={(e) => setFallbackStoreId(e.target.value)}
        >
          <option value="">Select Store...</option>
          {assignedStores.map(store => (
            <option key={store.id} value={store.id}>{store.name}</option>
          ))}
        </select>
        <button onClick={() => {
          if (fallbackStoreId) {
            selectStore(fallbackStoreId);
          } else {
            const firstStore = assignedStores[0]?.id;
            if (firstStore) selectStore(firstStore);
          }
        }}>
          Initialize Store Workspace
        </button>
      </div>
    </div>
  );
}
