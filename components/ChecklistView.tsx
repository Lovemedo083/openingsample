import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button, Input } from './Components';
import {
  CheckCircle2, Circle, Plus, Calendar, MapPin, Store,
  ChevronRight, Loader2, AlertCircle, Clock, Trash2
} from 'lucide-react';

interface ChecklistItem {
  id: string;
  task: string;
  category: string;
  dueDate?: string;
  completed: boolean;
  order: number;
  notes?: string;
}

interface Checklist {
  id: string;
  title: string;
  businessType: string;
  targetOpenDate?: string;
  location?: string;
  items: ChecklistItem[];
  progress: number;
  status: string;
}

// 업종별 기본 체크리스트 템플릿
const CHECKLIST_TEMPLATES: Record<string, ChecklistItem[]> = {
  '카페': [
    { id: '1', task: '사업자등록', category: '인허가', completed: false, order: 1 },
    { id: '2', task: '영업신고 (일반음식점/휴게음식점)', category: '인허가', completed: false, order: 2 },
    { id: '3', task: '위생교육 이수', category: '인허가', completed: false, order: 3 },
    { id: '4', task: '인테리어 업체 선정 및 계약', category: '시설', completed: false, order: 4 },
    { id: '5', task: '인테리어 시공', category: '시설', completed: false, order: 5 },
    { id: '6', task: '간판 제작 및 설치', category: '시설', completed: false, order: 6 },
    { id: '7', task: '커피머신 구매/렌탈', category: '장비', completed: false, order: 7 },
    { id: '8', task: '냉장고/제빙기 구매', category: '장비', completed: false, order: 8 },
    { id: '9', task: 'POS/카드단말기 설치', category: '시스템', completed: false, order: 9 },
    { id: '10', task: '인터넷/전화 개통', category: '시스템', completed: false, order: 10 },
    { id: '11', task: 'CCTV 설치', category: '시스템', completed: false, order: 11 },
    { id: '12', task: '화재/배상책임 보험 가입', category: '보험', completed: false, order: 12 },
    { id: '13', task: '원두/음료 도매처 계약', category: '운영', completed: false, order: 13 },
    { id: '14', task: '배달앱 등록 (배민/쿠팡이츠)', category: '운영', completed: false, order: 14 },
    { id: '15', task: '입주청소', category: '오픈준비', completed: false, order: 15 },
    { id: '16', task: '시범운영 (소프트오픈)', category: '오픈준비', completed: false, order: 16 },
    { id: '17', task: '그랜드오픈', category: '오픈준비', completed: false, order: 17 },
  ],
  '음식점': [
    { id: '1', task: '사업자등록', category: '인허가', completed: false, order: 1 },
    { id: '2', task: '영업신고 (일반음식점)', category: '인허가', completed: false, order: 2 },
    { id: '3', task: '위생교육 이수', category: '인허가', completed: false, order: 3 },
    { id: '4', task: '소방안전교육 이수', category: '인허가', completed: false, order: 4 },
    { id: '5', task: '인테리어 업체 선정', category: '시설', completed: false, order: 5 },
    { id: '6', task: '주방설비 공사', category: '시설', completed: false, order: 6 },
    { id: '7', task: '후드/환기시설 설치', category: '시설', completed: false, order: 7 },
    { id: '8', task: '간판 제작 및 설치', category: '시설', completed: false, order: 8 },
    { id: '9', task: '업소용 냉장고/냉동고', category: '장비', completed: false, order: 9 },
    { id: '10', task: '조리기구 구매', category: '장비', completed: false, order: 10 },
    { id: '11', task: '테이블/의자 구매', category: '장비', completed: false, order: 11 },
    { id: '12', task: 'POS/카드단말기 설치', category: '시스템', completed: false, order: 12 },
    { id: '13', task: '인터넷/전화 개통', category: '시스템', completed: false, order: 13 },
    { id: '14', task: '화재/배상책임 보험', category: '보험', completed: false, order: 14 },
    { id: '15', task: '식자재 도매처 계약', category: '운영', completed: false, order: 15 },
    { id: '16', task: '주류 도매처 계약', category: '운영', completed: false, order: 16 },
    { id: '17', task: '배달대행 계약', category: '운영', completed: false, order: 17 },
    { id: '18', task: '입주청소', category: '오픈준비', completed: false, order: 18 },
    { id: '19', task: '그랜드오픈', category: '오픈준비', completed: false, order: 19 },
  ],
  '소매점': [
    { id: '1', task: '사업자등록', category: '인허가', completed: false, order: 1 },
    { id: '2', task: '통신판매업 신고 (온라인 겸업시)', category: '인허가', completed: false, order: 2 },
    { id: '3', task: '인테리어/집기 설치', category: '시설', completed: false, order: 3 },
    { id: '4', task: '간판 설치', category: '시설', completed: false, order: 4 },
    { id: '5', task: '진열대/쇼케이스', category: '장비', completed: false, order: 5 },
    { id: '6', task: 'POS/카드단말기', category: '시스템', completed: false, order: 6 },
    { id: '7', task: 'CCTV 설치', category: '시스템', completed: false, order: 7 },
    { id: '8', task: '도매처/공급처 계약', category: '운영', completed: false, order: 8 },
    { id: '9', task: '초도물량 입고', category: '운영', completed: false, order: 9 },
    { id: '10', task: '오픈', category: '오픈준비', completed: false, order: 10 },
  ]
};

