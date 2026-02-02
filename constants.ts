import { CategoryNode, Package, ItemGrade, Product, ConsultingOption, OpenTaskCategory, OpenTaskItem } from './types';
import { 
  Utensils, ShoppingBag, Scissors, GraduationCap, 
  Stethoscope, Gamepad2, Building2, Car, BedDouble 
} from 'lucide-react';

// 1. 업종 카테고리 트리
export const CATEGORY_TREE: CategoryNode[] = [
  {
    id: 'FOOD',
    label: '음식·외식',
    icon: Utensils,
    children: [
      { id: 'CAFE', label: '카페/디저트', children: [{ id: 'cafe_small', label: '개인카페' }, { id: 'cafe_fran', label: '프랜차이즈' }, { id: 'bakery', label: '베이커리' }] },
      { id: 'PUB', label: '주점/호프', children: [{ id: 'pub_Izakaya', label: '이자카야' }, { id: 'pub_poch', label: '포차' }, { id: 'pub_bar', label: '바(Bar)' }] },
      { id: 'CHICKEN', label: '치킨/피자', children: [] },
      { id: 'KOREAN', label: '한식/분식', children: [] },
    ]
  },
  {
    id: 'RETAIL',
    label: '소매·유통',
    icon: ShoppingBag,
    children: [
      { id: 'CVS', label: '편의점/마트', children: [] },
      { id: 'CLOTHES', label: '의류/잡화', children: [] },
    ]
  },
  {
    id: 'BEAUTY',
    label: '뷰티·서비스',
    icon: Scissors,
    children: [
      { id: 'HAIR', label: '헤어샵', children: [] },
      { id: 'NAIL', label: '네일/속눈썹', children: [] },
    ]
  },
  {
    id: 'EDUCATION',
    label: '교육·학습',
    icon: GraduationCap,
    children: [
      { id: 'STUDY', label: '스터디카페', children: [] },
      { id: 'ACADEMY', label: '학원/교습소', children: [] },
    ]
  },
  {
    id: 'HEALTH',
    label: '의료·건강',
    icon: Stethoscope,
    children: [
      { id: 'FITNESS', label: '헬스/PT' },
      { id: 'PILATES', label: '필라테스' }
    ]
  },
  {
    id: 'ENTERTAINMENT',
    label: '엔터·PC',
    icon: Gamepad2,
    children: [
      { id: 'PC', label: 'PC방', children: [] },
      { id: 'KARAOKE', label: '노래방', children: [] },
    ]
  },
  {
    id: 'OFFICE',
    label: '사무·오피스',
    icon: Building2,
    children: []
  },
  {
    id: 'AUTO',
    label: '자동차',
    icon: Car,
    children: []
  },
  {
    id: 'LODGING',
    label: '숙박·기타',
    icon: BedDouble,
    children: []
  }
];

// 2. 오픈 프로세스 태스크 (체크리스트용) - [최신 기획 반영]
export const OPEN_TASK_CATEGORIES: OpenTaskCategory[] = [
  { id: 'CONSTRUCTION', label: '공사/정리', description: '철거부터 인테리어, 청소까지' },
  { id: 'OPERATION', label: '운영 준비', description: '매장 운영 필수 인프라' },
  { id: 'INFO', label: '입지/정보', description: '상권 분석과 필수 지식' },
  { id: 'OPENING_LITE', label: '오프닝 패키지', description: '비용 절감의 핵심 솔루션' },
];

