import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import {
  MapPin, Users, TrendingUp, Clock, Lightbulb, ChevronRight,
  Loader2, X, Banknote, Store, Coffee, Utensils
} from 'lucide-react';

interface District {
  id: string;
  dongCode: string;
  dongName: string;
  description: string;
  characteristics: string[];
  popularCategories: string[];
  avgRent: number;
  avgDeposit: number;
  avgPremium: number;
  footTraffic: string;
  competitionLevel: string;
  targetDemographics: string[];
  tips: string;
}

const TRAFFIC_LABELS: Record<string, { label: string; color: string }> = {
  'HIGH': { label: '유동인구 많음', color: 'bg-green-100 text-green-700' },
  'MEDIUM': { label: '보통', color: 'bg-yellow-100 text-yellow-700' },
  'LOW': { label: '유동인구 적음', color: 'bg-gray-100 text-gray-600' },
  'VERY_HIGH': { label: '매우 많음', color: 'bg-red-100 text-red-700' },
};

const COMPETITION_LABELS: Record<string, { label: string; color: string }> = {
  'VERY_HIGH': { label: '경쟁 치열', color: 'bg-red-100 text-red-700' },
  'HIGH': { label: '경쟁 높음', color: 'bg-orange-100 text-orange-700' },
  'MEDIUM': { label: '경쟁 보통', color: 'bg-yellow-100 text-yellow-700' },
  'LOW': { label: '경쟁 낮음', color: 'bg-green-100 text-green-700' },
};

