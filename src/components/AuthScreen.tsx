import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, AlertTriangle, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { signInDemo, signUpDemo } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState('owner');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    if (!isSupabaseConfigured) {
      try {
        if (isLogin) {
          if (signInDemo) await signInDemo(email, role);
        } else {
          if (signUpDemo) await signUpDemo(email, role);
          setMessage('Mock account initialized successfully in demo mode!');
        }
      } catch (err: any) {
        setError(err.message || 'Verification failed in demo mode.');
      } finally {
        setLoading(false);
      }
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { data: { email } }
        });
        if (error) throw error;
        setMessage('Check your email for the confirmation link!');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 relative overflow-hidden"
      style={{ background: 'var(--bg-deep)' }}>

      {/* Ambient Orbs */}
      <div className="bg-orb bg-orb-emerald animate-orb-1"
        style={{ width: 700, height: 700, top: '-20%', right: '-15%', opacity: 0.7 }} />
      <div className="bg-orb bg-orb-indigo animate-orb-2"
        style={{ width: 600, height: 600, bottom: '-20%', left: '-15%', opacity: 0.7 }} />
      <div className="bg-orb bg-orb-rose"
        style={{ width: 400, height: 400, top: '60%', right: '10%', opacity: 0.5 }} />

      {/* Background grid pattern */}
      <div className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(62,207,142,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(62,207,142,0.025) 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px'
        }} />

      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Card */}
        <div className="modal-box p-0">

          {/* Card top accent */}
          <div style={{
            height: 3,
            background: 'linear-gradient(90deg, transparent 0%, #3ecf8e 40%, #6366f1 80%, transparent 100%)',
            borderRadius: '20px 20px 0 0'
          }} />

          <div className="p-8">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1, duration: 0.4 }}
              className="flex justify-center mb-8"
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-11 h-11 rounded-xl flex items-center justify-center font-bold text-lg shadow-lg"
                  style={{
                    background: 'linear-gradient(135deg, #3ecf8e 0%, #059669 100%)',
                    color: '#040d18',
                    boxShadow: '0 0 24px rgba(62,207,142,0.35), 0 4px 12px rgba(0,0,0,0.4)'
                  }}
                >
                  TM
                </div>
                <div>
                  <h1 className="text-xl font-bold tracking-tight" style={{ color: 'var(--text-primary)', letterSpacing: '-0.03em' }}>
                    TableMaître
                  </h1>
                  <p className="text-xs" style={{ color: 'var(--text-muted)', letterSpacing: '0.06em' }}>Restaurant Operations Suite</p>
                </div>
              </div>
            </motion.div>

            {/* Auth Tab Toggle */}
            <div className="flex gap-1 mb-7 p-1 rounded-xl"
              style={{ background: 'rgba(0,0,0,0.30)', border: '1px solid var(--border-subtle)' }}>
              {[
                { id: 'login', label: 'Sign In', icon: LogIn },
                { id: 'signup', label: 'Create Account', icon: UserPlus }
              ].map(({ id, label, icon: Icon }) => {
                const active = (id === 'login') === isLogin;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => {
                      setIsLogin(id === 'login');
                      setError(null);
                      setMessage(null);
                    }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-semibold transition-all"
                    style={{
                      background: active ? 'rgba(62,207,142,0.12)' : 'transparent',
                      color: active ? 'var(--color-emerald)' : 'var(--text-muted)',
                      border: active ? '1px solid rgba(62,207,142,0.22)' : '1px solid transparent',
                      letterSpacing: '0.04em'
                    }}
                  >
                    <Icon size={14} />
                    {label}
                  </button>
                );
              })}
            </div>

            {/* Form */}
            <form onSubmit={handleAuth} className="space-y-4">
              {/* Email */}
              <div>
                <label className="label-glass">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-glass"
                  placeholder="name@restaurant.com"
                />
              </div>

              {/* Password */}
              <div>
                <label className="label-glass">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input-glass"
                    placeholder="••••••••"
                    style={{ paddingRight: '40px' }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 transition-colors"
                    style={{ color: 'var(--text-muted)' }}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              {/* Demo Role Selector */}
              {!isSupabaseConfigured && (
                <div>
                  <label className="label-glass">Demo Role Privilege</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="input-glass"
                    style={{ color: 'var(--color-emerald)', fontFamily: 'var(--font-mono)', textTransform: 'uppercase', fontSize: '11px' }}
                  >
                    <option value="owner" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Owner — Full Access</option>
                    <option value="manager" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Manager — Admin Access</option>
                    <option value="host" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Host — Limited Access</option>
                    <option value="waiter" style={{ background: 'var(--bg-surface)', color: 'var(--text-primary)' }}>Waiter — Floor Access</option>
                  </select>
                </div>
              )}

              {/* Status Messages */}
              <AnimatePresence mode="wait">
                {!isSupabaseConfigured && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.97 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="alert-warning"
                  >
                    <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold mb-0.5">Demo Mode Active</p>
                      <p className="opacity-80 text-xs">Supabase not configured. Using local data only.</p>
                      <button
                        type="button"
                        onClick={() => window.location.reload()}
                        className="text-[10px] uppercase tracking-wider font-bold mt-1 underline underline-offset-4 opacity-90 hover:opacity-100"
                      >
                        Retry connection
                      </button>
                    </div>
                  </motion.div>
                )}

                {error && (
                  <motion.div
                    key="error"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="alert-danger"
                  >
                    <ShieldCheck size={14} className="shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </motion.div>
                )}
                {message && (
                  <motion.div
                    key="message"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="alert-success"
                  >
                    {message}
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Submit */}
              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3.5 text-sm"
                style={{ marginTop: '8px' }}
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" strokeDasharray="60" strokeDashoffset="60" />
                    </svg>
                    Processing...
                  </span>
                ) : isLogin ? 'Sign In to Dashboard' : 'Create Account'}
              </button>
            </form>

            {/* Footer */}
            <p className="mt-7 text-center text-[10px] uppercase tracking-widest" style={{ color: 'var(--text-muted)', letterSpacing: '0.18em' }}>
              Premium Restaurant Suite · v4.0
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
