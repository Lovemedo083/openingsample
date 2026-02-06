import React, { useState } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Search, ArrowRight, Loader2, MessageCircle } from 'lucide-react';

interface LandingViewProps {
  onKakaoLogin: () => void;
  onGoToLogin: () => void;
}

export const LandingView: React.FC<LandingViewProps> = ({ onKakaoLogin, onGoToLogin }) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleStartKakaoLogin = async () => {
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
        // fallback: 일반 로그인 페이지로
        onGoToLogin();
      }
    } catch (e) {
      console.error('Login failed:', e);
      onGoToLogin();
    } finally {
      setIsLoading(false);
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
            onClick={onGoToLogin}
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
              onClick={handleStartKakaoLogin}
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

      {/* 하단 로고 */}
      <div className="pb-8 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <img src="/favicon-new.png" alt="오프닝" className="w-7 h-7 rounded-lg" />
          <span className="font-bold text-slate-300 text-sm">오프닝</span>
        </div>
      </div>
    </div>
  );
};
