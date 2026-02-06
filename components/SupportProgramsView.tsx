import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import {
  Search, ExternalLink, Calendar, Building2, Users,
  Loader2, ChevronRight, X, Banknote, Phone, Filter
} from 'lucide-react';

interface Program {
  id: string;
  name: string;
  organization: string;
  category: string;
  targetAudience: string[];
  supportAmount: string;
  supportDetails: string;
  eligibility: string;
  applicationStart?: string;
  applicationEnd?: string;
  applicationLink: string;
  contact: string;
  description: string;
  region: string;
  isActive: boolean;
}

const CATEGORIES = ['전체', '폐업/재창업', '창업지원', '자금지원', '디지털전환', '경영개선', '폐업지원', '재창업'];

export const SupportProgramsView: React.FC = () => {
  const [programs, setPrograms] = useState<Program[]>([]);
  const [filteredPrograms, setFilteredPrograms] = useState<Program[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProgram, setSelectedProgram] = useState<Program | null>(null);

  useEffect(() => {
    loadPrograms();
  }, []);

  useEffect(() => {
    let filtered = programs;

    if (selectedCategory !== '전체') {
      filtered = filtered.filter(p => p.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.description.toLowerCase().includes(query) ||
        p.organization.toLowerCase().includes(query)
      );
    }

    setFilteredPrograms(filtered);
  }, [programs, selectedCategory, searchQuery]);

  const loadPrograms = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('government_programs')
      .select('*')
      .eq('is_active', true)
      .order('application_end', { ascending: true });

    if (!error && data) {
      setPrograms(data.map((p: any) => ({
        id: p.id,
        name: p.name,
        organization: p.organization,
        category: p.category,
        targetAudience: p.target_audience || [],
        supportAmount: p.support_amount,
        supportDetails: p.support_details,
        eligibility: p.eligibility,
        applicationStart: p.application_start,
        applicationEnd: p.application_end,
        applicationLink: p.application_link,
        contact: p.contact,
        description: p.description,
        region: p.region,
        isActive: p.is_active
      })));
    }
    setLoading(false);
  };

  const isApplying = (program: Program) => {
    if (!program.applicationStart || !program.applicationEnd) return true;
    const now = new Date();
    const start = new Date(program.applicationStart);
    const end = new Date(program.applicationEnd);
    return now >= start && now <= end;
  };

  const getDaysLeft = (endDate?: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  };

  // 상세 모달
  const ProgramDetailModal = () => {
    if (!selectedProgram) return null;
    const program = selectedProgram;
    const daysLeft = getDaysLeft(program.applicationEnd);

    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
        <div className="bg-white w-full max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg pr-8">{program.name}</h2>
            <button onClick={() => setSelectedProgram(null)}>
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 핵심 정보 */}
            <div className="bg-brand-50 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-brand-600 font-bold text-lg">{program.supportAmount}</span>
                {daysLeft !== null && daysLeft > 0 && (
                  <span className="px-2 py-1 bg-red-100 text-red-600 text-sm font-bold rounded">
                    D-{daysLeft}
                  </span>
                )}
              </div>
              <p className="text-sm text-brand-700">{program.supportDetails}</p>
            </div>

            {/* 기본 정보 */}
            <div className="space-y-3">
              <div className="flex items-start gap-3">
                <Building2 size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">주관기관</p>
                  <p className="font-medium">{program.organization}</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Users size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">지원대상</p>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    {program.targetAudience.map((target, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-gray-100 rounded text-sm">
                        {target}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Calendar size={18} className="text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">신청기간</p>
                  <p className="font-medium">
                    {program.applicationStart && program.applicationEnd
                      ? `${program.applicationStart} ~ ${program.applicationEnd}`
                      : '상시 접수'}
                  </p>
                </div>
              </div>

              {program.contact && (
                <div className="flex items-start gap-3">
                  <Phone size={18} className="text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">문의</p>
                    <a href={`tel:${program.contact}`} className="font-medium text-brand-600">
                      {program.contact}
                    </a>
                  </div>
                </div>
              )}
            </div>

            {/* 자격요건 */}
            {program.eligibility && (
              <div>
                <h3 className="font-bold mb-2">자격요건</h3>
                <p className="text-gray-600 text-sm bg-gray-50 p-3 rounded-lg">
                  {program.eligibility}
                </p>
              </div>
            )}

            {/* 상세 설명 */}
            <div>
              <h3 className="font-bold mb-2">상세내용</h3>
              <p className="text-gray-600 text-sm whitespace-pre-line">
                {program.description}
              </p>
            </div>
          </div>

          <div className="p-4 border-t">
            {program.applicationLink && (
              <a
                href={program.applicationLink}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center justify-center gap-2 py-3 bg-brand-600 text-white rounded-xl font-bold"
              >
                <ExternalLink size={20} />
                신청 페이지 바로가기
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="animate-spin text-brand-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-2">정부 지원사업</h1>
          <p className="text-sm text-gray-500 mb-4">소상공인을 위한 정부/지자체 지원 프로그램</p>

          {/* 검색 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="사업명, 기관으로 검색"
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 카테고리 */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 프로그램 목록 */}
      <div className="p-4 space-y-3">
        {/* 추천 배너 */}
        <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-xl p-4 text-white mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={20} />
            <span className="font-bold">희망리턴패키지</span>
          </div>
          <p className="text-sm opacity-90 mb-3">
            폐업 후 재창업 시 최대 2,600만원 지원받으세요
          </p>
          <button
            onClick={() => {
              const pkg = programs.find(p => p.name.includes('희망리턴'));
              if (pkg) setSelectedProgram(pkg);
            }}
            className="text-sm font-bold underline"
          >
            자세히 보기 →
          </button>
        </div>

        {filteredPrograms.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            해당 조건의 지원사업이 없습니다
          </div>
        ) : (
          filteredPrograms.map(program => {
            const daysLeft = getDaysLeft(program.applicationEnd);
            const applying = isApplying(program);

            return (
              <div
                key={program.id}
                onClick={() => setSelectedProgram(program)}
                className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-200 transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 text-xs font-medium rounded ${
                        applying ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {applying ? '접수중' : '접수예정'}
                      </span>
                      <span className="text-xs text-gray-400">{program.region}</span>
                    </div>
                    <h3 className="font-bold">{program.name}</h3>
                    <p className="text-sm text-gray-500 mt-1">{program.organization}</p>
                  </div>
                  {daysLeft !== null && daysLeft > 0 && daysLeft <= 30 && (
                    <span className="px-2 py-1 bg-red-50 text-red-600 text-xs font-bold rounded shrink-0">
                      D-{daysLeft}
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between mt-3 pt-3 border-t">
                  <span className="text-brand-600 font-bold">{program.supportAmount}</span>
                  <ChevronRight className="text-gray-300" size={20} />
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedProgram && <ProgramDetailModal />}
    </div>
  );
};
