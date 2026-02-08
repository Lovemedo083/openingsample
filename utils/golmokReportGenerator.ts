/**
 * 골목상권 분석 보고서 생성 유틸리티
 * golmok.seoul.go.kr 스크래퍼 데이터를 기반으로 종합 보고서를 생성합니다.
 */

// --- Types ---

export interface GolmokReportData {
  dongName: string;
  businessType: string;
  quarter: string;
  summary: string[];
  storeChange: string;
  salesChange: string;
  populationChange: string;
  ranking?: {
    storeRank: number;
    salesRank: number;
    populationRank: number;
    totalDongs: number;
  };
  rawData?: string;
  // === 확장 데이터 ===
  industryAnalysis?: {
    survivalRate1Year?: string;
    survivalRate3Year?: string;
    survivalRate5Year?: string;
    avgOperatingYears?: string;
    openingCount?: number;
    closureCount?: number;
    openingRate?: string;
    closureRate?: string;
    franchiseRatio?: string;
    similarStoreCount?: number;
  };
  salesAnalysis?: {
    totalSales?: string;
    avgMonthlySales?: string;
    weekdaySales?: string;
    weekendSales?: string;
    peakDay?: string;
    peakTime?: string;
    maleCustomerRatio?: string;
    femaleCustomerRatio?: string;
  };
  populationAnalysis?: {
    totalPopulation?: string;
    workingPopulation?: string;
    residentPopulation?: string;
    maleRatio?: string;
    femaleRatio?: string;
    peakDay?: string;
    peakTime?: string;
  };
  areaAnalysis?: {
    avgRent?: string;
    rentTrend?: string;
    commercialDensity?: string;
    residentialRatio?: string;
    commercialRatio?: string;
  };
}

export interface GeneratedReport {
  title: string;
  location: string;
  businessType: string;
  quarter: string;
  generatedAt: string;
  sections: ReportSection[];
  recommendations: string[];
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  overallScore: number;
}

export interface ReportSection {
  title: string;
  icon: string;
  content: string[];
  metrics?: ReportMetric[];
  trend?: 'UP' | 'DOWN' | 'STABLE';
}

export interface ReportMetric {
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}

// --- Helper Functions ---

function parseChange(changeStr: string): { value: number; isPositive: boolean } {
  if (!changeStr) return { value: 0, isPositive: true };
  const match = changeStr.match(/([+\-]?)([\d,]+)/);
  if (!match) return { value: 0, isPositive: true };
  const isPositive = match[1] !== '-';
  const value = parseInt(match[2].replace(/,/g, ''), 10);
  return { value, isPositive };
}

function extractSummaryInsights(summary: string[]): {
  storeInsight: string;
  salesInsight: string;
  populationInsight: string;
  competitionWarning: boolean;
} {
  let storeInsight = '';
  let salesInsight = '';
  let populationInsight = '';
  let competitionWarning = false;

  for (const text of summary) {
    if (text.includes('점포수')) {
      storeInsight = text;
      if (text.includes('증가') && text.includes('신중')) {
        competitionWarning = true;
      }
    }
    if (text.includes('매출')) {
      salesInsight = text;
    }
    if (text.includes('유동인구')) {
      populationInsight = text;
    }
    if (text.includes('경쟁') || text.includes('경계')) {
      competitionWarning = true;
    }
  }

  return { storeInsight, salesInsight, populationInsight, competitionWarning };
}

function calculateRiskLevel(data: GolmokReportData): 'LOW' | 'MEDIUM' | 'HIGH' {
  const insights = extractSummaryInsights(data.summary);
  const salesChange = parseChange(data.salesChange);
  const storeChange = parseChange(data.storeChange);

  let riskScore = 0;

  // 매출 감소는 리스크
  if (!salesChange.isPositive) riskScore += 2;

  // 점포수 증가 + 매출 감소 = 경쟁 과열
  if (storeChange.isPositive && !salesChange.isPositive) riskScore += 2;

  // 경쟁 경고가 있으면 리스크
  if (insights.competitionWarning) riskScore += 1;

  // 순위가 낮으면 리스크
  if (data.ranking) {
    if (data.ranking.salesRank > data.ranking.totalDongs * 0.7) riskScore += 1;
  }

  if (riskScore >= 4) return 'HIGH';
  if (riskScore >= 2) return 'MEDIUM';
  return 'LOW';
}

