import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { DoorOpen, ArrowRight, Lock, Mail, Loader2, Sparkles } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({ onLoginSuccess }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isRegister, setIsRegister] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert("회원가입 확인 이메일을 발송했습니다. 확인 후 로그인해주세요.");
        setIsRegister(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        onLoginSuccess();
      }
    } catch (err: any) {
      setError(err.message || "인증 중 오류가 발생했습니다.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleGuestLogin = () => {
    // For demo/guest access
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen w-full bg-[#F8FAFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Dynamic Background Elements */}
      <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-brand-200/40 rounded-full blur-3xl animate-pulse" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-200/30 rounded-full blur-3xl" />

      <div className="w-full max-w-md relative z-10 animate-scale-in">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-brand-600 rounded-2xl flex items-center justify-center text-white mx-auto mb-4 shadow-lg shadow-brand-500/30">
            <DoorOpen size={32} strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight mb-2">오프닝</h1>
          <p className="text-slate-500 font-medium">성공적인 창업의 시작과 끝</p>
        </div>

        {/* Auth Card */}
        <div className="glass-panel rounded-3xl p-8 backdrop-blur-xl">
          <div className="flex gap-4 mb-8 p-1 bg-slate-100/50 rounded-xl">
            <button 
              onClick={() => setIsRegister(false)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${!isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              로그인
            </button>
            <button 
              onClick={() => setIsRegister(true)}
              className={`flex-1 py-2.5 text-sm font-bold rounded-lg transition-all ${isRegister ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              회원가입
            </button>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">이메일</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input 
                  type="email" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
                  placeholder="name@example.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 ml-1">비밀번호</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-3.5 text-slate-400 group-focus-within:text-brand-500 transition-colors" size={20} />
                <input 
                  type="password" 
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-slate-50 border-none rounded-xl py-3.5 pl-12 pr-4 text-slate-900 font-medium focus:ring-2 focus:ring-brand-500 transition-all placeholder:text-slate-400"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-50 text-red-600 text-sm font-medium rounded-lg flex items-center gap-2 animate-fade-in">
                <span>⚠️</span> {error}
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-4 rounded-xl shadow-lg shadow-brand-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mt-4"
            >
              {isLoading ? <Loader2 className="animate-spin" /> : (isRegister ? '회원가입' : '로그인')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-slate-100">
             <button 
                type="button"
                onClick={handleGuestLogin}
                className="w-full py-3 px-4 rounded-xl border-2 border-slate-100 text-slate-600 font-bold hover:bg-slate-50 hover:border-slate-200 transition-all flex items-center justify-center gap-2"
             >
                <Sparkles size={18} className="text-yellow-500" />
                게스트로 둘러보기
             </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-8">
          © 2026 Opening Inc. All rights reserved.
        </p>
      </div>
    </div>
  );
};
