/**
 * 상권분석 API 유틸리티
 * 소상공인시장진흥공단 상가(상권)정보 API + 서울시 열린데이터광장 API
 */

// --- 환경변수에서 API 키 가져오기 ---
function getDataGoKrApiKey(): string {
  const key = import.meta.env.VITE_DATA_GO_KR_API_KEY;
  if (!key) {
    throw new Error('VITE_DATA_GO_KR_API_KEY 환경변수가 설정되지 않았습니다.');
  }
  return key;
}

function getSeoulApiKey(): string {
  const key = import.meta.env.VITE_SEOUL_API_KEY;
  if (!key) {
    console.warn('VITE_SEOUL_API_KEY가 설정되지 않았습니다. 서울 데이터 API를 사용할 수 없습니다.');
    return '';
  }
  return key;
}

// --- 서울시 열린데이터광장 API ---
// URL 형식: http://openapi.seoul.go.kr:8088/{KEY}/{FORMAT}/{SERVICE}/{START}/{END}

const SEOUL_API_BASE = 'http://openapi.seoul.go.kr:8088';

// 서울시 상권분석 API 서비스명 (data.seoul.go.kr 참조)
export const SEOUL_COMMERCE_SERVICES = {
  // 추정매출
  SALES_TRDAR: 'VwsmTrdarSelngW',        // 상권별 추정매출
  SALES_SIGNGU: 'VwsmSignguSelngW',      // 자치구별 추정매출
  SALES_ADSTRD: 'VwsmAdstrdSelngW',      // 행정동별 추정매출
  // 유동인구
  FLPOP_TRDAR: 'VwsmTrdarFlpopQq',       // 상권별 유동인구
  FLPOP_SIGNGU: 'VwsmSignguFlpopQq',     // 자치구별 유동인구
  // 점포
  STORE_TRDAR: 'VwsmTrdarStorQq',        // 상권별 점포수
  // 상권영역
  AREA_TRDAR: 'VwsmTrdarW',              // 상권영역 정보
} as const;

/** 서울시 추정매출 데이터 */
export interface SeoulSalesData {
  STDR_YY_CD: string;       // 기준년도
  STDR_QU_CD: string;       // 기준분기
  TRDAR_CD: string;         // 상권코드
  TRDAR_CD_NM: string;      // 상권코드명
  SVC_INDUTY_CD: string;    // 서비스업종코드
  SVC_INDUTY_CD_NM: string; // 서비스업종명
  THSMON_SELNG_AMT: number; // 당월매출금액
  THSMON_SELNG_CO: number;  // 당월매출건수
  MDWK_SELNG_AMT: number;   // 주중매출금액
  WKEND_SELNG_AMT: number;  // 주말매출금액
  MON_SELNG_AMT: number;    // 월요일매출금액
  TUES_SELNG_AMT: number;   // 화요일매출금액
  WED_SELNG_AMT: number;    // 수요일매출금액
  THUR_SELNG_AMT: number;   // 목요일매출금액
  FRI_SELNG_AMT: number;    // 금요일매출금액
  SAT_SELNG_AMT: number;    // 토요일매출금액
  SUN_SELNG_AMT: number;    // 일요일매출금액
  ML_SELNG_AMT: number;     // 남성매출금액
  FML_SELNG_AMT: number;    // 여성매출금액
  AGRDE_10_SELNG_AMT: number; // 10대매출금액
  AGRDE_20_SELNG_AMT: number; // 20대매출금액
  AGRDE_30_SELNG_AMT: number; // 30대매출금액
  AGRDE_40_SELNG_AMT: number; // 40대매출금액
  AGRDE_50_SELNG_AMT: number; // 50대매출금액
  AGRDE_60_ABOVE_SELNG_AMT: number; // 60대이상매출금액
}