export const OPEN_PROCESS_TASKS: OpenTaskItem[] = [
  // 1. 공사/정리
  { id: 'demolition', category: 'CONSTRUCTION', title: '철거 및 원상복구', description: '폐기물 처리 및 철거', iconType: 'hammer' },
  { id: 'interior', category: 'CONSTRUCTION', title: '인테리어 시공', description: '업종별 맞춤 시공', iconType: 'paint' },
  { id: 'signage', category: 'CONSTRUCTION', title: '간판/사인물', description: '내외부 간판 설치', iconType: 'sign' },
  { id: 'cleaning', category: 'CONSTRUCTION', title: '전문 청소', description: '준공/입주 딥클리닝', iconType: 'sparkles' },

  // 2. 운영 준비
  { id: 'network', category: 'OPERATION', title: '통신 솔루션', description: '인터넷/CCTV/포스', iconType: 'wifi' },
  { id: 'insurance', category: 'OPERATION', title: '필수 보험', description: '화재/배상책임 보험', iconType: 'shield' },
  { id: 'beverage', category: 'OPERATION', title: '음료/주류 도매', description: '주류사 최저가 매칭', iconType: 'wine' },
  { id: 'delivery', category: 'OPERATION', title: '배달 대행', description: '배달 권역 세팅', iconType: 'bike' },

  // 3. 입지/정보
  { id: 'find_store', category: 'INFO', title: '점포 찾기', description: '상권 분석 및 매물 추천', iconType: 'map' },
  { id: 'owner_guide', category: 'INFO', title: '사장님 필독', description: '인허가/행정 가이드', iconType: 'book' },

  // 4. 오프닝 패키지 (핵심)
  { id: 'used_package', category: 'OPENING_LITE', title: '중고 가구/집기 패키지', description: 'A급 검수 자재 + 설치', iconType: 'box', isOpeningExclusive: true },
  { id: 'consulting', category: 'OPENING_LITE', title: '창업 컨설팅', description: '예산/구성 최적화 진단', iconType: 'user', isOpeningExclusive: true },
  { id: '3d_link', category: 'OPENING_LITE', title: '3D 인테리어 시안', description: '미리보는 배치 체험', iconType: 'cube', isOpeningExclusive: true },
];

// Helper to create mock products
const createProduct = (name: string, category: string, w: number, d: number, h: number, price: number = 0, grade: ItemGrade = ItemGrade.A): Product => ({
  id: `p_${Math.random().toString(36).substr(2, 9)}`,
  name, category, width: w, depth: d, height: h, price, grade, 
  utility: {electric:false, water:false, gas:false, vent:false}, 
  image: '', 
  clearance: {front:0, side:0}
});

