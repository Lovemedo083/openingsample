import React, { useState } from 'react';
import { User, MainTab } from '../types';
import { supabase } from '../utils/supabaseClient';
import { Button, Badge } from './Components';
import {
  User as UserIcon, LogOut, FileText, HelpCircle,
  ShieldAlert, Wrench, Building2, ChevronRight, MessageCircle,
  Phone, Bell, CreditCard, FileCheck, Search, ChevronDown,
  AlertTriangle, Clock, Box, RefreshCw, ClipboardList, Users,
  Banknote, MapPin, Armchair, Rocket, Sparkles
} from 'lucide-react';

interface MoreViewProps {
  user: User | null;
  onLogin: (type: 'KAKAO' | 'PHONE') => void;
  onLogout: () => void;
  consultingCount: number;
  quoteCount: number;
  onNavigate?: (tab: MainTab) => void;
  hasActiveProject?: boolean;
  onStartNewProject?: () => void;
}

// FAQ Data Structure
const FAQ_CATEGORIES = [
    { id: 'ALL', label: '전체' },
    { id: 'COMMON', label: '일반/개요' },
    { id: 'LISTING', label: '홈vs매물' },
    { id: 'QUOTE', label: '견적/비용' },
    { id: 'SCHEDULE', label: '일정/설치' },
    { id: 'WARRANTY', label: '검수/보증' },
    { id: '3D', label: '3D인테리어' },
];

const FAQ_ITEMS = [
    { id: 1, category: '3D', q: '3D 체험 링크가 안 와요.', a: '3D 인테리어 체험 링크는 작업 완료 후 카카오톡 링크로 발송됩니다. 보통 영업일 기준 3~5일 소요됩니다.' },
    { id: 2, category: 'SCHEDULE', q: '설치 일정이 밀리면 어떻게 하나요?', a: '천재지변이나 건물 측 사유가 아닌 경우, 지연 보상 정책에 따라 보상해 드립니다.' },
    { id: 3, category: 'WARRANTY', q: '설치 후 하자가 발견되면요?', a: '인수 확인서 서명 전 발견된 하자는 즉시 교체/수리해 드립니다. 보증 기간 내 발생한 문제는 CS센터로 접수해주세요.' },
    { id: 4, category: 'QUOTE', q: '견적에 포함된 범위가 어디까지인가요?', a: '견적서 상세 화면의 [포함 범위] 섹션에서 아이콘으로 구분하여 확인하실 수 있습니다.' },
    { id: 5, category: 'LISTING', q: '홈의 매물과 매물 탭의 차이가 뭔가요?', a: '홈은 타 점주님의 직거래/정리 매물이며, 매물 탭은 오프닝이 직접 검수하고 보증하는 인증 패키지입니다.' },
];