/** 서울시 유동인구 데이터 */
export interface SeoulPopulationData {
  STDR_YY_CD: string;       // 기준년도
  STDR_QU_CD: string;       // 기준분기
  TRDAR_CD: string;         // 상권코드
  TRDAR_CD_NM: string;      // 상권코드명
  TOT_FLPOP_CO: number;     // 총유동인구수
  ML_FLPOP_CO: number;      // 남성유동인구수
  FML_FLPOP_CO: number;     // 여성유동인구수
  AGRDE_10_FLPOP_CO: number;  // 10대유동인구수
  AGRDE_20_FLPOP_CO: number;  // 20대유동인구수
  AGRDE_30_FLPOP_CO: number;  // 30대유동인구수
  AGRDE_40_FLPOP_CO: number;  // 40대유동인구수
  AGRDE_50_FLPOP_CO: number;  // 50대유동인구수
  AGRDE_60_ABOVE_FLPOP_CO: number; // 60대이상유동인구수
  TMZON_1_FLPOP_CO: number;   // 시간대1(00~06)유동인구
  TMZON_2_FLPOP_CO: number;   // 시간대2(06~11)유동인구
  TMZON_3_FLPOP_CO: number;   // 시간대3(11~14)유동인구
  TMZON_4_FLPOP_CO: number;   // 시간대4(14~17)유동인구
  TMZON_5_FLPOP_CO: number;   // 시간대5(17~21)유동인구
  TMZON_6_FLPOP_CO: number;   // 시간대6(21~24)유동인구
}

/**
 * 서울시 API 호출 (범용)
 */