// 3. 통합 매물 데이터 (25개 - 홈 화면 및 매물 탭용)
export const MOCK_OPENING_PACKAGES: Package[] = [
  // --- [EDUCATION] ---
  {
    id: 'pkg_edu_001', source: 'OPENING',
    name: '강남 프리미엄 스터디카페 20평형 (A급)',
    description: '프리미엄 독서실 폐업 자재, 상태 최상. 시디즈 의자 40개, 1인실 책상 포함.',
    businessType: 'EDUCATION',
    image: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1000',
    items: [createProduct('1인실 책상', 'FURNITURE', 100, 60, 120, 150000)],
    totalPrice: 15000000, location: '서울 강남구', leadTimeDays: 7, has3D: true, badges: ['오프닝 검수', '설치포함'], grade: 'A', warranty: '6개월', tags: ['study', 'gangnam', 'today']
  },
  {
    id: 'pkg_edu_002', source: 'USER',
    name: '보습학원 15평 강의실 집기 일괄',
    description: '책걸상 세트 30조, 화이트보드 2개, 강연대 1개. 상태 깨끗함.',
    businessType: 'EDUCATION',
    image: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?q=80&w=1000',
    items: [], totalPrice: 1200000, location: '경기 성남시', leadTimeDays: 5, has3D: false, badges: ['직거래', '가구위주'], grade: 'B', warranty: '없음', deadline: 'D-10', hopePrice: 1000000, tags: ['academy', 'bundang', 'cheap']
  },
  {
    id: 'pkg_edu_003', source: 'USER',
    name: '미술학원 이젤 및 수납장 정리',
    description: '원목 이젤 20개, 물감 정리함, 작업대. 폐업 정리합니다.',
    businessType: 'EDUCATION',
    image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?q=80&w=1000',
    items: [], totalPrice: 800000, location: '서울 마포구', leadTimeDays: 3, has3D: false, badges: ['직거래', '급처'], grade: 'C', warranty: '없음', deadline: 'D-3', hopePrice: 500000, tags: ['art', 'urgent']
  },

  // --- [CAFE] ---
  {
    id: 'pkg_cafe_001', source: 'OPENING',
    name: '성수동 감성 카페 15평 (B급 가성비)',
    description: '우드톤 인테리어 가구 일체. 라마르조꼬 머신 포함.',
    businessType: 'CAFE',
    image: 'https://images.unsplash.com/photo-1554118811-1e0d58224f24?auto=format&fit=crop&q=80&w=1000',
    items: [createProduct('에스프레소 머신', 'KITCHEN', 80, 60, 50, 4500000)],
    totalPrice: 12000000, location: '서울 성동구', leadTimeDays: 14, has3D: true, badges: ['오프닝 검수', '철거포함'], grade: 'B', warranty: '3개월', tags: ['cafe', 'seongsu', 'today']
  },
  {
    id: 'pkg_cafe_002', source: 'USER',
    name: '프랜차이즈 카페 폐업 정리 (집기/머신)',
    description: '메가/컴포즈 스타일. 제빙기 2대, 블렌더 2대, 포스기 포함.',
    businessType: 'CAFE',
    image: 'https://images.unsplash.com/photo-1507914464562-6b718842a633?q=80&w=1000',
    items: [], totalPrice: 8500000, location: '인천 부평구', leadTimeDays: 7, has3D: false, badges: ['직거래', '급처'], grade: 'C', warranty: '없음', deadline: 'D-3', hopePrice: 8000000, tags: ['cafe', 'franchise', 'urgent']
  },
  {
    id: 'pkg_cafe_003', source: 'USER',
    name: '디저트 카페 쇼케이스 및 오븐',
    description: '900 사이즈 제과 쇼케이스(사각), 스메그 오븐 4단.',
    businessType: 'CAFE',
    image: 'https://images.unsplash.com/photo-1517433670267-08bbd4be890f?q=80&w=1000',
    items: [], totalPrice: 3200000, location: '서울 용산구', leadTimeDays: 5, has3D: false, badges: ['직거래', '상태좋음'], grade: 'A', warranty: '없음', deadline: 'D-14', hopePrice: 3000000, tags: ['cafe', 'dessert']
  },
  {
    id: 'pkg_cafe_004', source: 'OPENING',
    name: '베이커리 카페 주방 장비 세트',
    description: '3단 데크오븐, 도우컨디셔너, 믹서기, 스텐 작업대 3개.',
    businessType: 'CAFE',
    image: 'https://images.unsplash.com/photo-1556910103-1c02745a30bf?q=80&w=1000',
    items: [], totalPrice: 18000000, location: '서울 송파구', leadTimeDays: 10, has3D: true, badges: ['오프닝 검수', '주방위주'], grade: 'B+', warranty: '6개월', tags: ['bakery', 'kitchen']
  },

  // --- [PUB] ---
  {
    id: 'pkg_pub_001', source: 'OPENING',
    name: '홍대 펍/바 12평 패키지 (주방 설비 특화)',
    description: '업소용 냉장고, 제빙기, 4구 간택기, 식기세척기 포함.',
    businessType: 'PUB',
    image: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&q=80&w=1000',
    items: [], totalPrice: 18500000, location: '서울 마포구', leadTimeDays: 7, has3D: true, badges: ['오프닝 검수', '빠른설치'], grade: 'A', warranty: '3개월', tags: ['pub', 'hongdae', 'kitchen']
  },
  {
    id: 'pkg_pub_002', source: 'USER',
    name: '이자카야 다찌(Bar) 테이블 및 목재 인테리어',
    description: '히노끼 스타일 다찌 상판, 목재 파티션, 조명 일괄 양도.',
    businessType: 'PUB',
    image: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?q=80&w=1000',
    items: [], totalPrice: 3000000, location: '서울 관악구', leadTimeDays: 20, has3D: false, badges: ['직거래', '인테리어포함'], grade: 'B', warranty: '없음', deadline: 'D-14', hopePrice: 2500000, tags: ['izakaya', 'wood']
  },
  {
    id: 'pkg_pub_003', source: 'USER',
    name: '실내포차 원형테이블 15개 세트 급처',
    description: '스텐 원형 드럼통 테이블 15개, 수납 의자 60개 일괄.',
    businessType: 'PUB',
    image: 'https://images.unsplash.com/photo-1572116469696-958721b7d6ca?q=80&w=1000',
    items: [], totalPrice: 800000, location: '경기 수원시', leadTimeDays: 3, has3D: false, badges: ['직거래', '초저가'], grade: 'C', warranty: '없음', deadline: 'D-2', hopePrice: 500000, tags: ['pub', 'pocha', 'cheap', 'today']
  },
  {
    id: 'pkg_pub_004', source: 'USER',
    name: '와인바 럭셔리 소파 및 조명',
    description: '벨벳 소파 6조, 샹들리에 조명 3개, 와인잔 랙.',
    businessType: 'PUB',
    image: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?q=80&w=1000',
    items: [], totalPrice: 4500000, location: '서울 강남구', leadTimeDays: 14, has3D: false, badges: ['직거래', '고급'], grade: 'A', warranty: '없음', deadline: 'D-30', hopePrice: 4000000, tags: ['wine', 'luxury']
  },

  // --- [RETAIL] ---
  {
    id: 'pkg_retail_001', source: 'USER',
    name: '동네 분식집 급처분 (집기 일괄)',
    description: '운영 6개월차. 떡볶이 다이, 튀김기, 순대 찜기 등 일괄.',
    businessType: 'RETAIL',
    image: 'https://images.unsplash.com/photo-1563245372-f21724e3856d?auto=format&fit=crop&q=80&w=1000',
    items: [], totalPrice: 5000000, location: '서울 강서구', leadTimeDays: 3, has3D: false, badges: ['직거래', '빠른회수'], grade: 'C', warranty: '없음', deadline: 'D-5', hopePrice: 5000000, tags: ['snack', 'urgent', 'cheap']
  },
  {
    id: 'pkg_retail_002', source: 'OPENING',
    name: '편의점/마트 진열대(곤돌라) 20개 세트',
    description: '화이트 철제 곤돌라(양면/단면 혼합). 워크인 쿨러 도어 4짝.',
    businessType: 'RETAIL',
    image: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?q=80&w=1000',
    items: [], totalPrice: 4500000, location: '경기 김포시', leadTimeDays: 7, has3D: true, badges: ['오프닝 검수', '설치지원'], grade: 'A', warranty: '6개월', tags: ['retail', 'cvs', 'shelf']
  },
  {
    id: 'pkg_retail_003', source: 'USER',
    name: '옷가게 행거 및 전신거울, 마네킹',
    description: '골드 프레임 행거 10개, 대형 전신거울 2개, 마네킹 5개.',
    businessType: 'RETAIL',
    image: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?q=80&w=1000',
    items: [], totalPrice: 1500000, location: '서울 마포구', leadTimeDays: 7, has3D: false, badges: ['직거래', '소량'], grade: 'A', warranty: '없음', deadline: 'D-7', hopePrice: 1200000, tags: ['clothing', 'interior', 'today']
  },
  {
    id: 'pkg_retail_004', source: 'USER',
    name: '꽃집 작업대 및 진열장',
    description: '대형 원목 작업테이블(2000), 리본걸이, 화분 진열대.',
    businessType: 'RETAIL',
    image: 'https://images.unsplash.com/photo-1589244188104-81233c62a5a9?q=80&w=1000',
    items: [], totalPrice: 800000, location: '서울 서초구', leadTimeDays: 3, has3D: false, badges: ['직거래', '가구위주'], grade: 'B', warranty: '없음', deadline: 'D-5', hopePrice: 700000, tags: ['flower', 'furniture']
  },

  // --- [BEAUTY] ---
  {
    id: 'pkg_beauty_001', source: 'USER',
    name: '네일샵 테이블 및 의자 정리',
    description: '흡진기 내장 테이블, 시술 의자, 패디 의자 1개.',
    businessType: 'BEAUTY',
    image: 'https://images.unsplash.com/photo-1604654894610-df63bc536371?auto=format&fit=crop&q=80&w=1000',
    items: [], totalPrice: 2000000, location: '서울 마포구', leadTimeDays: 5, has3D: false, badges: ['직거래', '소량'], grade: 'B', warranty: '없음', deadline: 'D-2', hopePrice: 1800000, tags: ['beauty', 'nail', 'urgent']
  },
  {
    id: 'pkg_beauty_002', source: 'OPENING',
    name: '미용실 경대/의자 3세트 패키지',
    description: '골드 프레임 팔각 거울 경대 3개, 전동 미용 의자 3개.',
    businessType: 'BEAUTY',
    image: 'https://images.unsplash.com/photo-1560066984-138dadb4c035?q=80&w=1000',
    items: [], totalPrice: 5500000, location: '서울 강남구', leadTimeDays: 10, has3D: true, badges: ['오프닝 검수', '설치포함'], grade: 'A', warranty: '1년', tags: ['hair', 'premium', 'today']
  },
  {
    id: 'pkg_beauty_003', source: 'USER',
    name: '바버샵 클래식 체어 2대',
    description: '앤티크 스타일 중량 바버 체어 2대. 가죽 상태 양호.',
    businessType: 'BEAUTY',
    image: 'https://images.unsplash.com/photo-1503951914205-9847627cb971?q=80&w=1000',
    items: [], totalPrice: 2800000, location: '서울 용산구', leadTimeDays: 7, has3D: false, badges: ['직거래', '희귀템'], grade: 'B+', warranty: '없음', deadline: 'D-15', hopePrice: 2500000, tags: ['barber', 'vintage']
  },

  // --- [FITNESS] ---
  {
    id: 'pkg_fit_001', source: 'OPENING',
    name: '필라테스 스튜디오 30평 기구 일괄 (S급)',
    description: '리포머, 캐딜락, 체어, 바렐 풀세트 4조 (인투필라테스).',
    businessType: 'FITNESS',
    image: 'https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&q=80&w=1000',
    items: [createProduct('콤비 리포머', 'EQUIPMENT', 80, 240, 180, 1500000)],
    totalPrice: 25000000, location: '서울 송파구', leadTimeDays: 10, has3D: true, badges: ['오프닝 검수', '설치포함'], grade: 'A', warranty: '1년', tags: ['pilates', 'large', 'today']
  },
  {
    id: 'pkg_fit_002', source: 'USER',
    name: 'PT샵 운동기구 정리 (렉, 덤벨, 벤치)',
    description: '파워렉 1대, 스미스머신 1대, 덤벨 세트, 벤치 2개.',
    businessType: 'FITNESS',
    image: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?q=80&w=1000',
    items: [], totalPrice: 4500000, location: '경기 안양시', leadTimeDays: 14, has3D: false, badges: ['직거래', '운반별도'], grade: 'B', warranty: '없음', deadline: 'D-20', hopePrice: 4000000, tags: ['gym', 'pt']
  },

  // --- [OTHER] ---
  {
    id: 'pkg_other_001', source: 'OPENING',
    name: '셀프 사진관(스튜디오) 장비 세트',
    description: '조명(스트로보) 2조, 배경지 전동 시스템, 키오스크.',
    businessType: 'OTHER',
    image: 'https://images.unsplash.com/photo-1527011046414-4781f1f94f8c?q=80&w=1000',
    items: [], totalPrice: 6500000, location: '서울 마포구', leadTimeDays: 7, has3D: false, badges: ['오프닝 검수', '설치지원'], grade: 'A', warranty: '6개월', tags: ['photo', 'studio']
  },
  {
    id: 'pkg_other_002', source: 'OPENING',
    name: '코인노래방 15룸 패키지',
    description: 'TJ미디어 최신 반주기 세트 15개. 소파 및 케이스 포함.',
    businessType: 'ENTERTAINMENT',
    image: 'https://images.unsplash.com/photo-1598518619679-584fbddb7f3d?q=80&w=1000',
    items: [], totalPrice: 35000000, location: '경기 부천시', leadTimeDays: 20, has3D: true, badges: ['오프닝 검수', '대량'], grade: 'B+', warranty: '3개월', tags: ['karaoke', 'large']
  },
  {
    id: 'pkg_chicken_001', source: 'OPENING',
    name: '치킨·배달 주방 패키지 8~12평',
    description: '작업대/선반/냉장/싱크 표준 구성. 튀김기 2구 포함.',
    businessType: 'CHICKEN',
    image: 'https://images.unsplash.com/photo-1583251633115-788a2b9e6eb1?q=80&w=800',
    items: [], totalPrice: 27500000, location: '전국 설치 가능', leadTimeDays: 14, has3D: true, badges: ['오프닝 검수', '장비보증'], grade: 'B+', warranty: '30일', tags: ['chicken', 'kitchen', 'delivery']
  },
  {
    id: 'pkg_chicken_002', source: 'USER',
    name: '피자집 오븐 및 토핑냉장고 정리',
    description: '컨베이어 피자오븐 1대, 토핑테이블 냉장고.',
    businessType: 'CHICKEN',
    image: 'https://images.unsplash.com/photo-1566843972233-03099975775a?q=80&w=800',
    items: [], totalPrice: 4000000, location: '서울 동대문구', leadTimeDays: 7, has3D: false, badges: ['직거래', '주방위주'], grade: 'B', warranty: '없음', deadline: 'D-7', hopePrice: 3500000, tags: ['pizza', 'oven']
  }
];

