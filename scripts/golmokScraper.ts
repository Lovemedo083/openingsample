/**
 * 서울시 골목상권분석 서비스 자동화 스크래퍼
 * golmok.seoul.go.kr에서 상권분석 리포트를 자동으로 가져옵니다.
 */

import puppeteer, { Browser, Page } from 'puppeteer';

// --- Types ---

export interface GolmokAnalysisRequest {
  address: string;           // 분석할 주소
  lat?: number;              // 위도
  lon?: number;              // 경도
  businessCategory?: '외식업' | '서비스업' | '소매업' | '전체';
  businessType?: string;     // 업종 중분류
  radiusMeters?: number;     // 분석 반경 (기본: 500m)
}

export interface GolmokAnalysisResult {
  success: boolean;
  location: {
    address: string;
    lat: number;
    lon: number;
    dongName?: string;
  };
  businessType: {
    category: string;
    type: string;
  };
  // 분석리포트 데이터
  report?: {
    dongName: string;           // 위치 (동 이름)
    businessType: string;       // 업종
    quarter: string;            // 기준분기
    summary: string[];          // 종합의견 (bullet points)
    storeChange: string;        // 점포수 변화 (예: "+2개")
    salesChange: string;        // 매출액 변화 (예: "+132만원")
    populationChange: string;   // 유동인구 변화 (예: "+4,034명")
    ranking?: {
      storeRank: number;        // 점포수 순위
      salesRank: number;        // 매출액 순위
      populationRank: number;   // 유동인구 순위
      totalDongs: number;       // 전체 행정동 수
    };
    // === 확장 데이터 (탭별 상세 분석) ===
    industryAnalysis?: {        // 업종분석 탭
      survivalRate1Year?: string;    // 1년 생존률
      survivalRate3Year?: string;    // 3년 생존률
      survivalRate5Year?: string;    // 5년 생존률
      avgOperatingYears?: string;    // 평균 영업 년수
      openingCount?: number;         // 개업 수
      closureCount?: number;         // 폐업 수
      openingRate?: string;          // 개업률
      closureRate?: string;          // 폐업률
      franchiseRatio?: string;       // 프랜차이즈 비율
      similarStoreCount?: number;    // 유사업종 점포수
    };
    salesAnalysis?: {           // 매출분석 탭
      totalSales?: string;           // 총 매출
      avgMonthlySales?: string;      // 월평균 매출
      weekdaySales?: string;         // 주중 매출
      weekendSales?: string;         // 주말 매출
      peakDay?: string;              // 매출 피크 요일
      peakTime?: string;             // 매출 피크 시간
      maleCustomerRatio?: string;    // 남성 고객 비율
      femaleCustomerRatio?: string;  // 여성 고객 비율
      ageGroupSales?: Record<string, string>; // 연령대별 매출
    };
    populationAnalysis?: {      // 인구분석 탭
      totalPopulation?: string;      // 총 유동인구
      workingPopulation?: string;    // 직장인구
      residentPopulation?: string;   // 주거인구
      maleRatio?: string;            // 남성 비율
      femaleRatio?: string;          // 여성 비율
      peakDay?: string;              // 피크 요일
      peakTime?: string;             // 피크 시간대
      ageDistribution?: Record<string, string>; // 연령대별 분포
    };
    areaAnalysis?: {            // 지역(배후지)분석 탭
      avgRent?: string;              // 평균 임대료
      rentTrend?: string;            // 임대료 추세
      nearbyFacilities?: string[];   // 주변 시설
      commercialDensity?: string;    // 상권 밀집도
      residentialRatio?: string;     // 주거 비율
      commercialRatio?: string;      // 상업 비율
    };
  };
  // 점포 현황
  stores?: {
    totalStores: number;      // 총 점포수
    similarStores: number;    // 유사업종 점포수
    franchiseCount: number;   // 프랜차이즈 수
    openCount: number;        // 개업 수
    closeCount: number;       // 폐업 수
  };
  // 추정 매출
  sales?: {
    totalSales: string;       // 총 매출 (텍스트)
    avgSalesPerStore: string; // 점포당 평균 매출
    weekdayRatio: number;     // 주중 비율
    weekendRatio: number;     // 주말 비율
  };
  // 유동인구
  population?: {
    total: string;            // 총 유동인구
    maleRatio: number;        // 남성 비율
    femaleRatio: number;      // 여성 비율
    peakDay: string;          // 피크 요일
    peakTime: string;         // 피크 시간
    topAgeGroup: string;      // 주요 연령대
  };
  // 임대료
  rent?: {
    avgRent: string;          // 평균 임대료
    rentTrend: string;        // 임대료 추세
  };
  // 원본 텍스트 데이터
  rawData?: string;
  analyzedAt: string;
  error?: string;
  screenshotPath?: string;
}

// --- Main Scraper Class ---

export class GolmokScraper {
  private browser: Browser | null = null;
  private page: Page | null = null;
  private headless: boolean;

  constructor(options?: { headless?: boolean }) {
    this.headless = options?.headless ?? true;
  }

