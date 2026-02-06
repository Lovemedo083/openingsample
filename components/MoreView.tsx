import React, { useState } from 'react';
import { User, MainTab } from '../types';
import { Button, Badge } from './Components';
import {
  HelpCircle, Wrench, Building2, ChevronRight, MessageCircle,
  Bell, Search, ChevronDown, AlertTriangle, Clock, Box, RefreshCw,
  ClipboardList, Users, Banknote, MapPin, Armchair, Rocket, Sparkles,
  FileText, ShieldAlert, Phone
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

// FAQ Data
const FAQ_CATEGORIES = [
    { id: 'ALL', label: '전체' },
    { id: 'COMMON', label: '일반' },
    { id: 'QUOTE', label: '비용' },
    { id: 'SCHEDULE', label: '일정' },
    { id: 'WARRANTY', label: '보증' },
];

const FAQ_ITEMS = [
    { id: 1, category: 'COMMON', q: '오프닝은 어떤 서비스인가요?', a: '창업의 시작부터 끝까지 전담 PM이 함께하는 창업 지원 서비스입니다. 업종 선택, 입지 분석, 비용 산출, 인허가 지원 등을 도와드립니다.' },
    { id: 2, category: 'QUOTE', q: '비용은 얼마나 드나요?', a: '업종, 규모, 지역에 따라 달라집니다. 앱에서 무료로 예상 비용을 확인하실 수 있습니다.' },
    { id: 3, category: 'SCHEDULE', q: '창업까지 얼마나 걸리나요?', a: '업종과 준비 상황에 따라 다르지만, 보통 2~4개월 소요됩니다. PM이 일정을 함께 관리해드립니다.' },
    { id: 4, category: 'WARRANTY', q: '중간에 취소하면 어떻게 되나요?', a: '진행 단계에 따라 환불 정책이 적용됩니다. 자세한 내용은 1:1 문의를 통해 안내받으실 수 있습니다.' },
    { id: 5, category: 'COMMON', q: '강남구 외 지역도 가능한가요?', a: '현재는 강남구에서만 서비스를 제공하고 있으며, 다른 지역은 순차적으로 확대 예정입니다.' },
];

export const MoreView: React.FC<MoreViewProps> = ({
    user, onNavigate, hasActiveProject, onStartNewProject
}) => {
  const [viewState, setViewState] = useState<'MENU' | 'FAQ'>('MENU');
  const [faqCategory, setFaqCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedFaq, setExpandedFaq] = useState<number | null>(null);

  // --- FAQ ---
  const renderFAQ = () => {
      const filteredFaqs = FAQ_ITEMS.filter(item => {
          const catMatch = faqCategory === 'ALL' || item.category === faqCategory;
          const searchMatch = item.q.includes(searchQuery) || item.a.includes(searchQuery);
          return catMatch && searchMatch;
      });

      return (
          <div className="min-h-screen bg-white pb-20">
              <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
                  <div className="flex items-center px-4 h-14 gap-3">
                      <button onClick={() => setViewState('MENU')} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
                          <ChevronRight className="rotate-180" />
                      </button>
                      <h2 className="font-bold text-lg">자주 묻는 질문</h2>
                  </div>

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

                  <div className="px-4 overflow-x-auto no-scrollbar flex gap-4 border-b border-gray-100">
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

              <div className="divide-y divide-gray-100">
                  {filteredFaqs.map(item => (
                      <div key={item.id} className="bg-white">
                          <button
                            onClick={() => setExpandedFaq(expandedFaq === item.id ? null : item.id)}
                            className="w-full px-4 py-4 text-left flex justify-between items-start"
                          >
                              <span className="text-sm font-medium text-slate-900 leading-snug">
                                  <span className="text-brand-600 font-bold mr-1">Q.</span> {item.q}
                              </span>
                              <ChevronDown size={16} className={`text-gray-400 shrink-0 ml-2 transition-transform ${expandedFaq === item.id ? 'rotate-180' : ''}`} />
                          </button>
                          {expandedFaq === item.id && (
                              <div className="px-4 pb-4 bg-gray-50 text-xs text-gray-600 leading-relaxed">
                                  <div className="pt-2 border-t border-gray-100">{item.a}</div>
                              </div>
                          )}
                      </div>
                  ))}
              </div>
          </div>
      );
  };

  if (viewState === 'FAQ') return renderFAQ();

  // --- Main Menu ---
  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      <div className="bg-white p-6 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-slate-900">더보기</h1>
      </div>

      <div className="p-4 space-y-4">

          {/* 창업 프로젝트 */}
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

          {/* 고객지원 */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">고객지원</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={HelpCircle} label="자주 묻는 질문 (FAQ)" onClick={() => setViewState('FAQ')} />
                  <MenuItem icon={MessageCircle} label="1:1 문의하기" sub="평일 10:00 - 18:00" />
                  <MenuItem icon={Bell} label="공지사항" />
              </div>
          </section>

          {/* 창업 도구 */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">창업 도구</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={MapPin} label="강남구 상권 정보" sub="동별 창업 비용/특성" />
                  <MenuItem icon={Banknote} label="정부 지원사업" sub="희망리턴패키지 등" />
                  <MenuItem icon={Armchair} label="가구 마켓" sub="중고 장비 거래" />
              </div>
          </section>

          {/* 정보 */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">정보</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={FileText} label="이용약관" />
                  <MenuItem icon={ShieldAlert} label="개인정보 처리방침" />
                  <MenuItem icon={Building2} label="회사 소개" />
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

// MenuItem
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
