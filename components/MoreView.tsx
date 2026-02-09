import React, { useState, useEffect } from 'react';
import { MainTab } from '../types';
import { supabase } from '../utils/supabaseClient';
import { Badge } from './Components';
import { GangnamDistrictsView } from './GangnamDistrictsView';
import { FurnitureMarketView } from './FurnitureMarketView';
import {
  ChevronRight, ChevronLeft, Loader2,
  Users, Banknote, MapPin, Armchair, Rocket, Sparkles,
  Calendar, ExternalLink
} from 'lucide-react';

interface MoreViewProps {
  user?: User | null;
  onNavigate?: (tab: MainTab) => void;
  hasActiveProject?: boolean;
  onStartNewProject?: () => void;
}

type MoreViewState = 'MENU' | 'DISTRICTS' | 'GOV_PROGRAMS' | 'FURNITURE';

export const MoreView: React.FC<MoreViewProps> = ({
    user, onNavigate, hasActiveProject, onStartNewProject
}) => {
  const [viewState, setViewState] = useState<MoreViewState>('MENU');

  // === 서브헤더 ===
  const SubHeader: React.FC<{ title: string }> = ({ title }) => (
    <div className="sticky top-0 bg-white border-b border-gray-100 z-10">
      <div className="flex items-center px-4 h-14 gap-3">
        <button onClick={() => setViewState('MENU')} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
          <ChevronLeft size={24} />
        </button>
        <h2 className="font-bold text-lg">{title}</h2>
      </div>
    </div>
  );

  // --- 정부 지원사업 ---
  const GovProgramsView = () => {
    const [programs, setPrograms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const fallbackPrograms = [
      {
        id: '1',
        name: '희망리턴패키지',
        organization: '소상공인시장진흥공단',
        description: '폐업 소상공인의 재취업·재창업 지원. 사업정리 컨설팅, 재기교육, 전직장려금 등 제공.',
        target: '폐업 예정 또는 폐업 소상공인',
        period: '연중 상시',
        amount: '최대 200만원',
        link: 'https://www.semas.or.kr',
      },
      {
        id: '2',
        name: '소상공인 정책자금 (창업자금)',
        organization: '중소벤처기업부',
        description: '사업 개시 후 3년 미만 소상공인에게 저금리 융자 지원.',
        target: '창업 3년 미만 소상공인',
        period: '연초 공고 (예산 소진 시 조기 마감)',
        amount: '업체당 최대 1억원 (직접대출)',
        link: 'https://ols.semas.or.kr',
      },
      {
        id: '3',
        name: '신사업창업사관학교',
        organization: '소상공인시장진흥공단',
        description: '유망 업종 창업을 위한 체계적 교육, 컨설팅, 멘토링, 사업화 자금 지원.',
        target: '예비 창업자 또는 업종전환 소상공인',
        period: '연 2회 모집 (상·하반기)',
        amount: '교육 무료 + 사업화 자금 최대 1천만원',
        link: 'https://newbiz.semas.or.kr',
      },
      {
        id: '4',
        name: '강남구 소상공인 지원사업',
        organization: '강남구청',
        description: '강남구 소재 소상공인 대상 경영 컨설팅, 홍보 지원, 교육 프로그램.',
        target: '강남구 소재 소상공인',
        period: '연중 상시',
        amount: '프로그램별 상이',
        link: 'https://www.gangnam.go.kr',
      },
    ];

    useEffect(() => {
      (async () => {
        try {
          const { data, error } = await supabase
            .from('government_programs')
            .select('*')
            .order('created_at', { ascending: false });

          if (!error && data && data.length > 0) {
            setPrograms(data);
          } else {
            setPrograms(fallbackPrograms);
          }
        } catch {
          setPrograms(fallbackPrograms);
        }
        setLoading(false);
      })();
    }, []);

    return (
      <div className="min-h-screen bg-gray-50">
        <SubHeader title="정부 지원사업" />
        <div className="p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="animate-spin text-brand-600" size={32} />
            </div>
          ) : (
            <div className="space-y-3">
              {programs.map((p: any) => (
                <div key={p.id} className="bg-white rounded-xl border border-gray-200 p-4">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex-1">
                      <h4 className="font-bold text-sm">{p.name}</h4>
                      <p className="text-xs text-gray-400 mt-0.5">{p.organization}</p>
                    </div>
                    {p.amount && (
                      <Badge color="brand">{p.amount}</Badge>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed mb-3">{p.description}</p>
                  <div className="space-y-1.5 text-xs text-gray-500">
                    {p.target && (
                      <div className="flex items-center gap-2">
                        <Users size={12} className="text-gray-400 shrink-0" />
                        <span>{p.target}</span>
                      </div>
                    )}
                    {p.period && (
                      <div className="flex items-center gap-2">
                        <Calendar size={12} className="text-gray-400 shrink-0" />
                        <span>{p.period}</span>
                      </div>
                    )}
                  </div>
                  {p.link && (
                    <a
                      href={p.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 flex items-center gap-1 text-xs text-brand-600 font-medium"
                    >
                      <ExternalLink size={12} />
                      자세히 보기
                    </a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  // === 라우팅 ===
  if (viewState === 'DISTRICTS') return <GangnamDistrictsView onBack={() => setViewState('MENU')} />;
  if (viewState === 'GOV_PROGRAMS') return <GovProgramsView />;
  if (viewState === 'FURNITURE') return <FurnitureMarketView onBack={() => setViewState('MENU')} />;

  // --- Main Menu ---
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="bg-white p-6 pb-4 border-b border-gray-100">
          <h1 className="text-xl font-bold text-slate-900">더보기</h1>
          <p className="text-sm text-gray-400 mt-1">창업에 필요한 정보와 도구</p>
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

          {/* 창업 도구 */}
          <section>
              <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">창업 도구</h3>
              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden divide-y divide-gray-100">
                  <MenuItem icon={MapPin} label="강남구 상권 정보" sub="동별 창업 비용/특성" onClick={() => setViewState('DISTRICTS')} />
                  <MenuItem icon={Banknote} label="정부 지원사업" sub="희망리턴패키지 등" onClick={() => setViewState('GOV_PROGRAMS')} />
                  <MenuItem icon={Armchair} label="가구 마켓" sub="중고 장비 거래" onClick={() => setViewState('FURNITURE')} />
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