export const MoreView: React.FC<MoreViewProps> = ({
    user, onLogout, consultingCount, quoteCount, onNavigate, hasActiveProject, onStartNewProject
}) => {
  const [viewState, setViewState] = useState<'MENU' | 'FAQ'>('MENU');
  const [faqCategory, setFaqCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // 실제 로그인 핸들러
  const handleSupabaseLogin = async (provider: 'kakao' | 'google') => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: provider,
        options: {
          redirectTo: window.location.origin, // 로그인 완료 후 돌아올 현재 URL
        }
      });
      if (error) throw error;
    } catch (error: any) {
      alert('로그인 중 오류가 발생했습니다: ' + error.message);
    }
  };

  // --- Sub-View: FAQ Section ---
  const renderFAQ = () => {
      const filteredFaqs = FAQ_ITEMS.filter(item => {
          const catMatch = faqCategory === 'ALL' || item.category === faqCategory;
          const searchMatch = item.q.includes(searchQuery) || item.a.includes(searchQuery);
          return catMatch && searchMatch;
      });

      return (
          <div className="min-h-screen bg-white pb-20 animate-in slide-in-from-right">
              {/* FAQ Header */}
              <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
                  <div className="flex items-center px-4 h-14 gap-3">
                      <button onClick={() => setViewState('MENU')} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
                          <ChevronRight className="rotate-180" />
                      </button>
                      <h2 className="font-bold text-lg">고객지원센터</h2>
                  </div>
                  
                  {/* Search */}
                  <div className="px-4 pb-3">
                      <div className="bg-gray-100 rounded-lg flex items-center px-3 h-10">
                          <Search size={16} className="text-gray-400 mr-2"/>
                          <input 
                            className="bg-transparent flex-1 text-sm outline-none" 
                            placeholder="궁금한 점을 검색해보세요"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                          />
                      </div>
                  </div>

                  {/* Categories */}
                  <div className="px-4 pb-0 overflow-x-auto no-scrollbar flex gap-4 border-b border-gray-100">
                      {FAQ_CATEGORIES.map(cat => (
                          <button
                            key={cat.id}
                            onClick={() => setFaqCategory(cat.id)}
                            className={`pb-3 text-sm font-bold whitespace-nowrap border-b-2 transition-colors
                                ${faqCategory === cat.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400'}`}
                          >
                              {cat.label}
                          </button>
                      ))}
                  </div>
              </div>

              {/* Quick Fixes (Problem Solving) */}
              {faqCategory === 'ALL' && !searchQuery && (
                  <div className="p-4 border-b border-gray-100 bg-gray-50">
                      <h3 className="text-xs font-bold text-gray-500 mb-3">자주 찾는 문제 해결</h3>
                      <div className="grid grid-cols-2 gap-2">
                          <button className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:border-brand-300 transition-colors">
                              <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1"><Box size={12}/> 3D 링크 미수신</div>
                              <div className="text-[10px] text-gray-400">발송 상태 확인하기</div>
                          </button>
                          <button className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:border-brand-300 transition-colors">
                              <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1"><Clock size={12}/> 일정 지연/변경</div>
                              <div className="text-[10px] text-gray-400">담당자 연결</div>
                          </button>
                          <button className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:border-brand-300 transition-colors">
                              <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1"><AlertTriangle size={12}/> 하자/AS 접수</div>
                              <div className="text-[10px] text-gray-400">사진 업로드 바로가기</div>
                          </button>
                          <button className="bg-white p-3 rounded-lg border border-gray-200 text-left hover:border-brand-300 transition-colors">
                              <div className="text-xs font-bold text-slate-900 mb-1 flex items-center gap-1"><RefreshCw size={12}/> 환불/취소</div>
                              <div className="text-[10px] text-gray-400">정책 확인하기</div>
                          </button>
                      </div>
                  </div>
              )}

              {/* List */}
              <div className="divide-y divide-gray-100">
                  {filteredFaqs.map(item => (
                      <div key={item.id} className="bg-white">
                          <button 
                            onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id as number)}
                            className="w-full px-4 py-4 text-left flex justify-between items-start"
                          >
                              <span className="text-sm font-medium text-slate-900 leading-snug">
                                  <span className="text-brand-600 font-bold mr-1">Q.</span> {item.q}
                              </span>
                              <ChevronDown size={16} className={`text-gray-400 transition-transform ${expandedFaq === item.id ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedFaq === item.id && (
                              <div className="px-4 pb-4 bg-gray-50 text-xs text-gray-600 leading-relaxed">
                                  <div className="pt-2 border-t border-gray-100">
                                      {item.a}
                                      {item.category === '3D' && (
                                          <div className="mt-2 text-brand-600 font-bold bg-brand-50 p-2 rounded">
                                              * 3D 인테리어 체험 링크는 작업 완료 후 카카오톡 링크로 발송됩니다.
                                          </div>
                                      )}
                                  </div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  if (viewState === 'FAQ') return renderFAQ();

  // --- Main View: More Menu ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* 2) & 3.1 Top Card (Login State) */}
      <div className="bg-white p-6 pb-8 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-6">더보기</h1>
          
          {user ? (
              // Logged In State
              <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-xl shadow-slate-200">
                  <div className="flex justify-between items-start mb-4">
                      <div className="flex items-center gap-3">
                          <div className="w-12 h-12 bg-gray-700 rounded-full flex items-center justify-center text-xl font-bold">
                              {user.name[0]}
                          </div>
                          <div>
                              <div className="font-bold text-lg">{user.name} 사장님</div>
                              <div className="text-xs text-slate-400">{user.phone}</div>
                          </div>
                      </div>
                      <button className="text-xs text-slate-400 border border-slate-600 px-2 py-1 rounded hover:bg-slate-800">
                          정보수정
                      </button>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 mt-4">
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-400 mb-1">진행중 상담</div>
                          <div className="font-bold text-lg text-brand-400">{consultingCount}건</div>
                      </div>
                      <div className="bg-slate-800 rounded-lg p-3 text-center">
                          <div className="text-xs text-slate-400 mb-1">받은 견적</div>
                          <div className="font-bold text-lg text-white">{quoteCount}건</div>
                      </div>
                  </div>
                  
                  <div className="mt-4 pt-4 border-t border-slate-700 flex justify-end">
                      <button onClick={onLogout} className="text-xs text-slate-500 flex items-center gap-1 hover:text-white">
                          <LogOut size={12} /> 로그아웃
                      </button>
                  </div>
              </div>
          ) : (
              // Logged Out State
              <div className="bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-sm">
                  <h3 className="font-bold text-slate-900 mb-2">로그인하고 시작하세요</h3>
                  <p className="text-xs text-gray-500 mb-6">
                      상담 진행 상황과 견적서를 안전하게 저장합니다.<br/>
                      3D 체험 링크 발송을 위해 로그인이 필요합니다.
                  </p>
                  <div className="space-y-2">
                      <button 
                        onClick={() => handleSupabaseLogin('kakao')}
                        className="w-full bg-[#FEE500] text-[#000000] h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                      >
                          <MessageCircle size={18} fill="black" className="border-none" /> 카카오로 3초만에 시작
                      </button>
                      <button 
                         onClick={() => alert("휴대폰 로그인은 준비 중입니다.")}
                         className="w-full bg-white border border-gray-300 text-slate-700 h-11 rounded-lg font-bold text-sm flex items-center justify-center gap-2 hover:bg-gray-50 transition-colors"
                      >
                          <Phone size={16} /> 휴대폰 번호로 시작
                      </button>
                  </div>
                  <div className="mt-4 text-[10px] text-gray-400">
                      * 3D 인테리어 체험 링크는 카카오톡으로 발송됩니다.
                  </div>
              </div>
          )}
      </div>

      {/* 3.2 Menu Sections */}
      <div className="p-4 space-y-4">

          {/* 0. 창업 프로젝트 */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">창업 프로젝트</h3>
              {hasActiveProject ? (
                  <div
                      onClick={() => onNavigate?.('PROJECT')}
                      className="bg-gradient-to-r from-green-600 to-green-700 rounded-xl p-4 text-white cursor-pointer hover:from-green-700 hover:to-green-800 transition-colors"
                  >
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <Rocket size={20} />
                          </div>
                          <div className="flex-1">
                              <p className="font-bold">진행 중인 프로젝트</p>
                              <p className="text-sm text-green-100">대시보드에서 확인하기</p>
                          </div>
                          <ChevronRight size={20} className="text-green-200" />
                      </div>
                  </div>
              ) : (
                  <div
                      onClick={onStartNewProject}
                      className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-4 text-white cursor-pointer hover:from-brand-700 hover:to-brand-800 transition-colors"
                  >
                      <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                              <Sparkles size={20} />
                          </div>
                          <div className="flex-1">
                              <p className="font-bold">창업 시작하기</p>
                              <p className="text-sm text-brand-100">예상 비용 산출 + PM 배정</p>
                          </div>
                          <ChevronRight size={20} className="text-brand-200" />
                      </div>
                  </div>
              )}
          </section>

          {/* A. Account */}
          {user && (
              <section>
                  <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">계정</h3>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                      <MenuItem icon={UserIcon} label="내 정보 관리" sub="사업자 정보 등록" />
                      <MenuItem icon={MessageCircle} label="연동 관리" sub="카카오톡 연동됨" />
                      <MenuItem icon={Bell} label="알림 설정" />
                  </div>
              </section>
          )}

          {/* B. My Documents */}
          {user && (
               <section>
                  <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">내 문서</h3>
                  <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                      <MenuItem icon={FileText} label="저장된 견적서" badge={quoteCount > 0 ? `${quoteCount}` : undefined} />
                      <MenuItem icon={FileCheck} label="계약/확정 내역" />
                      <MenuItem icon={CreditCard} label="결제 영수증" />
                  </div>
              </section>
          )}

          {/* C. Customer Support */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">고객지원</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={HelpCircle} label="자주 묻는 질문 (FAQ)" onClick={() => setViewState('FAQ')} />
                  <MenuItem icon={MessageCircle} label="1:1 문의하기" sub="평일 10:00 - 18:00" />
                  <MenuItem icon={Bell} label="공지사항" />
              </div>
          </section>

          {/* D. Tools */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">창업 도구</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={ClipboardList} label="창업 체크리스트" sub="오픈까지 할 일 관리" onClick={() => onNavigate?.('CHECKLIST')} />
                  <MenuItem icon={Users} label="업체 찾기" sub="인테리어, 청소, 간판 등" onClick={() => onNavigate?.('VENDORS')} />
                  <MenuItem icon={MapPin} label="강남구 상권 정보" sub="동별 창업 비용/특성" onClick={() => onNavigate?.('DISTRICTS')} />
                  <MenuItem icon={Banknote} label="정부 지원사업" sub="희망리턴패키지 등" onClick={() => onNavigate?.('SUPPORT')} />
                  <MenuItem icon={Armchair} label="가구 마켓" sub="중고 장비 거래" onClick={() => onNavigate?.('FURNITURE')} />
              </div>
          </section>

          {/* E. Guides */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">가이드</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={Wrench} label="점포 치수 입력 가이드" />
                  <MenuItem icon={ShieldAlert} label="사장님 필독 체크리스트" sub="업종별 실수 방지" />
              </div>
          </section>

          {/* E. Policies & Company */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">정보</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={FileText} label="이용약관" />
                  <MenuItem icon={FileText} label="개인정보 처리방침" />
                  <MenuItem icon={ShieldAlert} label="보증/CS 정책" />
                  <MenuItem icon={Building2} label="회사 소개 / 파트너 신청" />
              </div>
          </section>
      </div>

      <div className="p-4 text-center">
          <p className="text-[10px] text-gray-400 leading-relaxed">
              (주)오프닝 | 대표: 김창업 | 사업자등록번호: 123-45-67890<br/>
              서울시 강남구 테헤란로 123 오프닝타워 10층<br/>
              고객센터: 1544-0000 (평일 10:00 - 18:00)
          </p>
      </div>
    </div>
  );
};

// Helper Component for Menu Item
const MenuItem: React.FC<{ 
    icon: any, 
    label: string, 
    sub?: string, 
    badge?: string,
    onClick?: () => void 
}> = ({ icon: Icon, label, sub, badge, onClick }) => (
    <button onClick={onClick} className="w-full p-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
        <div className="flex items-center gap-3">
            <Icon size={18} className="text-gray-500" />
            <div className="text-left">
                <div className="text-sm font-medium text-slate-900">{label}</div>
                {sub && <div className="text-[10px] text-gray-400">{sub}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2">
            {badge && <Badge color="brand">{badge}</Badge>}
            <ChevronRight size={16} className="text-gray-300" />
        </div>
    </button>
);
