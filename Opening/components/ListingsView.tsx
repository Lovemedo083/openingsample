import React, { useState, useEffect } from 'react';
import { Package, CategoryNode, ItemGrade } from '../types';
import { CATEGORY_TREE, MOCK_OPENING_PACKAGES } from '../constants';
import { Card, Badge, Button, Input } from './Components';
import { 
  Search, SlidersHorizontal, Map as MapIcon, List, ArrowUpDown, 
  Heart, Check, ChevronDown, MapPin, Clock, ShieldCheck, Box, 
  RotateCcw, X, Info, ChevronRight, FileText, MessageCircle 
} from 'lucide-react';

interface ListingsViewProps {
  onPackageSelect: (pkg: Package) => void;
  onConsultingClick: (pkg?: Package) => void;
}

export const ListingsView: React.FC<ListingsViewProps> = ({ onPackageSelect, onConsultingClick }) => {
  // --- States ---
  const [viewMode, setViewMode] = useState<'LIST' | 'MAP'>('LIST');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeCategory, setActiveCategory] = useState<string>('ALL');
  
  // Filter States
  const [isFilterOpen, setIsFilterOpen] = useState(false); // Bottom Sheet
  const [filters, setFilters] = useState({
      budgetRange: [0, 100000000],
      areaRange: [0, 100],
      only7Days: false,
      has3D: false,
      minGrade: 'C',
      services: [] as string[], // 'INSTALL', 'DEMOLITION'
  });

  // Comparison & Wishlist
  const [compareList, setCompareList] = useState<Set<string>>(new Set());
  const [wishlist, setWishlist] = useState<Set<string>>(new Set());
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);

  // Detail View State
  const [selectedPackage, setSelectedPackage] = useState<Package | null>(null);

  // --- Logic ---

  // 1. Search Parser (Keyword -> Filter)
  const parseSearch = (query: string) => {
      // Mock parsing logic: "Gangnam", "Chicken", "20py"
      const lower = query.toLowerCase();
      return MOCK_OPENING_PACKAGES.filter(pkg => {
          if (!lower) return true;
          const textMatch = pkg.name.toLowerCase().includes(lower) || 
                            pkg.location.toLowerCase().includes(lower) ||
                            pkg.tags?.some(t => t.includes(lower));
          return textMatch;
      });
  };

  // 2. Apply Advanced Filters
  const filteredPackages = parseSearch(searchQuery).filter(pkg => {
      // Category
      if (activeCategory !== 'ALL' && pkg.businessType !== activeCategory) return false;
      
      // Budget
      if (pkg.totalPrice < filters.budgetRange[0] || pkg.totalPrice > filters.budgetRange[1]) return false;
      
      // 7 Days
      if (filters.only7Days && pkg.leadTimeDays > 7) return false;

      // 3D
      if (filters.has3D && !pkg.has3D) return false;

      // Grade (Simplified logic)
      if (filters.minGrade === 'A' && pkg.grade !== 'A') return false;
      if (filters.minGrade === 'B' && pkg.grade === 'C') return false;

      return true;
  });

  // 3. Handlers
  const toggleCompare = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = new Set(compareList);
      if (next.has(id)) next.delete(id);
      else {
          if (next.size >= 3) {
              alert("최대 3개까지 비교 가능합니다.");
              return;
          }
          next.add(id);
      }
      setCompareList(next);
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
      e.stopPropagation();
      const next = new Set(wishlist);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      setWishlist(next);
  };

  const handle3DClick = (pkg: Package, e: React.MouseEvent) => {
      e.stopPropagation();
      if (pkg.has3D) {
          alert("3D 체험 브라우저를 엽니다.");
      } else {
          // Request Flow
          const confirm = window.confirm("3D 시안이 없습니다. 요청하시겠습니까? (도면/사진 필요)");
          if (confirm) onConsultingClick(pkg);
      }
  };

  // --- Render Sub-Components ---

  const renderFilterSheet = () => {
      if (!isFilterOpen) return null;
      return (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
              <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsFilterOpen(false)} />
              <div className="bg-white w-full max-w-xl rounded-t-2xl p-6 relative z-10 animate-in slide-in-from-bottom duration-300">
                  <div className="flex justify-between items-center mb-6">
                      <h2 className="font-bold text-lg">상세 필터</h2>
                      <button onClick={() => setIsFilterOpen(false)}><X /></button>
                  </div>
                  
                  <div className="space-y-6 max-h-[60vh] overflow-y-auto pb-20">
                      {/* Budget */}
                      <div>
                          <label className="text-sm font-bold text-gray-700 mb-2 block">예산 범위 (총비용)</label>
                          <div className="flex gap-2">
                              <button className="flex-1 py-2 border rounded-lg text-sm hover:bg-brand-50 hover:border-brand-500">~1천만원</button>
                              <button className="flex-1 py-2 border rounded-lg text-sm hover:bg-brand-50 hover:border-brand-500">1~3천만원</button>
                              <button className="flex-1 py-2 border rounded-lg text-sm hover:bg-brand-50 hover:border-brand-500">3천만원+</button>
                          </div>
                      </div>
                      
                      {/* Area (Simplified) */}
                      <div>
                           <label className="text-sm font-bold text-gray-700 mb-2 block">면적</label>
                           <div className="flex gap-2 overflow-x-auto">
                               {['10평 이하', '10~20평', '20~30평', '30평 이상'].map(l => (
                                   <button key={l} className="px-3 py-2 border rounded-lg text-sm whitespace-nowrap">{l}</button>
                               ))}
                           </div>
                      </div>

                      {/* Toggles */}
                      <div className="space-y-3">
                          <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">7일 이내 빠른 설치</span>
                              <input type="checkbox" checked={filters.only7Days} onChange={e => setFilters({...filters, only7Days: e.target.checked})} className="toggle" />
                          </div>
                          <div className="flex items-center justify-between">
                              <span className="text-sm font-medium">3D 체험 가능 매물만</span>
                              <input type="checkbox" checked={filters.has3D} onChange={e => setFilters({...filters, has3D: e.target.checked})} className="toggle" />
                          </div>
                      </div>

                      {/* Services */}
                      <div>
                          <label className="text-sm font-bold text-gray-700 mb-2 block">포함 서비스</label>
                          <div className="flex flex-wrap gap-2">
                              {['철거 포함', '청소 포함', '간판 지원', '운송비 무료'].map(s => (
                                  <button key={s} className="px-3 py-1.5 bg-gray-100 rounded-full text-xs text-gray-600">{s}</button>
                              ))}
                          </div>
                      </div>
                  </div>

                  <div className="absolute bottom-0 left-0 right-0 p-4 bg-white border-t flex gap-3">
                      <Button variant="outline" className="flex-1" onClick={() => setFilters({ ...filters, only7Days: false, has3D: false })}>초기화</Button>
                      <Button className="flex-[2]" onClick={() => setIsFilterOpen(false)}>결과 보기</Button>
                  </div>
              </div>
          </div>
      );
  };

  const renderComparisonModal = () => {
      if (!isCompareModalOpen) return null;
      const targets = MOCK_OPENING_PACKAGES.filter(p => compareList.has(p.id));

      return (
          <div className="fixed inset-0 z-[60] bg-white overflow-hidden flex flex-col">
              <div className="h-14 border-b flex items-center justify-between px-4 shrink-0">
                  <h2 className="font-bold text-lg">매물 비교 ({targets.length})</h2>
                  <button onClick={() => setIsCompareModalOpen(false)}><X /></button>
              </div>
              <div className="flex-1 overflow-x-auto">
                  <div className="flex min-w-max p-4 gap-4">
                      {/* Headers Column */}
                      <div className="w-24 pt-40 space-y-4 text-sm font-bold text-gray-500 text-right sticky left-0 bg-white z-10 border-r border-gray-100 pr-4">
                          <div className="h-8">총 비용</div>
                          <div className="h-8">설치 일정</div>
                          <div className="h-8">상태 등급</div>
                          <div className="h-8">3D 제공</div>
                          <div className="h-8">보증 기간</div>
                      </div>

                      {/* Items Columns */}
                      {targets.map(pkg => (
                          <div key={pkg.id} className="w-48 space-y-4">
                              <div className="h-40 flex flex-col gap-2">
                                  <div className="aspect-video bg-gray-100 rounded-lg overflow-hidden">
                                      <img src={pkg.image} className="w-full h-full object-cover"/>
                                  </div>
                                  <div className="text-sm font-bold line-clamp-2">{pkg.name}</div>
                                  <Button size="sm" fullWidth onClick={() => { setIsCompareModalOpen(false); onPackageSelect(pkg); }}>견적 생성</Button>
                              </div>
                              <div className="h-8 flex items-center justify-center font-bold text-brand-700">{pkg.totalPrice.toLocaleString()}</div>
                              <div className="h-8 flex items-center justify-center text-sm">{pkg.leadTimeDays}일</div>
                              <div className="h-8 flex items-center justify-center text-sm"><Badge>{pkg.grade}급</Badge></div>
                              <div className="h-8 flex items-center justify-center text-sm">{pkg.has3D ? 'O' : '요청'}</div>
                              <div className="h-8 flex items-center justify-center text-sm text-gray-500">{pkg.warranty || '없음'}</div>
                          </div>
                      ))}
                  </div>
              </div>
          </div>
      );
  };

  const renderDetailView = () => {
      if (!selectedPackage) return null;
      const pkg = selectedPackage;
      
      return (
          <div className="fixed inset-0 z-[60] bg-white overflow-y-auto animate-in slide-in-from-right duration-300">
               {/* Header */}
               <div className="sticky top-0 bg-white/95 backdrop-blur border-b z-10 px-4 h-14 flex items-center gap-3">
                  <button onClick={() => setSelectedPackage(null)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full"><ChevronRight className="rotate-180" /></button>
                  <span className="font-bold text-lg truncate flex-1">{pkg.name}</span>
                  <div className="flex gap-2">
                    <button onClick={(e) => toggleWishlist(pkg.id, e)} className="p-2 text-gray-400 hover:text-red-500">
                        <Heart size={20} fill={wishlist.has(pkg.id) ? "currentColor" : "none"} className={wishlist.has(pkg.id) ? "text-red-500" : ""} />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-900"><Share size={20}/></button>
                  </div>
              </div>

              <div className="p-0 pb-24">
                  {/* Image */}
                  <div className="aspect-video relative bg-gray-100">
                      <img src={pkg.image} className="w-full h-full object-cover" />
                      <div className="absolute bottom-4 left-4 flex gap-1">
                          {pkg.badges.map(b => (
                              <Badge key={b} color="white">{b}</Badge>
                          ))}
                      </div>
                  </div>

                  {/* Main Info */}
                  <div className="p-5 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-2">
                          <span className="text-sm font-bold text-brand-600">{pkg.businessType} · {pkg.location}</span>
                          <span className="text-xs text-gray-400">등록일: 2024.01.15</span>
                      </div>
                      <h1 className="text-2xl font-bold text-slate-900 leading-snug mb-4">{pkg.name}</h1>
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                          <div className="flex justify-between items-center mb-1">
                              <span className="text-sm font-bold text-slate-600">총 견적</span>
                              <span className="text-2xl font-black text-slate-900">{pkg.totalPrice.toLocaleString()}원</span>
                          </div>
                          <div className="text-xs text-gray-400 text-right mb-3">VAT 별도</div>
                          
                          {/* Breakdown Graph (Visual) */}
                          <div className="h-2 w-full bg-gray-200 rounded-full flex overflow-hidden mb-2">
                              <div className="w-[70%] bg-slate-800" />
                              <div className="w-[10%] bg-brand-500" />
                              <div className="w-[20%] bg-gray-400" />
                          </div>
                          <div className="flex justify-between text-[10px] text-gray-500">
                              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-slate-800"/>가구/집기</span>
                              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-brand-500"/>물류/설치</span>
                              <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-gray-400"/>옵션예비</span>
                          </div>
                      </div>
                  </div>

                  {/* Specs & Timeline */}
                  <div className="p-5 border-b border-gray-100 grid grid-cols-3 gap-4 text-center">
                       <div>
                           <div className="text-xs text-gray-500 mb-1">설치 일정</div>
                           <div className="font-bold text-slate-900">{pkg.leadTimeDays}일 이내</div>
                       </div>
                       <div>
                           <div className="text-xs text-gray-500 mb-1">상태 등급</div>
                           <div className="font-bold text-brand-600">{pkg.grade}급</div>
                       </div>
                       <div>
                           <div className="text-xs text-gray-500 mb-1">보증 기간</div>
                           <div className="font-bold text-slate-900">{pkg.warranty || '없음'}</div>
                       </div>
                  </div>

                  {/* 3D Action */}
                  <div className="p-5 border-b border-gray-100">
                      <div className="flex justify-between items-center bg-slate-900 text-white p-4 rounded-xl cursor-pointer" onClick={(e) => handle3DClick(pkg, e)}>
                          <div className="flex items-center gap-3">
                              <Box className="text-yellow-400" />
                              <div>
                                  <div className="font-bold text-sm">3D 인테리어 체험</div>
                                  <div className="text-xs text-gray-400">
                                      {pkg.has3D ? '지금 바로 링크 열기' : '도면 업로드 후 요청하기'}
                                  </div>
                              </div>
                          </div>
                          <ChevronRight className="text-gray-500" />
                      </div>
                      <p className="text-[10px] text-gray-400 mt-2 text-center">
                         * 체험 링크는 작업 완료 후 카카오톡으로도 발송됩니다.
                      </p>
                  </div>
              </div>

              {/* Bottom Actions */}
              <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-gray-100 flex gap-3 z-50">
                <Button 
                    variant="outline" 
                    className="flex-1" 
                    onClick={() => { setSelectedPackage(null); onConsultingClick(pkg); }}
                >
                    <MessageCircle size={18} className="mr-2" /> 상담 신청
                </Button>
                <Button 
                    className="flex-[2]"
                    onClick={() => { setSelectedPackage(null); onPackageSelect(pkg); }}
                >
                    <FileText size={18} className="mr-2" /> 견적 생성
                </Button>
            </div>
          </div>
      );
  };

  // --- Main Render ---
  return (
    <div className="pb-20 bg-white min-h-screen">
      {/* 1. Top Search Bar */}
      <div className="sticky top-0 z-30 bg-white border-b border-gray-100">
          <div className="p-4 flex gap-3">
              <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input 
                    type="text" 
                    placeholder="업종, 지역, '20평', '7일' 검색" 
                    className="w-full bg-gray-100 h-10 pl-10 pr-4 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
              </div>
              <button 
                onClick={() => setViewMode(viewMode === 'LIST' ? 'MAP' : 'LIST')}
                className="w-10 h-10 flex items-center justify-center border border-gray-200 rounded-lg hover:bg-gray-50 text-gray-600"
              >
                  {viewMode === 'LIST' ? <MapIcon size={20} /> : <List size={20} />}
              </button>
          </div>
          
          {/* 2. Category & Filter Chips */}
          <div className="px-4 pb-3 flex gap-2 overflow-x-auto no-scrollbar">
              <button 
                onClick={() => setIsFilterOpen(true)}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full border text-xs font-bold whitespace-nowrap transition-colors
                    ${isFilterOpen ? 'bg-slate-800 text-white border-slate-800' : 'bg-white border-gray-200 text-gray-700'}`}
              >
                  <SlidersHorizontal size={12} /> 필터
              </button>
              {CATEGORY_TREE.map(cat => (
                  <button 
                    key={cat.id}
                    onClick={() => setActiveCategory(activeCategory === cat.id ? 'ALL' : cat.id)}
                    className={`px-3 py-1.5 rounded-full border text-xs font-medium whitespace-nowrap transition-colors
                        ${activeCategory === cat.id 
                            ? 'bg-brand-50 border-brand-200 text-brand-700 font-bold' 
                            : 'bg-white border-gray-200 text-gray-600'}`}
                  >
                      {cat.label}
                  </button>
              ))}
          </div>

          {/* Sort & Count */}
          <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex justify-between items-center">
              <span className="text-xs text-gray-500">
                  검색 결과 <strong className="text-slate-900">{filteredPackages.length}</strong>건
              </span>
              <button className="flex items-center gap-1 text-xs text-gray-500 font-medium">
                  <ArrowUpDown size={12} /> 추천순
              </button>
          </div>
      </div>

      {/* 3. Listings Content */}
      <div className="p-4 bg-gray-50 min-h-[calc(100vh-180px)]">
          {viewMode === 'MAP' ? (
              <div className="w-full h-[60vh] bg-gray-200 rounded-xl flex flex-col items-center justify-center text-gray-400">
                  <MapPin size={48} className="mb-2 opacity-50" />
                  <p>지도 뷰 (Mock)</p>
                  <p className="text-xs">실제 구현 시 지도 API 연동 필요</p>
                  <Button size="sm" variant="outline" className="mt-4" onClick={() => setViewMode('LIST')}>리스트로 보기</Button>
              </div>
          ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {filteredPackages.map(pkg => {
                      const isSelected = compareList.has(pkg.id);
                      return (
                        <Card key={pkg.id} onClick={() => setSelectedPackage(pkg)} className="cursor-pointer hover:shadow-lg transition-all group">
                            <div className="flex p-3 gap-3">
                                {/* Thumbnail */}
                                <div className="w-24 h-24 bg-gray-100 rounded-lg shrink-0 overflow-hidden relative">
                                    <img src={pkg.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform"/>
                                    {pkg.has3D && (
                                        <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-[9px] font-bold text-center py-0.5 flex items-center justify-center gap-1">
                                            <Box size={8} /> 3D
                                        </div>
                                    )}
                                </div>
                                
                                {/* Info */}
                                <div className="flex-1 min-w-0 flex flex-col justify-between">
                                    <div>
                                        <div className="flex justify-between items-start">
                                            <div className="text-[10px] text-brand-600 font-bold bg-brand-50 px-1.5 py-0.5 rounded w-fit mb-1">{pkg.businessType}</div>
                                            <button onClick={(e) => toggleWishlist(pkg.id, e)} className="text-gray-300 hover:text-red-500">
                                                <Heart size={16} fill={wishlist.has(pkg.id) ? "currentColor" : "none"} className={wishlist.has(pkg.id) ? "text-red-500" : ""} />
                                            </button>
                                        </div>
                                        <h3 className="text-sm font-bold text-slate-900 leading-tight line-clamp-2 mb-1">{pkg.name}</h3>
                                        <div className="flex items-center gap-2 text-xs text-gray-500">
                                            <span className="flex items-center gap-0.5"><MapPin size={10}/> {pkg.location}</span>
                                            <span className="flex items-center gap-0.5"><Clock size={10}/> {pkg.leadTimeDays}일</span>
                                        </div>
                                    </div>
                                    
                                    <div className="flex justify-between items-end mt-2">
                                        <div>
                                            <span className="text-[10px] text-gray-400 block">총 비용</span>
                                            <span className="text-base font-black text-slate-900">{pkg.totalPrice.toLocaleString()}</span>
                                        </div>
                                        {/* Compare Checkbox */}
                                        <div onClick={(e) => e.stopPropagation()} className="flex items-center gap-1.5 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer">
                                            <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${isSelected ? 'bg-slate-800 border-slate-800' : 'bg-white border-gray-300'}`}>
                                                {isSelected && <Check size={12} className="text-white" />}
                                            </div>
                                            <span className="text-xs text-gray-500 font-medium">비교</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                      )
                  })}
              </div>
          )}
      </div>

      {/* 4. Compare Bar (Floating) */}
      {compareList.size > 0 && (
          <div className="fixed bottom-20 left-4 right-4 z-40 animate-in slide-in-from-bottom duration-300">
              <div className="bg-slate-900 text-white rounded-xl p-3 shadow-xl flex items-center justify-between">
                  <div className="flex items-center gap-3">
                      <div className="bg-brand-500 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm">
                          {compareList.size}
                      </div>
                      <span className="text-sm font-medium">개의 매물을 비교합니다</span>
                  </div>
                  <div className="flex gap-2">
                      <button onClick={() => setCompareList(new Set())} className="px-3 py-1.5 text-xs text-gray-400 hover:text-white">초기화</button>
                      <button onClick={() => setIsCompareModalOpen(true)} className="px-4 py-1.5 bg-white text-slate-900 rounded-lg text-xs font-bold hover:bg-gray-100">
                          비교하기
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Modals */}
      {renderFilterSheet()}
      {renderDetailView()}
      {renderComparisonModal()}

    </div>
  );
};

// Helper for share icon (was missing in lucide import)
const Share = ({ size = 24, className = "" }) => (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      className={className}
    >
      <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path>
      <polyline points="16 6 12 2 8 6"></polyline>
      <line x1="12" y1="2" x2="12" y2="15"></line>
    </svg>
);
