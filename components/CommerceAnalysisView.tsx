import React, { useState, useCallback, useMemo } from 'react';
import {
  Search,
  MapPin,
  Building2,
  TrendingUp,
  PieChart,
  Store,
  Loader2,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  Download,
  RefreshCw,
  Navigation,
  Filter,
  Users,
  Award,
  BarChart3,
  Layers,
} from 'lucide-react';
import { Button } from './Components';
import {
  generateCommerceReport,
  geocodeAddress,
  searchPlaceByKeyword,
  INDUSTRY_LARGE_CATEGORIES,
  INDUSTRY_MEDIUM_CATEGORIES,
  CommerceReport,
  GeocodingResult,
  Store as StoreType,
} from '../utils/commerceApi';

// --- Types ---

type AnalysisStep = 'INPUT' | 'LOADING' | 'RESULT';

interface SearchResult extends GeocodingResult {
  name?: string;
}

// --- Component ---

export const CommerceAnalysisView: React.FC = () => {
  // Step State
  const [step, setStep] = useState<AnalysisStep>('INPUT');

  // Input State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<SearchResult | null>(null);
  const [radius, setRadius] = useState(500); // meters
  const [selectedLargeCate, setSelectedLargeCate] = useState<string>('');

  // Result State
  const [report, setReport] = useState<CommerceReport | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showStoreList, setShowStoreList] = useState(false);
  const [storeFilter, setStoreFilter] = useState('');

  // --- Handlers ---

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    setError(null);

    try {
      // 먼저 키워드 검색 시도
      const places = await searchPlaceByKeyword(searchQuery);

      if (places.length > 0) {
        setSearchResults(places.map(p => ({ ...p, name: p.address })));
      } else {
        // 키워드 검색 실패 시 주소 검색
        const geocoded = await geocodeAddress(searchQuery);
        if (geocoded) {
          setSearchResults([{ ...geocoded, name: geocoded.address }]);
        } else {
          setSearchResults([]);
          setError('검색 결과가 없습니다. 다른 주소나 장소명으로 검색해주세요.');
        }
      }
    } catch (err) {
      setError('검색 중 오류가 발생했습니다.');
      console.error('[CommerceAnalysis] Search error:', err);
    } finally {
      setIsSearching(false);
    }
  }, [searchQuery]);

  const handleSelectLocation = useCallback((result: SearchResult) => {
    setSelectedLocation(result);
    setSearchResults([]);
  }, []);

  const handleAnalyze = useCallback(async () => {
    if (!selectedLocation) {
      setError('분석할 위치를 선택해주세요.');
      return;
    }

    setStep('LOADING');
    setError(null);

    try {
      const result = await generateCommerceReport(
        selectedLocation.lat,
        selectedLocation.lon,
        radius,
        selectedLocation.address
      );
      setReport(result);
      setStep('RESULT');
    } catch (err) {
      const message = err instanceof Error ? err.message : '분석 중 오류가 발생했습니다.';
      setError(message);
      setStep('INPUT');
      console.error('[CommerceAnalysis] Analysis error:', err);
    }
  }, [selectedLocation, radius]);

  const handleReset = useCallback(() => {
    setStep('INPUT');
    setSearchQuery('');
    setSearchResults([]);
    setSelectedLocation(null);
    setReport(null);
    setError(null);
    setShowStoreList(false);
    setStoreFilter('');
  }, []);

  const handleUseCurrentLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('위치 서비스를 사용할 수 없습니다.');
      return;
    }

    setIsSearching(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setSelectedLocation({
          address: '현재 위치',
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
        setIsSearching(false);
      },
      (err) => {
        setError('위치를 가져올 수 없습니다. 위치 권한을 확인해주세요.');
        setIsSearching(false);
        console.error('[CommerceAnalysis] Geolocation error:', err);
      }
    );
  }, []);

  // --- Filtered Stores ---

  const filteredStores = useMemo(() => {
    if (!report) return [];

    let stores = report.stores;

    if (storeFilter) {
      const filter = storeFilter.toLowerCase();
      stores = stores.filter(
        s =>
          s.bizesNm?.toLowerCase().includes(filter) ||
          s.indsMclsNm?.toLowerCase().includes(filter) ||
          s.indsLclsNm?.toLowerCase().includes(filter)
      );
    }

    return stores;
  }, [report, storeFilter]);

  // --- Render ---

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 h-14 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-brand-50 text-brand-600 rounded-lg flex items-center justify-center">
              <TrendingUp size={18} />
            </div>
            <h1 className="font-bold text-lg">상권 분석</h1>
          </div>
          {step !== 'INPUT' && (
            <button
              onClick={handleReset}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 font-medium transition-colors"
            >
              <RefreshCw size={16} />
              다시 분석
            </button>
          )}
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6">
        {/* --- INPUT Step --- */}
        {step === 'INPUT' && (
          <div className="space-y-6 animate-fade-in">
            {/* Guide */}
            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100">
              <p className="text-sm text-brand-800 font-medium mb-1">
                분석하고 싶은 상권 위치를 입력해주세요.
              </p>
              <p className="text-xs text-brand-600">
                주소, 건물명, 역 이름 등으로 검색하거나 현재 위치를 사용할 수 있습니다.
              </p>
            </div>

            {/* Location Search */}
            <div className="space-y-3">
              <label className="block text-sm font-semibold text-gray-700">
                위치 검색
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    placeholder="예: 강남역, 홍대입구, 서울 마포구 연남동"
                    className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-gray-300 text-sm
                      focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                  />
                </div>
                <Button onClick={handleSearch} disabled={isSearching || !searchQuery.trim()}>
                  {isSearching ? <Loader2 size={18} className="animate-spin" /> : '검색'}
                </Button>
              </div>

              {/* Current Location Button */}
              <button
                onClick={handleUseCurrentLocation}
                disabled={isSearching}
                className="flex items-center gap-2 text-sm text-brand-600 hover:text-brand-700 font-medium"
              >
                <Navigation size={16} />
                현재 위치 사용
              </button>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100">
                  {searchResults.slice(0, 5).map((result, idx) => (
                    <button
                      key={idx}
                      onClick={() => handleSelectLocation(result)}
                      className="w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors flex items-start gap-3"
                    >
                      <MapPin size={18} className="text-gray-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-medium text-gray-900">{result.address}</p>
                        {result.roadAddress && result.roadAddress !== result.address && (
                          <p className="text-xs text-gray-500 mt-0.5">{result.roadAddress}</p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Selected Location */}
            {selectedLocation && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-brand-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <MapPin size={20} className="text-brand-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{selectedLocation.address}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      위도: {selectedLocation.lat.toFixed(6)}, 경도: {selectedLocation.lon.toFixed(6)}
                    </p>
                  </div>
                  <button
                    onClick={() => setSelectedLocation(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <ChevronDown size={20} />
                  </button>
                </div>
              </div>
            )}

            {/* Radius Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                분석 반경
              </label>
              <div className="flex gap-2">
                {[300, 500, 1000, 1500].map((r) => (
                  <button
                    key={r}
                    onClick={() => setRadius(r)}
                    className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition-colors ${
                      radius === r
                        ? 'bg-brand-600 text-white border-brand-600'
                        : 'bg-white text-gray-700 border-gray-300 hover:border-brand-400'
                    }`}
                  >
                    {r}m
                  </button>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-2">
                선택한 위치를 중심으로 {radius}m 반경의 상권을 분석합니다.
              </p>
            </div>

            {/* Industry Filter (Optional) */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">
                업종 필터 (선택)
              </label>
              <select
                value={selectedLargeCate}
                onChange={(e) => setSelectedLargeCate(e.target.value)}
                className="w-full py-2.5 px-3 rounded-lg border border-gray-300 text-sm
                  focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
              >
                <option value="">전체 업종</option>
                {INDUSTRY_LARGE_CATEGORIES.map((cat) => (
                  <option key={cat.code} value={cat.code}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Error */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
                <AlertCircle size={18} className="text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700">{error}</p>
              </div>
            )}

            {/* Analyze Button */}
            <Button
              fullWidth
              size="lg"
              onClick={handleAnalyze}
              disabled={!selectedLocation}
            >
              <TrendingUp size={18} className="mr-2" />
              상권 분석하기
            </Button>
          </div>
        )}

        {/* --- LOADING Step --- */}
        {step === 'LOADING' && (
          <div className="flex flex-col items-center justify-center py-20 animate-fade-in">
            <div className="w-20 h-20 bg-brand-50 rounded-3xl flex items-center justify-center mb-6 shadow-lg shadow-brand-100">
              <Loader2 size={40} className="text-brand-600 animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-2">상권 분석 중</h2>
            <p className="text-sm text-gray-500 text-center max-w-sm">
              {selectedLocation?.address} 주변 상권 데이터를 분석하고 있습니다...
            </p>
            <p className="text-xs text-gray-400 mt-2">
              반경 {radius}m
            </p>
          </div>
        )}

        {/* --- RESULT Step --- */}
        {step === 'RESULT' && report && (
          <div className="space-y-6 animate-fade-in">
            {/* Summary Header */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-brand-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <PieChart size={24} className="text-brand-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-lg font-bold text-gray-900 mb-1">상권 분석 결과</h2>
                  <p className="text-sm text-gray-500">{report.location.address}</p>
                  <p className="text-xs text-gray-400 mt-1">
                    반경 {report.location.radius}m | 분석일: {new Date(report.analyzedAt).toLocaleDateString('ko-KR')}
                  </p>
                </div>
              </div>

              {/* Key Metrics */}
              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="p-4 bg-brand-50 rounded-xl">
                  <p className="text-xs text-brand-600 mb-1">총 상가 업소</p>
                  <p className="text-2xl font-bold text-brand-700">
                    {report.summary.totalStores.toLocaleString()}개
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-xl">
                  <p className="text-xs text-purple-600 mb-1">점포 밀집도</p>
                  <p className="text-2xl font-bold text-purple-700">
                    {report.summary.storesDensity.toLocaleString()}<span className="text-sm font-normal">/km²</span>
                  </p>
                </div>
              </div>
              {report.location.dongName && (
                <p className="mt-3 text-xs text-gray-500">
                  행정동: {report.location.dongName}
                </p>
              )}
            </div>

            {/* Industry Breakdown */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Building2 size={18} className="text-gray-500" />
                업종별 분포
              </h3>
              <div className="space-y-3">
                {report.summary.industryBreakdown.slice(0, 6).map((item, idx) => (
                  <div key={idx}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.category}</span>
                      <span className="text-sm text-gray-500">
                        {item.count}개 ({item.percentage}%)
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-brand-500 rounded-full transition-all duration-500"
                        style={{ width: `${item.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top Categories */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-gray-500" />
                상위 업종 (중분류)
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {report.summary.topCategories.slice(0, 8).map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                  >
                    <span className="text-sm font-medium text-gray-700 truncate">{item.name}</span>
                    <span className="text-sm font-bold text-brand-600 ml-2">{item.count}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Franchise Analysis */}
            <div className="bg-white rounded-xl border border-gray-200 p-5">
              <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Award size={18} className="text-gray-500" />
                프랜차이즈 분석
              </h3>
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className="text-center p-3 bg-orange-50 rounded-lg">
                  <p className="text-xs text-orange-600 mb-1">프랜차이즈</p>
                  <p className="text-lg font-bold text-orange-700">{report.franchiseAnalysis.franchiseCount}</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-xs text-green-600 mb-1">개인사업자</p>
                  <p className="text-lg font-bold text-green-700">{report.franchiseAnalysis.independentCount}</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded-lg">
                  <p className="text-xs text-gray-600 mb-1">프랜차이즈 비율</p>
                  <p className="text-lg font-bold text-gray-700">{report.franchiseAnalysis.franchiseRatio}%</p>
                </div>
              </div>
              {report.franchiseAnalysis.topFranchises.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">주요 프랜차이즈 브랜드</p>
                  <div className="flex flex-wrap gap-2">
                    {report.franchiseAnalysis.topFranchises.slice(0, 8).map((f, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-orange-100 text-orange-700 rounded-full text-xs font-medium"
                      >
                        {f.name}
                        <span className="bg-orange-200 px-1.5 py-0.5 rounded-full text-[10px]">{f.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Industry Details */}
            {report.industryDetails.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Layers size={18} className="text-gray-500" />
                  업종별 상세 분석
                </h3>
                <div className="space-y-4">
                  {report.industryDetails.slice(0, 5).map((industry, idx) => (
                    <div key={idx} className="border-b border-gray-100 pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-semibold text-gray-800">{industry.name}</span>
                        <span className="text-sm text-gray-500">
                          {industry.count}개 ({industry.percentage}%)
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {industry.subCategories.map((sub, subIdx) => (
                          <span
                            key={subIdx}
                            className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded"
                          >
                            {sub.name} ({sub.count})
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Seoul Data (추정매출/유동인구) - 서울시 API 키 필요 */}
            {report.seoulData?.available ? (
              <div className="bg-white rounded-xl border border-gray-200 p-5">
                <h3 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <BarChart3 size={18} className="text-gray-500" />
                  서울시 추가 데이터
                </h3>

                {/* 추정매출 */}
                {report.seoulData.salesData && (
                  <div className="mb-4">
                    <p className="text-xs font-semibold text-gray-500 mb-2">추정매출</p>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">총 추정매출</p>
                        <p className="text-lg font-bold text-blue-700">
                          {(report.seoulData.salesData.totalSales / 100000000).toFixed(1)}억
                        </p>
                      </div>
                      <div className="p-3 bg-blue-50 rounded-lg">
                        <p className="text-xs text-blue-600">점포당 평균</p>
                        <p className="text-lg font-bold text-blue-700">
                          {(report.seoulData.salesData.avgSalesPerStore / 10000).toFixed(0)}만
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* 유동인구 */}
                {report.seoulData.populationData && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">유동인구</p>
                    <div className="grid grid-cols-3 gap-2">
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-green-600">총 유동인구</p>
                        <p className="text-lg font-bold text-green-700">
                          {(report.seoulData.populationData.totalFloatingPop / 10000).toFixed(1)}만
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-green-600">피크 시간대</p>
                        <p className="text-sm font-bold text-green-700">
                          {report.seoulData.populationData.peakTimeSlot}
                        </p>
                      </div>
                      <div className="p-3 bg-green-50 rounded-lg text-center">
                        <p className="text-xs text-green-600">주요 연령대</p>
                        <p className="text-sm font-bold text-green-700">
                          {report.seoulData.populationData.topAgeGroup}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 rounded-xl border border-gray-200 p-5">
                <div className="flex items-start gap-3">
                  <BarChart3 size={20} className="text-gray-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-gray-600">추가 데이터 (추정매출/유동인구)</p>
                    <p className="text-xs text-gray-400 mt-1">
                      서울시 열린데이터광장 API 키를 등록하면 추정매출, 유동인구 데이터를 볼 수 있습니다.
                    </p>
                    <a
                      href="https://data.seoul.go.kr"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-brand-600 hover:underline mt-2 inline-block"
                    >
                      서울 열린데이터광장에서 API 키 발급받기 →
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Store List (Collapsible) */}
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setShowStoreList(!showStoreList)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
              >
                <span className="text-sm font-bold text-gray-900 flex items-center gap-2">
                  <Store size={18} className="text-gray-500" />
                  상가 업소 목록 ({report.stores.length}개)
                </span>
                {showStoreList ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
              </button>

              {showStoreList && (
                <div className="border-t border-gray-100">
                  {/* Filter */}
                  <div className="p-4 bg-gray-50 border-b border-gray-100">
                    <div className="relative">
                      <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                      <input
                        type="text"
                        value={storeFilter}
                        onChange={(e) => setStoreFilter(e.target.value)}
                        placeholder="상호명, 업종으로 필터링..."
                        className="w-full pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm
                          focus:border-brand-500 focus:ring-1 focus:ring-brand-500"
                      />
                    </div>
                  </div>

                  {/* Store Items */}
                  <div className="max-h-96 overflow-y-auto divide-y divide-gray-100">
                    {filteredStores.slice(0, 50).map((store, idx) => (
                      <div key={store.bizesId || idx} className="px-5 py-3 hover:bg-gray-50">
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {store.bizesNm}
                              {store.brchNm && <span className="text-gray-500"> {store.brchNm}</span>}
                            </p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {store.indsLclsNm} &gt; {store.indsMclsNm}
                            </p>
                          </div>
                          <span className="text-xs text-gray-400 ml-2 flex-shrink-0">
                            {store.adongNm}
                          </span>
                        </div>
                        <p className="text-xs text-gray-400 mt-1 truncate">
                          {store.rdnmAdr || store.lnoAdr}
                        </p>
                      </div>
                    ))}
                    {filteredStores.length > 50 && (
                      <div className="px-5 py-3 text-center text-sm text-gray-500">
                        외 {filteredStores.length - 50}개 더...
                      </div>
                    )}
                    {filteredStores.length === 0 && (
                      <div className="px-5 py-8 text-center text-sm text-gray-500">
                        검색 결과가 없습니다.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button variant="outline" fullWidth onClick={handleReset}>
                <RefreshCw size={16} className="mr-2" />
                다시 분석
              </Button>
              <Button
                fullWidth
                onClick={() => {
                  // Export to JSON
                  const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `commerce_report_${new Date().toISOString().slice(0, 10)}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                }}
              >
                <Download size={16} className="mr-2" />
                리포트 저장
              </Button>
            </div>

            {/* API Notice */}
            <p className="text-xs text-gray-400 text-center">
              데이터 출처: 소상공인시장진흥공단 상가(상권)정보 API
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