const CATEGORIES = ['전체', '인허가', '시설', '장비', '시스템', '보험', '운영', '오픈준비'];
const BUSINESS_TYPES = ['카페', '음식점', '소매점', '미용실', '헬스장', '학원', '기타'];

export const ChecklistView: React.FC = () => {
  const [checklists, setChecklists] = useState<Checklist[]>([]);
  const [selectedChecklist, setSelectedChecklist] = useState<Checklist | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('전체');

  useEffect(() => {
    loadChecklists();
  }, []);

  const loadChecklists = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('startup_checklists')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setChecklists(data.map((c: any) => ({
        id: c.id,
        title: c.title,
        businessType: c.business_type,
        targetOpenDate: c.target_open_date,
        location: c.location,
        items: c.items || [],
        progress: c.progress,
        status: c.status
      })));
    }
    setLoading(false);
  };

  const createChecklist = async (title: string, businessType: string, location: string, targetDate: string) => {
    const template = CHECKLIST_TEMPLATES[businessType] || CHECKLIST_TEMPLATES['음식점'];
    const items = template.map(item => ({ ...item, id: crypto.randomUUID() }));

    const { data, error } = await supabase
      .from('startup_checklists')
      .insert([{
        title,
        business_type: businessType,
        location,
        target_open_date: targetDate || null,
        items,
        progress: 0
      }])
      .select()
      .single();

    if (!error && data) {
      await loadChecklists();
      setShowCreateModal(false);
    }
  };

  const toggleItem = async (itemId: string) => {
    if (!selectedChecklist) return;

    const updatedItems = selectedChecklist.items.map(item =>
      item.id === itemId ? { ...item, completed: !item.completed } : item
    );
    const completedCount = updatedItems.filter(i => i.completed).length;
    const progress = Math.round((completedCount / updatedItems.length) * 100);

    const { error } = await supabase
      .from('startup_checklists')
      .update({ items: updatedItems, progress })
      .eq('id', selectedChecklist.id);

    if (!error) {
      setSelectedChecklist({ ...selectedChecklist, items: updatedItems, progress });
      setChecklists(prev => prev.map(c =>
        c.id === selectedChecklist.id ? { ...c, items: updatedItems, progress } : c
      ));
    }
  };

  const filteredItems = selectedChecklist?.items.filter(item =>
    selectedCategory === '전체' || item.category === selectedCategory
  ) || [];

  // 생성 모달
  const CreateModal = () => {
    const [title, setTitle] = useState('');
    const [businessType, setBusinessType] = useState('카페');
    const [location, setLocation] = useState('강남구');
    const [targetDate, setTargetDate] = useState('');

    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4">
          <h2 className="text-xl font-bold mb-4">새 체크리스트 만들기</h2>

          <div className="space-y-4">
            <Input
              label="프로젝트명"
              placeholder="예: 역삼동 카페 오픈"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            <div>
              <label className="block text-sm font-medium mb-2">업종</label>
              <select
                className="w-full px-4 py-3 border rounded-xl"
                value={businessType}
                onChange={e => setBusinessType(e.target.value)}
              >
                {BUSINESS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </div>

            <Input
              label="위치"
              placeholder="예: 강남구 역삼동"
              value={location}
              onChange={e => setLocation(e.target.value)}
            />

            <Input
              label="목표 오픈일"
              type="date"
              value={targetDate}
              onChange={e => setTargetDate(e.target.value)}
            />
          </div>

          <div className="flex gap-3 mt-6">
            <Button variant="outline" fullWidth onClick={() => setShowCreateModal(false)}>
              취소
            </Button>
            <Button fullWidth onClick={() => createChecklist(title, businessType, location, targetDate)}>
              만들기
            </Button>
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

  // 체크리스트 상세 보기
  if (selectedChecklist) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="sticky top-0 z-30 bg-white border-b">
          <div className="px-4 py-4">
            <div className="flex items-center gap-3 mb-3">
              <button onClick={() => setSelectedChecklist(null)} className="text-gray-600">
                ←
              </button>
              <div className="flex-1">
                <h1 className="font-bold text-lg">{selectedChecklist.title}</h1>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Store size={14} />
                  <span>{selectedChecklist.businessType}</span>
                  {selectedChecklist.location && (
                    <>
                      <MapPin size={14} />
                      <span>{selectedChecklist.location}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* 진행률 */}
            <div className="mb-4">
              <div className="flex justify-between text-sm mb-1">
                <span className="font-medium">진행률</span>
                <span className="text-brand-600 font-bold">{selectedChecklist.progress}%</span>
              </div>
              <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className="h-full bg-brand-600 transition-all duration-300"
                  style={{ width: `${selectedChecklist.progress}%` }}
                />
              </div>
            </div>

            {/* 카테고리 필터 */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
              {CATEGORIES.map(cat => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap ${
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

        <div className="p-4 space-y-2">
          {filteredItems.map(item => (
            <div
              key={item.id}
              onClick={() => toggleItem(item.id)}
              className={`p-4 bg-white rounded-xl border cursor-pointer transition-all ${
                item.completed ? 'border-green-200 bg-green-50' : 'border-gray-200 hover:border-brand-200'
              }`}
            >
              <div className="flex items-center gap-3">
                {item.completed ? (
                  <CheckCircle2 className="text-green-500" size={24} />
                ) : (
                  <Circle className="text-gray-300" size={24} />
                )}
                <div className="flex-1">
                  <p className={`font-medium ${item.completed ? 'line-through text-gray-400' : ''}`}>
                    {item.task}
                  </p>
                  <span className="text-xs text-gray-400">{item.category}</span>
                </div>
                <ChevronRight size={20} className="text-gray-300" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // 체크리스트 목록
  return (
    <div className="min-h-screen bg-gray-50 pb-28">
      <div className="sticky top-0 z-30 bg-white border-b px-4 py-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">창업 체크리스트</h1>
          <Button size="sm" onClick={() => setShowCreateModal(true)}>
            <Plus size={18} className="mr-1" /> 새로 만들기
          </Button>
        </div>
      </div>

      <div className="p-4">
        {checklists.length === 0 ? (
          <div className="text-center py-20">
            <AlertCircle size={48} className="mx-auto mb-4 text-gray-300" />
            <p className="text-gray-500 mb-4">아직 체크리스트가 없습니다</p>
            <Button onClick={() => setShowCreateModal(true)}>
              <Plus size={18} className="mr-1" /> 첫 체크리스트 만들기
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {checklists.map(checklist => (
              <div
                key={checklist.id}
                onClick={() => setSelectedChecklist(checklist)}
                className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-200 transition-colors"
              >
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-bold">{checklist.title}</h3>
                  <span className="text-sm text-brand-600 font-bold">{checklist.progress}%</span>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Store size={14} /> {checklist.businessType}
                  </span>
                  {checklist.location && (
                    <span className="flex items-center gap-1">
                      <MapPin size={14} /> {checklist.location}
                    </span>
                  )}
                  {checklist.targetOpenDate && (
                    <span className="flex items-center gap-1">
                      <Calendar size={14} /> {checklist.targetOpenDate}
                    </span>
                  )}
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-brand-600"
                    style={{ width: `${checklist.progress}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showCreateModal && <CreateModal />}
    </div>
  );
};
