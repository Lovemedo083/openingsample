import React, { useState } from 'react';
import { User } from '../types';
import { supabase } from '../utils/supabaseClient';
import {
  User as UserIcon, LogOut, Bell, ChevronRight,
  FileText, CreditCard, FileCheck, MessageCircle, X, Info
} from 'lucide-react';

interface MyPageViewProps {
  user: User | null;
  onLogout: () => void;
  consultingCount?: number;
  quoteCount?: number;
}

export const MyPageView: React.FC<MyPageViewProps> = ({ user, onLogout, consultingCount = 0, quoteCount = 0 }) => {
  const [toast, setToast] = useState<string | null>(null);

  const showComingSoon = (label: string) => {
    setToast(`${label} 기능은 준비중입니다`);
    setTimeout(() => setToast(null), 2000);
  };

  const handleKakaoLogin = async () => {
    const redirectUrl = window.location.hostname === 'localhost'
      ? window.location.origin
      : 'https://opening.run';

    await supabase.auth.signInWithOAuth({
      provider: 'kakao',
      options: { redirectTo: redirectUrl },
    });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 프로필 헤더 */}
      <div className="bg-white px-4 pt-6 pb-6 border-b border-slate-100">
        <h1 className="text-xl font-bold text-slate-900 mb-5">마이페이지</h1>

        {user ? (
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-brand-100 rounded-full flex items-center justify-center text-brand-600 font-bold text-xl">
              {user.name[0]}
            </div>
            <div className="flex-1">
              <p className="font-bold text-lg text-slate-900">{user.name} 사장님</p>
              <p className="text-sm text-slate-400">{user.phone || '게스트'}</p>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-slate-500 mb-4">로그인하고 나의 창업을 관리하세요</p>
            <button
              onClick={handleKakaoLogin}
              className="w-full bg-[#FEE500] text-[#3C1E1E] font-bold py-3 rounded-xl flex items-center justify-center gap-2"
            >
              <MessageCircle size={18} />
              카카오로 로그인
            </button>
          </div>
        )}
      </div>

      {/* 내 현황 */}
      {user && (
        <div className="px-4 pt-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">진행중 상담</p>
              <p className="font-bold text-lg text-brand-600">{consultingCount}건</p>
            </div>
            <div className="bg-white rounded-xl border border-slate-100 p-4 text-center">
              <p className="text-xs text-slate-400 mb-1">받은 견적</p>
              <p className="font-bold text-lg text-slate-900">{quoteCount}건</p>
            </div>
          </div>
        </div>
      )}

      {/* 메뉴 */}
      <div className="p-4 space-y-4">
        {user && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">내 계정</h3>
            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
              <MenuItem icon={UserIcon} label="내 정보 관리" sub="이름·연락처 수정" onClick={() => showComingSoon('내 정보 관리')} />
              <MenuItem icon={Bell} label="알림 설정" onClick={() => showComingSoon('알림 설정')} />
            </div>
          </section>
        )}

        {user && (
          <section>
            <h3 className="text-xs font-bold text-slate-400 mb-2 px-1">내 문서</h3>
            <div className="bg-white rounded-xl border border-slate-100 divide-y divide-slate-100">
              <MenuItem icon={FileText} label="저장된 견적서" onClick={() => showComingSoon('저장된 견적서')} />
              <MenuItem icon={FileCheck} label="계약/확정 내역" onClick={() => showComingSoon('계약/확정 내역')} />
              <MenuItem icon={CreditCard} label="결제 영수증" onClick={() => showComingSoon('결제 영수증')} />
            </div>
          </section>
        )}

        {user && (
          <button
            onClick={onLogout}
            className="w-full py-3 text-sm text-slate-400 font-medium flex items-center justify-center gap-2 hover:text-slate-600 transition-colors"
          >
            <LogOut size={16} />
            로그아웃
          </button>
        )}
      </div>

      <div className="p-4 text-center">
        <p className="text-[10px] text-slate-300 leading-relaxed">
          (주)오프닝 | 서울시 강남구 테헤란로 123<br />
          고객센터: 1544-0000 (평일 10:00 - 18:00)
        </p>
      </div>

      {/* 준비중 토스트 */}
      {toast && (
        <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 bg-slate-800 text-white text-sm px-5 py-3 rounded-2xl shadow-lg flex items-center gap-2 animate-fade-in">
          <Info size={16} className="text-slate-300 shrink-0" />
          {toast}
        </div>
      )}
    </div>
  );
};

const MenuItem: React.FC<{
  icon: any;
  label: string;
  sub?: string;
  onClick?: () => void;
}> = ({ icon: Icon, label, sub, onClick }) => (
  <button onClick={onClick} className="w-full p-4 flex items-center justify-between hover:bg-slate-50 transition-colors">
    <div className="flex items-center gap-3">
      <Icon size={18} className="text-slate-400" />
      <div className="text-left">
        <span className="text-sm font-medium text-slate-900">{label}</span>
        {sub && <p className="text-[10px] text-slate-400">{sub}</p>}
      </div>
    </div>
    <ChevronRight size={16} className="text-slate-300" />
  </button>
);
