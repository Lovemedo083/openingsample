import React, { useState, useEffect, useRef } from 'react';
import { FurnitureListing, FurnitureCondition } from '../types';
import { fetchFurnitureListings, createFurnitureListing, uploadFurnitureImage } from '../utils/api';
import { Button, Input } from './Components';
import {
  Search, Filter, Plus, X, Heart, Eye, MapPin, Phone,
  ChevronLeft, ChevronRight, Tag, Truck, MessageCircle,
  Camera, Loader2, Check, CreditCard, ShoppingBag
} from 'lucide-react';

// 토스 결제 SDK 타입
declare global {
  interface Window {
    TossPayments?: any;
  }
}

const CATEGORIES = ['ALL', '테이블', '의자', '소파', '주방기기', '수납/선반', '조명/인테리어', '기타'];

const CONDITION_LABELS: Record<FurnitureCondition, { label: string; color: string }> = {
  'NEW': { label: '새상품', color: 'bg-green-100 text-green-700' },
  'LIKE_NEW': { label: '거의 새것', color: 'bg-blue-100 text-blue-700' },
  'GOOD': { label: '상태 좋음', color: 'bg-yellow-100 text-yellow-700' },
  'FAIR': { label: '사용감 있음', color: 'bg-gray-100 text-gray-600' }
};

interface FurnitureMarketViewProps {
  onBack?: () => void;
}