  async init(): Promise<void> {
    console.log('[GolmokScraper] Launching browser...');
    this.browser = await puppeteer.launch({
      headless: this.headless,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--lang=ko-KR',
      ],
      defaultViewport: { width: 1400, height: 900 },
      protocolTimeout: 60000, // 60초 타임아웃
    });
    this.page = await this.browser.newPage();
    await this.page.setExtraHTTPHeaders({ 'Accept-Language': 'ko-KR,ko;q=0.9' });
    console.log('[GolmokScraper] Browser ready');
  }

  async close(): Promise<void> {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
      this.page = null;
      console.log('[GolmokScraper] Browser closed');
    }
  }

  async analyze(request: GolmokAnalysisRequest): Promise<GolmokAnalysisResult> {
    if (!this.page) {
      throw new Error('Browser not initialized. Call init() first.');
    }

    const result: GolmokAnalysisResult = {
      success: false,
      location: {
        address: request.address,
        lat: request.lat || 0,
        lon: request.lon || 0,
      },
      businessType: {
        category: request.businessCategory || '전체',
        type: request.businessType || '',
      },
      analyzedAt: new Date().toISOString(),
    };

    try {
      console.log(`[GolmokScraper] Analyzing: ${request.address}`);

      // 1. 페이지 접속
      await this.page.goto('https://golmok.seoul.go.kr/main.do', {
        waitUntil: 'networkidle2',
        timeout: 30000,
      });
      console.log('[GolmokScraper] Page loaded');
      await this.delay(3000);

      // 메인 대시보드에서 구/업종 필터 선택
      console.log('[GolmokScraper] Selecting district and category filters...');

      // 1. 자치구 선택 (강남구)
      const districtSelected = await this.page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const options = Array.from(select.options);
          for (const opt of options) {
            if (opt.text.includes('강남구')) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return '강남구';
            }
          }
        }
        // 버튼/링크로 선택 시도
        const links = document.querySelectorAll('a, button, li, option');
        for (const link of links) {
          if (link.textContent?.trim() === '강남구') {
            (link as HTMLElement).click();
            return '강남구 (click)';
          }
        }
        return null;
      });
      if (districtSelected) {
        console.log(`[GolmokScraper] District selected: ${districtSelected}`);
        await this.delay(1500);
      }

      // 2. 업종 선택 (외식업)
      const businessSelected = await this.page.evaluate(() => {
        const selects = document.querySelectorAll('select');
        for (const select of selects) {
          const options = Array.from(select.options);
          for (const opt of options) {
            if (opt.text.includes('외식업')) {
              select.value = opt.value;
              select.dispatchEvent(new Event('change', { bubbles: true }));
              return '외식업';
            }
          }
        }
        // 버튼/링크로 선택 시도
        const links = document.querySelectorAll('a, button, li');
        for (const link of links) {
          if (link.textContent?.trim() === '외식업') {
            (link as HTMLElement).click();
            return '외식업 (click)';
          }
        }
        return null;
      });
      if (businessSelected) {
        console.log(`[GolmokScraper] Business type selected: ${businessSelected}`);
        await this.delay(1500);
      }

      // 3. 페이지 갱신 대기 후 지도 확인
      await this.delay(3000);

      // 디버그: 필터 적용 후 스크린샷
      await this.page.screenshot({ path: 'debug_1_initial.png' });

      // 4. "나도 곧 사장" 탭 클릭
      console.log('[GolmokScraper] Clicking "나도 곧 사장" tab...');

      const preOwnerClicked = await this.page.evaluate(() => {
        const links = document.querySelectorAll('a');
        for (const link of links) {
          const text = link.textContent?.trim() || '';
          if (text.includes('나도 곧 사장')) {
            (link as HTMLElement).click();
            return link.getAttribute('href');
          }
        }
        return null;
      });

      if (preOwnerClicked) {
        console.log(`[GolmokScraper] Clicked "나도 곧 사장" -> ${preOwnerClicked}`);
        await this.delay(3000);
      }

      // 튜토리얼 팝업 닫기 (취소 버튼 클릭)
      console.log('[GolmokScraper] Closing tutorial popup...');
      await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button');
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          if (text === '취소' || text.includes('취소')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        // 대안: 닫기 버튼
        const closeBtn = document.querySelector('[class*="close"], .btn-close');
        if (closeBtn) {
          (closeBtn as HTMLElement).click();
          return true;
        }
        return false;
      });
      await this.delay(2000);

      // 현재 URL 확인
      const currentUrl = this.page.url();
      console.log(`[GolmokScraper] Current URL: ${currentUrl}`);

      // 스크린샷
      await this.page.screenshot({ path: 'debug_1b_preowner.png' });
      console.log('[GolmokScraper] Debug screenshot: debug_1b_preowner.png');

      // "YES! 네, 있습니다" 클릭 - 화면 오른쪽 카드 위치
      console.log('[GolmokScraper] Clicking YES card by position...');
      await this.page.mouse.click(900, 450); // 오른쪽 YES 카드 위치
      await this.delay(3000);

      // 업종 선택 화면 스크린샷
      await this.page.screenshot({ path: 'debug_2_business.png' });
      console.log('[GolmokScraper] Debug screenshot: debug_2_business.png');

      // 외식업 탭 선택 (첫 번째 탭)
      console.log('[GolmokScraper] Selecting 외식업 tab...');
      await this.page.evaluate(() => {
        const tabs = document.querySelectorAll('[class*="tab"], button, li, a');
        for (const tab of tabs) {
          const text = tab.textContent?.trim() || '';
          if (text.includes('외식') || text === '외식업') {
            (tab as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      await this.delay(1000);

      // "확인" 버튼 클릭
      console.log('[GolmokScraper] Clicking 확인 button...');
      const confirmClicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a');
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          if (text === '확인') {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (confirmClicked) {
        console.log('[GolmokScraper] Clicked 확인');
        await this.delay(3000);
      }

      // 지도 로딩 대기 후 스크린샷
      await this.page.screenshot({ path: 'debug_3_map.png' });
      console.log('[GolmokScraper] Debug screenshot: debug_3_map.png');

      // 지도가 로드되었으므로 바로 원형 마커 클릭으로 이동
      console.log('[GolmokScraper] Map loaded with dong circles, ready to click...');

      // 5. 먼저 왼쪽 사이드바의 순위 항목 클릭 시도
      console.log('[GolmokScraper] Looking for ranking items in sidebar...');

      const rankingClicked = await this.page.evaluate(() => {
        // 사이드바에서 "1위", "2위" 등의 순위 항목 찾기
        const items = document.querySelectorAll('li, tr, [class*="rank"], [class*="list-item"], a');
        for (const item of items) {
          const text = item.textContent?.trim() || '';
          // "1위 논현1동" 같은 패턴 찾기
          if (text.match(/\d위\s*[가-힣0-9]+동/) || text.match(/논현|역삼|청담|삼성|대치|개포|도곡/)) {
            (item as HTMLElement).click();
            return text.slice(0, 50);
          }
        }
        return null;
      });

      if (rankingClicked) {
        console.log(`[GolmokScraper] Clicked ranking item: ${rankingClicked}`);
        await this.delay(3000);

        // 클릭 후 스크린샷
        await this.page.screenshot({ path: 'debug_3b_ranking_click.png' });
      }

      // 6. 지도에서 동별 원형 마커 클릭
      console.log('[GolmokScraper] Looking for dong circle markers on map...');

      // 여러 위치에서 원형 마커 클릭 시도
      const clickPositions = [
        { x: 950, y: 400, name: '중앙 원' },
        { x: 1050, y: 350, name: '오른쪽 상단 원' },
        { x: 850, y: 450, name: '왼쪽 하단 원' },
        { x: 1100, y: 500, name: '오른쪽 하단 원' },
      ];

      let reportFound = false;
      let sidebarData: any = null;

      for (const pos of clickPositions) {
        console.log(`[GolmokScraper] Clicking ${pos.name} at (${pos.x}, ${pos.y})...`);
        await this.page.mouse.click(pos.x, pos.y);
        await this.delay(3000); // 사이드바 로딩 대기

        // 분석리포트 패널에서 데이터 추출
        sidebarData = await this.page.evaluate(() => {
          const data: any = {
            // 분석리포트 데이터
            report: {
              dongName: '',
              businessType: '',
              quarter: '',
              summary: [] as string[],
              storeChange: '',
              salesChange: '',
              populationChange: '',
              ranking: null as any,
            },
            rawText: '',
            rankingData: [] as Array<{ rank: number; dong: string; count: number }>,
          };

          const text = document.body.innerText || '';
          data.rawText = text;

          // 분석리포트 패널 확인 (오른쪽 패널)
          const reportPanel = document.querySelector('[class*="report"], [class*="analysis"], [class*="detail-panel"]');
          const panelText = reportPanel?.textContent || text;

          // 위치 (동 이름) 추출: "위치 역삼2동"
          const locationMatch = panelText.match(/위치\s+([가-힣0-9]+동)/);
          if (locationMatch) data.report.dongName = locationMatch[1];

          // 업종 추출: "업종 한식음식점"
          const businessMatch = panelText.match(/업종\s+([가-힣]+)/);
          if (businessMatch) data.report.businessType = businessMatch[1];

          // 기준분기 추출: "기준분기 2025년 3분기"
          const quarterMatch = panelText.match(/기준분기\s+(\d{4}년\s*\d분기)/);
          if (quarterMatch) data.report.quarter = quarterMatch[1];

          // 종합의견 추출 (bullet points)
          const summarySection = panelText.match(/종합의견([\s\S]*?)(?=점포수|$)/);
          if (summarySection) {
            const bullets = summarySection[1].split(/[•·]/);
            data.report.summary = bullets
              .map((b: string) => b.trim())
              .filter((b: string) => b.length > 10);
          }

          // 점포수 변화 추출: "전분기 대비 +2개" 또는 "-3개"
          const storeChangeMatch = panelText.match(/점포수[\s\S]*?전분기\s*대비\s*([+\-]?\d+[\d,]*\s*개)/);
          if (storeChangeMatch) data.report.storeChange = storeChangeMatch[1];

          // 매출액 변화 추출: "전분기 대비 +132만원"
          const salesChangeMatch = panelText.match(/매출액[\s\S]*?전분기\s*대비\s*([+\-]?[\d,]+\s*만원)/);
          if (salesChangeMatch) data.report.salesChange = salesChangeMatch[1];

          // 유동인구 변화 추출: "전분기 대비 +4,034명"
          const popChangeMatch = panelText.match(/유동인구[\s\S]*?전분기\s*대비\s*([+\-]?[\d,]+\s*명)/);
          if (popChangeMatch) data.report.populationChange = popChangeMatch[1];

          // 순위 정보 추출: "점포수는 9위, 매출액 20위, 유동인구 2위"
          const rankMatch = panelText.match(/(\d+)개\s*중[^점]*점포수[는은]\s*(\d+)위[,\s]*매출액?\s*(\d+)위[,\s]*유동인구\s*(\d+)위/);
          if (rankMatch) {
            data.report.ranking = {
              totalDongs: parseInt(rankMatch[1], 10),
              storeRank: parseInt(rankMatch[2], 10),
              salesRank: parseInt(rankMatch[3], 10),
              populationRank: parseInt(rankMatch[4], 10),
            };
          }

          // 왼쪽 순위 목록도 추출
          const rankingPattern = /(\d)\s+강남구\s+([가-힣0-9]+동)\s+(\d+)개/g;
          let match;
          while ((match = rankingPattern.exec(text)) !== null) {
            data.rankingData.push({
              rank: parseInt(match[1], 10),
              dong: match[2],
              count: parseInt(match[3], 10),
            });
          }

          // 데이터가 있는지 확인
          const hasReport = data.report.dongName || data.report.storeChange || data.report.summary.length > 0;
          return hasReport ? data : null;
        });

        if (sidebarData) {
          console.log('[GolmokScraper] Found sidebar data:', JSON.stringify(sidebarData, null, 2));
          reportFound = true;
          break;
        }

        // 더블클릭 시도
        console.log(`[GolmokScraper] Double-clicking ${pos.name}...`);
        await this.page.mouse.click(pos.x, pos.y);
        await this.delay(100);
        await this.page.mouse.click(pos.x, pos.y);
        await this.delay(3000);

        // 분석리포트 패널이 열렸는지 확인
        sidebarData = await this.page.evaluate(() => {
          const text = document.body.innerText;

          // 분석리포트 패널 확인
          if (!text.includes('분석리포트') && !text.includes('종합의견')) {
            return null;
          }

          const data: any = {
            report: {
              dongName: '',
              businessType: '',
              quarter: '',
              summary: [] as string[],
              storeChange: '',
              salesChange: '',
              populationChange: '',
              ranking: null as any,
            },
            rawText: text,
          };

          // 위치 추출
          const locationMatch = text.match(/위치\s+([가-힣0-9]+동)/);
          if (locationMatch) data.report.dongName = locationMatch[1];

          // 업종 추출
          const businessMatch = text.match(/업종\s+([가-힣]+)/);
          if (businessMatch) data.report.businessType = businessMatch[1];

          // 기준분기 추출
          const quarterMatch = text.match(/기준분기\s+(\d{4}년\s*\d분기)/);
          if (quarterMatch) data.report.quarter = quarterMatch[1];

          // 점포수 변화
          const storeChangeMatch = text.match(/점포수[\s\S]*?전분기\s*대비\s*([+\-]?\d+[\d,]*\s*개)/);
          if (storeChangeMatch) data.report.storeChange = storeChangeMatch[1];

          // 매출액 변화
          const salesChangeMatch = text.match(/매출액[\s\S]*?전분기\s*대비\s*([+\-]?[\d,]+\s*만원)/);
          if (salesChangeMatch) data.report.salesChange = salesChangeMatch[1];

          // 유동인구 변화
          const popChangeMatch = text.match(/유동인구[\s\S]*?전분기\s*대비\s*([+\-]?[\d,]+\s*명)/);
          if (popChangeMatch) data.report.populationChange = popChangeMatch[1];

          return data.report.dongName ? data : null;
        });

        if (sidebarData) {
          console.log('[GolmokScraper] Found report data after double-click');
          reportFound = true;
          break;
        }
      }

      // 분석리포트 데이터를 result에 저장
      if (sidebarData) {
        result.rawData = sidebarData.rawText?.slice(0, 5000);

        // 분석리포트 데이터 저장
        if (sidebarData.report) {
          result.report = {
            dongName: sidebarData.report.dongName || '',
            businessType: sidebarData.report.businessType || '',
            quarter: sidebarData.report.quarter || '',
            summary: sidebarData.report.summary || [],
            storeChange: sidebarData.report.storeChange || '',
            salesChange: sidebarData.report.salesChange || '',
            populationChange: sidebarData.report.populationChange || '',
            ranking: sidebarData.report.ranking || undefined,
          };
          result.location.dongName = sidebarData.report.dongName;

          console.log('[GolmokScraper] 분석리포트 추출 완료:');
          console.log(`  위치: ${result.report.dongName}`);
          console.log(`  업종: ${result.report.businessType}`);
          console.log(`  기준분기: ${result.report.quarter}`);
          console.log(`  점포수 변화: ${result.report.storeChange}`);
          console.log(`  매출액 변화: ${result.report.salesChange}`);
          console.log(`  유동인구 변화: ${result.report.populationChange}`);
          if (result.report.summary.length > 0) {
            console.log('  종합의견:');
            result.report.summary.forEach((s, i) => console.log(`    ${i + 1}. ${s.slice(0, 80)}...`));
          }
          if (result.report.ranking) {
            console.log(`  순위: 점포수 ${result.report.ranking.storeRank}위, 매출액 ${result.report.ranking.salesRank}위, 유동인구 ${result.report.ranking.populationRank}위 (${result.report.ranking.totalDongs}개 동 중)`);
          }
        }

        // 왼쪽 순위 목록도 출력
        if (sidebarData.rankingData && sidebarData.rankingData.length > 0) {
          console.log('\n[GolmokScraper] 동별 순위:');
          sidebarData.rankingData.forEach((item: any) => {
            console.log(`  ${item.rank}위: ${item.dong} - ${item.count}개`);
          });
        }
      }

      // 클릭 후 스크린샷
      await this.page.screenshot({ path: 'debug_4_click.png' });
      console.log('[GolmokScraper] Debug screenshot: debug_4_click.png');

      // === 확장 데이터 추출: 각 탭 순회 ===
      if (reportFound) {
        console.log('[GolmokScraper] Extracting extended data from report tabs...');
        const extendedData = await this.scrapeReportTabs();

        if (extendedData && result.report) {
          result.report.industryAnalysis = extendedData.industryAnalysis;
          result.report.salesAnalysis = extendedData.salesAnalysis;
          result.report.populationAnalysis = extendedData.populationAnalysis;
          result.report.areaAnalysis = extendedData.areaAnalysis;

          // 확장 데이터 출력
          console.log('\n[GolmokScraper] === 확장 데이터 ===');
          if (Object.keys(extendedData.industryAnalysis || {}).length > 0) {
            console.log('📊 업종분석:');
            if (extendedData.industryAnalysis.survivalRate1Year)
              console.log(`   - 1년 생존률: ${extendedData.industryAnalysis.survivalRate1Year}`);
            if (extendedData.industryAnalysis.survivalRate3Year)
              console.log(`   - 3년 생존률: ${extendedData.industryAnalysis.survivalRate3Year}`);
            if (extendedData.industryAnalysis.survivalRate5Year)
              console.log(`   - 5년 생존률: ${extendedData.industryAnalysis.survivalRate5Year}`);
            if (extendedData.industryAnalysis.avgOperatingYears)
              console.log(`   - 평균 영업 년수: ${extendedData.industryAnalysis.avgOperatingYears}`);
            if (extendedData.industryAnalysis.openingCount !== undefined)
              console.log(`   - 개업: ${extendedData.industryAnalysis.openingCount}개`);
            if (extendedData.industryAnalysis.closureCount !== undefined)
              console.log(`   - 폐업: ${extendedData.industryAnalysis.closureCount}개`);
          }
          if (Object.keys(extendedData.salesAnalysis || {}).length > 0) {
            console.log('💰 매출분석:');
            Object.entries(extendedData.salesAnalysis).forEach(([k, v]) => {
              if (v) console.log(`   - ${k}: ${v}`);
            });
          }
          if (Object.keys(extendedData.populationAnalysis || {}).length > 0) {
            console.log('👥 인구분석:');
            Object.entries(extendedData.populationAnalysis).forEach(([k, v]) => {
              if (v) console.log(`   - ${k}: ${v}`);
            });
          }
          if (Object.keys(extendedData.areaAnalysis || {}).length > 0) {
            console.log('📍 지역분석:');
            Object.entries(extendedData.areaAnalysis).forEach(([k, v]) => {
              if (v) console.log(`   - ${k}: ${v}`);
            });
          }
        }
      }

      if (!reportFound) {
        console.log('[GolmokScraper] No detailed report found in sidebar');

        // 페이지 전체에서 데이터 추출 시도
        console.log('[GolmokScraper] Attempting to extract from full page...');
        const fullPageData = await this.page.evaluate(() => {
          const text = document.body.innerText;
          console.log('Page text length:', text.length);

          // 모든 테이블 데이터 추출
          const tables = document.querySelectorAll('table');
          const tableData: string[] = [];
          tables.forEach((table, i) => {
            const rows = table.querySelectorAll('tr');
            rows.forEach(row => {
              const cells = row.querySelectorAll('td, th');
              const rowText = Array.from(cells).map(c => c.textContent?.trim()).join(' | ');
              if (rowText.length > 5) tableData.push(rowText);
            });
          });

          // dl/dt/dd 형태의 데이터 추출
          const dlData: string[] = [];
          document.querySelectorAll('dl').forEach(dl => {
            const items = dl.querySelectorAll('dt, dd');
            let pair = '';
            items.forEach((item, i) => {
              const text = item.textContent?.trim() || '';
              if (item.tagName === 'DT') {
                pair = text + ': ';
              } else {
                dlData.push(pair + text);
                pair = '';
              }
            });
          });

          return {
            pageTextSample: text.slice(0, 2000),
            tableData: tableData.slice(0, 20),
            dlData: dlData.slice(0, 20),
          };
        });

        console.log('[GolmokScraper] Page data sample:', fullPageData.pageTextSample.slice(0, 500));
        if (fullPageData.tableData.length > 0) {
          console.log('[GolmokScraper] Table data:', fullPageData.tableData.slice(0, 10));
        }
        if (fullPageData.dlData.length > 0) {
          console.log('[GolmokScraper] DL data:', fullPageData.dlData);
        }
      }

      // 최종 스크린샷
      await this.page.screenshot({ path: 'debug_5_result.png' });
      console.log('[GolmokScraper] Debug screenshot: debug_5_result.png');

      // 이미 sidebarData에서 추출했으므로 추가 스크래핑은 필요 시에만
      if (!sidebarData) {
        const data = await this.scrapeResults();
        Object.assign(result, data);
      }
      result.success = true;

      // 6. 최종 스크린샷 저장
      const screenshotPath = `golmok_result_${Date.now()}.png`;
      await this.page.screenshot({ path: screenshotPath, fullPage: true });
      result.screenshotPath = screenshotPath;

      console.log('[GolmokScraper] Analysis complete');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      console.error('[GolmokScraper] Error:', message);
      result.error = message;

      // 에러 시에도 스크린샷 저장
      try {
        await this.page?.screenshot({ path: `golmok_error_${Date.now()}.png`, fullPage: true });
      } catch {}
    }

    return result;
  }

  private async setLocation(address: string, lat?: number, lon?: number): Promise<void> {
    if (!this.page) return;

    console.log(`[GolmokScraper] Setting location: ${address}`);

    // 직접 좌표가 있으면 JavaScript로 설정
    if (lat && lon) {
      console.log(`[GolmokScraper] Setting coordinates directly: ${lat}, ${lon}`);
      await this.page.evaluate((latitude, longitude) => {
        const latInput = document.getElementById('ownerLat') as HTMLInputElement;
        const lonInput = document.getElementById('ownerLon') as HTMLInputElement;
        if (latInput) latInput.value = String(latitude);
        if (lonInput) lonInput.value = String(longitude);
      }, lat, lon);
      return;
    }

    // 주소 검색 시도
    try {
      // 먼저 "점포위치" 버튼 클릭하여 위치 선택 모드 활성화
      await this.page.evaluate(() => {
        const buttons = document.querySelectorAll('button, a, [class*="btn"]');
        for (const btn of buttons) {
          const text = btn.textContent?.trim() || '';
          if (text.includes('점포위치') || text.includes('위치선택')) {
            (btn as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      await this.delay(500);

      // 모든 input 필드 확인
      const inputs = await this.page.$$('input[type="text"]');
      console.log(`[GolmokScraper] Found ${inputs.length} text inputs`);

      // 검색 관련 input 찾기
      for (const input of inputs) {
        const placeholder = await input.evaluate(el => el.placeholder || '');
        const id = await input.evaluate(el => el.id || '');
        console.log(`[GolmokScraper] Input: id="${id}" placeholder="${placeholder}"`);

        if (placeholder.includes('주소') || placeholder.includes('검색') ||
            placeholder.includes('동') || placeholder.includes('지역') ||
            id.includes('addr') || id.includes('search')) {
          await input.click();
          await this.delay(300);
          await input.type(address, { delay: 50 });
          console.log(`[GolmokScraper] Typed address in input: ${id || placeholder}`);
          await this.delay(1000);

          // Enter 키로 검색
          await this.page.keyboard.press('Enter');
          await this.delay(2000);
          break;
        }
      }

      // "주소" 탭 클릭
      const tabClicked = await this.page.evaluate(() => {
        const tabs = document.querySelectorAll('li a, .tab a, button, li');
        for (const tab of tabs) {
          if (tab.textContent?.trim() === '주소') {
            (tab as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      if (tabClicked) {
        console.log('[GolmokScraper] Clicked "주소" tab');
      }
      await this.delay(1500);

      // 검색 결과 확인 및 클릭 (정확한 동 주소 찾기)
      const clicked = await this.page.evaluate(() => {
        // 검색 결과 목록 찾기 - "서울 강남구 역삼동" 형식
        const allListItems = document.querySelectorAll('li');
        for (const item of allListItems) {
          const text = item.textContent?.trim() || '';
          // 정확한 주소 패턴: "서울 강남구 역삼1동" 또는 "서울 강남구 역삼동"
          // 우체국, 병원 등 장소명이 아닌 순수 주소만
          if (text.match(/서울\s*(강남구|서초구|송파구)?\s*역삼\d?동$/) ||
              text.match(/서울\s+강남구\s+역삼\d?동/)) {
            const clickable = item.querySelector('a') || item;
            (clickable as HTMLElement).click();
            return text.slice(0, 60);
          }
        }
        // 대안: "역삼동"으로 끝나는 짧은 텍스트
        for (const item of allListItems) {
          const text = item.textContent?.trim() || '';
          if (text.endsWith('동') && text.includes('역삼') && text.length < 30 && !text.includes('우체국')) {
            const clickable = item.querySelector('a') || item;
            (clickable as HTMLElement).click();
            return text.slice(0, 60);
          }
        }
        return null;
      });

      if (clicked) {
        console.log(`[GolmokScraper] Clicked address result: ${clicked}`);
        await this.delay(3000); // 지도 이동 대기
      } else {
        console.log('[GolmokScraper] No address result found');
      }

      // 1. 점포위치 섹션 클릭하여 위치 선택 모드 활성화
      console.log('[GolmokScraper] Activating store location selection...');
      await this.page.evaluate(() => {
        // 점포위치 관련 버튼/섹션 찾기
        const sections = document.querySelectorAll('[class*="section"], [class*="step"], button, a');
        for (const sec of sections) {
          const text = sec.textContent?.trim() || '';
          // "점포위치"만 포함하고 다른 긴 텍스트는 제외
          if (text === '점포위치' || (text.includes('점포위치') && text.length < 30)) {
            (sec as HTMLElement).click();
            return true;
          }
        }
        return false;
      });
      await this.delay(1000);

      // 2. 지도에서 점포 마커 클릭 시도
      console.log('[GolmokScraper] Looking for store markers...');

      // 마커 이미지나 SVG 요소 찾기
      const markerClicked = await this.page.evaluate(() => {
        // 지도 마커 (img, svg, div 등) 찾기
        const markers = document.querySelectorAll('[class*="marker"], [class*="Marker"], img[src*="marker"], [class*="icon"], [class*="store"]');
        for (const marker of markers) {
          const rect = marker.getBoundingClientRect();
          if (rect.width > 10 && rect.height > 10 && rect.x > 400) { // 지도 영역 내
            (marker as HTMLElement).click();
            return true;
          }
        }
        return false;
      });

      if (markerClicked) {
        console.log('[GolmokScraper] Clicked on a marker');
        await this.delay(2000);
      } else {
        // 마커를 못 찾으면 지도 중앙 클릭
        console.log('[GolmokScraper] No marker found, clicking map center...');
        const mapArea = await this.page.$('#map, .map_area, [id*="map"]');
        if (mapArea) {
          const box = await mapArea.boundingBox();
          if (box) {
            const centerX = box.x + box.width / 2;
            const centerY = box.y + box.height / 2;
            await this.page.mouse.click(centerX, centerY);
            await this.delay(100);
            await this.page.mouse.click(centerX, centerY);
            await this.delay(2000);
          }
        }
      }

      // 3. 점포위치 선택 상태 확인
      const locationStatus = await this.page.evaluate(() => {
        const sections = document.body.innerText.split('\n');
        for (let i = 0; i < sections.length; i++) {
          if (sections[i].includes('점포위치')) {
            // 다음 몇 줄에서 선택됨/선택안됨 확인
            for (let j = i; j < Math.min(i + 5, sections.length); j++) {
              if (sections[j].includes('선택됨') && !sections[j].includes('선택안됨')) {
                return '선택됨';
              }
              if (sections[j].includes('선택안됨')) {
                return '선택안됨';
              }
            }
          }
        }
        return 'unknown';
      });
      console.log(`[GolmokScraper] Store location status: ${locationStatus}`);

    } catch (error) {
      console.log(`[GolmokScraper] Address search failed: ${error}`);
    }

    // 지도 클릭으로 위치 설정 시도 (강남역 기본 좌표)
    const defaultLat = 37.4979;
    const defaultLon = 127.0276;

    console.log(`[GolmokScraper] Setting default coordinates: ${defaultLat}, ${defaultLon}`);
    await this.page.evaluate((latitude, longitude) => {
      const latInput = document.getElementById('ownerLat') as HTMLInputElement;
      const lonInput = document.getElementById('ownerLon') as HTMLInputElement;
      if (latInput) latInput.value = String(latitude);
      if (lonInput) lonInput.value = String(longitude);

      // 지도 이동 함수가 있으면 호출
      if (typeof (window as any).moveMap === 'function') {
        (window as any).moveMap(latitude, longitude);
      }
    }, defaultLat, defaultLon);
  }

  private async selectAnalysisArea(radiusMeters: number): Promise<void> {
    if (!this.page) return;

    console.log(`[GolmokScraper] Selecting analysis area (${radiusMeters}m)...`);

    // 분석영역 선택 버튼/탭 클릭
    const areaClicked = await this.page.evaluate(() => {
      // "분석영역 선택해주세요" 버튼 찾기
      const areaButtons = document.querySelectorAll('button, a, .btn, [class*="area"], [class*="radius"]');
      for (const btn of areaButtons) {
        const text = btn.textContent?.trim() || '';
        if (text.includes('분석영역') || text.includes('반경')) {
          (btn as HTMLElement).click();
          return text;
        }
      }
      return null;
    });

    if (areaClicked) {
      console.log(`[GolmokScraper] Clicked area selector: ${areaClicked}`);
      await this.delay(1000);
    }

    // 반경/다각형 탭 클릭
    await this.page.evaluate(() => {
      const tabs = document.querySelectorAll('a, button, li');
      for (const tab of tabs) {
        const text = tab.textContent?.trim() || '';
        if (text === '반경/다각형' || text.includes('반경')) {
          (tab as HTMLElement).click();
          return true;
        }
      }
      return false;
    });
    await this.delay(500);

    // 반경 선택 (0.5 KM 또는 1 KM)
    const radiusClicked = await this.page.evaluate((targetRadius) => {
      // 반경 옵션 버튼들 찾기
      const options = document.querySelectorAll('button, a, li, span, [class*="distance"]');
      for (const opt of options) {
        const text = opt.textContent?.trim() || '';

        // 0.5 KM 선택
        if (targetRadius <= 500 && (text === '0.5 KM' || text.includes('0.5'))) {
          (opt as HTMLElement).click();
          return `0.5 KM`;
        }
        // 1 KM 선택
        if (targetRadius > 500 && (text === '1 KM' || text.includes('1 KM'))) {
          (opt as HTMLElement).click();
          return `1 KM`;
        }
      }
      return null;
    }, radiusMeters);

    if (radiusClicked) {
      console.log(`[GolmokScraper] Selected radius: ${radiusClicked}`);
    }

    await this.delay(500);

    // "적용" 버튼 클릭
    const applyClicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text === '적용') {
          (btn as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (applyClicked) {
      console.log('[GolmokScraper] Clicked 적용 button');
    }

    await this.delay(1000);
  }

  private async selectBusinessCategory(category: string, subType?: string): Promise<void> {
    if (!this.page) return;

    console.log(`[GolmokScraper] Selecting category: ${category}`);

    // 1. 업종선택 섹션 클릭하여 열기
    const sectionClicked = await this.page.evaluate(() => {
      const elements = document.querySelectorAll('button, a, div, span');
      for (const el of elements) {
        const text = el.textContent?.trim() || '';
        if (text.includes('업종선택') || text.includes('업종 선택')) {
          (el as HTMLElement).click();
          return true;
        }
      }
      return false;
    });

    if (sectionClicked) {
      console.log('[GolmokScraper] Clicked 업종선택 section');
      await this.delay(1000);
    }

    // 2. 대분류 선택 (외식업, 서비스업, 소매업)
    const categoryClicked = await this.page.evaluate((cat) => {
      // select 요소 확인
      const select = document.querySelector('#storeServiceL, select[name*="service"], select[id*="service"]') as HTMLSelectElement;
      if (select) {
        for (const option of select.options) {
          if (option.text.includes(cat) || option.value.includes(cat)) {
            select.value = option.value;
            select.dispatchEvent(new Event('change', { bubbles: true }));
            return `select: ${option.text}`;
          }
        }
      }

      // 버튼/탭으로 선택
      const buttons = document.querySelectorAll('button, a, li, label');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text === cat || text.includes(cat)) {
          (btn as HTMLElement).click();
          return `button: ${text}`;
        }
      }

      // 라디오 버튼
      const radios = document.querySelectorAll('input[type="radio"]');
      for (const radio of radios) {
        const label = radio.parentElement?.textContent?.trim() || '';
        if (label.includes(cat)) {
          (radio as HTMLElement).click();
          return `radio: ${label}`;
        }
      }

      return null;
    }, category);

    if (categoryClicked) {
      console.log(`[GolmokScraper] Selected category: ${categoryClicked}`);
      await this.delay(1000);
    }

    // 3. 중분류 선택 (있는 경우)
    if (subType) {
      const subSelect = await this.page.$('#storeServiceM');
      if (subSelect) {
        await this.delay(500);
        await this.page.select('#storeServiceM', subType);
        console.log(`[GolmokScraper] Selected sub-category: ${subType}`);
      }
    }
  }

  private async clickAnalysisButton(): Promise<void> {
    if (!this.page) return;

    console.log('[GolmokScraper] Clicking analysis button...');

    // 현재 선택 상태 확인
    const selectionStatus = await this.page.evaluate(() => {
      const text = document.body.innerText;
      return {
        location: text.includes('점포위치') && text.match(/점포위치[^선]*선택됨/),
        category: text.includes('업종선택') && text.match(/업종선택[^선]*선택됨/),
        area: text.includes('분석영역') && text.match(/분석영역[^선]*선택됨/),
      };
    });
    console.log('[GolmokScraper] Selection status:', JSON.stringify(selectionStatus));

    // 1. "분석하기" 버튼 클릭
    const analyzeClicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, .btn, [role="button"]');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text === '분석하기' || text.includes('분석하기')) {
          (btn as HTMLElement).click();
          return text;
        }
      }
      return null;
    });

    if (analyzeClicked) {
      console.log(`[GolmokScraper] Clicked "분석하기" button`);
    }

    // 2. 충분히 대기 (분석 결과 로딩)
    console.log('[GolmokScraper] Waiting for analysis results...');
    await this.delay(5000);

    // 3. 팝업/레이어 확인
    const popupFound = await this.page.evaluate(() => {
      const popups = document.querySelectorAll('[class*="layer"], [class*="popup"], [class*="modal"], [class*="report"]');
      for (const popup of popups) {
        const style = window.getComputedStyle(popup);
        if (style.display !== 'none' && style.visibility !== 'hidden') {
          const text = popup.textContent || '';
          if (text.includes('매출') || text.includes('인구') || text.includes('점포')) {
            return true;
          }
        }
      }
      return false;
    });

    if (popupFound) {
      console.log('[GolmokScraper] Report popup found!');
    } else {
      console.log('[GolmokScraper] No report popup detected, checking page content...');

      // 페이지 내 데이터 탭 클릭 시도
      await this.page.evaluate(() => {
        const tabs = document.querySelectorAll('a, button, li');
        for (const tab of tabs) {
          const text = tab.textContent?.trim() || '';
          if (text.includes('상권영역') || text.includes('점포이력') || text.includes('유동인구')) {
            (tab as HTMLElement).click();
            return text;
          }
        }
        return null;
      });
      await this.delay(2000);
    }

    // 4. 추가 데이터 로딩을 위해 스크롤
    await this.page.evaluate(() => {
      window.scrollTo(0, document.body.scrollHeight);
    });
    await this.delay(1000);
  }

  private async scrapeResults(): Promise<Partial<GolmokAnalysisResult>> {
    if (!this.page) return {};

    console.log('[GolmokScraper] Scraping results...');

    // 전체 페이지 텍스트 추출
    const bodyText = await this.page.evaluate(() => document.body.innerText);
    console.log('[GolmokScraper] Page content length:', bodyText.length);

    const result: Partial<GolmokAnalysisResult> = {
      rawData: bodyText.slice(0, 5000),
    };

    // 숫자 추출 헬퍼
    function extractNumber(text: string): number {
      const match = text.replace(/,/g, '').match(/[\d.]+/);
      return match ? parseFloat(match[0]) : 0;
    }

    // 점포수 추출 (전체 XXX개)
    const totalStoreMatch = bodyText.match(/전체\s*([\d,]+)\s*개/);
    const regularStoreMatch = bodyText.match(/일반점포\s*([\d,]+)\s*개/);
    const franchiseMatch = bodyText.match(/프랜차이즈\s*([\d,]+)\s*개/);

    result.stores = {
      totalStores: totalStoreMatch ? extractNumber(totalStoreMatch[1]) : 0,
      similarStores: regularStoreMatch ? extractNumber(regularStoreMatch[1]) : 0,
      franchiseCount: franchiseMatch ? extractNumber(franchiseMatch[1]) : 0,
      openCount: 0,
      closeCount: 0,
    };

    // 매출액 추출 (XX,XXX억)
    const salesMatch = bodyText.match(/([\d,]+)\s*억/);
    if (salesMatch) {
      result.sales = {
        totalSales: salesMatch[1] + '억',
        avgSalesPerStore: '',
        weekdayRatio: 0,
        weekendRatio: 0,
      };
    }

    // 유동인구 정보 추출 (동별 데이터)
    const popMatches = bodyText.match(/([가-힣]+동)\s*유동인구\s*([\d,]+)/g);
    if (popMatches && popMatches.length > 0) {
      const firstMatch = popMatches[0].match(/([가-힣]+동)\s*유동인구\s*([\d,]+)/);
      result.population = {
        total: popMatches.map(m => {
          const match = m.match(/([가-힣]+동)\s*유동인구\s*([\d,]+)/);
          return match ? `${match[1]}: ${match[2]}만` : '';
        }).join(', '),
        maleRatio: 0,
        femaleRatio: 0,
        peakDay: '',
        peakTime: '',
        topAgeGroup: firstMatch ? firstMatch[1] : '',
      };
    }

    // 분기 데이터 추출
    const quarterMatch = bodyText.match(/(\d{4})년\s*(\d)분기/);
    if (quarterMatch) {
      result.analyzedAt = `${quarterMatch[1]}년 ${quarterMatch[2]}분기 기준`;
    }

    // 지역 정보 추출 - 유동인구 데이터에서 실제 선택된 지역 확인
    // 패턴: "강남구 역삼1동 유동인구 23"
    const popAreaMatch = bodyText.match(/(강남구|서초구|송파구|강동구|마포구|종로구|중구|용산구|성동구|광진구|동대문구|중랑구|성북구|강북구|도봉구|노원구|은평구|서대문구|양천구|강서구|구로구|금천구|영등포구|동작구|관악구)\s+[가-힣0-9]+동\s+유동인구/);
    if (popAreaMatch) {
      result.location = {
        address: popAreaMatch[1],
        lat: 0,
        lon: 0,
        dongName: popAreaMatch[1],
      };
    }

    console.log('[GolmokScraper] Extracted data keys:', Object.keys(result));
    return result;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * 분석리포트 패널의 각 탭을 순회하며 상세 데이터 추출
   */
  private async scrapeReportTabs(): Promise<any> {
    if (!this.page) return null;

    console.log('[GolmokScraper] Scraping report tabs...');

    const extendedData: any = {
      industryAnalysis: {},
      salesAnalysis: {},
      populationAnalysis: {},
      areaAnalysis: {},
    };

    // 1. 먼저 분석리포트 패널 내에서 스크롤하여 전체 내용 로드
    console.log('[GolmokScraper] Scrolling report panel to load all content...');
    await this.page.evaluate(() => {
      // 분석리포트 패널 찾기
      const reportPanel = document.querySelector('[class*="report"], [class*="analysis"], [class*="sidebar"], [class*="detail"]');
      if (reportPanel) {
        // 패널 내 스크롤 컨테이너 찾기
        const scrollContainers = reportPanel.querySelectorAll('[class*="scroll"], [class*="content"], [class*="body"]');
        scrollContainers.forEach(container => {
          if (container.scrollHeight > container.clientHeight) {
            container.scrollTop = container.scrollHeight;
            setTimeout(() => { container.scrollTop = 0; }, 500);
          }
        });
        // 패널 자체도 스크롤
        if (reportPanel.scrollHeight > (reportPanel as HTMLElement).clientHeight) {
          reportPanel.scrollTop = reportPanel.scrollHeight;
        }
      }
    });
    await this.delay(1500);

    // 2. "상세분석" 또는 "더보기" 버튼 클릭 시도 (상세 탭 열기)
    const detailOpened = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll('button, a, span, div');
      for (const btn of buttons) {
        const text = btn.textContent?.trim() || '';
        if (text === '상세분석' || text === '더보기' || text.includes('상세') || text === '분석보기') {
          (btn as HTMLElement).click();
          return text;
        }
      }
      return null;
    });
    if (detailOpened) {
      console.log(`[GolmokScraper] Clicked detail button: "${detailOpened}"`);
      await this.delay(2000);
      await this.page.screenshot({ path: 'debug_7_detail.png' });
    }

    // 3. 현재 보이는 탭 목록 확인 (더 광범위하게)
    const availableTabs = await this.page.evaluate(() => {
      const tabs: string[] = [];
      // 모든 클릭 가능한 요소 확인
      document.querySelectorAll('a, button, li, span, div, [role="tab"], [class*="tab"]').forEach(el => {
        const text = el.textContent?.trim() || '';
        const className = el.className || '';
        // 탭 관련 키워드
        if (text.includes('업종') || text.includes('매출') || text.includes('인구') ||
            text.includes('지역') || text.includes('배후지') || text.includes('분석') ||
            className.includes('tab')) {
          tabs.push(`${text.slice(0, 30)} [${className.slice(0, 30)}]`);
        }
      });
      return [...new Set(tabs)]; // 중복 제거
    });
    console.log('[GolmokScraper] Available tabs:', availableTabs);

    // 탭 목록 (HTML class: tabcnt_summary, tabcnt_district, tabcnt_sales, tabcnt_population, tabcnt_area)
    // 다양한 탭 이름 패턴 지원
    const tabs = [
      { names: ['업종분석', '업종', '점포'], key: 'industryAnalysis', cssClass: 'tabcnt_district' },
      { names: ['매출분석', '매출'], key: 'salesAnalysis', cssClass: 'tabcnt_sales' },
      { names: ['인구분석', '인구', '유동인구'], key: 'populationAnalysis', cssClass: 'tabcnt_population' },
      { names: ['지역분석', '지역', '배후지', '배후지분석'], key: 'areaAnalysis', cssClass: 'tabcnt_area' },
    ];

    for (const tab of tabs) {
      console.log(`[GolmokScraper] Looking for tab: ${tab.names.join('/')}...`);

      // 탭 클릭 시도 (분석리포트 패널 내의 탭만)
      const clicked = await this.page.evaluate((tabNames: string[], cssClass: string) => {
        // 1. 분석리포트 패널 찾기 (우측 사이드바)
        const reportPanel = document.querySelector(
          '[class*="report"], [class*="analysis"], [class*="sidebar-right"], ' +
          '[class*="detail-panel"], [id*="report"]'
        );

        // 2. 분석리포트 패널 내의 탭 버튼만 찾기
        const searchArea = reportPanel || document.body;
        const tabSelectors = [
          // 리포트 탭 버튼 (일반적인 패턴)
          `a[href*="${cssClass}"]`,
          `[data-target*="${cssClass}"]`,
          `[aria-controls*="${cssClass}"]`,
        ];

        for (const selector of tabSelectors) {
          const btn = searchArea.querySelector(selector);
          if (btn) {
            (btn as HTMLElement).click();
            return `css-selector: ${cssClass}`;
          }
        }

        // 3. 분석리포트 패널 내에서 탭 텍스트로 찾기
        // 중요: 패널 외부의 메뉴는 클릭하지 않음
        if (reportPanel) {
          const panelClickable = reportPanel.querySelectorAll('a, button, li, span, [role="tab"]');
          for (const el of panelClickable) {
            const text = el.textContent?.trim() || '';
            const isTabSized = text.length < 20; // 탭 버튼은 보통 짧음

            for (const tabName of tabNames) {
              // 정확히 일치하거나 탭 이름으로 시작하는 짧은 요소
              if (text === tabName || (isTabSized && text.startsWith(tabName))) {
                (el as HTMLElement).click();
                return `panel-text: ${text}`;
              }
            }
          }
        }

        // 4. 패널을 찾지 못한 경우에만 전체 페이지에서 검색 (메뉴 제외)
        // 단, "지역·상권별 현황" 같은 메인 메뉴는 제외
        const allClickable = document.querySelectorAll('[class*="tab"] a, [class*="tab"] button');
        for (const el of allClickable) {
          const text = el.textContent?.trim() || '';
          // 메인 메뉴 항목 제외
          if (text.includes('상권별') || text.includes('현황') || text.includes('메뉴')) {
            continue;
          }
          const isSmallElement = text.length < 15;

          for (const tabName of tabNames) {
            if (text === tabName || (isSmallElement && text.includes(tabName))) {
              (el as HTMLElement).click();
              return `fallback-text: ${text}`;
            }
          }
        }

        return null;
      }, tab.names, tab.cssClass);

      if (clicked) {
        console.log(`[GolmokScraper] Clicked: "${clicked}"`);
        await this.delay(2000); // 탭 콘텐츠 로딩 대기

        // 스크린샷 저장 (디버깅용)
        await this.page.screenshot({ path: `debug_tab_${tab.key}.png` });
      } else {
        console.log(`[GolmokScraper] Tab not found: ${tab.names.join('/')}, extracting from current view...`);
      }

      // 스크롤하여 모든 콘텐츠 로드
      await this.page.evaluate(() => {
        const panels = document.querySelectorAll('[class*="report"], [class*="tabcnt"], [class*="detail"], [class*="scroll"]');
        panels.forEach(panel => {
          if (panel.scrollHeight > panel.clientHeight) {
            panel.scrollTop = panel.scrollHeight;
          }
        });
        // 페이지 전체도 스크롤
        window.scrollTo(0, document.body.scrollHeight);
      });
      await this.delay(1000);

      // 탭별 데이터 추출 (탭 클릭 여부와 관계없이 현재 보이는 데이터에서 추출)
      const tabData = await this.page.evaluate((tabKey: string, cssClass: string) => {
        // 1. 특정 탭 패널에서 먼저 추출 시도
        let targetElement = document.querySelector(`.${cssClass}, [class*="${cssClass}"]`);
        let text = targetElement ? targetElement.textContent || '' : '';

        // 2. 탭 패널이 없으면 분석리포트 패널 전체에서 추출
        if (!text) {
          const reportPanel = document.querySelector('[class*="report"], [class*="analysis-detail"], [class*="sidebar-content"]');
          text = reportPanel ? reportPanel.textContent || '' : document.body.innerText;
        }

        const data: any = { _debug: '' };

        // 디버깅: 관련 키워드 주변 텍스트 추출
        const keywords = ['생존', '영업', '개업', '폐업', '매출', '인구', '임대', '평균'];
        for (const kw of keywords) {
          const idx = text.indexOf(kw);
          if (idx !== -1) {
            data._debug += `[${kw}]: ${text.slice(Math.max(0, idx - 10), idx + 50)}... | `;
          }
        }

        if (tabKey === 'industryAnalysis') {
          // === 신생기업 생존률 (1년/3년/5년) ===
          // 실제 텍스트 패턴: "신생기업 생존율(3년)\n신생기업 생존율은 60.81% 입니다"
          // 또는 "3년 생존율 60.81%"

          // 생존율 값 추출 (XX.XX% 형태) - "생존율은 XX% 입니다" 패턴
          const survivalValueMatch = text.match(/(?:생존율|생존률)[은이가]?\s*(\d+(?:\.\d+)?)\s*%/i);
          if (survivalValueMatch) {
            // 몇 년 생존율인지 확인 (근처에 1년/3년/5년이 있는지)
            const survivalContext = text.slice(Math.max(0, text.indexOf(survivalValueMatch[0]) - 50), text.indexOf(survivalValueMatch[0]) + 30);
            if (survivalContext.includes('1년')) {
              data.survivalRate1Year = survivalValueMatch[1] + '%';
            } else if (survivalContext.includes('3년')) {
              data.survivalRate3Year = survivalValueMatch[1] + '%';
            } else if (survivalContext.includes('5년')) {
              data.survivalRate5Year = survivalValueMatch[1] + '%';
            } else {
              // 기본값으로 3년 생존율로 설정 (가장 흔함)
              data.survivalRate3Year = survivalValueMatch[1] + '%';
            }
          }

          // 여러 생존율이 있을 경우 추가 추출 시도
          const allSurvivalMatches = text.matchAll(/(\d)년[^0-9]*(?:생존율|생존률)[은이가]?\s*(\d+(?:\.\d+)?)\s*%/gi);
          for (const match of allSurvivalMatches) {
            const year = match[1];
            const rate = match[2];
            if (year === '1' && !data.survivalRate1Year) data.survivalRate1Year = rate + '%';
            if (year === '3' && !data.survivalRate3Year) data.survivalRate3Year = rate + '%';
            if (year === '5' && !data.survivalRate5Year) data.survivalRate5Year = rate + '%';
          }

          // === 평균 영업 년수/기간 ===
          // 실제 텍스트 패턴: "평균 영업기간은 3.6년 입니다" 또는 "평균영업기간 3.6년"
          const avgYearsPatterns = [
            /평균\s*영업\s*(?:기간|년수)[은이가]?\s*(\d+(?:\.\d+)?)\s*년/i,
            /영업\s*(?:기간|년수)[은이가]?\s*(\d+(?:\.\d+)?)\s*년/i,
            /평균\s*(?:기간|년수)[^0-9]*(\d+(?:\.\d+)?)\s*년/i,
          ];
          for (const pattern of avgYearsPatterns) {
            const match = text.match(pattern);
            if (match && !data.avgOperatingYears) {
              data.avgOperatingYears = match[1] + '년';
              break;
            }
          }

          // === 개업/폐업 수 ===
          // 실제 텍스트 패턴: "개업수는 9개 입니다" 또는 "폐업수는 3개 입니다"
          const openingMatch = text.match(/개업\s*(?:수)?[은는이가]?\s*(\d+)\s*개/);
          const closureMatch = text.match(/폐업\s*(?:수)?[은는이가]?\s*(\d+)\s*개/);
          if (openingMatch) data.openingCount = parseInt(openingMatch[1], 10);
          if (closureMatch) data.closureCount = parseInt(closureMatch[1], 10);

          // 개업률/폐업률
          const openRate = text.match(/개업\s*률\s*[:\s]*(\d+(?:\.\d+)?)\s*%/);
          const closeRate = text.match(/폐업\s*률\s*[:\s]*(\d+(?:\.\d+)?)\s*%/);
          if (openRate) data.openingRate = openRate[1] + '%';
          if (closeRate) data.closureRate = closeRate[1] + '%';

          // 프랜차이즈 비율
          const franchise = text.match(/프랜차이즈[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          if (franchise) data.franchiseRatio = franchise[1] + '%';
        }

        if (tabKey === 'salesAnalysis') {
          // === 매출 데이터 ===
          // 총 매출/월평균 매출
          const salesPatterns = [
            { pattern: /(?:총|전체)\s*매출[^0-9]*([\d,]+)\s*(억|만)/i, key: 'totalSales' },
            { pattern: /월\s*평균\s*매출[^0-9]*([\d,]+)\s*(만|원)/i, key: 'avgMonthlySales' },
            { pattern: /점포\s*당[^0-9]*([\d,]+)\s*(만|원)/i, key: 'avgMonthlySales' },
          ];
          for (const { pattern, key } of salesPatterns) {
            const match = text.match(pattern);
            if (match && !data[key]) {
              data[key] = match[1] + match[2];
            }
          }

          // 주중/주말
          const weekday = text.match(/주중[^0-9]*([\d,]+)\s*(만|%)/);
          const weekend = text.match(/주말[^0-9]*([\d,]+)\s*(만|%)/);
          if (weekday) data.weekdaySales = weekday[1] + weekday[2];
          if (weekend) data.weekendSales = weekend[1] + weekend[2];

          // 성별 매출 비율
          const male = text.match(/남성[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          const female = text.match(/여성[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          if (male) data.maleCustomerRatio = male[1] + '%';
          if (female) data.femaleCustomerRatio = female[1] + '%';

          // 피크 요일/시간
          const peakDay = text.match(/(?:피크|최고)\s*요일[:\s]*([월화수목금토일]요일?)/);
          const peakTime = text.match(/(?:피크|최고)\s*시간[:\s]*(\d+시|\d+:\d+)/);
          if (peakDay) data.peakDay = peakDay[1];
          if (peakTime) data.peakTime = peakTime[1];
        }

        if (tabKey === 'populationAnalysis') {
          // === 유동인구 ===
          const popPatterns = [
            /(?:총|전체)?\s*유동\s*인구[^0-9]*([\d,]+)\s*(만|명)?/i,
            /유동인구\s*(?:합계|총)[^0-9]*([\d,]+)/i,
          ];
          for (const pattern of popPatterns) {
            const match = text.match(pattern);
            if (match && !data.totalPopulation) {
              data.totalPopulation = match[1] + (match[2] || '명');
              break;
            }
          }

          // 직장/주거 인구
          const working = text.match(/직장[^0-9]*([\d,]+)/);
          const resident = text.match(/(?:주거|거주)[^0-9]*([\d,]+)/);
          if (working) data.workingPopulation = working[1];
          if (resident) data.residentPopulation = resident[1];

          // 성별 비율
          const maleP = text.match(/남성[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          const femaleP = text.match(/여성[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          if (maleP) data.maleRatio = maleP[1] + '%';
          if (femaleP) data.femaleRatio = femaleP[1] + '%';

          // 피크 요일/시간대
          const peakDay = text.match(/(?:피크|최고)\s*요일[:\s]*([월화수목금토일]요일?)/);
          const peakTime = text.match(/(?:피크|최고|유동인구가\s*가장\s*많은)\s*시간[:\s]*(\d+시|\d+~\d+시)/);
          if (peakDay) data.peakDay = peakDay[1];
          if (peakTime) data.peakTime = peakTime[1];
        }

        if (tabKey === 'areaAnalysis') {
          // === 임대료 ===
          // 실제 패턴: "임대료가 3.3㎡당 178" 또는 "평균 임대료 180만원"
          const rentPatterns = [
            /임대료[가는이]?\s*(?:3\.3㎡당|평당)?\s*(\d+(?:,\d+)?)\s*(만\s*원|원)?/i,
            /(?:평균\s*)?임대\s*(?:시세|료)?[^0-9]*([\d,]+)\s*(만\s*원|원)?/i,
          ];
          for (const pattern of rentPatterns) {
            const match = text.match(pattern);
            if (match && !data.avgRent) {
              data.avgRent = match[1] + (match[2] || '만원');
              break;
            }
          }

          // 임대료 추세 - "임대료가 감소하고 있으며" 등
          const trendPatterns = [
            /임대[료가격]?[가는이]?\s*(상승|하락|감소|증가|보합|안정)/,
            /임대[^가-힣]*(상승|하락|감소|증가|보합|안정)/,
          ];
          for (const pattern of trendPatterns) {
            const match = text.match(pattern);
            if (match && !data.rentTrend) {
              data.rentTrend = match[1];
              break;
            }
          }

          // 밀집도
          const density = text.match(/(?:상권\s*)?밀집[도]?[^가-힣]*(높음|보통|낮음|상|중|하|밀집|희박)/);
          if (density) data.commercialDensity = density[1];

          // 비율
          const resRatio = text.match(/주거[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          const comRatio = text.match(/상업[^0-9]*(\d+(?:\.\d+)?)\s*%/);
          if (resRatio) data.residentialRatio = resRatio[1] + '%';
          if (comRatio) data.commercialRatio = comRatio[1] + '%';
        }

        return data;
      }, tab.key, tab.cssClass);

      // 디버깅 출력
      if (tabData._debug) {
        console.log(`[GolmokScraper] ${tab.names.join('/')} debug:`, tabData._debug.slice(0, 300));
        delete tabData._debug;
      }

      extendedData[tab.key] = tabData;
      const dataCount = Object.keys(tabData).filter(k => !k.startsWith('_')).length;
      console.log(`[GolmokScraper] ${tab.names[0]} extracted ${dataCount} fields:`, JSON.stringify(tabData, null, 2));
    }

    // 탭 클릭이 안 됐을 경우, 분석리포트 패널에서 직접 데이터 추출
    const hasAnyData = Object.values(extendedData).some((d: any) => {
      const keys = Object.keys(d).filter(k => !k.startsWith('_'));
      return keys.length > 0;
    });

    if (!hasAnyData) {
      console.log('[GolmokScraper] No tab data found, extracting from report panel directly...');

      const fullPageData = await this.page.evaluate(() => {
        // 분석리포트 패널 텍스트 추출 (우측 사이드바)
        const reportPanel = document.querySelector(
          '[class*="report-panel"], [class*="analysis-report"], ' +
          '[class*="sidebar-right"], [class*="detail-panel"], ' +
          '[class*="report"]'
        );
        const text = reportPanel ? reportPanel.textContent || '' : document.body.innerText;

        const data: any = {
          industryAnalysis: {},
          salesAnalysis: {},
          populationAnalysis: {},
          areaAnalysis: {},
        };

        // === 업종분석 데이터 (신생기업생존률 등) ===
        // 생존율 추출 - "생존율은 60.81% 입니다" 형태
        const survivalValueMatch = text.match(/(?:생존율|생존률)[은이가]?\s*(\d+(?:\.\d+)?)\s*%/i);
        if (survivalValueMatch) {
          const survivalIdx = text.indexOf(survivalValueMatch[0]);
          const survivalContext = text.slice(Math.max(0, survivalIdx - 50), survivalIdx + 30);
          if (survivalContext.includes('1년')) {
            data.industryAnalysis.survivalRate1Year = survivalValueMatch[1] + '%';
          } else if (survivalContext.includes('3년')) {
            data.industryAnalysis.survivalRate3Year = survivalValueMatch[1] + '%';
          } else if (survivalContext.includes('5년')) {
            data.industryAnalysis.survivalRate5Year = survivalValueMatch[1] + '%';
          } else {
            data.industryAnalysis.survivalRate3Year = survivalValueMatch[1] + '%';
          }
        }

        // 평균 영업 년수
        const avgYearsPatterns = [
          /평균\s*영업\s*(?:기간|년수)[은이가]?\s*(\d+(?:\.\d+)?)\s*년/i,
          /영업\s*(?:기간|년수)[은이가]?\s*(\d+(?:\.\d+)?)\s*년/i,
        ];
        for (const pattern of avgYearsPatterns) {
          const match = text.match(pattern);
          if (match) {
            data.industryAnalysis.avgOperatingYears = match[1] + '년';
            break;
          }
        }

        // 개업/폐업 - "개업수는 9개 입니다" 형태
        const openingMatch = text.match(/개업\s*(?:수)?[은는이가]?\s*(\d+)\s*개/);
        const closureMatch = text.match(/폐업\s*(?:수)?[은는이가]?\s*(\d+)\s*개/);
        if (openingMatch) data.industryAnalysis.openingCount = parseInt(openingMatch[1], 10);
        if (closureMatch) data.industryAnalysis.closureCount = parseInt(closureMatch[1], 10);

        // 개업률/폐업률
        const openRate = text.match(/개업\s*률[^0-9]*(\d+(?:\.\d+)?)\s*%/);
        const closeRate = text.match(/폐업\s*률[^0-9]*(\d+(?:\.\d+)?)\s*%/);
        if (openRate) data.industryAnalysis.openingRate = openRate[1] + '%';
        if (closeRate) data.industryAnalysis.closureRate = closeRate[1] + '%';

        // === 매출분석 데이터 ===
        const avgSales = text.match(/(?:월\s*)?평균\s*매출[^0-9]*([\d,]+)\s*(만|원|억)/);
        if (avgSales) data.salesAnalysis.avgMonthlySales = avgSales[1] + avgSales[2];

        const totalSales = text.match(/(?:총|전체)\s*매출[^0-9]*([\d,]+)\s*(만|원|억)/);
        if (totalSales) data.salesAnalysis.totalSales = totalSales[1] + totalSales[2];

        // 성별 매출 비율
        const maleSales = text.match(/남성[^0-9]*(\d+(?:\.\d+)?)\s*%/);
        const femaleSales = text.match(/여성[^0-9]*(\d+(?:\.\d+)?)\s*%/);
        if (maleSales) data.salesAnalysis.maleCustomerRatio = maleSales[1] + '%';
        if (femaleSales) data.salesAnalysis.femaleCustomerRatio = femaleSales[1] + '%';

        // === 인구분석 데이터 ===
        const population = text.match(/유동\s*인구[^0-9]*([\d,]+)\s*(만|명)?/);
        if (population) data.populationAnalysis.totalPopulation = population[1] + (population[2] || '명');

        const workPop = text.match(/직장[^0-9]*([\d,]+)/);
        const resPop = text.match(/(?:주거|거주)[^0-9]*([\d,]+)/);
        if (workPop) data.populationAnalysis.workingPopulation = workPop[1];
        if (resPop) data.populationAnalysis.residentPopulation = resPop[1];

        // === 지역분석 데이터 ===
        // 임대료 - "임대료가 3.3㎡당 178" 형태
        const rentMatch = text.match(/임대료[가는이]?\s*(?:3\.3㎡당|평당)?\s*(\d+(?:,\d+)?)/);
        if (rentMatch) data.areaAnalysis.avgRent = rentMatch[1] + '만원';

        // 임대료 추세 - "임대료가 감소하고 있으며" 형태
        const trendMatch = text.match(/임대[료가격]?[가는이]?\s*(상승|하락|감소|증가|보합|안정)/);
        if (trendMatch) data.areaAnalysis.rentTrend = trendMatch[1];

        // 디버깅용 rawText 샘플
        data._rawSample = text.slice(0, 1500);

        return data;
      });

      console.log('[GolmokScraper] Report panel extraction:', JSON.stringify(fullPageData, null, 2));

      // 추출된 데이터 병합 (_rawSample 제외)
      if (fullPageData.industryAnalysis) {
        Object.assign(extendedData.industryAnalysis, fullPageData.industryAnalysis);
      }
      if (fullPageData.salesAnalysis) {
        Object.assign(extendedData.salesAnalysis, fullPageData.salesAnalysis);
      }
      if (fullPageData.populationAnalysis) {
        Object.assign(extendedData.populationAnalysis, fullPageData.populationAnalysis);
      }
      if (fullPageData.areaAnalysis) {
        Object.assign(extendedData.areaAnalysis, fullPageData.areaAnalysis);
      }

      // rawSample 출력 (디버깅)
      if (fullPageData._rawSample) {
        console.log('[GolmokScraper] Raw text sample:\n', fullPageData._rawSample.slice(0, 800));
      }
    }

    // 스크린샷 저장
    await this.page.screenshot({ path: 'debug_6_tabs.png' });

    return extendedData;
  }
}

// --- CLI 실행 ---

async function main() {
  const args = process.argv.slice(2);
  const address = args[0] || '서울 강남구 역삼동';
  const category = (args[1] as any) || '외식업';

  console.log('╔════════════════════════════════════════╗');
  console.log('║    골목상권 분석 스크래퍼 v1.0        ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`\n주소: ${address}`);
  console.log(`업종: ${category}`);
  console.log('');

  const scraper = new GolmokScraper({ headless: false });

  try {
    await scraper.init();
    const result = await scraper.analyze({
      address,
      businessCategory: category,
      radiusMeters: 500,
    });

    console.log('\n╔════════════════════════════════════════╗');
    console.log('║           분석 결과                    ║');
    console.log('╚════════════════════════════════════════╝\n');

    if (result.success) {
      console.log('✅ 분석 성공!');

      // 분석리포트 출력
      if (result.report) {
        console.log('\n╔════════════════════════════════════════╗');
        console.log('║         📊 분석리포트                   ║');
        console.log('╚════════════════════════════════════════╝');
        console.log(`📍 위치: ${result.report.dongName}`);
        console.log(`🏪 업종: ${result.report.businessType}`);
        console.log(`📅 기준: ${result.report.quarter}`);

        console.log('\n--- 전분기 대비 변화 ---');
        console.log(`   🏬 점포수: ${result.report.storeChange || 'N/A'}`);
        console.log(`   💰 매출액: ${result.report.salesChange || 'N/A'}`);
        console.log(`   👥 유동인구: ${result.report.populationChange || 'N/A'}`);

        if (result.report.ranking) {
          console.log(`\n--- 자치구 내 순위 (${result.report.ranking.totalDongs}개 동 중) ---`);
          console.log(`   🏬 점포수: ${result.report.ranking.storeRank}위`);
          console.log(`   💰 매출액: ${result.report.ranking.salesRank}위`);
          console.log(`   👥 유동인구: ${result.report.ranking.populationRank}위`);
        }

        if (result.report.summary.length > 0) {
          console.log('\n--- 종합의견 ---');
          result.report.summary.forEach((s, i) => {
            console.log(`   ${i + 1}. ${s}`);
          });
        }

        // 확장 데이터 출력
        if (result.report.industryAnalysis) {
          const ia = result.report.industryAnalysis;
          console.log('\n--- 📊 업종분석 (상세) ---');
          if (ia.survivalRate1Year) console.log(`   🎯 1년 생존률: ${ia.survivalRate1Year}`);
          if (ia.survivalRate3Year) console.log(`   🎯 3년 생존률: ${ia.survivalRate3Year}`);
          if (ia.survivalRate5Year) console.log(`   🎯 5년 생존률: ${ia.survivalRate5Year}`);
          if (ia.avgOperatingYears) console.log(`   ⏱️ 평균 영업 년수: ${ia.avgOperatingYears}`);
          if (ia.openingCount !== undefined) console.log(`   📈 개업: ${ia.openingCount}개`);
          if (ia.closureCount !== undefined) console.log(`   📉 폐업: ${ia.closureCount}개`);
          if (ia.openingRate) console.log(`   📈 개업률: ${ia.openingRate}`);
          if (ia.closureRate) console.log(`   📉 폐업률: ${ia.closureRate}`);
          if (ia.franchiseRatio) console.log(`   🏪 프랜차이즈 비율: ${ia.franchiseRatio}`);
        }

        if (result.report.salesAnalysis) {
          const sa = result.report.salesAnalysis;
          console.log('\n--- 💰 매출분석 (상세) ---');
          if (sa.totalSales) console.log(`   💵 총 매출: ${sa.totalSales}`);
          if (sa.avgMonthlySales) console.log(`   💵 월평균 매출: ${sa.avgMonthlySales}`);
          if (sa.weekdaySales) console.log(`   📅 주중 매출: ${sa.weekdaySales}`);
          if (sa.weekendSales) console.log(`   📅 주말 매출: ${sa.weekendSales}`);
          if (sa.peakDay) console.log(`   🔝 피크 요일: ${sa.peakDay}`);
          if (sa.peakTime) console.log(`   🔝 피크 시간: ${sa.peakTime}`);
          if (sa.maleCustomerRatio) console.log(`   👨 남성 고객: ${sa.maleCustomerRatio}`);
          if (sa.femaleCustomerRatio) console.log(`   👩 여성 고객: ${sa.femaleCustomerRatio}`);
        }

        if (result.report.populationAnalysis) {
          const pa = result.report.populationAnalysis;
          console.log('\n--- 👥 인구분석 (상세) ---');
          if (pa.totalPopulation) console.log(`   👥 총 유동인구: ${pa.totalPopulation}`);
          if (pa.workingPopulation) console.log(`   💼 직장인구: ${pa.workingPopulation}`);
          if (pa.residentPopulation) console.log(`   🏠 주거인구: ${pa.residentPopulation}`);
          if (pa.maleRatio) console.log(`   👨 남성: ${pa.maleRatio}`);
          if (pa.femaleRatio) console.log(`   👩 여성: ${pa.femaleRatio}`);
          if (pa.peakDay) console.log(`   🔝 피크 요일: ${pa.peakDay}`);
          if (pa.peakTime) console.log(`   🔝 피크 시간대: ${pa.peakTime}`);
        }

        if (result.report.areaAnalysis) {
          const aa = result.report.areaAnalysis;
          console.log('\n--- 📍 지역분석 (상세) ---');
          if (aa.avgRent) console.log(`   🏠 평균 임대료: ${aa.avgRent}`);
          if (aa.rentTrend) console.log(`   📈 임대료 추세: ${aa.rentTrend}`);
          if (aa.commercialDensity) console.log(`   🏢 상권 밀집도: ${aa.commercialDensity}`);
          if (aa.residentialRatio) console.log(`   🏠 주거 비율: ${aa.residentialRatio}`);
          if (aa.commercialRatio) console.log(`   🏢 상업 비율: ${aa.commercialRatio}`);
        }
      } else {
        console.log(`📍 위치: ${result.location.address}`);
        if (result.location.dongName) {
          console.log(`📍 동: ${result.location.dongName}`);
        }
      }

      if (result.stores) {
        console.log('\n📊 점포 현황:');
        console.log(`   - 총 점포수: ${result.stores.totalStores.toLocaleString()}개`);
      }

      if (result.screenshotPath) {
        console.log(`\n📸 스크린샷: ${result.screenshotPath}`);
      }
    } else {
      console.log('❌ 분석 실패');
      console.log(`   오류: ${result.error}`);
    }

    console.log('\n--- 전체 데이터 (JSON) ---');
    console.log(JSON.stringify(result, null, 2));

  } catch (error) {
    console.error('\n❌ 치명적 오류:', error);
  } finally {
    await scraper.close();
  }
}

main().catch(console.error);

export type { GolmokAnalysisRequest, GolmokAnalysisResult };
