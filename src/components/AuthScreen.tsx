import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import { LogIn, UserPlus, AlertTriangle, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { isSupabaseConfigured } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

export default function AuthScreen() {
  const { signInDemo, signUpDemo } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
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
          if (signInDemo) {
            await signInDemo(email, role);
          }
        } else {
          if (signUpDemo) {
            await signUpDemo(email, role);
          }
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
          options: {
            // Note: If Supabase triggers aren't set up, we'd create the profile here.
            // But based on the prompt, it seems they expect user creation to flow properly.
            data: {
              email: email,
            }
          }
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
    <div className="min-h-screen flex items-center justify-center bg-[#020617] px-4 relative overflow-hidden">
      {/* Background Glow Effect */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-[#3ecf8e]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#3ecf8e]/3 rounded-full blur-[120px] pointer-events-none" />

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-[#0f172a]/50 border border-slate-800 rounded-2xl p-8 shadow-2xl backdrop-blur-md overflow-hidden relative z-10"
      >
        <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
           <img src="https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&q=80&w=300" alt="bg" className="w-32 h-32 object-cover rounded-full rotate-12" />
        </div>

        <div className="flex justify-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-[#3ecf8e] rounded-lg flex items-center justify-center text-slate-950 font-bold text-xl shadow-[0_0_15px_rgba(62,207,142,0.4)]">
              TM
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">TableMaître</h1>
          </div>
        </div>

        <div className="flex gap-4 mb-8 p-1 bg-slate-900/50 rounded-xl border border-slate-800">
          <button 
            type="button"
            onClick={() => {
              console.log('[Auth] Tab clicked: Sign In');
              setIsLogin(true);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${isLogin ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <LogIn size={16} />
            Sign In
          </button>
          <button 
            type="button"
            onClick={() => {
              console.log('[Auth] Tab clicked: Create Account');
              setIsLogin(false);
            }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${!isLogin ? 'bg-[#3ecf8e]/10 text-[#3ecf8e] border border-[#3ecf8e]/20 shadow-sm' : 'text-slate-400 hover:text-slate-200'}`}
          >
            <UserPlus size={16} />
            Create Account
          </button>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all"
              placeholder="name@restaurant.com"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all"
              placeholder="••••••••"
            />
          </div>

          {!isSupabaseConfigured && (
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-[0.2em] mb-1.5 ml-1">E2E Role Privilege (Demo Mode)</label>
              <select 
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="w-full bg-[#020617] border border-slate-800 rounded-xl px-4 py-3 text-[#3ecf8e] focus:outline-none focus:border-[#3ecf8e] focus:ring-1 focus:ring-[#3ecf8e] transition-all font-mono text-xs uppercase"
              >
                <option value="owner" className="bg-[#0f172a]">Owner (Admin, Full Access)</option>
                <option value="manager" className="bg-[#0f172a]">Manager (Admin, Full Access)</option>
                <option value="host" className="bg-[#0f172a]">Host (Staff, Limited Access)</option>
                <option value="waiter" className="bg-[#0f172a]">Waiter (Staff, Limited Access)</option>
              </select>
            </div>
          )}

          <AnimatePresence mode="wait">
            {!isSupabaseConfigured && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-amber-500/10 border border-amber-500/30 p-4 rounded-xl mb-6 flex gap-3"
              >
                <AlertTriangle className="text-amber-500 shrink-0" size={18} />
                <div className="space-y-2">
                  <p className="text-xs text-amber-200 leading-relaxed font-medium">
                    Supabase connection not detected. Please add your project credentials to the project secrets.
                  </p>
                  <button 
                    onClick={() => window.location.reload()}
                    className="text-[10px] uppercase tracking-wider font-bold text-amber-500 hover:text-amber-400 underline underline-offset-4"
                  >
                    Check connectivity again
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-500/10 border border-red-500/50 text-red-500 text-sm p-3 rounded-xl flex items-center gap-2 mb-4"
              >
                <span>⚠️ {error}</span>
              </motion.div>
            )}
            {message && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-[#3ecf8e]/10 border border-[#3ecf8e]/50 text-[#3ecf8e] text-sm p-3 rounded-xl"
              >
                {message}
              </motion.div>
            )}
          </AnimatePresence>

          <button 
            type="submit" 
            disabled={loading}
            className="w-full bg-[#3ecf8e] hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed text-[#020617] font-bold py-3.5 rounded-xl transition-all shadow-[0_0_20px_rgba(62,207,142,0.2)] active:scale-[0.98]"
          >
            {loading ? 'Processing...' : (isLogin ? 'Enter Workspace' : 'Initialize Profile')}
          </button>
        </form>

        <div className="mt-8 text-center text-slate-600 text-[10px] uppercase tracking-widest">
          Premium Restaurant Operations Suite v4.0.0
        </div>
      </motion.div>
    </div>
  );
}
