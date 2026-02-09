import React, { useState, useEffect } from 'react';
import { Search, ArrowRight } from 'lucide-react';

const BUSINESS_EXAMPLES = [
  { emoji: '🍗', name: '교대역 치킨집', cost: '1억 2,000', color: 'from-amber-500 to-orange-500', saving: 34 },
  { emoji: '☕', name: '역삼동 카페', cost: '1억 4,000', color: 'from-amber-700 to-yellow-600', saving: 27 },
  { emoji: '🍶', name: '서초 요리주점', cost: '1억 6,000', color: 'from-rose-500 to-pink-500', saving: 26 },
  { emoji: '💪', name: '청담동 필라테스', cost: '9,000', color: 'from-violet-500 to-purple-500', saving: 31 },
];

interface LandingViewProps {
  onStart: () => void;
  onGoToLogin?: () => void;
  onAdminLogin?: (email: string, password: string) => Promise<boolean>;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart, onGoToLogin, onAdminLogin }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [logoTapCount, setLogoTapCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentIndex(prev => (prev + 1) % BUSINESS_EXAMPLES.length);
    }, 1600);
    return () => clearInterval(interval);
  }, []);
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminError, setAdminError] = useState('');

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
    <div className="h-[100dvh] w-full bg-white flex flex-col overflow-hidden">
      {/* 상단 바: 이미 진행중이세요? */}
      <div className="w-full bg-slate-50 border-b border-slate-100 shrink-0">
        <div className="max-w-lg mx-auto px-4 py-2.5 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-500 text-xs">
            <Search size={12} className="text-slate-400" />
            <span>이미 회원이신가요?</span>
          </div>
          <button
            onClick={onGoToLogin || onStart}
            className="text-brand-600 text-xs font-bold hover:text-brand-700 transition-colors"
          >
            로그인하기
          </button>
        </div>
      </div>

      {/* 메인 히어로 */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 min-h-0">
        <div className="max-w-lg w-full text-center">
          {/* 히어로 텍스트 */}
          <h1 className="text-2xl font-bold text-slate-900 leading-tight mb-1">
            <span className="text-brand-600">창업비용</span> 간편하게
            <br />
            확인해보세요
          </h1>

          {/* 비주얼: 업종별 비용 슬라이드 */}
          <div className="my-6 flex flex-col items-center gap-3">
            <div className="relative">
              {/* 절약 퍼센트 배지 — 원 바깥에 위치 */}
              <div className="absolute top-3 -right-4 z-20">
                <div
                  key={`badge-${currentIndex}`}
                  className="bg-amber-500 text-white font-extrabold text-sm px-3.5 py-1.5 rounded-full shadow-lg whitespace-nowrap"
                  style={{ textShadow: '0 1px 2px rgba(0,0,0,0.15)', animation: 'fadeIn 0.7s ease-in-out' }}
                >
                  평균 {BUSINESS_EXAMPLES[currentIndex].saving}% 절약
                </div>
              </div>
              <div className="w-48 h-48 rounded-full border-2 border-brand-200 flex items-center justify-center overflow-hidden">
                {/* 활성 카드 1개만 렌더링 */}
                <div
                  key={`card-${currentIndex}`}
                  className="flex flex-col items-center justify-center"
                  style={{ animation: 'fadeIn 0.7s ease-in-out' }}
                >
                  <span className="text-4xl mb-1">{BUSINESS_EXAMPLES[currentIndex].emoji}</span>
                  <p className="text-xs font-medium text-slate-400">{BUSINESS_EXAMPLES[currentIndex].name}</p>
                  <p className="text-brand-700 font-black text-2xl tracking-tight mt-0.5">
                    {BUSINESS_EXAMPLES[currentIndex].cost}<span className="text-base font-bold text-brand-400">만원</span>
                  </p>
                </div>
              </div>
            </div>
            {/* 인디케이터 */}
            <div className="flex gap-1.5">
              {BUSINESS_EXAMPLES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-4 bg-brand-500' : 'w-1.5 bg-slate-200'
                  }`}
                />
              ))}
            </div>
            <p className="text-xs text-slate-300">*강남구 기준</p>
          </div>

          {/* CTA 버튼 */}
          <div className="space-y-2">
            <button
              onClick={onStart}
              className="w-full max-w-xs mx-auto bg-brand-600 hover:bg-brand-700 text-white font-bold py-3.5 px-6 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2 text-base"
            >
              창업비용 확인하기
              <ArrowRight size={18} />
            </button>
            <p className="text-xs text-slate-300">
              * 업종/지역/규모에 따라 달라질 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 하단 로고 (5회 탭 → 관리자 로그인) */}
      <div className="py-4 text-center shrink-0">
        <button onClick={handleLogoTap} className="inline-flex items-center justify-center gap-2.5">
          <img src="/favicon-new.png" alt="오프닝" className="w-9 h-9 rounded-xl" />
          <span className="font-bold text-slate-400 text-sm">오프닝</span>
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