// 3. 사용자 직거래 리스트 (홈 화면용 필터링 로직)
// tags에 'today'나 'urgent'가 있거나 source가 USER인 것을 기본으로 가져오되,
// HomeView 컴포넌트 내부에서 탭(today, quick 등)에 따라 2차 필터링을 합니다.
export const MOCK_USER_LISTINGS = MOCK_OPENING_PACKAGES.filter(p => 
  p.source === 'USER' || p.tags?.includes('today') || p.tags?.includes('urgent')
);

// 4. 비용 상수
export const LOGISTICS_BASE_COST = 200000;
export const INSTALLATION_BASE_COST = 300000;

// 5. 상담 옵션
export const MOCK_CONSULTING_OPTIONS: ConsultingOption[] = [
  {
    id: 'c_quick',
    title: '빠른 검증 (30분)',
    durationMin: 30,
    price: 30000,
    description: '아이디어/상권 초기 진단. 전화 또는 화상.',
    isOnline: true,
  },
  {
    id: 'c_standard',
    title: '구성/동선 확정 (60분)',
    durationMin: 60,
    price: 99000,
    description: '도면 기반 상세 배치 및 설비 체크. 화상 미팅.',
    isOnline: true,
  },
  {
    id: 'c_site',
    title: '현장 실측 동행',
    durationMin: 90,
    price: 250000,
    description: '전문가 현장 방문. 실측 및 인테리어 조언.',
    isOnline: false,
  }
];
