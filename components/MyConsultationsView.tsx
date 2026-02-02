import React, { useState, useRef } from 'react';
import { ConsultingBooking, OpenTaskItem, BusinessType } from '../types';
import { OPEN_PROCESS_TASKS, OPEN_TASK_CATEGORIES } from '../constants';
import { uploadConsultingFile } from '../utils/api'; // API import
import { Card, Badge, Button, Input } from './Components';
import { 
  ChevronRight, Calendar, Clock, MapPin, CheckCircle, AlertCircle, 
  FileText, MessageSquare, UploadCloud, ChevronDown, MoreHorizontal,
  Layout, ListTodo, FolderOpen, ArrowRight, X, Phone, Settings, RefreshCw, Box, Loader2
} from 'lucide-react';

interface MyConsultationsViewProps {
  bookings: ConsultingBooking[];
  onBookConsulting: () => void;
}

// Extended Status for UI
type ProjectStatus = 'WAITING' | 'REQUESTING_DOCS' | 'DESIGNING' | 'REVIEWING' | 'CONFIRMED' | 'IN_PROGRESS' | 'COMPLETED';

const getStatusLabel = (status: ProjectStatus | string) => {
    switch (status) {
        case 'PENDING': return '접수 대기';
        case 'WAITING': return '대기 (접수완료)';
        case 'REQUESTING_DOCS': return '자료 요청중';
        case 'DESIGNING': return '설계/산출중';
        case 'REVIEWING': return '견적 검토중';
        case 'CONFIRMED': return '확정/결제대기';
        case 'IN_PROGRESS': return '진행중 (현장)';
        case 'COMPLETED': return '완료 (인수)';
        default: return '진행중';
    }
};

const getStatusColor = (status: ProjectStatus | string) => {
    switch (status) {
        case 'PENDING': return 'gray';
        case 'WAITING': return 'gray';
        case 'REQUESTING_DOCS': return 'red';
        case 'DESIGNING': return 'blue';
        case 'REVIEWING': return 'yellow';
        case 'CONFIRMED': return 'green';
        case 'IN_PROGRESS': return 'brand';
        case 'COMPLETED': return 'slate';
        default: return 'gray';
    }
};

