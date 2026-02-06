import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Search, Loader2, MessageCircle } from 'lucide-react';

interface LandingViewProps {
  onAdminLogin?: (email: string, password: string) => Promise<boolean>;
}

export const LandingView: React.FC<LandingViewProps> = ({ onAdminLogin }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

  const handleKakaoLogin = async () => {
    setIsLoading(true);
    try {
      const redirectUrl = window.location.hostname === 'localhost'
        ? window.location.origin
        : 'https://opening.run';

      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: {
          redirectTo: redirectUrl,
        },
      });

      if (error) {
        console.error('Kakao login error:', error);
        alert('로그인에 실패했습니다. 다시 시도해주세요.');
      }
    } catch (e) {
      console.error('Login failed:', e);
      alert('로그인에 실패했습니다. 다시 시도해주세요.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoTap = () => {
    const newCount = logoTapCount + 1;
    setLogoTapCount(newCount);
    if (newCount >= 5) {
      setShowAdminLogin(true);
      setLogoTapCount(0);
    }
    setTimeout(() => setLogoTapCount(0), 3000);
  };

  const handleAdminSubmit = async () => {
    if (!onAdminLogin) return;
    setAdminError('');
    const success = await onAdminLogin(adminEmail, adminPassword);
    if (!success) {
      setAdminError('로그인 실패');
    }
  };

  return (
    <div className="min-h-screen w-full bg-white flex flex-col">
      {/* 상단 바: 이미 진행중이세요? */}
      <div className="w-full bg-slate-50 border-b border-slate-100">
        <div className="max-w-lg mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Search size={14} className="text-slate-400" />
            <span>이미 진행중이세요?</span>
          </div>
          <button
            onClick={handleKakaoLogin}
            className="text-brand-600 text-sm font-bold hover:text-brand-700 transition-colors"
          >
            내 프로젝트 보기
          </button>
        </div>
      </div>

      {/* 메인 히어로 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 pb-12">
        <div className="max-w-lg w-full text-center">
          {/* 히어로 텍스트 */}
          <h1 className="text-3xl font-bold text-slate-900 leading-tight mb-2 animate-fade-in">
            <span className="text-brand-600">창업비용</span> 간편하게
            <br />
            확인해보세요
          </h1>

          {/* 비주얼 요소: 평균 비용 표시 */}
          <div className="relative my-10 flex justify-center animate-scale-in">
            <div className="relative">
              <div className="w-64 h-64 rounded-full bg-gradient-to-br from-slate-100 to-slate-50 flex items-center justify-center shadow-inner">
                <div className="bg-slate-800 rounded-2xl px-8 py-5 shadow-2xl">
                  <p className="text-slate-400 text-sm font-medium mb-1">평균</p>
                  <p className="text-white text-3xl font-black tracking-tight">
                    4,200<span className="text-xl font-bold">만원</span><span className="text-base text-slate-400">*</span>
                  </p>
                </div>
              </div>
              <div className="absolute -top-2 -right-2 w-8 h-8 bg-brand-100 rounded-full opacity-60" />
              <div className="absolute -bottom-3 -left-4 w-12 h-12 bg-brand-50 rounded-full opacity-80" />
            </div>
          </div>

          {/* CTA 버튼: 카카오 로그인 */}
          <div className="animate-slide-up space-y-3">
            <button
              onClick={handleKakaoLogin}
              disabled={isLoading}
              className="w-full max-w-sm mx-auto bg-[#FEE500] hover:bg-[#F5DC00] text-[#3C1E1E] font-bold py-4 px-8 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-lg"
            >
              {isLoading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <MessageCircle size={20} />
                  창업비용 확인하기
                </>
              )}
            </button>
            <p className="text-xs text-slate-400">
              카카오 로그인으로 간편하게 시작합니다
            </p>
            <p className="text-xs text-slate-300">
              * 업종/지역/규모에 따라 달라질 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 하단 로고 (5회 탭 → 관리자 로그인) */}
      <div className="pb-8 text-center">
        <button onClick={handleLogoTap} className="inline-flex items-center justify-center gap-2 mb-2">
          <img src="/favicon-new.png" alt="오프닝" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-slate-300 text-sm">오프닝</span>
        </button>
      </div>

      {/* 관리자/PM 로그인 모달 (숨김) */}
      {showAdminLogin && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
            <h3 className="text-lg font-bold text-slate-900 mb-4">관리자 로그인</h3>
            <input
              type="text"
              placeholder="이메일"
              value={adminEmail}
              onChange={(e) => setAdminEmail(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-3"
            />
            <input
              type="password"
              placeholder="비밀번호"
              value={adminPassword}
              onChange={(e) => setAdminPassword(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm mb-3"
            />
            {adminError && <p className="text-red-500 text-sm mb-3">{adminError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => setShowAdminLogin(false)}
                className="flex-1 py-3 rounded-xl border border-slate-200 text-sm font-medium text-slate-600"
              >
                취소
              </button>
              <button
                onClick={handleAdminSubmit}
                className="flex-1 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold"
              >
                로그인
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
