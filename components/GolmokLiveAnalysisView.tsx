/**
 * 골목상권 실시간 분석 뷰
 * 동네 선택 → 업종 선택 → 스크래핑 실행 → 보고서 표시
 */

import React, { useState, useCallback } from 'react';
import {
  MapPin,
  Loader2,
  AlertCircle,
  BarChart3,
  Store,
  Users,
  DollarSign,
  Award,
  Clock,
  PieChart,
  Home,
  FileText,
  Download,
  Copy,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';
import { Button } from './Components';
import { ScoreGauge, MetricCard, RiskBadge, TrendIcon } from './GolmokReportView';
import {
  generateGolmokReport,
  reportToText,
  reportToHTML,
  GolmokReportData,
  GeneratedReport,
} from '../utils/golmokReportGenerator';
import { startGolmokScrape, pollGolmokJob } from '../utils/golmokApi';

// --- Constants ---

type AnalysisStep = 'INPUT' | 'LOADING' | 'RESULT';

const DONG_LIST = [
  { name: '역삼1동', address: '서울 강남구 역삼1동' },
  { name: '역삼2동', address: '서울 강남구 역삼2동' },
  { name: '논현1동', address: '서울 강남구 논현1동' },
  { name: '논현2동', address: '서울 강남구 논현2동' },
  { name: '청담동', address: '서울 강남구 청담동' },
  { name: '압구정동', address: '서울 강남구 압구정동' },
  { name: '신사동', address: '서울 강남구 신사동' },
  { name: '대치1동', address: '서울 강남구 대치1동' },
  { name: '대치2동', address: '서울 강남구 대치2동' },
  { name: '삼성1동', address: '서울 강남구 삼성1동' },
  { name: '삼성2동', address: '서울 강남구 삼성2동' },
] as const;

const BUSINESS_CATEGORIES = [
  { value: '외식업', label: '외식업', icon: '🍽️' },
  { value: '서비스업', label: '서비스업', icon: '💈' },
  { value: '소매업', label: '소매업', icon: '🛒' },
  { value: '전체', label: '전체', icon: '📊' },
] as const;

// --- Component ---

export const GolmokLiveAnalysisView: React.FC = () => {
  // Step State
  const [step, setStep] = useState<AnalysisStep>('INPUT');

  // Input State
  const [selectedDong, setSelectedDong] = useState<string>('');
  const [businessCategory, setBusinessCategory] = useState<string>('외식업');

  // Loading State
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');

  // Result State
  const [report, setReport] = useState<GeneratedReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set([0, 1, 2, 3]));
  const [copied, setCopied] = useState(false);

  // --- Handlers ---

  const selectedLocation = DONG_LIST.find((d) => d.name === selectedDong);

  const handleAnalyze = useCallback(async () => {
    if (!selectedLocation) {
      setError('동네를 선택해주세요.');
      return;
    }

    setStep('LOADING');
    setProgress(0);
    setProgressMessage('분석 요청 전송 중...');
    setError(null);

    try {
      const { jobId } = await startGolmokScrape({
        address: selectedLocation.address,
        businessCategory: businessCategory as any,
      });

      const result = await pollGolmokJob(jobId, (p, msg) => {
        setProgress(p);
        setProgressMessage(msg);
      });

      // Convert scraper result to report
      if (result.result?.report) {
        const reportData: GolmokReportData = result.result.report;
        const generated = generateGolmokReport(reportData);
        setReport(generated);
        setStep('RESULT');
      } else if (result.result?.success) {
        setError('데이터 추출에 일부 실패했습니다. 다시 시도해주세요.');
        setStep('INPUT');
      } else {
        setError(result.result?.error || '분석 결과를 가져올 수 없습니다.');
        setStep('INPUT');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.');
      setStep('INPUT');
    }
  }, [selectedLocation, businessCategory]);

  const handleReset = useCallback(() => {
    setStep('INPUT');
    setReport(null);
    setSelectedDong('');
    setProgress(0);
    setError(null);
    setExpandedSections(new Set([0, 1, 2, 3]));
  }, []);

  const toggleSection = (idx: number) => {
    setExpandedSections((prev) => {
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
      <div className="bg-gradient-to-r from-brand-600 to-brand-700 text-white">
        <div className="max-w-2xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <BarChart3 size={22} />
            </div>
            <h1 className="text-xl font-bold">골목상권 실시간 분석</h1>
          </div>
          <p className="text-brand-100 text-sm">
            강남구 동네와 업종을 선택하면 서울시 골목상권 데이터를 실시간으로 분석합니다
          </p>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* Error Banner */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3 animate-fade-in">
            <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm text-red-700">{error}</p>
              {step === 'INPUT' && (
                <button
                  onClick={() => setError(null)}
                  className="text-xs text-red-500 hover:text-red-700 mt-1 underline"
                >
                  닫기
                </button>
              )}
            </div>
          </div>
        )}

        {/* === INPUT Step === */}
        {step === 'INPUT' && (
          <div className="space-y-4 animate-fade-in">
            {/* Dong Selection */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <MapPin size={16} className="text-brand-600" />
                동네 선택 (강남구)
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {DONG_LIST.map((dong) => (
                  <button
                    key={dong.name}
                    onClick={() => setSelectedDong(dong.name)}
                    className={`py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      selectedDong === dong.name
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-brand-300'
                    }`}
                  >
                    {dong.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Business Category */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h2 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Store size={16} className="text-brand-600" />
                업종 선택
              </h2>
              <div className="grid grid-cols-4 gap-2">
                {BUSINESS_CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => setBusinessCategory(cat.value)}
                    className={`py-3 rounded-lg text-sm font-medium border transition-colors text-center ${
                      businessCategory === cat.value
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-brand-300'
                    }`}
                  >
                    <span className="block text-lg mb-1">{cat.icon}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Analyze Button */}
            <Button
              fullWidth
              size="lg"
              onClick={handleAnalyze}
              disabled={!selectedDong}
              className={!selectedDong ? '' : 'bg-brand-600 hover:bg-brand-700'}
            >
              <BarChart3 size={18} className="mr-2" />
              분석 시작
            </Button>

            <p className="text-xs text-gray-400 text-center">
              분석에 약 30~60초가 소요됩니다. 서울시 골목상권분석 서비스의 데이터를 실시간으로 가져옵니다.
            </p>
          </div>
        )}

        {/* === LOADING Step === */}
        {step === 'LOADING' && (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-white rounded-xl border border-gray-200 p-8 text-center">
              <Loader2 size={48} className="text-brand-500 animate-spin mx-auto mb-6" />

              <h2 className="text-lg font-bold text-gray-900 mb-2">상권 분석 진행 중</h2>
              <p className="text-sm text-gray-500 mb-6">
                {selectedLocation?.address} - {businessCategory}
              </p>

              {/* Progress Bar */}
              <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
                <div
                  className="bg-brand-500 h-3 rounded-full transition-all duration-500"
                  style={{ width: `${Math.max(progress, 3)}%` }}
                />
              </div>

              <div className="flex justify-between text-xs text-gray-500 mb-4">
                <span>{progressMessage || '준비 중...'}</span>
                <span>{progress}%</span>
              </div>

              {/* Steps Guide */}
              <div className="text-left bg-gray-50 rounded-lg p-4 space-y-2">
                <StepIndicator active={progress >= 0} done={progress >= 15} label="사이트 접속" />
                <StepIndicator active={progress >= 15} done={progress >= 25} label="필터 설정" />
                <StepIndicator active={progress >= 25} done={progress >= 40} label="지도 데이터 로딩" />
                <StepIndicator active={progress >= 40} done={progress >= 60} label="기본 데이터 추출" />
                <StepIndicator active={progress >= 60} done={progress >= 90} label="상세 분석 탭 순회" />
                <StepIndicator active={progress >= 90} done={progress >= 100} label="결과 정리" />
              </div>

              <p className="text-xs text-gray-400 mt-4">
                예상 소요 시간: 30~60초
              </p>
            </div>
          </div>
        )}

        {/* === RESULT Step === */}
        {step === 'RESULT' && report && (
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
                      <FileText size={14} />
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
                    {section.icon === 'chart' && <BarChart3 size={18} className="text-brand-500" />}
                    {section.icon === 'store' && <Store size={18} className="text-orange-500" />}
                    {section.icon === 'money' && <DollarSign size={18} className="text-green-500" />}
                    {section.icon === 'users' && <Users size={18} className="text-blue-500" />}
                    {section.icon === 'ranking' && <Award size={18} className="text-purple-500" />}
                    {section.icon === 'survival' && <Clock size={18} className="text-brand-500" />}
                    {section.icon === 'sales' && <PieChart size={18} className="text-brand-500" />}
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
                              <p
                                className={`text-lg font-bold mt-1 ${
                                  m.changeType === 'positive'
                                    ? 'text-green-600'
                                    : m.changeType === 'negative'
                                    ? 'text-red-600'
                                    : 'text-gray-900'
                                }`}
                              >
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
              <Button variant="outline" fullWidth onClick={handleCopyText}>
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
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2 text-sm text-gray-500 hover:text-gray-700 py-2"
            >
              <RefreshCw size={14} />
              다시 분석하기
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

// --- Sub Components ---

const StepIndicator: React.FC<{ active: boolean; done: boolean; label: string }> = ({
  active,
  done,
  label,
}) => (
  <div className="flex items-center gap-2 text-xs">
    <div
      className={`w-4 h-4 rounded-full flex items-center justify-center transition-colors ${
        done
          ? 'bg-brand-500 text-white'
          : active
          ? 'bg-brand-50 border-2 border-brand-500'
          : 'bg-gray-200'
      }`}
    >
      {done && (
        <svg width="8" height="8" viewBox="0 0 12 12" fill="none">
          <path d="M2 6L5 9L10 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      )}
    </div>
    <span className={done ? 'text-brand-700 font-medium' : active ? 'text-gray-700' : 'text-gray-400'}>
      {label}
    </span>
  </div>
);
