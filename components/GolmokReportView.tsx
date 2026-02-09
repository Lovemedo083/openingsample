/**
 * 골목상권 분석 보고서 뷰
 * golmok.seoul.go.kr 데이터 기반 종합 보고서를 표시합니다.
 */

import React, { useState, useMemo } from 'react';
import {
  FileText,
  TrendingUp,
  TrendingDown,
  Minus,
  Store,
  Users,
  DollarSign,
  Award,
  AlertTriangle,
  CheckCircle,
  Info,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  BarChart3,
  Target,
  Lightbulb,
  MapPin,
  Calendar,
  Clock,
  PieChart,
  Home,
} from 'lucide-react';
import { Button } from './Components';
import {
  generateGolmokReport,
  reportToText,
  reportToHTML,
  GolmokReportData,
  GeneratedReport,
} from '../utils/golmokReportGenerator';

// --- Sample Data (테스트용 - 실제 스크래핑 결과 기반) ---

const SAMPLE_DATA: GolmokReportData = {
  dongName: '장위3동',
  businessType: '업종전체',
  quarter: '2025년 3분기',
  summary: [
    '장위3동의 업종전체 점포수가 전년동기에 비해 감소하고 있습니다. 상권이 쇠퇴하는 시기인 경우 창업에 유의하셔야 합니다.',
    '장위3동 매출액이 전년대비 감소 추세입니다. 매출감소 원인을 파악하시기 바랍니다. 창업전이라면 창업을 재검토하시고 창업자이시면 자신의 점포에 영향이 있는지 파악하세요.',
    '장위3동은 유동인구가 증가하고있는 지역입니다. 경쟁 업소출현을 경계하세요.',
    '자치구 내 행정동 20개 중 장위3동의 점포수는 19위, 매출액 19위, 유동인구 11위 입니다.',
  ],
  storeChange: '+7개',
  salesChange: '+252만원',
  populationChange: '+4,796명',
  ranking: {
    storeRank: 19,
    salesRank: 19,
    populationRank: 11,
    totalDongs: 20,
  },
  // 확장 데이터 (실제 스크래핑 결과)
  industryAnalysis: {
    survivalRate3Year: '60.81%',
    avgOperatingYears: '3.6년',
    openingCount: 9,
    closureCount: 3,
  },
  salesAnalysis: {
    avgMonthlySales: '501만',
    peakDay: '화요일',
    peakTime: '17~21시',
    maleCustomerRatio: '51.9%',
    femaleCustomerRatio: '48.1%',
  },
  populationAnalysis: {
    totalPopulation: '43,489명',
    workingPopulation: '275명',
    residentPopulation: '15,519명',
  },
  areaAnalysis: {
    avgRent: '178,750원',
    rentTrend: '감소',
  },
};

// --- Sub Components ---

export const TrendIcon: React.FC<{ trend: 'UP' | 'DOWN' | 'STABLE' }> = ({ trend }) => {
  if (trend === 'UP') return <TrendingUp size={16} className="text-green-500" />;
  if (trend === 'DOWN') return <TrendingDown size={16} className="text-red-500" />;
  return <Minus size={16} className="text-gray-400" />;
};

