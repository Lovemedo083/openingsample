import React, { useState } from 'react';
import { Package, CategoryNode, ConsultingBooking } from '../types';
import { CATEGORY_TREE, MOCK_USER_LISTINGS } from '../constants';
import { Card, Button } from './Components';
import {
  Search, Bell, User, Clock, Heart, ChevronRight, RotateCcw,
  MapPin, Calendar, Tag, ShieldCheck, Box, MessageCircle, FileText,
  Check, SlidersHorizontal, ChevronDown, Rocket, Sparkles, ArrowRight
} from 'lucide-react';

interface HomeViewProps {
  onPackageSelect: (pkg: Package) => void;
  onConsultingClick: (pkg?: Package) => void;
  consultingBookings?: ConsultingBooking[];
  onNavigateToConsulting?: () => void;
  hasActiveProject?: boolean;
  onStartNewProject?: () => void;
  onNavigateToProject?: () => void;
}

export const HomeView: React.FC<HomeViewProps> = ({
    onPackageSelect,
    onConsultingClick,
    consultingBookings = [],
    onNavigateToConsulting,
    hasActiveProject,
    onStartNewProject,
    onNavigateToProject
}) => {
  const [selectedMajor, setSelectedMajor] = useState<CategoryNode | null>(null);
  const [selectedMiddle, setSelectedMiddle] = useState<CategoryNode | null>(null);
  const [selectedMinor, setSelectedMinor] = useState<CategoryNode | null>(null);
  const [activeTab, setActiveTab] = useState('오늘 올라온');
  
  // Detail Modal State
  const [selectedPackageDetail, setSelectedPackageDetail] = useState<Package | null>(null);

  // Category Action Modal
  const [showCategoryAction, setShowCategoryAction] = useState(false);

  // Wishlist & Compare State (Mock)
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [compareList, setCompareList] = useState<Set<string>>(new Set());

  // Count active consultations
  const activeConsultations = consultingBookings.filter(b => b.status === 'IN_PROGRESS' || b.status === 'PENDING').length;
  const totalConsultations = consultingBookings.length;

  // Home specific tabs
  const HOME_TABS = [
      { id: 'today', label: '오늘 올라온' },
      { id: 'quick', label: '7일 빠른회수' },
      { id: 'kitchen', label: '주방위주' },
      { id: 'furniture', label: '가구·홀 위주' },
      { id: 'franchise', label: '프랜차이즈' },
      { id: 'cheap', label: '초저가 급처' },
      { id: 'large', label: '대형 평수' }
  ];

  // Quick Filters (Visual only for MVP)
  const QUICK_FILTERS = [
      { label: '예산 범위', icon: <ChevronDown size={12}/> },
      { label: '면적', icon: <ChevronDown size={12}/> },
      { label: '지역', icon: <ChevronDown size={12}/> },
      { label: '7일 설치', icon: null },
      { label: '3D 체험', icon: null },
  ];

  const resetSelection = () => {
    setSelectedMajor(null);
    setSelectedMiddle(null);
    setSelectedMinor(null);
  };

  const handleMajorSelect = (cat: CategoryNode) => {
    if (selectedMajor?.id === cat.id) {
        resetSelection();
        setShowCategoryAction(false);
    } else {
        setSelectedMajor(cat);
        setSelectedMiddle(null);
        setSelectedMinor(null);
        // 하위 카테고리 없으면 바로 액션 모달 표시
        if (!cat.children || cat.children.length === 0) {
          setShowCategoryAction(true);
        }
    }
  };

  const handleMiddleSelect = (cat: CategoryNode) => {
      if (selectedMiddle?.id === cat.id) {
          setSelectedMiddle(null);
          setSelectedMinor(null);
          setShowCategoryAction(false);
      } else {
          setSelectedMiddle(cat);
          setSelectedMinor(null);
          // 하위 카테고리 없으면 바로 액션 모달 표시
          if (!cat.children || cat.children.length === 0) {
            setShowCategoryAction(true);
          }
      }
  };

  const handleMinorSelect = (cat: CategoryNode) => {
      if (selectedMinor?.id === cat.id) {
          setSelectedMinor(null);
          setShowCategoryAction(false);
      } else {
          setSelectedMinor(cat);
          setShowCategoryAction(true);
      }
  };

  const getSelectedCategoryLabel = () => {
    if (selectedMinor) return selectedMinor.label;
    if (selectedMiddle) return selectedMiddle.label;
    if (selectedMajor) return selectedMajor.label;
    return '';
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const next = new Set(wishlist);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setWishlist(next);
  };

  const toggleCompare = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = new Set(compareList);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setCompareList(next);
  }

  // Filter Logic for User Listings
  const filteredListings = MOCK_USER_LISTINGS.filter(pkg => {
    // Category filter
    if (selectedMajor) {
      const categoryMap: Record<string, string[]> = {
        'FOOD': ['CAFE', 'PUB', 'CHICKEN', 'KOREAN'],
        'RETAIL': ['CVS', 'CLOTHES', 'RETAIL'],
        'BEAUTY': ['HAIR', 'NAIL', 'BEAUTY'],
        'EDUCATION': ['STUDY', 'ACADEMY', 'EDUCATION'],
        'HEALTH': ['FITNESS', 'PILATES'],
        'ENTERTAINMENT': ['PC', 'KARAOKE', 'ENTERTAINMENT', 'OTHER'],
        'OFFICE': ['OFFICE'],
        'AUTO': ['AUTO'],
        'LODGING': ['LODGING']
      };
      const allowedTypes = categoryMap[selectedMajor.id] || [];
      if (!allowedTypes.includes(pkg.businessType)) return false;
    }

    // Tab filter
    const activeTabId = HOME_TABS.find(t => t.label === activeTab)?.id;
    if (activeTabId && activeTabId !== 'today' && pkg.tags) {
        if (!pkg.tags.includes(activeTabId)) return false;
    }
    return true;
  });

  const handle3DAction = (pkg: Package) => {
    if (pkg.has3D) {
        alert("카카오톡으로 3D 체험 링크가 발송됩니다.");
    } else {
        // Request 3D
        alert("3D 시안 요청이 접수되었습니다. 완료 후 카카오톡으로 안내드립니다.");
    }
  }

  // Render Detail Modal (Reused logic from ListingsView)
  const renderDetailView = () => {
    if (!selectedPackageDetail) return null;
    const pkg = selectedPackageDetail;
    const breakdown = [
        { label: '집기/가구', cost: pkg.totalPrice - 500000 },
        { label: '전문 물류', cost: 200000 },
        { label: '현장 설치', cost: 300000 },
    ];

    return (
        <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
            {/* Header */}
            <div className="sticky top-0 bg-white/95 backdrop-blur border-b z-10 px-4 h-14 flex items-center gap-3">
                <button onClick={() => setSelectedPackageDetail(null)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full"><ChevronRight className="rotate-180" /></button>
                <span className="font-bold text-lg truncate flex-1">{pkg.name}</span>
                <button onClick={(e) => toggleWishlist(pkg.id, e)} className="p-2">
                    <Heart size={20} fill={wishlist.has(pkg.id) ? "currentColor" : "none"} className={wishlist.has(pkg.id) ? "text-red-500" : "text-gray-400"} />
                </button>
            </div>

            <div className="p-0 pb-24">
                {/* Image & Main Info */}
                <div className="aspect-video relative bg-gray-100">
                     <img src={pkg.image} className="w-full h-full object-cover" alt={pkg.name} />
                     <div className="absolute bottom-4 left-4 flex gap-1">
                        <span className="px-2 py-1 bg-brand-600 text-white text-[10px] font-bold rounded flex items-center gap-1 shadow-sm border border-brand-500">
                             <ShieldCheck size={10} /> 오프닝 검수
                        </span>
                        {pkg.badges.filter(b => b !== '오프닝 검수').map(b => (
                             <span key={b} className="px-2 py-1 bg-white/90 backdrop-blur text-brand-700 text-[10px] font-bold rounded shadow-sm">
                                 {b}
                             </span>
                        ))}
                     </div>
                </div>

                <div className="p-5 border-b border-gray-100">
                     <div className="flex justify-between items-start mb-2">
                         <span className="text-sm font-bold text-brand-600">{pkg.businessType} · {pkg.location}</span>
                         <span className="text-xs text-gray-400">{pkg.leadTimeDays}일 소요</span>
                     </div>
                     <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-4">{pkg.name}</h1>
                     <p className="text-sm text-gray-600 leading-relaxed mb-6">{pkg.description}</p>
                     
                     {/* Cost */}
                     <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                         <div className="flex justify-between items-center mb-3 border-b border-slate-200 pb-3">
                             <span className="text-sm font-bold text-slate-600">총 견적 (VAT 별도)</span>
                             <span className="text-2xl font-black text-slate-900">{pkg.totalPrice.toLocaleString()}원</span>
                         </div>
                         <div className="space-y-1">
                             {breakdown.map((b, i) => (
                                 <div key={i} className="flex justify-between text-xs text-gray-500">
                                     <span>{b.label}</span>
                                     <span>{b.cost.toLocaleString()}원</span>
                                 </div>
                             ))}
                         </div>
                     </div>
                </div>

                {/* Items */}
                <div className="p-5 border-b border-gray-100">
                    <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                        <Box size={18} /> 정리 품목 리스트 ({pkg.items.length > 0 ? pkg.items.length : '다수'}종)
                    </h3>
                    {pkg.items.length > 0 ? (
                        <div className="space-y-3">
                            {pkg.items.map((item, idx) => (
                                <div key={idx} className="flex gap-3 items-center bg-white border border-gray-100 p-2 rounded-lg">
                                    <div className="w-12 h-12 bg-gray-100 rounded-md overflow-hidden shrink-0">
                                        {item.image && <img src={item.image} className="w-full h-full object-cover" alt={item.name} />}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="text-sm font-bold truncate">{item.name}</div>
                                        <div className="text-xs text-gray-500 flex gap-2">
                                            <span>{item.width}x{item.depth}cm</span>
                                            <span className="text-brand-600 font-bold">{item.grade}급</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-sm text-gray-500 p-4 bg-gray-50 rounded-lg text-center">
                            상세 품목 리스트는 상담 시 제공됩니다.
                        </div>
                    )}
                </div>

                {/* 3D Action */}
                <div className="p-5">
                     <div 
                        onClick={() => handle3DAction(pkg)}
                        className="bg-slate-900 rounded-xl p-5 text-white relative overflow-hidden cursor-pointer"
                    >
                         <div className="relative z-10">
                             <div className="flex items-center gap-2 mb-2 text-yellow-400 font-bold text-sm">
                                 {pkg.has3D ? <Box size={16}/> : <RotateCcw size={16}/>}
                                 {pkg.has3D ? '3D 체험 링크 있음' : '3D 시안 요청 가능'}
                             </div>
                             <h3 className="font-bold text-lg mb-1">
                                 {pkg.has3D ? '지금 바로 배치 체험하기' : '내 공간에 맞게 배치해보기'}
                             </h3>
                             <p className="text-xs text-slate-400">
                                 {pkg.has3D ? '브라우저에서 바로 열립니다.' : '치수 입력 후 시안을 받아보세요.'}
                             </p>
                         </div>
                         <div className="absolute right-[-20px] bottom-[-20px] opacity-20 rotate-12">
                             <Box size={100} />
                         </div>
                     </div>
                     <p className="text-[10px] text-gray-400 mt-2 text-center">
                         * 3D 인테리어 체험 링크는 작업 완료 후 카카오톡으로 발송됩니다.
                     </p>
                </div>
            </div>

            {/* Bottom Actions */}
            <div className="fixed bottom-0 left-0 right-0 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-gray-100 flex gap-3 z-50">
                <Button
                    variant="outline"
                    className="flex-1 border-gray-300"
                    onClick={() => { setSelectedPackageDetail(null); onConsultingClick(pkg); }}
                >
                    <MessageCircle size={18} className="mr-2" /> 패키지 없이 상담
                </Button>
                <Button
                    className="flex-[2]"
                    onClick={() => { setSelectedPackageDetail(null); onPackageSelect(pkg); }}
                >
                    <FileText size={18} className="mr-2" /> 견적 생성하기
                </Button>
            </div>
        </div>
    );
  };

  return (
    <div className="pb-28 bg-slate-50 min-h-screen">
      {/* 1. Sticky Glass Header */}
      <header className="sticky top-0 z-40 glass border-b border-white/50 transition-all">
        <div className="max-w-7xl mx-auto">
            {/* Top Bar */}
            <div className="px-4 h-16 flex items-center justify-between gap-4">
                <div className="flex items-center gap-2 shrink-0 cursor-pointer hover:opacity-80 transition-opacity" onClick={resetSelection}>
                    <img src="/favicon-new.png" alt="오프닝" className="w-9 h-9 rounded-xl shadow-lg shadow-brand-500/30" />
                    <span className="font-black text-xl text-slate-900 tracking-tight">오프닝</span>
                </div>
                
                <div className="flex-1 min-w-0 mx-4 bg-slate-100/50 hover:bg-white h-10 rounded-full flex items-center px-4 text-slate-500 text-sm gap-2 cursor-pointer transition-all border border-transparent hover:border-brand-200 hover:shadow-sm group">
                    <Search size={16} className="shrink-0 group-hover:text-brand-500 transition-colors" />
                    <span className="truncate group-hover:text-slate-700">업종, 지역, 예산 검색</span>
                </div>

                <div className="flex gap-2 text-slate-400">
                    <button className="hover:text-brand-600 transition-colors hover:bg-brand-50 p-2 rounded-full relative">
                        <Bell size={20} />
                        <span className="absolute top-1.5 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                </div>
            </div>

            {/* Status Summary Banner (Glass) */}
            <div 
                onClick={onNavigateToConsulting}
                className="bg-brand-50/50 backdrop-blur-sm px-4 py-2.5 flex items-center justify-between text-xs border-t border-white/50 cursor-pointer hover:bg-brand-50 transition-colors"
            >
                 <div className="flex gap-4 items-center">
                     <span className={`font-bold ${activeConsultations > 0 ? 'text-brand-700 flex items-center gap-1' : 'text-gray-400'}`}>
                         {activeConsultations > 0 && <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"/>}
                         진행중 {activeConsultations}건
                     </span>
                     <span className="w-px h-3 bg-slate-200"></span>
                     <span className="font-bold text-slate-600">내 상담 {totalConsultations}건</span>
                 </div>
                 <ChevronRight size={14} className="text-slate-400" />
            </div>
        </div>
      </header>

      {/* 1.5. 창업 시작 CTA 배너 */}
      {!hasActiveProject && onStartNewProject && (
        <section className="bg-gradient-to-r from-brand-600 to-brand-700 text-white py-6 px-4 relative overflow-hidden">
          <div className="max-w-7xl mx-auto relative z-10">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles size={20} className="text-yellow-300" />
                  <span className="text-sm font-bold text-brand-100">오프닝과 함께하는</span>
                </div>
                <h2 className="text-2xl font-bold mb-1">나만의 창업 여정을 시작하세요</h2>
                <p className="text-brand-100 text-sm">예상 비용 산출부터 전담 PM 배정까지, 한 번에</p>
              </div>
              <button
                onClick={onStartNewProject}
                className="flex items-center justify-center gap-2 bg-white text-brand-700 font-bold py-3 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105 active:scale-95"
              >
                <Rocket size={20} />
                창업 시작하기
                <ArrowRight size={18} />
              </button>
            </div>
          </div>
          <div className="absolute right-[-50px] top-[-30px] opacity-10">
            <Rocket size={200} />
          </div>
        </section>
      )}

      {/* 1.6. 활성 프로젝트 배너 */}
      {hasActiveProject && onNavigateToProject && (
        <section
          onClick={onNavigateToProject}
          className="bg-gradient-to-r from-green-600 to-green-700 text-white py-4 px-4 cursor-pointer hover:from-green-700 hover:to-green-800 transition-colors"
        >
          <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
                <Rocket size={20} />
              </div>
              <div>
                <p className="font-bold">진행 중인 프로젝트가 있습니다</p>
                <p className="text-sm text-green-100">탭하여 대시보드 확인하기</p>
              </div>
            </div>
            <ChevronRight size={24} className="text-green-200" />
          </div>
        </section>
      )}

      {/* 2. Category Tree Selection (Animated) */}
      <section className="bg-white border-b border-slate-100 pt-6 pb-6 shadow-sm relative z-30">
        <div className="max-w-7xl mx-auto">
            <div className="px-4 grid grid-cols-5 gap-y-6 gap-x-2 mb-2 animate-fade-in">
                {CATEGORY_TREE.map((cat, idx) => {
                    const Icon = cat.icon;
                    const isSelected = selectedMajor?.id === cat.id;
                    return (
                        <button 
                            key={cat.id}
                            onClick={() => handleMajorSelect(cat)}
                            className={`flex flex-col items-center justify-center gap-2 group cursor-pointer focus:outline-none transition-transform duration-300 ${isSelected ? 'scale-105' : ''}`}
                            style={{ animationDelay: `${idx * 50}ms` }}
                        >
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm
                                ${isSelected 
                                    ? 'bg-brand-600 text-white shadow-brand-500/40 ring-4 ring-brand-50' 
                                    : 'bg-slate-50 text-slate-500 hover:bg-white hover:text-brand-600 hover:shadow-md hover:ring-2 hover:ring-brand-100'}`}
                            >
                                {Icon && <Icon size={26} strokeWidth={isSelected ? 2.5 : 2} />}
                            </div>
                            <span className={`text-xs font-medium tracking-tight transition-colors
                                ${isSelected ? 'text-brand-700 font-bold' : 'text-slate-500 group-hover:text-slate-900'}`}>
                                {cat.label}
                            </span>
                        </button>
                    )
                })}
            </div>

            {selectedMajor && (
                <div className="mt-2 px-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 relative shadow-inner">
                        <div className="absolute top-2 right-2">
                            <button onClick={resetSelection} className="text-gray-400 hover:text-gray-600 p-1.5 hover:bg-gray-200 rounded-full transition-colors">
                                <RotateCcw size={14} />
                            </button>
                        </div>
                        
                        <div className="mb-2 text-xs font-bold text-slate-400 flex items-center gap-1">
                            {selectedMajor.label} 상세
                        </div>

                        <div className="grid grid-cols-3 gap-2">
                            {selectedMajor.children?.map(cat => (
                                <button
                                    key={cat.id}
                                    onClick={() => handleMiddleSelect(cat)}
                                    className={`h-10 px-2 rounded-lg text-xs font-bold transition-all flex items-center justify-center text-center leading-tight border cursor-pointer
                                        ${selectedMiddle?.id === cat.id
                                            ? 'bg-white text-brand-600 border-brand-500 ring-1 ring-brand-500 shadow-sm z-10'
                                            : 'bg-white text-gray-600 border-gray-200 hover:border-brand-300 hover:text-brand-700'}`}
                                >
                                    {cat.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {selectedMiddle && selectedMiddle.children && selectedMiddle.children.length > 0 && (
                <div className="px-4 pt-3 animate-in fade-in slide-in-from-top-1 duration-200">
                    <div className="flex flex-wrap gap-2">
                         {selectedMiddle.children.map(cat => (
                             <button
                                key={cat.id}
                                onClick={() => handleMinorSelect(cat)}
                                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-medium transition-all border cursor-pointer
                                    ${selectedMinor?.id === cat.id
                                        ? 'bg-brand-600 text-white border-brand-600 shadow-md transform scale-105'
                                        : 'bg-white border-gray-200 text-gray-600 hover:border-brand-300 hover:bg-brand-50'}`}
                            >
                                {cat.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
      </section>

      {/* 3. Recommended Listings Tabs & Filters */}
      <div className="sticky top-14 z-30 bg-white border-b border-gray-100 shadow-[0_2px_4px_rgba(0,0,0,0.02)]">
         {/* Tabs */}
         <div className="max-w-7xl mx-auto px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar items-center">
            {HOME_TABS.map(tab => (
                 <button 
                    key={tab.id}
                    onClick={() => setActiveTab(tab.label)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors
                        ${activeTab === tab.label 
                            ? 'bg-slate-800 text-white border-slate-800' 
                            : 'border-gray-200 text-gray-600 bg-white hover:border-gray-400'}`}
                 >
                    {tab.label}
                 </button>
            ))}
         </div>
         {/* Quick Filter Chips (New) */}
         <div className="max-w-7xl mx-auto px-4 pb-2 flex gap-2 overflow-x-auto no-scrollbar items-center">
             <button className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 bg-gray-50 text-xs font-bold text-gray-600 hover:bg-gray-100 whitespace-nowrap">
                 <SlidersHorizontal size={12} /> 필터
             </button>
             <div className="w-px h-3 bg-gray-200 mx-1 shrink-0" />
             {QUICK_FILTERS.map((f, i) => (
                 <button key={i} className="flex items-center gap-1 px-2.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-medium text-gray-600 hover:border-brand-300 whitespace-nowrap transition-colors">
                     {f.label}
                     {f.icon}
                 </button>
             ))}
         </div>
      </div>

      {/* 4. Feed (User Listings) */}
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-6">
        <div className="flex items-end justify-between">
            <div>
                <h2 className="text-xl font-bold text-slate-900">
                    추천 매물
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                    다른 창업자들의 알짜 정리/양도 매물입니다.
                </p>
            </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredListings.length === 0 ? (
                <div className="col-span-full py-20 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                    <div className="w-16 h-16 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 shadow-sm">
                        <Search size={28} />
                    </div>
                    <h3 className="text-slate-900 font-bold text-lg mb-1">해당하는 매물이 없습니다</h3>
                    <p className="text-gray-400 text-sm">다른 탭을 선택해보세요.</p>
                </div>
            ) : (
                filteredListings.map(pkg => {
                    const isCompared = compareList.has(pkg.id);
                    return (
                        <Card key={pkg.id} onClick={() => setSelectedPackageDetail(pkg)} className="overflow-hidden border border-gray-200 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300 group flex flex-col h-full cursor-pointer">
                            {/* Image Area */}
                            <div className="aspect-[4/3] relative bg-gray-100 overflow-hidden">
                                <img 
                                    src={pkg.image}
                                    alt={pkg.name} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                                />
                                <div className="absolute top-3 left-3 flex flex-col gap-1 items-start">
                                    <span className="px-2 py-1 bg-slate-900 text-white text-[10px] font-bold rounded flex items-center gap-1">
                                        <Tag size={10} /> 정리/양도
                                    </span>
                                    {pkg.deadline && (
                                        <span className="px-2 py-1 bg-red-600 text-white text-[10px] font-bold rounded flex items-center gap-1 animate-pulse">
                                            <Clock size={10} /> 마감 {pkg.deadline}
                                        </span>
                                    )}
                                </div>
                                <button onClick={(e) => toggleWishlist(pkg.id, e)} className="absolute top-3 right-3 p-2 bg-white/90 backdrop-blur rounded-full text-gray-400 hover:text-red-500 transition-colors shadow-sm hover:scale-110 active:scale-95">
                                    <Heart size={18} fill={wishlist.has(pkg.id) ? "currentColor" : "none"} className={wishlist.has(pkg.id) ? "text-red-500" : ""} />
                                </button>
                            </div>

                            {/* Content */}
                            <div className="p-4 flex flex-col flex-1">
                                <div className="mb-3">
                                    <div className="text-xs font-bold text-slate-500 mb-0.5">{pkg.businessType}</div>
                                    <h3 className="text-base font-bold text-slate-900 leading-snug line-clamp-2">{pkg.name}</h3>
                                </div>

                                <div className="flex flex-col gap-2 text-xs text-gray-500 mb-4 pb-4 border-b border-gray-100">
                                    <div className="flex items-center gap-2">
                                        <MapPin size={12} className="text-gray-400"/>
                                        <span>{pkg.location}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <Calendar size={12} className="text-gray-400"/>
                                        <span className="font-bold text-red-500">회수 마감: {pkg.deadline}</span>
                                    </div>
                                    <p className="text-gray-400 mt-1 line-clamp-1">{pkg.description}</p>
                                </div>

                                <div className="flex gap-1.5 flex-wrap mb-4">
                                    {pkg.badges.map((b, i) => (
                                        <span key={i} className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[10px] font-medium rounded border border-gray-200">
                                            {b}
                                        </span>
                                    ))}
                                </div>

                                <div className="mt-auto">
                                    <div className="mb-3">
                                        <span className="text-[10px] text-gray-400 block mb-0.5">{pkg.hopePrice ? '희망가 (협의가능)' : ''}</span>
                                        <div className="flex items-baseline justify-between">
                                            <div className="flex items-baseline gap-1">
                                                {pkg.hopePrice ? (
                                                  <>
                                                    <span className="text-xl font-black text-slate-900">{pkg.hopePrice.toLocaleString()}</span>
                                                    <span className="text-sm font-bold text-slate-900">원</span>
                                                  </>
                                                ) : (
                                                  <span className="text-lg font-bold text-brand-600">상담문의</span>
                                                )}
                                            </div>
                                            {/* Compare Checkbox (Added) */}
                                            <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5">
                                                <label className="flex items-center gap-1 cursor-pointer select-none">
                                                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isCompared ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'}`}>
                                                        {isCompared && <Check size={12} className="text-white" />}
                                                    </div>
                                                    <input type="checkbox" checked={isCompared} onChange={(e) => toggleCompare(pkg.id, e as any)} className="hidden" />
                                                    <span className={`text-xs font-bold ${isCompared ? 'text-brand-600' : 'text-gray-400'}`}>비교</span>
                                                </label>
                                            </div>
                                        </div>
                                    </div>

                                    <Button 
                                        fullWidth
                                        variant="primary"
                                        onClick={(e) => { e.stopPropagation(); onConsultingClick(pkg); }}
                                        className="h-10 text-sm shadow-none bg-slate-800 hover:bg-slate-700"
                                    >
                                        패키지 없이 상담
                                    </Button>
                                </div>
                            </div>
                        </Card>
                    )
                })
            )}
        </div>
      </main>

      {/* Detail Modal */}
      {selectedPackageDetail && renderDetailView()}

      {/* Category Action Modal */}
      {showCategoryAction && (selectedMajor || selectedMiddle || selectedMinor) && (
        <div className="fixed inset-0 z-50 flex items-end md:items-center justify-center animate-fade-in">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCategoryAction(false)} />
          <div className="relative bg-white w-full max-w-md rounded-t-3xl md:rounded-2xl p-6 animate-slide-up">
            <div className="w-12 h-1 bg-gray-300 rounded-full mx-auto mb-4 md:hidden" />

            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-brand-100 rounded-2xl flex items-center justify-center mx-auto mb-3">
                {selectedMajor?.icon && <selectedMajor.icon size={32} className="text-brand-600" />}
              </div>
              <h3 className="text-xl font-bold text-slate-900">{getSelectedCategoryLabel()}</h3>
              <p className="text-sm text-gray-500 mt-1">
                {getSelectedCategoryLabel()} 창업을 준비하고 계시나요?
              </p>
            </div>

            <div className="space-y-3">
              <button
                onClick={() => {
                  setShowCategoryAction(false);
                  onStartNewProject?.();
                }}
                className="w-full flex items-center justify-between p-4 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Rocket size={24} />
                  <div className="text-left">
                    <p className="font-bold">창업 상담 시작하기</p>
                    <p className="text-sm text-brand-100">예상 비용부터 PM 배정까지</p>
                  </div>
                </div>
                <ChevronRight size={20} />
              </button>

              <button
                onClick={() => {
                  setShowCategoryAction(false);
                  // 매물 목록이 필터링되어 보여짐
                }}
                className="w-full flex items-center justify-between p-4 bg-slate-100 hover:bg-slate-200 text-slate-900 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Box size={24} className="text-slate-600" />
                  <div className="text-left">
                    <p className="font-bold">추천 매물 보기</p>
                    <p className="text-sm text-gray-500">{filteredListings.length}개의 매물</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-slate-400" />
              </button>

              <button
                onClick={() => {
                  setShowCategoryAction(false);
                  onConsultingClick();
                }}
                className="w-full flex items-center justify-between p-4 bg-white border border-gray-200 hover:border-brand-300 hover:bg-brand-50 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MessageCircle size={24} className="text-gray-500" />
                  <div className="text-left">
                    <p className="font-bold text-gray-700">무료 상담 신청</p>
                    <p className="text-sm text-gray-500">전문 상담사와 1:1 상담</p>
                  </div>
                </div>
                <ChevronRight size={20} className="text-gray-400" />
              </button>
            </div>

            <button
              onClick={() => setShowCategoryAction(false)}
              className="w-full mt-4 py-3 text-gray-500 font-medium hover:text-gray-700"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