export async function fetchSeoulApi<T>(
  serviceName: string,
  startIndex: number = 1,
  endIndex: number = 100
): Promise<{ list: T[]; totalCount: number } | null> {
  const apiKey = getSeoulApiKey();
  if (!apiKey) {
    console.warn('[SeoulAPI] API 키가 설정되지 않았습니다.');
    return null;
  }

  const url = `${SEOUL_API_BASE}/${apiKey}/json/${serviceName}/${startIndex}/${endIndex}`;
  console.log(`[SeoulAPI] Fetching: ${serviceName}`);

  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`[SeoulAPI] HTTP Error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const serviceData = data[serviceName];

    if (!serviceData) {
      console.error(`[SeoulAPI] No data for service: ${serviceName}`);
      return null;
    }

    if (serviceData.RESULT?.CODE !== 'INFO-000') {
      console.error(`[SeoulAPI] API Error: ${serviceData.RESULT?.MESSAGE}`);
      return null;
    }

    return {
      list: serviceData.row || [],
      totalCount: serviceData.list_total_count || 0,
    };
  } catch (error) {
    console.error('[SeoulAPI] Fetch error:', error);
    return null;
  }
}

/**
 * 서울시 상권별 추정매출 조회
 */
export async function getSeoulSalesData(
  trdarCd?: string, // 상권코드 (선택)
  startIndex: number = 1,
  endIndex: number = 100
): Promise<SeoulSalesData[] | null> {
  const result = await fetchSeoulApi<SeoulSalesData>(
    SEOUL_COMMERCE_SERVICES.SALES_TRDAR,
    startIndex,
    endIndex
  );

  if (!result) return null;

  // 상권코드로 필터링 (선택)
  if (trdarCd) {
    return result.list.filter(item => item.TRDAR_CD === trdarCd);
  }

  return result.list;
}

/**
 * 서울시 상권별 유동인구 조회
 */
export async function getSeoulPopulationData(
  trdarCd?: string,
  startIndex: number = 1,
  endIndex: number = 100
): Promise<SeoulPopulationData[] | null> {
  const result = await fetchSeoulApi<SeoulPopulationData>(
    SEOUL_COMMERCE_SERVICES.FLPOP_TRDAR,
    startIndex,
    endIndex
  );

  if (!result) return null;

  if (trdarCd) {
    return result.list.filter(item => item.TRDAR_CD === trdarCd);
  }

  return result.list;
}

// --- Types ---

/** 업종 대분류 코드 */
export interface IndustryLargeCategory {
  code: string;
  name: string;
}

/** 업종 중분류 코드 */
export interface IndustryMediumCategory {
  code: string;
  name: string;
  largeCode: string;
}

/** 업종 소분류 코드 */
export interface IndustrySmallCategory {
  code: string;
  name: string;
  mediumCode: string;
}

/** 상가 업소 정보 */
export interface Store {
  bizesId: string;        // 상가업소번호
  bizesNm: string;        // 상호명
  brchNm?: string;        // 지점명
  indsLclsCd: string;     // 상권업종대분류코드
  indsLclsNm: string;     // 상권업종대분류명
  indsMclsCd: string;     // 상권업종중분류코드
  indsMclsNm: string;     // 상권업종중분류명
  indsSclsCd: string;     // 상권업종소분류코드
  indsSclsNm: string;     // 상권업종소분류명
  ksicCd?: string;        // 표준산업분류코드
  ksicNm?: string;        // 표준산업분류명
  ctprvnCd: string;       // 시도코드
  ctprvnNm: string;       // 시도명
  signguCd: string;       // 시군구코드
  signguNm: string;       // 시군구명
  adongCd: string;        // 행정동코드
  adongNm: string;        // 행정동명
  ldongCd?: string;       // 법정동코드
  ldongNm?: string;       // 법정동명
  lnoCd?: string;         // 지번코드
  plotSctCd?: string;     // 대지구분코드
  plotSctNm?: string;     // 대지구분명
  lnoMnno?: string;       // 지번본번지
  lnoSlno?: string;       // 지번부번지
  lnoAdr?: string;        // 지번주소
  rdnmCd?: string;        // 도로명코드
  rdnm?: string;          // 도로명
  bldMnno?: string;       // 건물본번지
  bldSlno?: string;       // 건물부번지
  bldMngNo?: string;      // 건물관리번호
  bldNm?: string;         // 건물명
  rdnmAdr?: string;       // 도로명주소
  oldZipCd?: string;      // 구우편번호
  newZipCd?: string;      // 신우편번호
  dongNo?: string;        // 동정보
  flrNo?: string;         // 층정보
  hoNo?: string;          // 호정보
  lon: number;            // 경도
  lat: number;            // 위도
}

/** API 응답 구조 */
export interface StoreApiResponse {
  header: {
    resultCode: string;
    resultMsg: string;
  };
  body: {
    items: Store[];
    totalCount: number;
    pageNo: number;
    numOfRows: number;
  };
}

/** 경쟁 분석 */
export interface CompetitionAnalysis {
  totalCompetitors: number;
  directCompetitors: Store[]; // 동일 업종
  indirectCompetitors: Store[]; // 유사 업종
  competitionDensity: number; // 경쟁 밀집도 (점포수/면적)
  avgDistanceToCompetitor: number; // 평균 경쟁점 거리
}

/** 프랜차이즈 분석 */
export interface FranchiseAnalysis {
  franchiseCount: number;
  independentCount: number;
  franchiseRatio: number;
  topFranchises: { name: string; count: number }[];
}

/** 업종별 상세 분석 */
export interface IndustryDetail {
  code: string;
  name: string;
  count: number;
  percentage: number;
  subCategories: { name: string; count: number }[];
}

/** 서울시 데이터 요약 */
export interface SeoulDataSummary {
  available: boolean;
  salesData?: {
    totalSales: number;
    avgSalesPerStore: number;
    weekdaySales: number;
    weekendSales: number;
    topAgeGroup: string;
    topGender: string;
  };
  populationData?: {
    totalFloatingPop: number;
    maleRatio: number;
    femaleRatio: number;
    peakTimeSlot: string;
    topAgeGroup: string;
  };
}

/** 상권 분석 리포트 */
export interface CommerceReport {
  location: {
    address: string;
    lat: number;
    lon: number;
    radius: number;
    dongName?: string;
  };
  summary: {
    totalStores: number;
    storesDensity: number; // 점포 밀집도 (개/km²)
    industryBreakdown: { category: string; count: number; percentage: number }[];
    topCategories: { name: string; count: number }[];
  };
  industryDetails: IndustryDetail[];
  franchiseAnalysis: FranchiseAnalysis;
  seoulData?: SeoulDataSummary; // 서울시 추가 데이터 (선택)
  stores: Store[];
  analyzedAt: string;
}

// --- 업종 코드 데이터 ---

export const INDUSTRY_LARGE_CATEGORIES: IndustryLargeCategory[] = [
  { code: 'Q', name: '음식' },
  { code: 'D', name: '소매' },
  { code: 'R', name: '생활서비스' },
  { code: 'P', name: '관광/여가/오락' },
  { code: 'L', name: '부동산' },
  { code: 'N', name: '숙박' },
  { code: 'O', name: '스포츠' },
  { code: 'F', name: '학문/교육' },
];

export const INDUSTRY_MEDIUM_CATEGORIES: IndustryMediumCategory[] = [
  // 음식 (Q)
  { code: 'Q01', name: '한식', largeCode: 'Q' },
  { code: 'Q02', name: '중식', largeCode: 'Q' },
  { code: 'Q03', name: '일식', largeCode: 'Q' },
  { code: 'Q04', name: '양식', largeCode: 'Q' },
  { code: 'Q05', name: '제과점', largeCode: 'Q' },
  { code: 'Q06', name: '패스트푸드', largeCode: 'Q' },
  { code: 'Q07', name: '치킨전문점', largeCode: 'Q' },
  { code: 'Q08', name: '분식', largeCode: 'Q' },
  { code: 'Q09', name: '카페', largeCode: 'Q' },
  { code: 'Q10', name: '호프/간이주점', largeCode: 'Q' },
  { code: 'Q12', name: '음식배달서비스', largeCode: 'Q' },
  // 소매 (D)
  { code: 'D01', name: '종합소매점', largeCode: 'D' },
  { code: 'D02', name: '식료품', largeCode: 'D' },
  { code: 'D03', name: '의류/패션', largeCode: 'D' },
  { code: 'D04', name: '가전/가구', largeCode: 'D' },
  { code: 'D05', name: '의약/의료용품', largeCode: 'D' },
  { code: 'D06', name: '문구/사무용품', largeCode: 'D' },
  // 생활서비스 (R)
  { code: 'R01', name: '이미용서비스', largeCode: 'R' },
  { code: 'R02', name: '세탁/수선', largeCode: 'R' },
  { code: 'R03', name: '자동차서비스', largeCode: 'R' },
  { code: 'R04', name: '인테리어/인쇄', largeCode: 'R' },
  // 관광/여가/오락 (P)
  { code: 'P01', name: '관광', largeCode: 'P' },
  { code: 'P02', name: '여가/오락', largeCode: 'P' },
  // 부동산 (L)
  { code: 'L01', name: '부동산중개', largeCode: 'L' },
  // 숙박 (N)
  { code: 'N01', name: '호텔/여관', largeCode: 'N' },
  // 스포츠 (O)
  { code: 'O01', name: '스포츠시설', largeCode: 'O' },
  // 학문/교육 (F)
  { code: 'F01', name: '학원', largeCode: 'F' },
];

// --- API 함수들 ---

// 개발환경에서는 Vite 프록시 사용 (CORS 우회)
const STORE_API_BASE = import.meta.env.DEV
  ? '/api/commerce/B553077/api/open/sdsc2'
  : 'https://apis.data.go.kr/B553077/api/open/sdsc2';

/**
 * 반경 내 상가업소 조회
 */
export async function getStoresInRadius(
  lat: number,
  lon: number,
  radius: number = 500, // meters
  options?: {
    pageNo?: number;
    numOfRows?: number;
    indsLclsCd?: string; // 대분류 코드
    indsMclsCd?: string; // 중분류 코드
  }
): Promise<StoreApiResponse> {
  const { pageNo = 1, numOfRows = 100, indsLclsCd, indsMclsCd } = options || {};

  const params = new URLSearchParams({
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    radius: String(radius),
    cx: String(lon),
    cy: String(lat),
    type: 'json',
  });

  if (indsLclsCd) params.append('indsLclsCd', indsLclsCd);
  if (indsMclsCd) params.append('indsMclsCd', indsMclsCd);

  // data.go.kr API 키 - Decoding 키면 인코딩 필요, Encoding 키면 그대로 사용
  const apiKey = getDataGoKrApiKey();
  // 키에 %가 없으면 Decoding 키이므로 인코딩 필요
  const encodedKey = apiKey.includes('%') ? apiKey : encodeURIComponent(apiKey);
  const url = `${STORE_API_BASE}/storeListInRadius?ServiceKey=${encodedKey}&${params.toString()}`;
  console.log('[CommerceAPI] Fetching stores in radius');
  console.log('[CommerceAPI] API Key encoded:', !apiKey.includes('%'));
  console.log('[CommerceAPI] Request URL:', url.replace(encodedKey, '***'));

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CommerceAPI] Error response:', errorText);
    throw new Error(`API 요청 실패: ${response.status} - ${errorText.slice(0, 200)}`);
  }

  const data = await response.json();
  console.log('[CommerceAPI] Response:', data);

  // API 에러 체크
  if (data.header?.resultCode !== '00') {
    throw new Error(`API 오류 (${data.header?.resultCode}): ${data.header?.resultMsg || '알 수 없는 오류'}`);
  }

  return {
    header: data.header,
    body: {
      items: data.body?.items || [],
      totalCount: data.body?.totalCount || 0,
      pageNo: data.body?.pageNo || pageNo,
      numOfRows: data.body?.numOfRows || numOfRows,
    },
  };
}

/**
 * 행정동 단위 상가업소 조회
 */
export async function getStoresInDong(
  adongCd: string, // 행정동코드
  options?: {
    pageNo?: number;
    numOfRows?: number;
    indsLclsCd?: string;
    indsMclsCd?: string;
  }
): Promise<StoreApiResponse> {
  const { pageNo = 1, numOfRows = 100, indsLclsCd, indsMclsCd } = options || {};

  const params = new URLSearchParams({
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    divId: 'adongCd',
    key: adongCd,
    type: 'json',
  });

  if (indsLclsCd) params.append('indsLclsCd', indsLclsCd);
  if (indsMclsCd) params.append('indsMclsCd', indsMclsCd);

  const apiKey = getDataGoKrApiKey();
  const encodedKey = apiKey.includes('%') ? apiKey : encodeURIComponent(apiKey);
  const url = `${STORE_API_BASE}/storeListInDong?ServiceKey=${encodedKey}&${params.toString()}`;
  console.log('[CommerceAPI] Fetching stores in dong');

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CommerceAPI] Error response:', errorText);
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();

  if (data.header?.resultCode !== '00') {
    throw new Error(`API 오류 (${data.header?.resultCode}): ${data.header?.resultMsg || '알 수 없는 오류'}`);
  }

  return {
    header: data.header,
    body: {
      items: data.body?.items || [],
      totalCount: data.body?.totalCount || 0,
      pageNo: data.body?.pageNo || pageNo,
      numOfRows: data.body?.numOfRows || numOfRows,
    },
  };
}

/**
 * 업종별 상가업소 조회
 */
export async function getStoresByIndustry(
  industryCode: string, // 업종코드 (대/중/소)
  divId: 'indsLclsCd' | 'indsMclsCd' | 'indsSclsCd' = 'indsMclsCd',
  options?: {
    pageNo?: number;
    numOfRows?: number;
  }
): Promise<StoreApiResponse> {
  const { pageNo = 1, numOfRows = 100 } = options || {};

  const params = new URLSearchParams({
    pageNo: String(pageNo),
    numOfRows: String(numOfRows),
    divId,
    key: industryCode,
    type: 'json',
  });

  const apiKey = getDataGoKrApiKey();
  const encodedKey = apiKey.includes('%') ? apiKey : encodeURIComponent(apiKey);
  const url = `${STORE_API_BASE}/storeListInUpjong?ServiceKey=${encodedKey}&${params.toString()}`;
  console.log('[CommerceAPI] Fetching stores by industry');

  const response = await fetch(url);

  if (!response.ok) {
    const errorText = await response.text();
    console.error('[CommerceAPI] Error response:', errorText);
    throw new Error(`API 요청 실패: ${response.status}`);
  }

  const data = await response.json();

  if (data.header?.resultCode !== '00') {
    throw new Error(`API 오류 (${data.header?.resultCode}): ${data.header?.resultMsg || '알 수 없는 오류'}`);
  }

  return {
    header: data.header,
    body: {
      items: data.body?.items || [],
      totalCount: data.body?.totalCount || 0,
      pageNo: data.body?.pageNo || pageNo,
      numOfRows: data.body?.numOfRows || numOfRows,
    },
  };
}

// --- 분석 함수들 ---

/**
 * 상권 분석 리포트 생성
 */
export async function generateCommerceReport(
  lat: number,
  lon: number,
  radius: number = 500,
  address: string = ''
): Promise<CommerceReport> {
  console.log(`[CommerceAPI] Generating report for (${lat}, ${lon}) radius=${radius}m`);

  // 전체 상가 조회 (최대 1000개)
  const response = await getStoresInRadius(lat, lon, radius, { numOfRows: 1000 });
  const stores = response.body.items;
  const totalCount = response.body.totalCount;

  // 면적 계산 (km²)
  const areaKm2 = Math.PI * Math.pow(radius / 1000, 2);
  const storesDensity = Math.round(totalCount / areaKm2);

  // 행정동 정보 추출
  const dongName = stores.length > 0 ? stores[0].adongNm : undefined;

  // 업종 대분류별 분류
  const industryMap = new Map<string, number>();
  stores.forEach(store => {
    const category = store.indsLclsNm || '기타';
    industryMap.set(category, (industryMap.get(category) || 0) + 1);
  });

  // 정렬 및 비율 계산
  const industryBreakdown = Array.from(industryMap.entries())
    .map(([category, count]) => ({
      category,
      count,
      percentage: stores.length > 0 ? Math.round((count / stores.length) * 1000) / 10 : 0,
    }))
    .sort((a, b) => b.count - a.count);

  // 중분류별 Top 카테고리
  const mediumMap = new Map<string, number>();
  stores.forEach(store => {
    const category = store.indsMclsNm || store.indsLclsNm || '기타';
    mediumMap.set(category, (mediumMap.get(category) || 0) + 1);
  });

  const topCategories = Array.from(mediumMap.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // 업종별 상세 분석 (대분류 → 중분류)
  const industryDetails: IndustryDetail[] = [];
  const largeCategories = new Map<string, { code: string; stores: Store[] }>();

  stores.forEach(store => {
    const key = store.indsLclsNm || '기타';
    if (!largeCategories.has(key)) {
      largeCategories.set(key, { code: store.indsLclsCd, stores: [] });
    }
    largeCategories.get(key)!.stores.push(store);
  });

  largeCategories.forEach((value, name) => {
    const subMap = new Map<string, number>();
    value.stores.forEach(store => {
      const subName = store.indsMclsNm || '기타';
      subMap.set(subName, (subMap.get(subName) || 0) + 1);
    });

    const subCategories = Array.from(subMap.entries())
      .map(([subName, count]) => ({ name: subName, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    industryDetails.push({
      code: value.code,
      name,
      count: value.stores.length,
      percentage: stores.length > 0 ? Math.round((value.stores.length / stores.length) * 1000) / 10 : 0,
      subCategories,
    });
  });

  industryDetails.sort((a, b) => b.count - a.count);

  // 프랜차이즈 분석 (brchNm이 있으면 프랜차이즈로 간주)
  const franchiseStores = stores.filter(s => s.brchNm && s.brchNm.trim() !== '');
  const franchiseCount = franchiseStores.length;
  const independentCount = stores.length - franchiseCount;
  const franchiseRatio = stores.length > 0 ? Math.round((franchiseCount / stores.length) * 1000) / 10 : 0;

  // 상호명 기준 프랜차이즈 집계
  const franchiseMap = new Map<string, number>();
  franchiseStores.forEach(store => {
    // 상호명에서 지점명 제거하고 본 상호만 추출
    const baseName = store.bizesNm.replace(/\s*(점|호점|호|지점|분점).*$/, '').trim();
    franchiseMap.set(baseName, (franchiseMap.get(baseName) || 0) + 1);
  });

  const topFranchises = Array.from(franchiseMap.entries())
    .map(([name, count]) => ({ name, count }))
    .filter(f => f.count >= 2) // 2개 이상만
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  return {
    location: {
      address,
      lat,
      lon,
      radius,
      dongName,
    },
    summary: {
      totalStores: totalCount,
      storesDensity,
      industryBreakdown,
      topCategories,
    },
    industryDetails,
    franchiseAnalysis: {
      franchiseCount,
      independentCount,
      franchiseRatio,
      topFranchises,
    },
    stores,
    analyzedAt: new Date().toISOString(),
  };
}

// --- 주소 → 좌표 변환 (Kakao API) ---

export interface GeocodingResult {
  address: string;
  lat: number;
  lon: number;
  roadAddress?: string;
}

/**
 * 주소를 좌표로 변환 (Kakao Local API)
 * 참고: Kakao API 키가 필요합니다
 */
export async function geocodeAddress(address: string): Promise<GeocodingResult | null> {
  const kakaoApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    console.warn('[CommerceAPI] VITE_KAKAO_REST_API_KEY not set, geocoding unavailable');
    return null;
  }

  const url = `https://dapi.kakao.com/v2/local/search/address.json?query=${encodeURIComponent(address)}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${kakaoApiKey}`,
    },
  });

  if (!response.ok) {
    console.error('[CommerceAPI] Geocoding failed:', response.status);
    return null;
  }

  const data = await response.json();

  if (!data.documents || data.documents.length === 0) {
    return null;
  }

  const doc = data.documents[0];
  return {
    address: doc.address?.address_name || address,
    lat: parseFloat(doc.y),
    lon: parseFloat(doc.x),
    roadAddress: doc.road_address?.address_name,
  };
}