export const GangnamDistrictsView: React.FC = () => {
  const [districts, setDistricts] = useState<District[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDistrict, setSelectedDistrict] = useState<District | null>(null);

  useEffect(() => {
    loadDistricts();
  }, []);

  const loadDistricts = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('gangnam_districts')
      .select('*')
      .order('dong_name');

    if (!error && data) {
      setDistricts(data.map((d: any) => ({
        id: d.id,
        dongCode: d.dong_code,
        dongName: d.dong_name,
        description: d.description,
        characteristics: d.characteristics || [],
        popularCategories: d.popular_categories || [],
        avgRent: d.avg_rent,
        avgDeposit: d.avg_deposit,
        avgPremium: d.avg_premium,
        footTraffic: d.foot_traffic,
        competitionLevel: d.competition_level,
        targetDemographics: d.target_demographics || [],
        tips: d.tips
      })));
    }
    setLoading(false);
  };

  const formatPrice = (price: number) => {
    if (price >= 100000000) {
      return `${(price / 100000000).toFixed(1)}억`;
    } else if (price >= 10000) {
      return `${Math.round(price / 10000)}만`;
    }
    return price.toLocaleString();
  };

  // 상세 모달
  const DistrictDetailModal = () => {
    if (!selectedDistrict) return null;
    const district = selectedDistrict;
    const traffic = TRAFFIC_LABELS[district.footTraffic] || TRAFFIC_LABELS['MEDIUM'];
    const competition = COMPETITION_LABELS[district.competitionLevel] || COMPETITION_LABELS['MEDIUM'];

    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
        <div className="bg-white w-full max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between bg-brand-600 text-white">
            <div>
              <h2 className="font-bold text-xl">{district.dongName}</h2>
              <p className="text-sm opacity-80">강남구</p>
            </div>
            <button onClick={() => setSelectedDistrict(null)} className="text-white/80 hover:text-white">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 한줄 설명 */}
            <p className="text-gray-600">{district.description}</p>

            {/* 특성 태그 */}
            <div className="flex flex-wrap gap-2">
              {district.characteristics.map((char, idx) => (
                <span key={idx} className="px-3 py-1.5 bg-brand-50 text-brand-700 rounded-lg text-sm font-medium">
                  {char}
                </span>
              ))}
            </div>

            {/* 핵심 지표 */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <Users size={16} />
                  유동인구
                </div>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${traffic.color}`}>
                  {traffic.label}
                </span>
              </div>
              <div className="bg-gray-50 p-3 rounded-xl">
                <div className="flex items-center gap-2 text-gray-500 text-sm mb-1">
                  <TrendingUp size={16} />
                  경쟁도
                </div>
                <span className={`px-2 py-0.5 rounded text-sm font-bold ${competition.color}`}>
                  {competition.label}
                </span>
              </div>
            </div>

            {/* 추천 업종 */}
            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Store size={18} />
                추천 업종
              </h3>
              <div className="flex flex-wrap gap-2">
                {district.popularCategories.map((cat, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm">
                    {cat}
                  </span>
                ))}
              </div>
            </div>

            {/* 주요 고객층 */}
            <div>
              <h3 className="font-bold mb-2 flex items-center gap-2">
                <Users size={18} />
                주요 고객층
              </h3>
              <div className="flex flex-wrap gap-2">
                {district.targetDemographics.map((demo, idx) => (
                  <span key={idx} className="px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm">
                    {demo}
                  </span>
                ))}
              </div>
            </div>

            {/* 예상 비용 */}
            <div>
              <h3 className="font-bold mb-3 flex items-center gap-2">
                <Banknote size={18} />
                예상 창업 비용 (15평 기준)
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">월 임대료</span>
                  <span className="font-bold">{formatPrice(district.avgRent)}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">보증금</span>
                  <span className="font-bold">{formatPrice(district.avgDeposit)}원</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">권리금 (평균)</span>
                  <span className="font-bold">{formatPrice(district.avgPremium)}원</span>
                </div>
                <div className="flex justify-between pt-3 border-t font-bold text-lg">
                  <span>예상 초기비용</span>
                  <span className="text-brand-600">
                    {formatPrice(district.avgDeposit + district.avgPremium)}원~
                  </span>
                </div>
              </div>
            </div>

            {/* 팁 */}
            {district.tips && (
              <div className="bg-yellow-50 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="text-yellow-600 shrink-0 mt-0.5" size={20} />
                  <div>
                    <p className="font-bold text-yellow-800 mb-1">창업 TIP</p>
                    <p className="text-sm text-yellow-700">{district.tips}</p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 border-t">
            <Button fullWidth onClick={() => setSelectedDistrict(null)}>
              닫기
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

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-brand-600 text-white">
        <div className="px-4 py-6">
          <h1 className="text-2xl font-bold mb-1">강남구 상권 정보</h1>
          <p className="text-sm opacity-80">동별 상권 특성과 창업 비용을 한눈에</p>
        </div>
      </div>

      {/* 요약 카드 */}
      <div className="px-4 -mt-3">
        <div className="bg-white rounded-xl p-4 shadow-lg grid grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">{districts.length}</p>
            <p className="text-xs text-gray-500">분석 지역</p>
          </div>
          <div className="text-center border-x">
            <p className="text-2xl font-bold text-brand-600">
              {formatPrice(Math.round(districts.reduce((a, b) => a + b.avgRent, 0) / districts.length))}
            </p>
            <p className="text-xs text-gray-500">평균 월세</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-brand-600">
              {formatPrice(Math.round(districts.reduce((a, b) => a + b.avgPremium, 0) / districts.length))}
            </p>
            <p className="text-xs text-gray-500">평균 권리금</p>
          </div>
        </div>
      </div>

      {/* 동 목록 */}
      <div className="p-4 space-y-3 mt-4">
        {districts.map(district => {
          const traffic = TRAFFIC_LABELS[district.footTraffic] || TRAFFIC_LABELS['MEDIUM'];
          const competition = COMPETITION_LABELS[district.competitionLevel] || COMPETITION_LABELS['MEDIUM'];

          return (
            <div
              key={district.id}
              onClick={() => setSelectedDistrict(district)}
              className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-200 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold text-lg">{district.dongName}</h3>
                  <p className="text-sm text-gray-500 line-clamp-1">{district.description}</p>
                </div>
                <ChevronRight className="text-gray-300 shrink-0" />
              </div>

              <div className="flex flex-wrap gap-2 mb-3">
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${traffic.color}`}>
                  {traffic.label}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${competition.color}`}>
                  {competition.label}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm pt-3 border-t">
                <div className="flex items-center gap-1 text-gray-500">
                  <MapPin size={14} />
                  <span>월세 {formatPrice(district.avgRent)}</span>
                </div>
                <div className="text-brand-600 font-medium">
                  권리금 {formatPrice(district.avgPremium)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {selectedDistrict && <DistrictDetailModal />}
    </div>
  );
};
