import React, { useState, useEffect } from 'react';
import { Search, ArrowRight } from 'lucide-react';

const BUSINESS_EXAMPLES = [
  { emoji: '🍗', name: '우리동네 치킨집', cost: '1억 2,000', color: 'from-amber-500 to-orange-500' },
  { emoji: '☕', name: '우리동네 카페', cost: '1억 4,000', color: 'from-amber-700 to-yellow-600' },
  { emoji: '🍶', name: '우리동네 요리술집', cost: '1억 6,000', color: 'from-rose-500 to-pink-500' },
  { emoji: '🍰', name: '우리동네 베이커리', cost: '1억 8,000', color: 'from-pink-400 to-rose-400' },
  { emoji: '💪', name: '우리동네 필라테스', cost: '9,000', color: 'from-violet-500 to-purple-500' },
  { emoji: '💇', name: '우리동네 미용실', cost: '8,500', color: 'from-teal-500 to-emerald-500' },
  { emoji: '🍜', name: '우리동네 분식집', cost: '7,000', color: 'from-red-500 to-orange-400' },
];

interface LandingViewProps {
  onStart: () => void;
  onAdminLogin?: (email: string, password: string) => Promise<boolean>;
}

export const LandingView: React.FC<LandingViewProps> = ({ onStart, onAdminLogin }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [logoTapCount, setLogoTapCount] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentIndex(prev => (prev + 1) % BUSINESS_EXAMPLES.length);
        setIsAnimating(false);
      }, 300);
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
            <span>이미 진행중이세요?</span>
          </div>
          <button
            onClick={onStart}
            className="text-brand-600 text-xs font-bold hover:text-brand-700 transition-colors"
          >
            내 프로젝트 보기
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
            <div className="relative w-full max-w-xs h-32 flex items-center justify-center overflow-hidden">
              {(() => {
                const item = BUSINESS_EXAMPLES[currentIndex];
                return (
                  <div
                    key={currentIndex}
                    className={`absolute inset-0 flex flex-col items-center justify-center transition-all duration-300 ${
                      isAnimating ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'
                    }`}
                  >
                    <span className="text-5xl mb-2">{item.emoji}</span>
                    <p className="text-sm font-bold text-slate-500">{item.name}</p>
                    <p className="text-slate-900 font-black text-2xl tracking-tight mt-0.5">
                      <span className={`bg-gradient-to-r ${item.color} bg-clip-text text-transparent`}>
                        {item.cost}
                      </span>
                      <span className="text-lg font-bold text-slate-400">만원</span>
                      <span className="text-xs text-slate-300 font-medium ml-1">평균</span>
                    </p>
                  </div>
                );
              })()}
            </div>
            {/* 인디케이터 */}
            <div className="flex gap-1.5">
              {BUSINESS_EXAMPLES.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 rounded-full transition-all duration-300 ${
                    i === currentIndex ? 'w-4 bg-brand-500' : 'w-1 bg-slate-200'
                  }`}
                />
              ))}
            </div>
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
            <p className="text-[11px] text-slate-300">
              * 업종/지역/규모에 따라 달라질 수 있습니다
            </p>
          </div>
        </div>
      </div>

      {/* 하단 로고 (5회 탭 → 관리자 로그인) */}
      <div className="py-4 text-center shrink-0">
        <button onClick={handleLogoTap} className="inline-flex items-center justify-center gap-2">
          <img src="/favicon-new.png" alt="오프닝" className="w-6 h-6 rounded-lg" />
          <span className="font-bold text-slate-300 text-xs">오프닝</span>
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
