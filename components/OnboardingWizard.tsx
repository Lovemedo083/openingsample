import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import {
  ChevronRight, ChevronLeft, Store, MapPin, Ruler, Wallet,
  Coffee, Utensils, ShoppingBag, Scissors, Dumbbell, GraduationCap,
  Beer, Loader2, CheckCircle, User, Sparkles, Calculator,
  Building, TrendingUp
} from 'lucide-react';

interface OnboardingWizardProps {
  onComplete: (projectId: string) => void;
  onSkip?: () => void;
}

interface ProjectManager {
  id: string;
  name: string;
  profile_image: string;
  specialties: string[];
  introduction: string;
  rating: number;
  completed_projects: number;
}

interface CostEstimate {
  category: string;
  items: { name: string; min: number; max: number; avg: number }[];
  subtotal: { min: number; max: number; avg: number };
}

// 업종 카테고리
const BUSINESS_CATEGORIES = [
  { id: 'cafe', label: '카페/디저트', icon: Coffee, color: 'bg-amber-100 text-amber-700' },
  { id: 'korean', label: '한식', icon: Utensils, color: 'bg-orange-100 text-orange-700' },
  { id: 'chicken', label: '치킨/분식', icon: Utensils, color: 'bg-red-100 text-red-700' },
  { id: 'pub', label: '주점/바', icon: Beer, color: 'bg-purple-100 text-purple-700' },
  { id: 'retail', label: '소매/편의점', icon: ShoppingBag, color: 'bg-blue-100 text-blue-700' },
  { id: 'beauty', label: '미용/뷰티', icon: Scissors, color: 'bg-pink-100 text-pink-700' },
  { id: 'fitness', label: '헬스/운동', icon: Dumbbell, color: 'bg-green-100 text-green-700' },
  { id: 'education', label: '교육/학원', icon: GraduationCap, color: 'bg-indigo-100 text-indigo-700' },
];

// 강남구 동 목록
const GANGNAM_DONGS = [
  '역삼동', '논현동', '신사동', '청담동', '삼성동', '대치동', '압구정동', '도곡동', '개포동', '일원동'
];

// 매장 규모
const STORE_SIZES = [
  { id: 'small', label: '소형 (10평 이하)', value: 10 },
  { id: 'medium', label: '중형 (15-20평)', value: 17 },
  { id: 'large', label: '대형 (25평 이상)', value: 30 },
];