function calculateOverallScore(data: GolmokReportData): number {
  let score = 70; // 기본 점수

  const salesChange = parseChange(data.salesChange);
  const popChange = parseChange(data.populationChange);
  const storeChange = parseChange(data.storeChange);

  // 매출 변화 반영
  if (salesChange.isPositive) {
    score += Math.min(salesChange.value / 10, 10);
  } else {
    score -= Math.min(salesChange.value / 10, 15);
  }

  // 유동인구 변화 반영
  if (popChange.isPositive) {
    score += Math.min(popChange.value / 500, 8);
  } else {
    score -= Math.min(popChange.value / 500, 10);
  }

  // 점포수 과다 증가는 경쟁 과열 신호
  if (storeChange.isPositive && storeChange.value > 5) {
    score -= 5;
  }

  // 순위 반영
  if (data.ranking) {
    const avgRank = (data.ranking.storeRank + data.ranking.salesRank + data.ranking.populationRank) / 3;
    const percentile = 1 - (avgRank / data.ranking.totalDongs);
    score += percentile * 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}

function generateRecommendations(data: GolmokReportData): string[] {
  const recommendations: string[] = [];
  const insights = extractSummaryInsights(data.summary);
  const salesChange = parseChange(data.salesChange);
  const popChange = parseChange(data.populationChange);
  const storeChange = parseChange(data.storeChange);

  // 매출 기반 추천
  if (!salesChange.isPositive) {
    recommendations.push(
      '매출이 감소 추세입니다. 임대료, 인건비 등 고정비용을 최소화할 수 있는 전략이 필요합니다.'
    );
    recommendations.push(
      '주변 경쟁업체 대비 차별화 포인트를 명확히 하여 고객 유치 전략을 수립하세요.'
    );
  } else {
    recommendations.push(
      '매출이 상승 추세입니다. 현재 상권의 성장세를 활용할 좋은 시기입니다.'
    );
  }

  // 유동인구 기반 추천
  if (popChange.isPositive) {
    recommendations.push(
      '유동인구가 증가하고 있어 신규 고객 확보에 유리한 환경입니다. 마케팅 활동을 강화하세요.'
    );
  } else {
    recommendations.push(
      '유동인구가 감소 추세입니다. 단골 고객 확보와 온라인 채널 활용을 고려하세요.'
    );
  }

  // 경쟁 관련 추천
  if (insights.competitionWarning || (storeChange.isPositive && storeChange.value > 3)) {
    recommendations.push(
      '신규 점포 유입이 증가하고 있습니다. 경쟁 업소의 동향을 주시하고 차별화 전략을 준비하세요.'
    );
  }

  // 순위 기반 추천
  if (data.ranking) {
    if (data.ranking.populationRank <= 5) {
      recommendations.push(
        `${data.dongName}은(는) 유동인구 ${data.ranking.populationRank}위로 상위권입니다. 접근성 좋은 위치 선정이 중요합니다.`
      );
    }
    if (data.ranking.salesRank > data.ranking.totalDongs / 2) {
      recommendations.push(
        '매출 순위가 중하위권입니다. 업종 특성에 맞는 틈새시장 공략을 검토하세요.'
      );
    }
  }

  return recommendations.slice(0, 5);
}

// --- Main Generator Function ---

export function generateGolmokReport(data: GolmokReportData): GeneratedReport {
  const insights = extractSummaryInsights(data.summary);
  const salesChange = parseChange(data.salesChange);
  const popChange = parseChange(data.populationChange);
  const storeChange = parseChange(data.storeChange);

  const sections: ReportSection[] = [];

  // 1. 종합 현황
  sections.push({
    title: '종합 현황',
    icon: 'chart',
    content: data.summary.filter(s => s.length > 0),
    metrics: [
      {
        label: '점포수 변화',
        value: data.storeChange || 'N/A',
        change: storeChange.isPositive ? '증가' : '감소',
        changeType: storeChange.isPositive ? 'neutral' : 'positive',
      },
      {
        label: '매출액 변화',
        value: data.salesChange || 'N/A',
        change: salesChange.isPositive ? '증가' : '감소',
        changeType: salesChange.isPositive ? 'positive' : 'negative',
      },
      {
        label: '유동인구 변화',
        value: data.populationChange || 'N/A',
        change: popChange.isPositive ? '증가' : '감소',
        changeType: popChange.isPositive ? 'positive' : 'negative',
      },
    ],
    trend: salesChange.isPositive ? 'UP' : popChange.isPositive ? 'STABLE' : 'DOWN',
  });

  // 2. 점포 분석
  sections.push({
    title: '점포 현황 분석',
    icon: 'store',
    content: [
      insights.storeInsight || `${data.dongName} 지역의 ${data.businessType} 점포 현황입니다.`,
      storeChange.isPositive
        ? `전분기 대비 ${data.storeChange} 점포가 증가했습니다. 상권 활성화 또는 경쟁 심화의 신호일 수 있습니다.`
        : `전분기 대비 점포수가 감소했습니다. 시장 안정화 또는 수요 감소를 나타낼 수 있습니다.`,
    ],
    trend: storeChange.isPositive ? 'UP' : 'DOWN',
  });

  // 3. 매출 분석
  sections.push({
    title: '매출 동향 분석',
    icon: 'money',
    content: [
      insights.salesInsight || `${data.businessType} 업종의 매출 동향입니다.`,
      salesChange.isPositive
        ? `점포당 월평균 매출이 ${data.salesChange} 상승했습니다. 긍정적인 시장 신호입니다.`
        : `점포당 월평균 매출이 감소 추세입니다. 고정비용 관리와 차별화 전략이 필요합니다.`,
    ],
    trend: salesChange.isPositive ? 'UP' : 'DOWN',
  });

  // 4. 유동인구 분석
  sections.push({
    title: '유동인구 분석',
    icon: 'users',
    content: [
      insights.populationInsight || `${data.dongName} 지역의 유동인구 현황입니다.`,
      popChange.isPositive
        ? `3개월간 유동인구가 ${data.populationChange} 증가했습니다. 고객 유입 잠재력이 높습니다.`
        : `유동인구가 감소 추세입니다. 타겟 고객층 재정의와 마케팅 전략 수정을 고려하세요.`,
    ],
    trend: popChange.isPositive ? 'UP' : 'DOWN',
  });

  // 5. 지역 순위
  if (data.ranking) {
    sections.push({
      title: '자치구 내 순위',
      icon: 'ranking',
      content: [
        `${data.ranking.totalDongs}개 행정동 중 현재 순위:`,
      ],
      metrics: [
        {
          label: '점포수',
          value: `${data.ranking.storeRank}위`,
          changeType: data.ranking.storeRank <= 10 ? 'positive' : 'neutral',
        },
        {
          label: '매출액',
          value: `${data.ranking.salesRank}위`,
          changeType: data.ranking.salesRank <= 10 ? 'positive' : data.ranking.salesRank > 15 ? 'negative' : 'neutral',
        },
        {
          label: '유동인구',
          value: `${data.ranking.populationRank}위`,
          changeType: data.ranking.populationRank <= 5 ? 'positive' : 'neutral',
        },
      ],
    });
  }

  // === 확장 데이터 섹션 ===

  // 6. 업종 상세분석 (생존률, 영업년수)
  if (data.industryAnalysis) {
    const ia = data.industryAnalysis;
    const metrics: ReportMetric[] = [];
    const content: string[] = [];

    if (ia.survivalRate1Year || ia.survivalRate3Year || ia.survivalRate5Year) {
      content.push(`신생기업 생존률 현황입니다.`);
    }
    if (ia.avgOperatingYears) {
      content.push(`이 지역 ${data.businessType} 업종의 평균 영업 기간은 ${ia.avgOperatingYears}입니다.`);
    }
    if (ia.openingCount !== undefined && ia.closureCount !== undefined) {
      const netChange = ia.openingCount - ia.closureCount;
      content.push(`최근 분기 개업 ${ia.openingCount}개, 폐업 ${ia.closureCount}개로 순증감 ${netChange >= 0 ? '+' : ''}${netChange}개입니다.`);
    }

    if (ia.survivalRate1Year) metrics.push({ label: '1년 생존률', value: ia.survivalRate1Year, changeType: parseFloat(ia.survivalRate1Year) >= 70 ? 'positive' : 'negative' });
    if (ia.survivalRate3Year) metrics.push({ label: '3년 생존률', value: ia.survivalRate3Year, changeType: parseFloat(ia.survivalRate3Year) >= 50 ? 'positive' : 'negative' });
    if (ia.survivalRate5Year) metrics.push({ label: '5년 생존률', value: ia.survivalRate5Year, changeType: parseFloat(ia.survivalRate5Year) >= 40 ? 'positive' : 'negative' });
    if (ia.avgOperatingYears) metrics.push({ label: '평균 영업년수', value: ia.avgOperatingYears, changeType: 'neutral' });

    if (content.length > 0 || metrics.length > 0) {
      sections.push({
        title: '업종 상세분석',
        icon: 'survival',
        content: content.length > 0 ? content : ['업종 상세 분석 데이터입니다.'],
        metrics: metrics.length > 0 ? metrics : undefined,
      });
    }
  }

  // 7. 매출 상세분석
  if (data.salesAnalysis) {
    const sa = data.salesAnalysis;
    const metrics: ReportMetric[] = [];
    const content: string[] = [];

    if (sa.avgMonthlySales) content.push(`점포당 월평균 매출은 ${sa.avgMonthlySales}입니다.`);
    if (sa.peakDay && sa.peakTime) content.push(`매출 피크 시간대는 ${sa.peakDay} ${sa.peakTime}입니다.`);
    if (sa.maleCustomerRatio && sa.femaleCustomerRatio) content.push(`고객 성비는 남성 ${sa.maleCustomerRatio}, 여성 ${sa.femaleCustomerRatio}입니다.`);

    if (sa.totalSales) metrics.push({ label: '총 매출', value: sa.totalSales, changeType: 'neutral' });
    if (sa.avgMonthlySales) metrics.push({ label: '월평균 매출', value: sa.avgMonthlySales, changeType: 'neutral' });
    if (sa.weekdaySales) metrics.push({ label: '주중 매출', value: sa.weekdaySales, changeType: 'neutral' });
    if (sa.weekendSales) metrics.push({ label: '주말 매출', value: sa.weekendSales, changeType: 'neutral' });

    if (content.length > 0 || metrics.length > 0) {
      sections.push({
        title: '매출 상세분석',
        icon: 'sales',
        content: content.length > 0 ? content : ['매출 상세 분석 데이터입니다.'],
        metrics: metrics.length > 0 ? metrics : undefined,
      });
    }
  }

  // 8. 인구 상세분석
  if (data.populationAnalysis) {
    const pa = data.populationAnalysis;
    const metrics: ReportMetric[] = [];
    const content: string[] = [];

    if (pa.totalPopulation) content.push(`총 유동인구는 ${pa.totalPopulation}입니다.`);
    if (pa.workingPopulation && pa.residentPopulation) content.push(`직장인구 ${pa.workingPopulation}, 주거인구 ${pa.residentPopulation}입니다.`);
    if (pa.peakDay && pa.peakTime) content.push(`유동인구 피크 시간대는 ${pa.peakDay} ${pa.peakTime}입니다.`);

    if (pa.totalPopulation) metrics.push({ label: '총 유동인구', value: pa.totalPopulation, changeType: 'neutral' });
    if (pa.maleRatio) metrics.push({ label: '남성 비율', value: pa.maleRatio, changeType: 'neutral' });
    if (pa.femaleRatio) metrics.push({ label: '여성 비율', value: pa.femaleRatio, changeType: 'neutral' });

    if (content.length > 0 || metrics.length > 0) {
      sections.push({
        title: '인구 상세분석',
        icon: 'population',
        content: content.length > 0 ? content : ['인구 상세 분석 데이터입니다.'],
        metrics: metrics.length > 0 ? metrics : undefined,
      });
    }
  }

  // 9. 지역 상세분석 (임대료, 배후지)
  if (data.areaAnalysis) {
    const aa = data.areaAnalysis;
    const metrics: ReportMetric[] = [];
    const content: string[] = [];

    if (aa.avgRent) content.push(`이 지역의 평균 임대료는 ${aa.avgRent}입니다.`);
    if (aa.rentTrend) content.push(`임대료 추세는 ${aa.rentTrend}입니다.`);
    if (aa.commercialDensity) content.push(`상권 밀집도는 ${aa.commercialDensity}입니다.`);

    if (aa.avgRent) metrics.push({ label: '평균 임대료', value: aa.avgRent, changeType: 'neutral' });
    if (aa.residentialRatio) metrics.push({ label: '주거 비율', value: aa.residentialRatio, changeType: 'neutral' });
    if (aa.commercialRatio) metrics.push({ label: '상업 비율', value: aa.commercialRatio, changeType: 'neutral' });

    if (content.length > 0 || metrics.length > 0) {
      sections.push({
        title: '지역 상세분석',
        icon: 'area',
        content: content.length > 0 ? content : ['지역 상세 분석 데이터입니다.'],
        metrics: metrics.length > 0 ? metrics : undefined,
      });
    }
  }

  return {
    title: `${data.dongName} ${data.businessType} 상권분석 보고서`,
    location: data.dongName,
    businessType: data.businessType,
    quarter: data.quarter,
    generatedAt: new Date().toISOString(),
    sections,
    recommendations: generateRecommendations(data),
    riskLevel: calculateRiskLevel(data),
    overallScore: calculateOverallScore(data),
  };
}

// --- Report to Text ---

export function reportToText(report: GeneratedReport): string {
  const lines: string[] = [];

  lines.push('═'.repeat(50));
  lines.push(`  ${report.title}`);
  lines.push('═'.repeat(50));
  lines.push('');
  lines.push(`기준: ${report.quarter}`);
  lines.push(`생성일: ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}`);
  lines.push(`종합점수: ${report.overallScore}점 / 100점`);
  lines.push(`리스크 수준: ${report.riskLevel === 'LOW' ? '낮음' : report.riskLevel === 'MEDIUM' ? '보통' : '높음'}`);
  lines.push('');

  for (const section of report.sections) {
    lines.push('─'.repeat(40));
    lines.push(`▶ ${section.title}`);
    lines.push('');

    for (const content of section.content) {
      lines.push(`  ${content}`);
    }

    if (section.metrics) {
      lines.push('');
      for (const metric of section.metrics) {
        const arrow = metric.changeType === 'positive' ? '▲' : metric.changeType === 'negative' ? '▼' : '─';
        lines.push(`  • ${metric.label}: ${metric.value} ${metric.change ? `(${arrow} ${metric.change})` : ''}`);
      }
    }
    lines.push('');
  }

  lines.push('─'.repeat(40));
  lines.push('▶ 전문가 추천사항');
  lines.push('');
  report.recommendations.forEach((rec, i) => {
    lines.push(`  ${i + 1}. ${rec}`);
  });
  lines.push('');
  lines.push('═'.repeat(50));

  return lines.join('\n');
}

// --- Report to HTML ---

export function reportToHTML(report: GeneratedReport): string {
  const riskColor = report.riskLevel === 'LOW' ? '#10b981' : report.riskLevel === 'MEDIUM' ? '#f59e0b' : '#ef4444';
  const scoreColor = report.overallScore >= 70 ? '#10b981' : report.overallScore >= 50 ? '#f59e0b' : '#ef4444';

  return `
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <title>${report.title}</title>
  <style>
    body { font-family: 'Pretendard', -apple-system, sans-serif; max-width: 800px; margin: 0 auto; padding: 20px; background: #f8fafc; }
    .header { background: linear-gradient(135deg, #3b82f6, #8b5cf6); color: white; padding: 30px; border-radius: 16px; margin-bottom: 24px; }
    .header h1 { margin: 0 0 8px 0; font-size: 24px; }
    .header p { margin: 0; opacity: 0.9; font-size: 14px; }
    .score-card { display: flex; gap: 16px; margin: 24px 0; }
    .score-item { flex: 1; background: white; padding: 20px; border-radius: 12px; text-align: center; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .score-item .label { font-size: 12px; color: #64748b; margin-bottom: 8px; }
    .score-item .value { font-size: 28px; font-weight: 700; }
    .section { background: white; border-radius: 12px; padding: 20px; margin-bottom: 16px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .section h3 { margin: 0 0 16px 0; font-size: 16px; color: #1e293b; display: flex; align-items: center; gap: 8px; }
    .section p { margin: 8px 0; color: #475569; font-size: 14px; line-height: 1.6; }
    .metrics { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-top: 16px; }
    .metric { background: #f8fafc; padding: 12px; border-radius: 8px; text-align: center; }
    .metric .label { font-size: 11px; color: #64748b; }
    .metric .value { font-size: 18px; font-weight: 600; margin-top: 4px; }
    .recommendations { background: #fef3c7; border-radius: 12px; padding: 20px; }
    .recommendations h3 { color: #92400e; }
    .recommendations ol { margin: 0; padding-left: 20px; }
    .recommendations li { color: #78350f; margin-bottom: 12px; font-size: 14px; line-height: 1.5; }
    .positive { color: #10b981; }
    .negative { color: #ef4444; }
    .neutral { color: #64748b; }
    .footer { text-align: center; margin-top: 24px; color: #94a3b8; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>${report.title}</h1>
    <p>기준: ${report.quarter} | 생성일: ${new Date(report.generatedAt).toLocaleDateString('ko-KR')}</p>
  </div>

  <div class="score-card">
    <div class="score-item">
      <div class="label">종합점수</div>
      <div class="value" style="color: ${scoreColor}">${report.overallScore}</div>
    </div>
    <div class="score-item">
      <div class="label">리스크 수준</div>
      <div class="value" style="color: ${riskColor}">${report.riskLevel === 'LOW' ? '낮음' : report.riskLevel === 'MEDIUM' ? '보통' : '높음'}</div>
    </div>
  </div>

  ${report.sections.map(section => `
    <div class="section">
      <h3>${section.title}</h3>
      ${section.content.map(c => `<p>${c}</p>`).join('')}
      ${section.metrics ? `
        <div class="metrics">
          ${section.metrics.map(m => `
            <div class="metric">
              <div class="label">${m.label}</div>
              <div class="value ${m.changeType}">${m.value}</div>
            </div>
          `).join('')}
        </div>
      ` : ''}
    </div>
  `).join('')}

  <div class="recommendations">
    <h3>전문가 추천사항</h3>
    <ol>
      ${report.recommendations.map(r => `<li>${r}</li>`).join('')}
    </ol>
  </div>

  <div class="footer">
    데이터 출처: 서울시 골목상권분석 서비스 (golmok.seoul.go.kr)
  </div>
</body>
</html>
  `.trim();
}