export const RiskBadge: React.FC<{ level: 'LOW' | 'MEDIUM' | 'HIGH' }> = ({ level }) => {
  const config = {
    LOW: { bg: 'bg-green-100', text: 'text-green-700', label: '낮음', icon: CheckCircle },
    MEDIUM: { bg: 'bg-yellow-100', text: 'text-yellow-700', label: '보통', icon: Info },
    HIGH: { bg: 'bg-red-100', text: 'text-red-700', label: '높음', icon: AlertTriangle },
  };
  const { bg, text, label, icon: Icon } = config[level];

  return (
    <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${bg} ${text}`}>
      <Icon size={14} />
      {label}
    </span>
  );
};

export const ScoreGauge: React.FC<{ score: number }> = ({ score }) => {
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32">
      <svg className="w-full h-full transform -rotate-90">
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke="#e5e7eb"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="64"
          cy="64"
          r="45"
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score}</span>
        <span className="text-xs text-gray-500">/ 100</span>
      </div>
    </div>
  );
};

export const MetricCard: React.FC<{
  icon: React.ReactNode;
  label: string;
  value: string;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
}> = ({ icon, label, value, change, changeType }) => {
  const changeColor = changeType === 'positive' ? 'text-green-600' : changeType === 'negative' ? 'text-red-600' : 'text-gray-500';

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <div className="flex items-center gap-2 text-gray-500 mb-2">
        {icon}
        <span className="text-xs font-medium">{label}</span>
      </div>
      <p className="text-xl font-bold text-gray-900">{value}</p>
      {change && (
        <p className={`text-xs mt-1 ${changeColor}`}>
          전분기 대비 {change}
        </p>
      )}
    </div>
  );
};

// --- Main Component ---

export const GolmokReportView: React.FC = () => {
  const [inputMode, setInputMode] = useState<'sample' | 'manual'>('sample');
  const [manualData, setManualData] = useState<string>('');
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [copied, setCopied] = useState(false);

  // Generate report from sample or manual data
  const handleGenerate = () => {
    if (inputMode === 'sample') {
      setReport(generateGolmokReport(SAMPLE_DATA));
    } else {
      try {
        const parsed = JSON.parse(manualData);
        setReport(generateGolmokReport(parsed));
      } catch (e) {
        alert('JSON 형식이 올바르지 않습니다.');
      }
    }
  };

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const handleCopyText = () => {
    if (!report) return;
    navigator.clipboard.writeText(reportToText(report));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadHTML = () => {
    if (!report) return;
    const html = reportToHTML(report);
    const blob = new Blob([html], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `골목상권분석_${report.location}_${new Date().toISOString().slice(0, 10)}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <FileText size={22} />
            </div>
            <h1 className="text-xl font-bold">골목상권 분석 보고서</h1>
          </div>
          <p className="text-indigo-100 text-sm">
            서울시 골목상권분석 데이터 기반 종합 보고서
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Input Section */}
        {!report && (
          <div className="space-y-4 animate-fade-in">
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4">데이터 소스 선택</h2>

              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setInputMode('sample')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    inputMode === 'sample'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  샘플 데이터 사용
                </button>
                <button
                  onClick={() => setInputMode('manual')}
                  className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                    inputMode === 'manual'
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-white text-gray-700 border-gray-300 hover:border-indigo-400'
                  }`}
                >
                  직접 입력
                </button>
              </div>

              {inputMode === 'sample' && (
                <div className="bg-indigo-50 rounded-lg p-4 text-sm">
                  <p className="font-medium text-indigo-800 mb-2">샘플 데이터 미리보기 (실제 스크래핑 결과)</p>
                  <div className="text-indigo-700 space-y-1">
                    <p>위치: {SAMPLE_DATA.dongName}</p>
                    <p>업종: {SAMPLE_DATA.businessType}</p>
                    <p>기준: {SAMPLE_DATA.quarter}</p>
                    <p>점포수 변화: {SAMPLE_DATA.storeChange}</p>
                    <p>매출액 변화: {SAMPLE_DATA.salesChange}</p>
                    <p>유동인구 변화: {SAMPLE_DATA.populationChange}</p>
                    {SAMPLE_DATA.industryAnalysis?.survivalRate3Year && (
                      <p>3년 생존률: {SAMPLE_DATA.industryAnalysis.survivalRate3Year}</p>
                    )}
                    {SAMPLE_DATA.areaAnalysis?.avgRent && (
                      <p>평균 임대료: {SAMPLE_DATA.areaAnalysis.avgRent}</p>
                    )}
                  </div>
                </div>
              )}

              {inputMode === 'manual' && (
                <div>
                  <p className="text-xs text-gray-500 mb-2">
                    스크래퍼 결과 JSON을 붙여넣으세요
                  </p>
                  <textarea
                    value={manualData}
                    onChange={(e) => setManualData(e.target.value)}
                    placeholder={JSON.stringify(SAMPLE_DATA, null, 2)}
                    className="w-full h-48 p-3 rounded-lg border border-gray-300 text-xs font-mono
                      focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              )}
            </div>

            <Button fullWidth size="lg" onClick={handleGenerate}>
              <FileText size={18} className="mr-2" />
              보고서 생성하기
            </Button>
          </div>
        )}

        {/* Report Display */}
        {report && (
          <div className="space-y-4 animate-fade-in">
            {/* Report Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h2 className="text-lg font-bold text-gray-900">{report.title}</h2>
                  <div className="flex items-center gap-3 mt-2 text-sm text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} />
                      {report.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} />
                      {report.quarter}
                    </span>
                  </div>
                </div>
                <RiskBadge level={report.riskLevel} />
              </div>

              {/* Score and Metrics */}
              <div className="flex items-center gap-6 mt-6">
                <ScoreGauge score={report.overallScore} />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-medium text-gray-700">종합 평가 점수</p>
                  <p className="text-xs text-gray-500">
                    {report.overallScore >= 70
                      ? '양호한 상권 환경입니다. 적극적인 진입을 고려해볼 수 있습니다.'
                      : report.overallScore >= 50
                      ? '보통 수준의 상권입니다. 신중한 검토가 필요합니다.'
                      : '주의가 필요한 상권입니다. 충분한 사전 조사를 권장합니다.'}
                  </p>
                </div>
              </div>
            </div>

            {/* Key Metrics */}
            <div className="grid grid-cols-3 gap-3">
              <MetricCard
                icon={<Store size={16} />}
                label="점포수"
                value={report.sections[0]?.metrics?.[0]?.value || 'N/A'}
                change={report.sections[0]?.metrics?.[0]?.change}
                changeType={report.sections[0]?.metrics?.[0]?.changeType}
              />
              <MetricCard
                icon={<DollarSign size={16} />}
                label="매출액"
                value={report.sections[0]?.metrics?.[1]?.value || 'N/A'}
                change={report.sections[0]?.metrics?.[1]?.change}
                changeType={report.sections[0]?.metrics?.[1]?.changeType}
              />
              <MetricCard
                icon={<Users size={16} />}
                label="유동인구"
                value={report.sections[0]?.metrics?.[2]?.value || 'N/A'}
                change={report.sections[0]?.metrics?.[2]?.change}
                changeType={report.sections[0]?.metrics?.[2]?.changeType}
              />
            </div>

            {/* Sections */}
            {report.sections.map((section, idx) => (
              <div key={idx} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <button
                  onClick={() => toggleSection(idx)}
                  className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
                >
                  <span className="flex items-center gap-2 text-sm font-bold text-gray-900">
                    {section.icon === 'chart' && <BarChart3 size={18} className="text-indigo-500" />}
                    {section.icon === 'store' && <Store size={18} className="text-orange-500" />}
                    {section.icon === 'money' && <DollarSign size={18} className="text-green-500" />}
                    {section.icon === 'users' && <Users size={18} className="text-blue-500" />}
                    {section.icon === 'ranking' && <Award size={18} className="text-purple-500" />}
                    {section.icon === 'survival' && <Clock size={18} className="text-teal-500" />}
                    {section.icon === 'sales' && <PieChart size={18} className="text-emerald-500" />}
                    {section.icon === 'population' && <Users size={18} className="text-cyan-500" />}
                    {section.icon === 'area' && <Home size={18} className="text-amber-500" />}
                    {section.title}
                    {section.trend && <TrendIcon trend={section.trend} />}
                  </span>
                  {expandedSections.has(idx) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                </button>

                {expandedSections.has(idx) && (
                  <div className="px-5 pb-4 border-t border-gray-100">
                    <div className="pt-4 space-y-3">
                      {section.content.map((text, i) => (
                        <p key={i} className="text-sm text-gray-600 leading-relaxed">
                          {text}
                        </p>
                      ))}

                      {section.metrics && idx !== 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-4">
                          {section.metrics.map((m, i) => (
                            <div key={i} className="text-center p-3 bg-gray-50 rounded-lg">
                              <p className="text-xs text-gray-500">{m.label}</p>
                              <p className={`text-lg font-bold mt-1 ${
                                m.changeType === 'positive' ? 'text-green-600' :
                                m.changeType === 'negative' ? 'text-red-600' : 'text-gray-900'
                              }`}>
                                {m.value}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}

            {/* Recommendations */}
            <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-xl border border-amber-200 p-5">
              <h3 className="flex items-center gap-2 text-sm font-bold text-amber-800 mb-4">
                <Lightbulb size={18} />
                전문가 추천사항
              </h3>
              <ol className="space-y-3">
                {report.recommendations.map((rec, idx) => (
                  <li key={idx} className="flex gap-3 text-sm text-amber-900">
                    <span className="flex-shrink-0 w-6 h-6 bg-amber-200 rounded-full flex items-center justify-center text-xs font-bold">
                      {idx + 1}
                    </span>
                    <span className="leading-relaxed">{rec}</span>
                  </li>
                ))}
              </ol>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                variant="outline"
                fullWidth
                onClick={handleCopyText}
              >
                <Copy size={16} className="mr-2" />
                {copied ? '복사됨!' : '텍스트 복사'}
              </Button>
              <Button fullWidth onClick={handleDownloadHTML}>
                <Download size={16} className="mr-2" />
                HTML 다운로드
              </Button>
            </div>

            {/* Reset */}
            <button
              onClick={() => setReport(null)}
              className="w-full text-center text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              다른 데이터로 새 보고서 생성
            </button>

            {/* Footer */}
            <p className="text-xs text-gray-400 text-center">
              데이터 출처: 서울시 골목상권분석 서비스 (golmok.seoul.go.kr)
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