// 층수
const STORE_FLOORS = [
  { id: 'b1', label: '지하 1층', discount: 0.7 },
  { id: '1f', label: '1층', discount: 1.0 },
  { id: '2f', label: '2층 이상', discount: 0.8 },
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({ onComplete, onSkip }) => {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [estimating, setEstimating] = useState(false);

  // 폼 데이터
  const [businessCategory, setBusinessCategory] = useState('');
  const [businessDetail, setBusinessDetail] = useState('');
  const [dong, setDong] = useState('');
  const [storeSize, setStoreSize] = useState<number>(15);
  const [storeSizeLabel, setStoreSizeLabel] = useState('');
  const [storeFloor, setStoreFloor] = useState('1f');
  const [budgetTotal, setBudgetTotal] = useState('');
  const [budgetOwn, setBudgetOwn] = useState('');

  // 결과
  const [costEstimates, setCostEstimates] = useState<CostEstimate[]>([]);
  const [totalEstimate, setTotalEstimate] = useState({ min: 0, max: 0, avg: 0 });
  const [assignedPM, setAssignedPM] = useState<ProjectManager | null>(null);
  const [projectId, setProjectId] = useState<string | null>(null);

  // 비용 산출 함수
  const calculateCosts = async () => {
    setEstimating(true);

    // 업종 매핑
    const categoryMap: Record<string, string> = {
      'cafe': '카페',
      'korean': '한식',
      'chicken': '치킨',
      'pub': '주점',
      'retail': '소매',
      'beauty': '미용',
      'fitness': '헬스',
      'education': '교육',
    };

    const dbCategory = categoryMap[businessCategory] || '카페';

    // 비용 기준 가져오기
    const { data: standards } = await supabase
      .from('cost_standards')
      .select('*')
      .or(`business_category.eq.${dbCategory},business_category.eq.공통`)
      .eq('location_district', '강남구');

    if (!standards || standards.length === 0) {
      // 기본값 사용
      setEstimating(false);
      return;
    }

    // 층수 할인율
    const floorDiscount = STORE_FLOORS.find(f => f.id === storeFloor)?.discount || 1;

    // 카테고리별 비용 계산
    const costGroups: Record<string, CostEstimate> = {};

    standards.forEach((std: any) => {
      const costType = std.cost_type;
      if (!costGroups[costType]) {
        costGroups[costType] = {
          category: costType,
          items: [],
          subtotal: { min: 0, max: 0, avg: 0 }
        };
      }

      let multiplier = 1;
      if (std.unit === '평당') {
        multiplier = storeSize;
      } else if (std.unit === '월') {
        multiplier = 1; // 월세는 그대로
      }

      // 권리금/보증금은 층수 영향
      if (costType === '권리금' || costType === '보증금' || costType === '월세') {
        multiplier *= floorDiscount;
      }

      const item = {
        name: std.cost_name,
        min: Math.round(std.min_price * multiplier),
        max: Math.round(std.max_price * multiplier),
        avg: Math.round(std.avg_price * multiplier)
      };

      costGroups[costType].items.push(item);
      costGroups[costType].subtotal.min += item.min;
      costGroups[costType].subtotal.max += item.max;
      costGroups[costType].subtotal.avg += item.avg;
    });

    const estimates = Object.values(costGroups);
    setCostEstimates(estimates);

    // 총액 계산
    const total = estimates.reduce(
      (acc, group) => ({
        min: acc.min + group.subtotal.min,
        max: acc.max + group.subtotal.max,
        avg: acc.avg + group.subtotal.avg
      }),
      { min: 0, max: 0, avg: 0 }
    );
    setTotalEstimate(total);

    setEstimating(false);
  };

  // PM 배정 함수
  const assignPM = async () => {
    const { data: pms } = await supabase
      .from('project_managers')
      .select('*')
      .eq('is_available', true);

    if (pms && pms.length > 0) {
      // 랜덤 배정
      const randomPM = pms[Math.floor(Math.random() * pms.length)];
      setAssignedPM(randomPM);
      return randomPM;
    }
    return null;
  };

  // 프로젝트 생성
  const createProject = async () => {
    setLoading(true);

    const pm = await assignPM();

    const { data: project, error } = await supabase
      .from('startup_projects')
      .insert([{
        business_category: businessCategory,
        business_detail: businessDetail,
        location_city: '서울시',
        location_district: '강남구',
        location_dong: dong,
        store_size: storeSize,
        store_floor: storeFloor,
        budget_total: budgetTotal ? Number(budgetTotal) * 10000 : null,
        budget_own: budgetOwn ? Number(budgetOwn) * 10000 : null,
        budget_loan: budgetTotal && budgetOwn ? (Number(budgetTotal) - Number(budgetOwn)) * 10000 : null,
        estimated_costs: costEstimates,
        estimated_total: totalEstimate.avg,
        pm_id: pm?.id,
        status: 'PM_ASSIGNED'
      }])
      .select()
      .single();

    if (!error && project) {
      setProjectId(project.id);

      // 기본 마일스톤 생성
      const milestones = [
        { step_order: 1, step_name: '사업자등록', step_category: '인허가', description: '사업자등록증 발급' },
        { step_order: 2, step_name: '영업신고', step_category: '인허가', description: '관할 구청 영업신고' },
        { step_order: 3, step_name: '점포계약', step_category: '계약', description: '임대차 계약 체결' },
        { step_order: 4, step_name: '인테리어', step_category: '시설', description: '인테리어 설계 및 시공' },
        { step_order: 5, step_name: '장비/집기', step_category: '장비', description: '필수 장비 구매 및 설치' },
        { step_order: 6, step_name: '간판/사인물', step_category: '시설', description: '간판 제작 및 설치' },
        { step_order: 7, step_name: 'POS/통신', step_category: '시스템', description: 'POS, 인터넷, CCTV 설치' },
        { step_order: 8, step_name: '시범운영', step_category: '오픈', description: '소프트 오픈' },
        { step_order: 9, step_name: '그랜드오픈', step_category: '오픈', description: '정식 오픈' },
      ];

      await supabase.from('project_milestones').insert(
        milestones.map(m => ({ ...m, project_id: project.id }))
      );

      // 환영 메시지
      await supabase.from('project_messages').insert({
        project_id: project.id,
        sender_type: 'PM',
        sender_id: pm?.id,
        message: `안녕하세요! 담당 PM ${pm?.name}입니다. 🙌\n\n${dong} ${BUSINESS_CATEGORIES.find(c => c.id === businessCategory)?.label} 창업을 함께 하게 되어 기쁩니다.\n\n산출된 예상 비용을 바탕으로 세부 계획을 세워보겠습니다. 궁금한 점이 있으시면 언제든 메시지 주세요!`
      });
    }

    setLoading(false);
    setStep(5); // 완료 단계
  };

  // Step 3에서 비용 산출
  useEffect(() => {
    if (step === 4 && costEstimates.length === 0) {
      calculateCosts();
    }
  }, [step]);

  const formatPrice = (price: number) => {
    if (price >= 100000000) {
      return `${(price / 100000000).toFixed(1)}억`;
    } else if (price >= 10000000) {
      return `${Math.round(price / 10000000)}천만`;
    } else if (price >= 10000) {
      return `${Math.round(price / 10000)}만`;
    }
    return price.toLocaleString();
  };

  const canProceed = () => {
    switch (step) {
      case 1: return businessCategory !== '';
      case 2: return dong !== '';
      case 3: return storeSize > 0;
      case 4: return !estimating;
      default: return true;
    }
  };

  // Step 1: 업종 선택
  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">어떤 창업을 준비하시나요?</h2>
        <p className="text-gray-500">업종을 선택해주세요</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {BUSINESS_CATEGORIES.map(cat => {
          const Icon = cat.icon;
          const isSelected = businessCategory === cat.id;
          return (
            <button
              key={cat.id}
              onClick={() => setBusinessCategory(cat.id)}
              className={`p-4 rounded-xl border-2 transition-all ${
                isSelected
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className={`w-12 h-12 rounded-xl ${cat.color} flex items-center justify-center mx-auto mb-3`}>
                <Icon size={24} />
              </div>
              <p className={`font-medium ${isSelected ? 'text-brand-700' : 'text-gray-700'}`}>
                {cat.label}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );

  // Step 2: 위치 선택
  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">어디에서 창업하시나요?</h2>
        <p className="text-gray-500">강남구 내 희망 지역을 선택해주세요</p>
      </div>

      <div className="bg-brand-50 rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 text-brand-700">
          <MapPin size={20} />
          <span className="font-bold">서울시 강남구</span>
        </div>
        <p className="text-sm text-brand-600 mt-1">현재 강남구에서만 서비스 이용 가능합니다</p>
      </div>

      <div className="grid grid-cols-2 gap-2">
        {GANGNAM_DONGS.map(d => (
          <button
            key={d}
            onClick={() => setDong(d)}
            className={`p-3 rounded-xl border-2 font-medium transition-all ${
              dong === d
                ? 'border-brand-600 bg-brand-50 text-brand-700'
                : 'border-gray-200 text-gray-700 hover:border-gray-300'
            }`}
          >
            {d}
          </button>
        ))}
      </div>
    </div>
  );

  // Step 3: 규모 선택
  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">매장 규모는 어느 정도인가요?</h2>
        <p className="text-gray-500">예상 평수와 층수를 선택해주세요</p>
      </div>

      {/* 규모 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">매장 크기</label>
        <div className="space-y-2">
          {STORE_SIZES.map(size => (
            <button
              key={size.id}
              onClick={() => {
                setStoreSize(size.value);
                setStoreSizeLabel(size.id);
              }}
              className={`w-full p-4 rounded-xl border-2 text-left transition-all ${
                storeSizeLabel === size.id
                  ? 'border-brand-600 bg-brand-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{size.label}</span>
                <Ruler size={20} className={storeSizeLabel === size.id ? 'text-brand-600' : 'text-gray-400'} />
              </div>
            </button>
          ))}
        </div>

        {/* 직접 입력 */}
        <div className="mt-3">
          <input
            type="number"
            placeholder="직접 입력 (평)"
            className="w-full px-4 py-3 border rounded-xl"
            value={storeSizeLabel === '' ? storeSize : ''}
            onChange={(e) => {
              setStoreSize(Number(e.target.value) || 15);
              setStoreSizeLabel('');
            }}
          />
        </div>
      </div>

      {/* 층수 */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">층수</label>
        <div className="grid grid-cols-3 gap-2">
          {STORE_FLOORS.map(floor => (
            <button
              key={floor.id}
              onClick={() => setStoreFloor(floor.id)}
              className={`p-3 rounded-xl border-2 font-medium transition-all ${
                storeFloor === floor.id
                  ? 'border-brand-600 bg-brand-50 text-brand-700'
                  : 'border-gray-200 text-gray-700 hover:border-gray-300'
              }`}
            >
              {floor.label}
            </button>
          ))}
        </div>
      </div>

      {/* 예산 (선택) */}
      <div>
        <label className="block text-sm font-bold text-gray-700 mb-3">예산 (선택)</label>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-gray-500 mb-1 block">총 예산</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                className="w-full px-4 py-3 border rounded-xl pr-12"
                value={budgetTotal}
                onChange={(e) => setBudgetTotal(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">만원</span>
            </div>
          </div>
          <div>
            <label className="text-xs text-gray-500 mb-1 block">자기자본</label>
            <div className="relative">
              <input
                type="number"
                placeholder="0"
                className="w-full px-4 py-3 border rounded-xl pr-12"
                value={budgetOwn}
                onChange={(e) => setBudgetOwn(e.target.value)}
              />
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">만원</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // Step 4: 비용 산출 결과
  const renderStep4 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold mb-2">예상 창업 비용</h2>
        <p className="text-gray-500">
          강남구 {dong} · {BUSINESS_CATEGORIES.find(c => c.id === businessCategory)?.label} · {storeSize}평
        </p>
      </div>

      {estimating ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-600 mb-4" size={48} />
          <p className="text-gray-500">비용을 산출하고 있습니다...</p>
        </div>
      ) : (
        <>
          {/* 총액 */}
          <div className="bg-gradient-to-r from-brand-600 to-brand-700 rounded-2xl p-6 text-white">
            <div className="flex items-center gap-2 mb-2">
              <Calculator size={20} />
              <span className="font-medium">예상 총 비용</span>
            </div>
            <div className="text-3xl font-bold mb-1">
              {formatPrice(totalEstimate.avg)}원
            </div>
            <div className="text-sm opacity-80">
              {formatPrice(totalEstimate.min)} ~ {formatPrice(totalEstimate.max)}원
            </div>
          </div>

          {/* 상세 내역 */}
          <div className="space-y-3">
            {costEstimates.map((group, idx) => (
              <div key={idx} className="bg-white border rounded-xl p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold">{group.category}</span>
                  <span className="text-brand-600 font-bold">{formatPrice(group.subtotal.avg)}원</span>
                </div>
                <div className="space-y-1">
                  {group.items.map((item, i) => (
                    <div key={i} className="flex justify-between text-sm text-gray-500">
                      <span>{item.name}</span>
                      <span>{formatPrice(item.avg)}원</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* 예산 비교 */}
          {budgetTotal && (
            <div className={`p-4 rounded-xl ${
              Number(budgetTotal) * 10000 >= totalEstimate.avg
                ? 'bg-green-50 border border-green-200'
                : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center gap-2">
                {Number(budgetTotal) * 10000 >= totalEstimate.avg ? (
                  <>
                    <CheckCircle className="text-green-600" size={20} />
                    <span className="text-green-700 font-medium">
                      예산 내 창업 가능합니다!
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingUp className="text-red-600" size={20} />
                    <span className="text-red-700 font-medium">
                      약 {formatPrice(totalEstimate.avg - Number(budgetTotal) * 10000)}원 부족합니다
                    </span>
                  </>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );

  // Step 5: PM 배정 완료
  const renderStep5 = () => (
    <div className="space-y-6 text-center">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="text-green-600" size={48} />
      </div>

      <div>
        <h2 className="text-2xl font-bold mb-2">PM이 배정되었습니다!</h2>
        <p className="text-gray-500">담당 PM이 끝까지 함께합니다</p>
      </div>

      {assignedPM && (
        <div className="bg-white border-2 border-brand-200 rounded-2xl p-6">
          <img
            src={assignedPM.profile_image}
            alt={assignedPM.name}
            className="w-24 h-24 rounded-full mx-auto mb-4 object-cover border-4 border-white shadow-lg"
          />
          <h3 className="text-xl font-bold mb-1">{assignedPM.name} PM</h3>
          <div className="flex items-center justify-center gap-2 text-sm text-gray-500 mb-3">
            <span>⭐ {assignedPM.rating}</span>
            <span>·</span>
            <span>프로젝트 {assignedPM.completed_projects}건 완료</span>
          </div>
          <p className="text-sm text-gray-600 mb-4">{assignedPM.introduction}</p>
          <div className="flex flex-wrap justify-center gap-2">
            {assignedPM.specialties.map((s, i) => (
              <span key={i} className="px-3 py-1 bg-brand-50 text-brand-700 rounded-full text-sm">
                {s}
              </span>
            ))}
          </div>
        </div>
      )}

      <Button fullWidth size="lg" onClick={() => onComplete(projectId!)}>
        <Sparkles size={20} className="mr-2" />
        프로젝트 시작하기
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 bg-white border-b z-10">
        <div className="flex items-center justify-between px-4 h-14">
          {step > 1 && step < 5 ? (
            <button onClick={() => setStep(step - 1)} className="p-2 -ml-2">
              <ChevronLeft size={24} />
            </button>
          ) : (
            <div className="w-10" />
          )}
          <div className="flex-1 mx-4">
            <div className="flex gap-1">
              {[1, 2, 3, 4].map(s => (
                <div
                  key={s}
                  className={`h-1 flex-1 rounded-full transition-colors ${
                    s <= step ? 'bg-brand-600' : 'bg-gray-200'
                  }`}
                />
              ))}
            </div>
          </div>
          {onSkip && step < 5 && (
            <button onClick={onSkip} className="text-sm text-gray-400">
              건너뛰기
            </button>
          )}
        </div>
      </div>

      {/* 컨텐츠 */}
      <div className="p-6 pb-32">
        {step === 1 && renderStep1()}
        {step === 2 && renderStep2()}
        {step === 3 && renderStep3()}
        {step === 4 && renderStep4()}
        {step === 5 && renderStep5()}
      </div>

      {/* 하단 버튼 */}
      {step < 5 && (
        <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t z-50">
          <Button
            fullWidth
            size="lg"
            disabled={!canProceed() || loading}
            onClick={() => {
              if (step === 4) {
                createProject();
              } else {
                setStep(step + 1);
              }
            }}
          >
            {loading ? (
              <Loader2 className="animate-spin mr-2" size={20} />
            ) : null}
            {step === 4 ? 'PM 배정받기' : '다음'}
            {!loading && <ChevronRight size={20} className="ml-1" />}
          </Button>
        </div>
      )}
    </div>
  );
};
