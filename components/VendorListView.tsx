import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import {
  Search, Star, Phone, MapPin, CheckCircle, ChevronRight,
  Loader2, Paintbrush, Trash2, Signpost, Sparkles, Wifi,
  Shield, Wine, Truck, X, MessageCircle
} from 'lucide-react';

interface Vendor {
  id: string;
  name: string;
  category: string;
  subcategory?: string;
  region: string;
  phone: string;
  description: string;
  services: string[];
  rating: number;
  reviewCount: number;
  priceRange: string;
  isVerified: boolean;
  isPartner: boolean;
}

const CATEGORY_ICONS: Record<string, any> = {
  '인테리어': Paintbrush,
  '철거': Trash2,
  '간판': Signpost,
  '청소': Sparkles,
  'POS/통신': Wifi,
  '보험': Shield,
  '주류/음료': Wine,
  '배달대행': Truck,
};

const CATEGORIES = ['전체', '인테리어', '철거', '간판', '청소', 'POS/통신', '보험', '주류/음료', '배달대행'];

export const VendorListView: React.FC = () => {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('전체');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);

  useEffect(() => {
    loadVendors();
  }, []);

  useEffect(() => {
    let filtered = vendors;

    if (selectedCategory !== '전체') {
      filtered = filtered.filter(v => v.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(v =>
        v.name.toLowerCase().includes(query) ||
        v.description.toLowerCase().includes(query) ||
        v.services.some(s => s.toLowerCase().includes(query))
      );
    }

    setFilteredVendors(filtered);
  }, [vendors, selectedCategory, searchQuery]);

  const loadVendors = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('is_partner', { ascending: false })
      .order('rating', { ascending: false });

    if (!error && data) {
      setVendors(data.map((v: any) => ({
        id: v.id,
        name: v.name,
        category: v.category,
        subcategory: v.subcategory,
        region: v.region,
        phone: v.phone,
        description: v.description,
        services: v.services || [],
        rating: v.rating,
        reviewCount: v.review_count,
        priceRange: v.price_range,
        isVerified: v.is_verified,
        isPartner: v.is_partner
      })));
    }
    setLoading(false);
  };

  // 업체 상세 모달
  const VendorDetailModal = () => {
    if (!selectedVendor) return null;
    const vendor = selectedVendor;
    const Icon = CATEGORY_ICONS[vendor.category] || Paintbrush;

    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center bg-black/50">
        <div className="bg-white w-full max-w-lg md:rounded-2xl rounded-t-2xl max-h-[90vh] overflow-hidden flex flex-col">
          <div className="p-4 border-b flex items-center justify-between">
            <h2 className="font-bold text-lg">{vendor.name}</h2>
            <button onClick={() => setSelectedVendor(null)}>
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 헤더 */}
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600">
                <Icon size={32} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  {vendor.isPartner && (
                    <span className="px-2 py-0.5 bg-brand-100 text-brand-700 text-xs font-bold rounded">
                      파트너
                    </span>
                  )}
                  {vendor.isVerified && (
                    <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded flex items-center gap-1">
                      <CheckCircle size={12} /> 인증
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 text-sm text-gray-500">
                  <Star className="text-yellow-400 fill-yellow-400" size={16} />
                  <span className="font-bold text-gray-900">{vendor.rating}</span>
                  <span>({vendor.reviewCount}개 리뷰)</span>
                </div>
              </div>
            </div>

            {/* 기본 정보 */}
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              <div className="flex items-center gap-3">
                <MapPin size={18} className="text-gray-400" />
                <span>{vendor.region}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone size={18} className="text-gray-400" />
                <a href={`tel:${vendor.phone}`} className="text-brand-600 font-medium">
                  {vendor.phone}
                </a>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-gray-400 text-sm w-[18px] text-center">₩</span>
                <span className="font-medium">{vendor.priceRange}</span>
              </div>
            </div>

            {/* 설명 */}
            <div>
              <h3 className="font-bold mb-2">소개</h3>
              <p className="text-gray-600">{vendor.description}</p>
            </div>

            {/* 서비스 */}
            <div>
              <h3 className="font-bold mb-2">제공 서비스</h3>
              <div className="flex flex-wrap gap-2">
                {vendor.services.map((service, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1.5 bg-gray-100 rounded-lg text-sm"
                  >
                    {service}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="p-4 border-t flex gap-3">
            <a
              href={`tel:${vendor.phone}`}
              className="flex-1 flex items-center justify-center gap-2 py-3 border border-brand-600 text-brand-600 rounded-xl font-bold"
            >
              <Phone size={20} />
              전화하기
            </a>
            <Button fullWidth>
              <MessageCircle size={20} className="mr-2" />
              견적 요청
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
      <div className="sticky top-0 z-30 bg-white border-b">
        <div className="px-4 py-4">
          <h1 className="text-xl font-bold mb-4">업체 찾기</h1>

          {/* 검색 */}
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="업체명, 서비스로 검색"
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>

          {/* 카테고리 */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar pb-2">
            {CATEGORIES.map(cat => {
              const Icon = CATEGORY_ICONS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                    selectedCategory === cat
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {Icon && <Icon size={16} />}
                  {cat}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 업체 목록 */}
      <div className="p-4 space-y-3">
        {filteredVendors.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            해당 조건의 업체가 없습니다
          </div>
        ) : (
          filteredVendors.map(vendor => {
            const Icon = CATEGORY_ICONS[vendor.category] || Paintbrush;
            return (
              <div
                key={vendor.id}
                onClick={() => setSelectedVendor(vendor)}
                className="bg-white p-4 rounded-xl border border-gray-200 cursor-pointer hover:border-brand-200 transition-colors"
              >
                <div className="flex gap-4">
                  <div className="w-14 h-14 bg-brand-50 rounded-xl flex items-center justify-center text-brand-600 shrink-0">
                    <Icon size={28} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-bold truncate">{vendor.name}</h3>
                      {vendor.isPartner && (
                        <span className="px-1.5 py-0.5 bg-brand-100 text-brand-700 text-xs font-bold rounded shrink-0">
                          파트너
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 line-clamp-1 mb-2">{vendor.description}</p>
                    <div className="flex items-center gap-3 text-sm">
                      <span className="flex items-center gap-1">
                        <Star className="text-yellow-400 fill-yellow-400" size={14} />
                        <span className="font-medium">{vendor.rating}</span>
                        <span className="text-gray-400">({vendor.reviewCount})</span>
                      </span>
                      <span className="text-gray-300">|</span>
                      <span className="text-gray-500">{vendor.priceRange}</span>
                    </div>
                  </div>
                  <ChevronRight className="text-gray-300 shrink-0" />
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedVendor && <VendorDetailModal />}
    </div>
  );
};