export const MyConsultationsView: React.FC<MyConsultationsViewProps> = ({ bookings, onBookConsulting }) => {
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null);
  const [detailTab, setDetailTab] = useState<'DASHBOARD' | 'CHECKLIST' | 'TIMELINE' | 'FILES'>('DASHBOARD');
  
  // File Upload State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // --- Data Enrichment ---
  const activeBooking = bookings.find(b => b.id === selectedBookingId);

  // Mock Project Data + Real Data Merge
  const projectData = activeBooking ? {
      ...activeBooking,
      status: activeBooking.status === 'PENDING' ? 'REQUESTING_DOCS' : activeBooking.status, 
      progress: 35, 
      nextAction: '현장 실측 도면 업로드 필요',
      lastUpdate: new Date().toLocaleDateString(),
      tasks: OPEN_PROCESS_TASKS.map(t => ({
          ...t,
          status: 'PENDING', 
          isSelected: activeBooking.selectedTaskIds?.includes(t.id) || false
      })),
      // [수정] DB에서 불러온 files가 있으면 그것을 쓰고, 없으면 빈 배열 (any 타입 캐스팅으로 임시 해결)
      files: (activeBooking as any).files || [] 
  } : null;

  // --- Handlers ---
  const handleTaskToggle = (taskId: string) => {
      console.log('Toggle task (Read Only in MVP):', taskId);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file || !selectedBookingId) return;

      if (file.size > 10 * 1024 * 1024) {
          alert("파일 크기는 10MB 이하여야 합니다.");
          return;
      }

      setIsUploading(true);
      try {
          await uploadConsultingFile(selectedBookingId, file);
          alert("파일이 성공적으로 업로드되었습니다. (새로고침 시 반영)");
          // 실제로는 여기서 부모 컴포넌트의 데이터를 리로드(Refetch)해주는 것이 좋습니다.
          // 현재 구조상으로는 알림만 띄웁니다.
      } catch (error: any) {
          console.error(error);
          alert("업로드 실패: " + error.message);
      } finally {
          setIsUploading(false);
          // Input 초기화
          if (fileInputRef.current) fileInputRef.current.value = '';
      }
  };

  const triggerFileInput = () => {
      fileInputRef.current?.click();
  }

  // --- Render Sub-Components ---

  const renderDetailHeader = () => (
      <div className="bg-white border-b border-gray-100 p-4 sticky top-0 z-10">
          <div className="flex justify-between items-start mb-4">
              <button onClick={() => setSelectedBookingId(null)} className="p-1 -ml-1 hover:bg-gray-100 rounded-full">
                  <ChevronRight className="rotate-180" />
              </button>
              <div className="flex gap-2">
                  <button className="p-2 text-gray-500 hover:text-brand-600" onClick={triggerFileInput} disabled={isUploading}>
                      {isUploading ? <Loader2 size={20} className="animate-spin"/> : <UploadCloud size={20}/>}
                  </button>
                  <button className="p-2 text-gray-500 hover:text-brand-600"><MessageSquare size={20}/></button>
              </div>
          </div>
          
          <div className="mb-4">
              <div className="flex items-center gap-2 mb-1">
                 <Badge color={getStatusColor(projectData!.status)}>{getStatusLabel(projectData!.status)}</Badge>
                 <span className="text-xs text-gray-400">담당: {projectData?.consultantName} 매니저</span>
              </div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight mb-1">
                  {projectData?.businessType} ({projectData?.area || '미정'}평)
              </h1>
              <div className="text-xs text-gray-500">
                  {activeBooking?.targetDate ? `${activeBooking.targetDate} 오픈 목표` : '오픈일 미정'} · {activeBooking?.region || '지역 미정'}
              </div>
          </div>

          <div className="grid grid-cols-3 gap-2 mb-2">
              <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => setDetailTab('FILES')}>
                  <UploadCloud size={14} className="mr-1.5"/> 자료 확인
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-9" onClick={() => setDetailTab('CHECKLIST')}>
                  <ListTodo size={14} className="mr-1.5"/> 체크 확인
              </Button>
              <Button size="sm" variant="outline" className="text-xs h-9">
                  <MessageSquare size={14} className="mr-1.5"/> 담당 채팅
              </Button>
          </div>

          <div className="flex border-b border-gray-100 -mb-4 mt-4">
              {[
                  { id: 'DASHBOARD', label: '대시보드' },
                  { id: 'CHECKLIST', label: '체크리스트' },
                  { id: 'TIMELINE', label: '진행/일정' },
                  { id: 'FILES', label: '자료/파일' },
              ].map(tab => (
                  <button 
                    key={tab.id}
                    onClick={() => setDetailTab(tab.id as any)}
                    className={`flex-1 pb-3 text-xs font-bold text-center border-b-2 transition-colors
                        ${detailTab === tab.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-gray-400'}`}
                  >
                      {tab.label}
                  </button>
              ))}
          </div>
      </div>
  );

  const renderDashboardTab = () => (
      <div className="p-4 space-y-6 bg-gray-50 min-h-screen pb-20">
          <div className="bg-brand-50 border border-brand-100 rounded-xl p-4 flex items-start gap-3">
              <AlertCircle className="text-brand-600 shrink-0 mt-0.5" size={20} />
              <div>
                  <h3 className="font-bold text-brand-900 text-sm mb-1">{projectData?.nextAction}</h3>
                  <p className="text-xs text-brand-700 leading-relaxed">
                      견적 산출 및 3D 시안 작업을 위해 현장 정보가 필요합니다. '자료/파일' 탭에서 업로드해주세요.
                  </p>
                  <button 
                    onClick={() => setDetailTab('FILES')}
                    className="mt-2 text-xs font-bold text-brand-700 underline underline-offset-2"
                  >
                      바로가기 &gt;
                  </button>
              </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
               <div className="bg-white p-4 rounded-xl border border-gray-200">
                   <div className="text-xs text-gray-500 mb-1">총 예산 (예상)</div>
                   <div className="font-black text-lg text-slate-900">
                       {projectData?.budget ? `${(Number(projectData.budget)/10000).toLocaleString()}만원` : '산출중'}
                   </div>
               </div>
               <div className="bg-white p-4 rounded-xl border border-gray-200">
                   <div className="text-xs text-gray-500 mb-1">진행률</div>
                   <div className="font-black text-lg text-brand-600">{projectData?.progress}%</div>
               </div>
          </div>

          <div>
              <h3 className="font-bold text-slate-900 mb-3 text-sm">선택한 서비스 현황</h3>
              <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
                  {projectData?.tasks.filter(t => t.isSelected).slice(0, 5).map(task => (
                      <div key={task.id} className="p-3 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">{task.title}</span>
                          <Badge color="gray">대기</Badge>
                      </div>
                  ))}
                  <button onClick={() => setDetailTab('CHECKLIST')} className="w-full p-3 text-xs text-center text-gray-500 font-bold hover:bg-gray-50">
                      + 전체 보기 및 수정
                  </button>
              </div>
          </div>
      </div>
  );

  const renderChecklistTab = () => (
      <div className="p-4 bg-gray-50 min-h-screen pb-20">
          <div className="text-sm text-gray-500 mb-4 px-1">
              선택하신 항목을 기반으로 <strong>견적서 v1</strong>이 작성됩니다.
          </div>
          
          <div className="space-y-6">
              {OPEN_TASK_CATEGORIES.map(category => {
                  const tasks = projectData?.tasks.filter(t => t.category === category.id) || [];
                  if (tasks.length === 0) return null;

                  return (
                      <div key={category.id}>
                          <h3 className="text-xs font-bold text-gray-400 mb-2 px-1">{category.label}</h3>
                          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                              {tasks.map((task, idx) => (
                                  <div 
                                    key={task.id} 
                                    className={`p-4 flex items-start gap-3 ${idx !== 0 ? 'border-t border-gray-100' : ''} ${task.isSelected ? 'bg-brand-50/30' : ''}`}
                                  >
                                      <div className={`mt-0.5 w-5 h-5 rounded border flex items-center justify-center
                                          ${task.isSelected ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'}`}>
                                          {task.isSelected && <CheckCircle size={14} className="text-white" />}
                                      </div>
                                      <div className="flex-1">
                                          <div className="flex justify-between items-start">
                                              <span className={`text-sm font-bold ${task.isSelected ? 'text-slate-900' : 'text-gray-400'}`}>
                                                  {task.title}
                                              </span>
                                              {task.isOpeningExclusive && (
                                                  <span className="text-[10px] text-brand-600 bg-brand-50 px-1.5 py-0.5 rounded font-bold">오프닝</span>
                                              )}
                                          </div>
                                          <p className="text-xs text-gray-400 mt-0.5">{task.description}</p>
                                          
                                          {task.isSelected && (
                                              <div className="mt-3 pt-3 border-t border-gray-100 animate-in fade-in slide-in-from-top-1">
                                                  <div className="flex gap-2 mb-2">
                                                      <span className="text-xs font-bold text-gray-600">범위:</span>
                                                      <span className="text-xs text-slate-900 bg-gray-100 px-2 rounded">전체</span>
                                                      <Settings size={12} className="text-gray-400"/>
                                                  </div>
                                                  <div className="text-[10px] text-brand-600 flex items-center gap-1">
                                                      <RefreshCw size={10} /> 견적 v2에 반영됨
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )
              })}
          </div>
      </div>
  );

  const renderFilesTab = () => (
      <div className="p-4 bg-gray-50 min-h-screen pb-20">
          <div className="bg-white rounded-xl border border-gray-200 p-5 text-center mb-6">
               <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3 text-gray-400">
                   <UploadCloud size={24} />
               </div>
               <h3 className="font-bold text-slate-900 mb-1">자료 업로드</h3>
               <p className="text-xs text-gray-500 mb-4">도면, 현장 사진, 사업자등록증 등을 올려주세요.</p>
               
               {/* Hidden Input */}
               <input 
                  type="file" 
                  ref={fileInputRef} 
                  onChange={handleFileUpload} 
                  className="hidden" 
                  accept="image/*,.pdf"
               />
               
               <Button fullWidth variant="outline" onClick={triggerFileInput} disabled={isUploading}>
                   {isUploading ? '업로드 중...' : '파일 선택하기'}
               </Button>
          </div>

          <h3 className="font-bold text-slate-900 text-sm mb-3 px-1">제출 목록</h3>
          <div className="space-y-3">
              {projectData?.files && projectData.files.length > 0 ? (
                  projectData.files.map((file: any, idx: number) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-gray-200 flex justify-between items-center">
                          <div className="flex items-center gap-3 overflow-hidden">
                              <div className={`w-2 h-2 rounded-full shrink-0 ${file.status === 'UPLOADED' ? 'bg-green-500' : 'bg-red-500'}`} />
                              <a href={file.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-gray-700 truncate hover:underline hover:text-brand-600">
                                  {file.name}
                              </a>
                          </div>
                          <Badge color={file.status === 'UPLOADED' ? 'green' : 'red'}>
                              {file.status === 'UPLOADED' ? '완료' : '미제출'}
                          </Badge>
                      </div>
                  ))
              ) : (
                  <div className="text-center text-xs text-gray-400 py-4">아직 제출된 자료가 없습니다.</div>
              )}
          </div>
      </div>
  );

  const renderTimelineTab = () => (
      <div className="p-4 bg-gray-50 min-h-screen pb-20">
          <div className="space-y-6 relative pl-4 border-l border-gray-200 ml-4 my-4">
               {['계약/착수', '철거/기초', '인테리어/설비', '설치/배치', '준공청소', '오픈'].map((stage, idx) => (
                   <div key={idx} className="relative pl-6">
                       <div className={`absolute left-[-21px] top-0 w-4 h-4 rounded-full border-2 
                           ${idx < 1 ? 'bg-brand-600 border-brand-600' : 'bg-white border-gray-300'}`} 
                       />
                       <h3 className={`font-bold text-sm mb-1 ${idx < 1 ? 'text-slate-900' : 'text-gray-400'}`}>{stage}</h3>
                       <p className="text-xs text-gray-400">일정 산출 중</p>
                   </div>
               ))}
          </div>
      </div>
  );

  // --- Main Render ---

  if (selectedBookingId && projectData) {
      return (
          <div className="fixed inset-0 z-[100] bg-white overflow-y-auto animate-in slide-in-from-right">
              {renderDetailHeader()}
              {detailTab === 'DASHBOARD' && renderDashboardTab()}
              {detailTab === 'CHECKLIST' && renderChecklistTab()}
              {detailTab === 'TIMELINE' && renderTimelineTab()}
              {detailTab === 'FILES' && renderFilesTab()}
          </div>
      );
  }

  // List View (Main)
  const activeCount = bookings.filter(b => b.status === 'IN_PROGRESS' || b.status === 'CONFIRMED').length;
  const waitingCount = bookings.filter(b => b.status === 'PENDING').length;

  return (
    <div className="min-h-screen bg-gray-50 pb-24">
      {/* Header Summary */}
      <div className="bg-white p-6 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-slate-900 mb-4">내 상담</h1>
          
          <div className="flex gap-4 mb-6">
              <div className="flex-1 bg-brand-50 rounded-xl p-4 border border-brand-100">
                  <div className="text-2xl font-black text-brand-600 mb-1">{waitingCount + activeCount}</div>
                  <div className="text-xs text-brand-800 font-bold">전체 프로젝트</div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-4 border border-gray-200">
                  <div className="text-2xl font-black text-slate-900 mb-1">{waitingCount}</div>
                  <div className="text-xs text-gray-500">진행/설계중</div>
              </div>
              <div className="flex-1 bg-white rounded-xl p-4 border border-gray-200 opacity-50">
                  <div className="text-2xl font-black text-slate-900 mb-1">0</div>
                  <div className="text-xs text-gray-500">완료</div>
              </div>
          </div>

          {bookings.length > 0 && (
              <div className="bg-slate-900 rounded-xl p-4 text-white flex justify-between items-center shadow-lg shadow-slate-200">
                  <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                          <AlertCircle size={18} />
                      </div>
                      <div>
                          <div className="font-bold text-sm">자료 업로드 필요</div>
                          <div className="text-xs text-slate-300">정확한 견적을 위해 도면을 올려주세요.</div>
                      </div>
                  </div>
                  <ChevronRight className="text-slate-500" />
              </div>
          )}
      </div>

      {/* List */}
      <div className="p-4 space-y-4">
          <h2 className="font-bold text-slate-900 text-lg">프로젝트 목록</h2>
          {bookings.length === 0 ? (
              <div className="text-center py-20">
                  <FolderOpen size={48} className="mx-auto text-gray-200 mb-4" />
                  <p className="text-gray-400 mb-4">진행 중인 프로젝트가 없습니다.</p>
                  <Button onClick={onBookConsulting}>새로운 상담 신청</Button>
              </div>
          ) : (
              bookings.map(booking => (
                  <Card 
                    key={booking.id} 
                    onClick={() => setSelectedBookingId(booking.id)}
                    className="p-5 cursor-pointer hover:shadow-md transition-shadow group"
                  >
                      <div className="flex justify-between items-start mb-3">
                          <Badge color={getStatusColor(booking.status)}>{getStatusLabel(booking.status)}</Badge>
                          <span className="text-xs text-gray-400">{booking.date}</span>
                      </div>
                      
                      <h3 className="font-bold text-lg text-slate-900 mb-1 group-hover:text-brand-600 transition-colors">
                          {booking.businessType} {booking.area ? `${booking.area}평` : ''} 프로젝트
                      </h3>
                      <p className="text-sm text-gray-500 mb-4 line-clamp-1">
                          {booking.consultantName} 매니저 · {booking.region || '지역 미정'}
                      </p>

                      <div className="flex gap-2 mb-4 pt-4 border-t border-gray-50 overflow-hidden">
                          {booking.selectedTaskIds?.slice(0, 4).map((taskId, i) => {
                              const taskName = OPEN_PROCESS_TASKS.find(t => t.id === taskId)?.title || taskId;
                              return (
                                <span key={i} className="text-[10px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium whitespace-nowrap">
                                    {taskName}
                                </span>
                              )
                          })}
                          {(booking.selectedTaskIds?.length || 0) > 4 && (
                              <span className="text-[10px] text-gray-400 px-1.5 py-0.5">+{booking.selectedTaskIds.length - 4}</span>
                          )}
                      </div>

                      <div className="flex justify-between items-center text-xs font-bold text-brand-600">
                          <span>바로가기</span>
                          <ArrowRight size={14} className="group-hover:translate-x-1 transition-transform" />
                      </div>
                  </Card>
              ))
          )}
      </div>
    </div>
  );
};