export const FurnitureMarketView: React.FC<FurnitureMarketViewProps> = () => {
  const [listings, setListings] = useState<FurnitureListing[]>([]);
  const [filteredListings, setFilteredListings] = useState<FurnitureListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedListing, setSelectedListing] = useState<FurnitureListing | null>(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showShippingForm, setShowShippingForm] = useState(false);
  const [paymentListing, setPaymentListing] = useState<FurnitureListing | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [likedItems, setLikedItems] = useState<Set<string>>(new Set());

  // 배송 정보
  const [shippingInfo, setShippingInfo] = useState({
    name: '',
    phone: '',
    address: '',
    addressDetail: '',
    zipCode: '',
    memo: ''
  });

  // 매물 목록 로드
  useEffect(() => {
    loadListings();
  }, []);

  // 필터링
  useEffect(() => {
    let filtered = listings;

    if (selectedCategory !== 'ALL') {
      filtered = filtered.filter(l => l.category === selectedCategory);
    }

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(l =>
        l.title.toLowerCase().includes(query) ||
        l.description.toLowerCase().includes(query) ||
        l.tags.some(t => t.toLowerCase().includes(query))
      );
    }

    setFilteredListings(filtered);
  }, [listings, selectedCategory, searchQuery]);

  const loadListings = async () => {
    setLoading(true);
    const data = await fetchFurnitureListings();
    setListings(data);
    setLoading(false);
  };

  const handleLike = (id: string) => {
    setLikedItems(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) {
        newSet.delete(id);
      } else {
        newSet.add(id);
      }
      return newSet;
    });
  };

  // 구매하기 버튼 클릭 -> 배송정보 입력 폼 표시
  const handleBuyClick = (listing: FurnitureListing) => {
    setPaymentListing(listing);
    setShowShippingForm(true);
  };

  // 배송정보 입력 후 결제 진행
  const handlePayment = async () => {
    if (!paymentListing) return;

    // 배송정보 유효성 검사
    if (!shippingInfo.name.trim()) {
      alert('받는 분 이름을 입력해주세요.');
      return;
    }
    if (!shippingInfo.phone.trim()) {
      alert('연락처를 입력해주세요.');
      return;
    }
    if (!shippingInfo.address.trim()) {
      alert('배송 주소를 입력해주세요.');
      return;
    }

    // 토스 페이먼츠 SDK 로드
    if (!window.TossPayments) {
      const script = document.createElement('script');
      script.src = 'https://js.tosspayments.com/v1/payment';
      script.async = true;
      document.body.appendChild(script);
      await new Promise(resolve => script.onload = resolve);
    }

    const clientKey = 'test_ck_D5GePWvyJnrK0W0k6q8gLzN97Eoq'; // 테스트 키
    const tossPayments = window.TossPayments(clientKey);

    try {
      await tossPayments.requestPayment('카드', {
        amount: paymentListing.price,
        orderId: `ORDER_${paymentListing.id}_${Date.now()}`,
        orderName: paymentListing.title,
        customerName: shippingInfo.name,
        successUrl: `${window.location.origin}/payment/success`,
        failUrl: `${window.location.origin}/payment/fail`,
      });
    } catch (error: any) {
      if (error.code === 'USER_CANCEL') {
        alert('결제가 취소되었습니다.');
      } else {
        alert('결제 중 오류가 발생했습니다: ' + error.message);
      }
    }
  };

  // 상세 모달
  const DetailModal = () => {
    if (!selectedListing) return null;
    const listing = selectedListing;
    const conditionInfo = CONDITION_LABELS[listing.condition];

    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setSelectedListing(null)} />
        <div className="relative bg-white w-full max-w-2xl h-[95vh] md:h-auto md:max-h-[90vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
          {/* 헤더 */}
          <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
            <button onClick={() => setSelectedListing(null)} className="flex items-center gap-2 text-gray-600">
              <ChevronLeft size={24} />
              <span className="font-medium">뒤로</span>
            </button>
            <button
              onClick={() => handleLike(listing.id)}
              className={`p-2 rounded-full ${likedItems.has(listing.id) ? 'text-red-500' : 'text-gray-400'}`}
            >
              <Heart size={24} fill={likedItems.has(listing.id) ? 'currentColor' : 'none'} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            {/* 이미지 갤러리 */}
            <div className="relative bg-gray-100 aspect-square md:aspect-video">
              {listing.images.length > 0 ? (
                <>
                  <img
                    src={listing.images[currentImageIndex]}
                    alt={listing.title}
                    className="w-full h-full object-cover"
                  />
                  {listing.images.length > 1 && (
                    <>
                      <button
                        onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                        className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow"
                        disabled={currentImageIndex === 0}
                      >
                        <ChevronLeft size={20} />
                      </button>
                      <button
                        onClick={() => setCurrentImageIndex(i => Math.min(listing.images.length - 1, i + 1))}
                        className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 p-2 rounded-full shadow"
                        disabled={currentImageIndex === listing.images.length - 1}
                      >
                        <ChevronRight size={20} />
                      </button>
                      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {listing.images.map((_, idx) => (
                          <div
                            key={idx}
                            className={`w-2 h-2 rounded-full transition-colors ${idx === currentImageIndex ? 'bg-white' : 'bg-white/50'}`}
                          />
                        ))}
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  <ShoppingBag size={64} />
                </div>
              )}
            </div>

            {/* 상품 정보 */}
            <div className="p-5 space-y-5">
              {/* 제목 & 가격 */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${conditionInfo.color}`}>
                    {conditionInfo.label}
                  </span>
                  <span className="text-xs text-gray-400">{listing.category}</span>
                </div>
                <h2 className="text-xl font-bold mb-2">{listing.title}</h2>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-brand-600">{listing.price.toLocaleString()}원</span>
                  {listing.originalPrice && (
                    <span className="text-sm text-gray-400 line-through">{listing.originalPrice.toLocaleString()}원</span>
                  )}
                  {listing.isNegotiable && (
                    <span className="text-xs text-orange-500 font-medium">가격협의 가능</span>
                  )}
                </div>
              </div>

              {/* 태그 */}
              {listing.tags.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {listing.tags.map((tag, idx) => (
                    <span key={idx} className="px-2 py-1 bg-gray-100 rounded text-sm text-gray-600">
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* 상세 정보 */}
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3 text-sm">
                  <MapPin size={16} className="text-gray-400" />
                  <span>{listing.location}</span>
                </div>
                {(listing.width || listing.height || listing.depth) && (
                  <div className="flex items-center gap-3 text-sm">
                    <Tag size={16} className="text-gray-400" />
                    <span>
                      {listing.width && `가로 ${listing.width}cm`}
                      {listing.depth && ` × 세로 ${listing.depth}cm`}
                      {listing.height && ` × 높이 ${listing.height}cm`}
                    </span>
                  </div>
                )}
                {listing.isDeliveryAvailable && (
                  <div className="flex items-center gap-3 text-sm text-green-600">
                    <Truck size={16} />
                    <span>배송 가능</span>
                  </div>
                )}
                <div className="flex items-center gap-4 text-xs text-gray-400 pt-2 border-t">
                  <span className="flex items-center gap-1"><Eye size={14} /> {listing.views}</span>
                  <span className="flex items-center gap-1"><Heart size={14} /> {listing.likes}</span>
                  <span>{new Date(listing.createdAt).toLocaleDateString()}</span>
                </div>
              </div>

              {/* 설명 */}
              <div>
                <h3 className="font-bold mb-2">상품 설명</h3>
                <p className="text-gray-600 whitespace-pre-wrap">{listing.description}</p>
              </div>

              {/* 판매자 정보 */}
              <div className="bg-brand-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold">{listing.sellerName}</p>
                    <p className="text-sm text-gray-500">{listing.sellerPhone}</p>
                  </div>
                  <a
                    href={`tel:${listing.sellerPhone}`}
                    className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg text-brand-600 font-medium shadow-sm"
                  >
                    <Phone size={18} />
                    전화하기
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* 하단 버튼 */}
          <div className="p-4 border-t bg-white shrink-0 flex gap-3">
            <button
              onClick={() => handleLike(listing.id)}
              className={`p-3 rounded-xl border ${likedItems.has(listing.id) ? 'border-red-200 bg-red-50 text-red-500' : 'border-gray-200'}`}
            >
              <Heart size={24} fill={likedItems.has(listing.id) ? 'currentColor' : 'none'} />
            </button>
            <Button fullWidth size="lg" onClick={() => handleBuyClick(listing)}>
              <CreditCard size={20} className="mr-2" />
              바로 구매하기
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 매물 등록 모달
  const RegisterModal = () => {
    const [formData, setFormData] = useState({
      title: '',
      description: '',
      category: '테이블',
      condition: 'GOOD' as FurnitureCondition,
      price: '',
      originalPrice: '',
      width: '',
      height: '',
      depth: '',
      location: '',
      sellerName: '',
      sellerPhone: '',
      isNegotiable: true,
      isDeliveryAvailable: false,
      tags: ''
    });
    const [images, setImages] = useState<string[]>([]);
    const [uploading, setUploading] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = e.target.files;
      if (!files) return;

      setUploading(true);
      try {
        const uploadPromises = Array.from(files).map(file => uploadFurnitureImage(file));
        const urls = await Promise.all(uploadPromises);
        setImages(prev => [...prev, ...urls]);
      } catch (error) {
        alert('이미지 업로드에 실패했습니다.');
      }
      setUploading(false);
    };

    const handleSubmit = async () => {
      if (!formData.title || !formData.price || !formData.sellerName || !formData.sellerPhone) {
        alert('필수 항목을 입력해주세요.');
        return;
      }

      setSubmitting(true);
      try {
        await createFurnitureListing({
          ...formData,
          price: Number(formData.price),
          originalPrice: formData.originalPrice ? Number(formData.originalPrice) : undefined,
          width: formData.width ? Number(formData.width) : undefined,
          height: formData.height ? Number(formData.height) : undefined,
          depth: formData.depth ? Number(formData.depth) : undefined,
          images,
          tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean)
        });
        alert('매물이 등록되었습니다!');
        setShowRegisterModal(false);
        loadListings();
      } catch (error) {
        alert('매물 등록에 실패했습니다.');
      }
      setSubmitting(false);
    };

    return (
      <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowRegisterModal(false)} />
        <div className="relative bg-white w-full max-w-xl h-[95vh] md:h-auto md:max-h-[90vh] md:rounded-2xl rounded-t-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
            <h2 className="font-bold text-lg">매물 등록하기</h2>
            <button onClick={() => setShowRegisterModal(false)} className="p-2 hover:bg-gray-100 rounded-full">
              <X size={24} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-5 space-y-5">
            {/* 이미지 업로드 */}
            <div>
              <label className="block text-sm font-medium mb-2">상품 사진</label>
              <div className="flex gap-3 flex-wrap">
                {images.map((url, idx) => (
                  <div key={idx} className="relative w-20 h-20 rounded-lg overflow-hidden">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button
                      onClick={() => setImages(prev => prev.filter((_, i) => i !== idx))}
                      className="absolute top-1 right-1 bg-black/50 text-white rounded-full p-0.5"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="w-20 h-20 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center text-gray-400 hover:border-brand-500 hover:text-brand-500 transition-colors"
                >
                  {uploading ? <Loader2 className="animate-spin" /> : <Camera size={24} />}
                  <span className="text-xs mt-1">{uploading ? '업로드중' : '사진추가'}</span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleImageUpload}
                />
              </div>
            </div>

            {/* 기본 정보 */}
            <Input
              label="제목 *"
              placeholder="상품명을 입력하세요"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">카테고리 *</label>
                <select
                  className="w-full px-4 py-3 border rounded-xl"
                  value={formData.category}
                  onChange={e => setFormData({...formData, category: e.target.value})}
                >
                  {CATEGORIES.filter(c => c !== 'ALL').map(cat => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">상태 *</label>
                <select
                  className="w-full px-4 py-3 border rounded-xl"
                  value={formData.condition}
                  onChange={e => setFormData({...formData, condition: e.target.value as FurnitureCondition})}
                >
                  {Object.entries(CONDITION_LABELS).map(([key, val]) => (
                    <option key={key} value={key}>{val.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="판매가격 (원) *"
                type="number"
                placeholder="0"
                value={formData.price}
                onChange={e => setFormData({...formData, price: e.target.value})}
              />
              <Input
                label="원가 (원)"
                type="number"
                placeholder="선택사항"
                value={formData.originalPrice}
                onChange={e => setFormData({...formData, originalPrice: e.target.value})}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">상세 설명</label>
              <textarea
                className="w-full px-4 py-3 border rounded-xl resize-none"
                rows={4}
                placeholder="상품 상태, 구매시기, 브랜드 등을 자세히 적어주세요"
                value={formData.description}
                onChange={e => setFormData({...formData, description: e.target.value})}
              />
            </div>

            {/* 크기 */}
            <div>
              <label className="block text-sm font-medium mb-2">크기 (cm)</label>
              <div className="grid grid-cols-3 gap-3">
                <Input placeholder="가로" type="number" value={formData.width} onChange={e => setFormData({...formData, width: e.target.value})} />
                <Input placeholder="세로" type="number" value={formData.depth} onChange={e => setFormData({...formData, depth: e.target.value})} />
                <Input placeholder="높이" type="number" value={formData.height} onChange={e => setFormData({...formData, height: e.target.value})} />
              </div>
            </div>

            <Input
              label="거래 지역 *"
              placeholder="예: 서울 강남구"
              value={formData.location}
              onChange={e => setFormData({...formData, location: e.target.value})}
            />

            <Input
              label="태그"
              placeholder="쉼표로 구분 (예: 카페, 원목, 빈티지)"
              value={formData.tags}
              onChange={e => setFormData({...formData, tags: e.target.value})}
            />

            {/* 옵션 */}
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isNegotiable}
                  onChange={e => setFormData({...formData, isNegotiable: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">가격 협의 가능</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isDeliveryAvailable}
                  onChange={e => setFormData({...formData, isDeliveryAvailable: e.target.checked})}
                  className="w-5 h-5 rounded"
                />
                <span className="text-sm">배송 가능</span>
              </label>
            </div>

            {/* 판매자 정보 */}
            <div className="pt-4 border-t">
              <h3 className="font-bold mb-3">판매자 정보</h3>
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="이름/상호명 *"
                  placeholder="홍길동"
                  value={formData.sellerName}
                  onChange={e => setFormData({...formData, sellerName: e.target.value})}
                />
                <Input
                  label="연락처 *"
                  placeholder="010-0000-0000"
                  value={formData.sellerPhone}
                  onChange={e => setFormData({...formData, sellerPhone: e.target.value})}
                />
              </div>
            </div>
          </div>

          <div className="p-4 border-t shrink-0">
            <Button fullWidth size="lg" onClick={handleSubmit} disabled={submitting}>
              {submitting ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
              {submitting ? '등록 중...' : '매물 등록하기'}
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 헤더 */}
      <div className="sticky top-0 z-30 bg-white border-b">
        <div className="px-4 py-4">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-xl font-bold">가구 마켓</h1>
            <Button size="sm" onClick={() => setShowRegisterModal(true)}>
              <Plus size={18} className="mr-1" /> 매물 등록
            </Button>
          </div>

          {/* 검색 */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
            <input
              type="text"
              placeholder="검색어를 입력하세요"
              className="w-full pl-10 pr-4 py-3 bg-gray-100 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* 카테고리 */}
        <div className="px-4 pb-3 overflow-x-auto no-scrollbar">
          <div className="flex gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-brand-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {cat === 'ALL' ? '전체' : cat}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* 매물 목록 */}
      <div className="p-4">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin text-brand-600" size={40} />
          </div>
        ) : filteredListings.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ShoppingBag size={48} className="mx-auto mb-4 opacity-50" />
            <p>등록된 매물이 없습니다.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {filteredListings.map(listing => {
              const conditionInfo = CONDITION_LABELS[listing.condition];
              return (
                <div
                  key={listing.id}
                  onClick={() => {
                    setSelectedListing(listing);
                    setCurrentImageIndex(0);
                  }}
                  className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                >
                  {/* 이미지 */}
                  <div className="relative aspect-square bg-gray-100">
                    {listing.images[0] ? (
                      <img src={listing.images[0]} alt={listing.title} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-300">
                        <ShoppingBag size={40} />
                      </div>
                    )}
                    <button
                      onClick={e => { e.stopPropagation(); handleLike(listing.id); }}
                      className={`absolute top-2 right-2 p-2 rounded-full bg-white/80 backdrop-blur-sm ${
                        likedItems.has(listing.id) ? 'text-red-500' : 'text-gray-400'
                      }`}
                    >
                      <Heart size={18} fill={likedItems.has(listing.id) ? 'currentColor' : 'none'} />
                    </button>
                    {listing.isDeliveryAvailable && (
                      <span className="absolute bottom-2 left-2 px-2 py-0.5 bg-green-500 text-white text-xs rounded-full flex items-center gap-1">
                        <Truck size={12} /> 배송
                      </span>
                    )}
                  </div>

                  {/* 정보 */}
                  <div className="p-3">
                    <span className={`inline-block px-1.5 py-0.5 rounded text-xs ${conditionInfo.color} mb-1`}>
                      {conditionInfo.label}
                    </span>
                    <h3 className="font-medium text-sm line-clamp-2 mb-1">{listing.title}</h3>
                    <p className="font-bold text-brand-600">{listing.price.toLocaleString()}원</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
                      <span className="flex items-center gap-0.5"><MapPin size={12} /> {listing.location.split(' ')[0]}</span>
                      <span className="flex items-center gap-0.5"><Eye size={12} /> {listing.views}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* 모달들 */}
      {selectedListing && <DetailModal />}
      {showRegisterModal && <RegisterModal />}

      {/* 배송정보 입력 모달 */}
      {showShippingForm && paymentListing && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowShippingForm(false)} />
          <div className="relative bg-white w-full max-w-md mx-4 rounded-2xl shadow-2xl overflow-hidden">
            <div className="h-14 border-b flex items-center justify-between px-4">
              <h3 className="font-bold text-lg">배송 정보 입력</h3>
              <button onClick={() => setShowShippingForm(false)} className="p-2 hover:bg-gray-100 rounded-full">
                <X size={20} />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              {/* 상품 요약 */}
              <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
                {paymentListing.images[0] && (
                  <img src={paymentListing.images[0]} alt="" className="w-16 h-16 rounded-lg object-cover" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{paymentListing.title}</p>
                  <p className="font-bold text-brand-600">{paymentListing.price.toLocaleString()}원</p>
                </div>
              </div>

              {/* 배송정보 폼 */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">받는 분 *</label>
                  <input
                    type="text"
                    placeholder="이름"
                    value={shippingInfo.name}
                    onChange={e => setShippingInfo({...shippingInfo, name: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">연락처 *</label>
                  <input
                    type="tel"
                    placeholder="010-0000-0000"
                    value={shippingInfo.phone}
                    onChange={e => setShippingInfo({...shippingInfo, phone: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배송 주소 *</label>
                  <input
                    type="text"
                    placeholder="주소 검색"
                    value={shippingInfo.address}
                    onChange={e => setShippingInfo({...shippingInfo, address: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 mb-2"
                  />
                  <input
                    type="text"
                    placeholder="상세 주소 (동/호수)"
                    value={shippingInfo.addressDetail}
                    onChange={e => setShippingInfo({...shippingInfo, addressDetail: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">배송 메모</label>
                  <input
                    type="text"
                    placeholder="부재 시 문 앞에 놓아주세요"
                    value={shippingInfo.memo}
                    onChange={e => setShippingInfo({...shippingInfo, memo: e.target.value})}
                    className="w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
                  />
                </div>
              </div>
            </div>

            <div className="p-4 border-t bg-gray-50">
              <Button fullWidth size="lg" onClick={handlePayment}>
                <CreditCard size={20} className="mr-2" />
                {paymentListing.price.toLocaleString()}원 결제하기
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