/**
 * 키워드로 장소 검색 (Kakao Local API)
 */
export async function searchPlaceByKeyword(
  keyword: string,
  options?: { lat?: number; lon?: number; radius?: number }
): Promise<GeocodingResult[]> {
  const kakaoApiKey = import.meta.env.VITE_KAKAO_REST_API_KEY;

  if (!kakaoApiKey) {
    console.warn('[CommerceAPI] VITE_KAKAO_REST_API_KEY not set');
    return [];
  }

  const params = new URLSearchParams({ query: keyword });
  if (options?.lat && options?.lon) {
    params.append('y', String(options.lat));
    params.append('x', String(options.lon));
    if (options.radius) {
      params.append('radius', String(options.radius));
    }
  }

  const url = `https://dapi.kakao.com/v2/local/search/keyword.json?${params.toString()}`;

  const response = await fetch(url, {
    headers: {
      Authorization: `KakaoAK ${kakaoApiKey}`,
    },
  });

  if (!response.ok) {
    console.error('[CommerceAPI] Place search failed:', response.status);
    return [];
  }

  const data = await response.json();

  return (data.documents || []).map((doc: any) => ({
    address: doc.address_name,
    lat: parseFloat(doc.y),
    lon: parseFloat(doc.x),
    roadAddress: doc.road_address_name,
  }));
}
