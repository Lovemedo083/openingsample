import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import { Button } from './Components';
import {
  User, Phone, Mail, Camera, Save, LogOut, Briefcase, MessageCircle,
  ChevronRight, Check, Clock, Loader2, Send, ArrowRight, X,
  Star, Award, MapPin, Calendar, CheckCircle, AlertTriangle,
  ClipboardList, Building2, ChevronDown, ExternalLink, AlertCircle,
  Image, Eye, EyeOff, Paperclip, Plus, Trash2
} from 'lucide-react';

interface PMPortalViewProps {
  pmId: string;
  onLogout: () => void;
}

interface ChecklistItemData {
  id: string;
  title: string;
  category: string;
  description?: string;
  status: 'done' | 'worry' | 'unchecked';
  estimatedCost?: { min: number; max: number; unit: string };
}

interface Project {
  id: string;
  business_category: string;
  location_dong: string;
  store_size: number;
  estimated_total: number;
  status: string;
  current_step: number;
  pm_approved_step: number;
  pm_notes: string;
  created_at: string;
  user_id: string;
  checklist_data: ChecklistItemData[];
  user_name?: string;
  user_phone?: string;
}

interface Partner {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  contact_name: string;
  contact_phone: string;
  contact_email: string;
  description: string;
  price_min: number;
  price_max: number;
  price_unit: string;
  commission_rate: number;
}

interface PartnerAssignment {
  id: string;
  project_id: string;
  checklist_item_id: string;
  partner_id: string;
  partner?: Partner;
  status: 'pending' | 'contacted' | 'confirmed' | 'completed';
  pm_notes: string;
  created_at: string;
}

interface Message {
  id: string;
  project_id: string;
  sender_type: 'USER' | 'PM' | 'SYSTEM';
  message: string;
  attachments?: { url: string; type: string; name: string }[];
  is_read: boolean;
  created_at: string;
}

interface PMProfile {
  id: string;
  name: string;
  phone: string;
  email: string;
  profile_image: string;
  introduction: string;
  specialties: string[];
  rating: number;
  completed_projects: number;
  is_available: boolean;
}

// PM 관리 단계 (1-6: 고객 입력, 7-12: PM 제어)
const STEP_LABELS: Record<number, string> = {
  1: '업종 선택',
  2: '위치 선택',
  3: '상권 분석',
  4: '매장 규모',
  5: '체크리스트',
  6: '비용 확인',
  7: '상담 시작',      // PM 배정 후
  8: '비용 컨설팅',    // 견적/업체 배정
  9: '계약/착수',      // 계약 및 공사
  10: '진행중',        // 공사/준비
  11: '오픈 완료',     // 오픈!
  12: '사후관리'       // 해피콜/A/S
};

// 각 단계별 설명 및 액션
const STEP_DETAILS: Record<number, { description: string; actions: string[]; color: string }> = {
  7: { description: 'PM 배정 완료, 상담 시작', actions: ['첫 인사', '요구사항 파악'], color: 'blue' },
  8: { description: '비용 견적 및 협력업체 배정', actions: ['비용 보고서 전송', '업체 카드 전달'], color: 'purple' },
  9: { description: '계약 진행 및 공사 착수', actions: ['계약 안내', '일정 공유'], color: 'orange' },
  10: { description: '공사 및 오픈 준비 진행', actions: ['진행 상황 공유', '최종 점검'], color: 'yellow' },
  11: { description: '오픈 완료! 축하드립니다', actions: ['축하 메시지', '리뷰 요청'], color: 'green' },
  12: { description: '사후관리 및 A/S 지원', actions: ['해피콜', 'A/S 접수'], color: 'slate' },
};

const CHECKLIST_CATEGORIES = [
  { id: 'license', label: '인허가/행정', color: 'blue' },
  { id: 'construction', label: '시설/공사', color: 'orange' },
  { id: 'equipment', label: '주방 장비', color: 'purple' },
  { id: 'operation', label: '운영 준비', color: 'green' },
];

export const PMPortalView: React.FC<PMPortalViewProps> = ({ pmId, onLogout }) => {
  const [profile, setProfile] = useState<PMProfile | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState<Partial<PMProfile>>({});
  const [partners, setPartners] = useState<Partner[]>([]);
  const [assignments, setAssignments] = useState<PartnerAssignment[]>([]);
  const [showPartnerModal, setShowPartnerModal] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'checklist'>('checklist');
  const [selectedChecklistCategory, setSelectedChecklistCategory] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [showStepModal, setShowStepModal] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [showCustomItemModal, setShowCustomItemModal] = useState(false);
  const [customItemForm, setCustomItemForm] = useState({
    title: '',
    category: 'PLANNING',
    description: '',
  });
  const [showMobileSidebar, setShowMobileSidebar] = useState(true); // 모바일: 사이드바/메인 토글
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadPMData();
  }, [pmId]);

  useEffect(() => {
    if (selectedProject) {
      loadMessages(selectedProject.id);
      loadAssignments(selectedProject.id);
      const unsubscribe = subscribeToMessages(selectedProject.id);
      return unsubscribe;
    }
  }, [selectedProject]);

  useEffect(() => {
    loadPartners();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const loadPMData = async () => {
    setLoading(true);

    // PM 프로필 로드 (project_managers 테이블 사용)
    const { data: pmData } = await supabase
      .from('project_managers')
      .select('*')
      .eq('id', pmId)
      .single();

    if (pmData) {
      setProfile(pmData);
      setProfileForm(pmData);
    }

    // 담당 프로젝트 로드
    const { data: projectsData } = await supabase
      .from('startup_projects')
      .select('*')
      .eq('pm_id', pmId)
      .order('created_at', { ascending: false });

    if (projectsData) {
      setProjects(projectsData);
      if (projectsData.length > 0 && !selectedProject) {
        setSelectedProject(projectsData[0]);
      }
    }

    setLoading(false);
  };

  const loadMessages = async (projectId: string) => {
    const { data } = await supabase
      .from('project_messages')
      .select('*')
      .eq('project_id', projectId)
      .order('created_at');

    if (data) {
      setMessages(data);
    }
  };

  const loadPartners = async () => {
    const { data } = await supabase
      .from('partners')
      .select('*')
      .eq('is_active', true);

    if (data) {
      setPartners(data);
    }
  };

  const loadAssignments = async (projectId: string) => {
    const { data } = await supabase
      .from('project_partner_assignments')
      .select('*, partner:partners(*)')
      .eq('project_id', projectId);

    if (data) {
      setAssignments(data);
    }
  };

  const assignPartner = async (checklistItemId: string, partnerId: string) => {
    if (!selectedProject) return;

    // 기존 배정 확인
    const existing = assignments.find(a => a.checklist_item_id === checklistItemId);

    if (existing) {
      await supabase
        .from('project_partner_assignments')
        .update({ partner_id: partnerId, status: 'pending' })
        .eq('id', existing.id);
    } else {
      await supabase
        .from('project_partner_assignments')
        .insert({
          project_id: selectedProject.id,
          checklist_item_id: checklistItemId,
          partner_id: partnerId,
          status: 'pending'
        });
    }

    await loadAssignments(selectedProject.id);
    setShowPartnerModal(null);

    // 알림 메시지
    const partner = partners.find(p => p.id === partnerId);
    const item = selectedProject.checklist_data?.find(i => i.id === checklistItemId);
    if (partner && item) {
      await supabase.from('project_messages').insert({
        project_id: selectedProject.id,
        sender_type: 'PM',
        message: `📋 "${item.title}" 항목에 업체를 배정했습니다.\n\n🏢 업체명: ${partner.name}\n💰 예상 비용: ${partner.price_min}~${partner.price_max}${partner.price_unit}\n📞 연락처: ${partner.contact_phone}\n\n업체에서 곧 연락드릴 예정입니다.`
      });
      loadMessages(selectedProject.id);
    }
  };

  const updateAssignmentStatus = async (assignmentId: string, status: PartnerAssignment['status']) => {
    await supabase
      .from('project_partner_assignments')
      .update({ status })
      .eq('id', assignmentId);

    if (selectedProject) {
      loadAssignments(selectedProject.id);
    }
  };

  const getPartnerForItem = (itemId: string) => {
    const assignment = assignments.find(a => a.checklist_item_id === itemId);
    return assignment;
  };

  // 커스텀 체크리스트 항목 추가
  const addCustomChecklistItem = async () => {
    if (!selectedProject || !customItemForm.title.trim()) return;

    const newItem: ChecklistItemData = {
      id: `custom_${Date.now()}`,
      title: customItemForm.title.trim(),
      category: customItemForm.category,
      description: customItemForm.description.trim() || undefined,
      status: 'unchecked',
    };

    const updatedChecklist = [...(selectedProject.checklist_data || []), newItem];

    const { error } = await supabase
      .from('consultings')
      .update({ checklist_data: updatedChecklist })
      .eq('id', selectedProject.id);

    if (!error) {
      // 로컬 상태 업데이트
      setSelectedProject({
        ...selectedProject,
        checklist_data: updatedChecklist,
      });
      setProjects(prev =>
        prev.map(p =>
          p.id === selectedProject.id ? { ...p, checklist_data: updatedChecklist } : p
        )
      );
      setShowCustomItemModal(false);
      setCustomItemForm({ title: '', category: 'PLANNING', description: '' });
    }
  };

  // 커스텀 체크리스트 항목 삭제
  const deleteCustomChecklistItem = async (itemId: string) => {
    if (!selectedProject) return;

    const updatedChecklist = selectedProject.checklist_data?.filter(item => item.id !== itemId) || [];

    const { error } = await supabase
      .from('consultings')
      .update({ checklist_data: updatedChecklist })
      .eq('id', selectedProject.id);

    if (!error) {
      setSelectedProject({
        ...selectedProject,
        checklist_data: updatedChecklist,
      });
      setProjects(prev =>
        prev.map(p =>
          p.id === selectedProject.id ? { ...p, checklist_data: updatedChecklist } : p
        )
      );
    }
  };

  const subscribeToMessages = (projectId: string) => {
    const channel = supabase
      .channel(`pm-project-${projectId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'project_messages',
        filter: `project_id=eq.${projectId}`
      }, (payload) => {
        setMessages(prev => [...prev, payload.new as Message]);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const sendMessage = async () => {
    if ((!newMessage.trim() && !selectedImage) || !selectedProject) return;

    setSending(true);

    let attachments: { url: string; type: string; name: string }[] | undefined;

    // 이미지 업로드 처리
    if (selectedImage) {
      setUploadingImage(true);
      const fileExt = selectedImage.name.split('.').pop();
      const fileName = `${selectedProject.id}/${Date.now()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(fileName, selectedImage);

      if (!uploadError && uploadData) {
        const { data: urlData } = supabase.storage
          .from('chat-images')
          .getPublicUrl(fileName);

        attachments = [{
          url: urlData.publicUrl,
          type: selectedImage.type,
          name: selectedImage.name
        }];
      }
      setUploadingImage(false);
    }

    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message: newMessage.trim() || '📷 이미지',
      attachments: attachments || null
    });

    setNewMessage('');
    setSelectedImage(null);
    setImagePreview(null);
    setSending(false);
  };

  // 읽음 상태 토글 (PM 수동 제어)
  const toggleReadStatus = async (messageId: string, currentStatus: boolean) => {
    await supabase
      .from('project_messages')
      .update({ is_read: !currentStatus })
      .eq('id', messageId);

    if (selectedProject) {
      loadMessages(selectedProject.id);
    }
  };

  // 이미지 선택 핸들러
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedImage(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const cancelImageUpload = () => {
    setSelectedImage(null);
    setImagePreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const advanceProjectStep = async () => {
    if (!selectedProject) return;

    const nextStep = selectedProject.current_step + 1;
    if (nextStep > 12) return;

    await setProjectStep(nextStep);
  };

  // 특정 단계로 설정
  const setProjectStep = async (step: number, notify: boolean = true) => {
    if (!selectedProject) return;

    const status = step >= 11 ? 'COMPLETED' : step >= 7 ? 'IN_PROGRESS' : 'PM_ASSIGNED';

    const { error } = await supabase
      .from('startup_projects')
      .update({
        current_step: step,
        pm_approved_step: step,
        status
      })
      .eq('id', selectedProject.id);

    if (!error) {
      if (notify) {
        const stepDetail = STEP_DETAILS[step];
        await supabase.from('project_messages').insert({
          project_id: selectedProject.id,
          sender_type: 'SYSTEM',
          message: `📍 **현재 단계: ${STEP_LABELS[step]}**\n\n${stepDetail?.description || ''}\n\n담당 PM이 진행 상황을 업데이트했습니다.`
        });
        loadMessages(selectedProject.id);
      }

      setSelectedProject({ ...selectedProject, current_step: step, pm_approved_step: step, status });
      loadPMData();
      setShowStepModal(false);
    }
  };

  // 비용 컨설팅 보고서 전송
  const sendCostReport = async () => {
    if (!selectedProject) return;

    // 체크리스트에서 도움 필요 항목들의 예상 비용 계산
    const worryItems = selectedProject.checklist_data?.filter(i => i.status === 'worry') || [];
    const assignedItems = assignments.filter(a => a.status !== 'pending');

    let reportMessage = `📊 **창업 비용 컨설팅 보고서**\n\n`;
    reportMessage += `🏪 ${selectedProject.business_category} | 강남구 ${selectedProject.location_dong} | ${selectedProject.store_size}평\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;

    // 배정된 협력업체 정보
    if (assignedItems.length > 0) {
      reportMessage += `**🤝 배정된 협력업체**\n\n`;
      assignedItems.forEach(item => {
        const checklistItem = selectedProject.checklist_data?.find(c => c.id === item.checklist_item_id);
        reportMessage += `• ${checklistItem?.title || item.checklist_item_id}\n`;
        reportMessage += `  └ ${item.partner?.name} (${item.partner?.price_min}~${item.partner?.price_max}${item.partner?.price_unit})\n\n`;
      });
    }

    reportMessage += `**💰 총 예상 비용: ${(selectedProject.estimated_total / 10000).toFixed(0)}만원**\n\n`;
    reportMessage += `━━━━━━━━━━━━━━━━━━━━\n\n`;
    reportMessage += `궁금한 점이 있으시면 언제든 문의해주세요! 😊`;

    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message: reportMessage
    });

    loadMessages(selectedProject.id);
    setShowReportModal(false);
  };

  // 해피콜 메시지 전송
  const sendHappyCallMessage = async () => {
    if (!selectedProject) return;

    const message = `📞 **오픈 후 해피콜**\n\n안녕하세요! 담당 PM입니다.\n\n${selectedProject.business_category} 오픈 이후 운영은 잘 되고 계신가요?\n\n혹시 추가로 도움이 필요하신 부분이 있으시면 언제든 말씀해주세요.\n\n• 장비 A/S 필요하신 부분\n• 추가 인테리어/보수 필요하신 부분\n• 마케팅/홍보 지원\n• 기타 운영 관련 문의\n\n항상 응원하겠습니다! 🎉`;

    await supabase.from('project_messages').insert({
      project_id: selectedProject.id,
      sender_type: 'PM',
      message
    });

    loadMessages(selectedProject.id);
  };

  const updateProfile = async () => {
    if (!profile) return;

    const { error } = await supabase
      .from('project_managers')
      .update({
        name: profileForm.name,
        phone: profileForm.phone,
        introduction: profileForm.introduction,
        specialties: profileForm.specialties,
        is_available: profileForm.is_available
      })
      .eq('id', profile.id);

    if (!error) {
      setProfile({ ...profile, ...profileForm } as PMProfile);
      setEditingProfile(false);
    }
  };

  const uploadProfileImage = async (file: File) => {
    if (!profile) return;

    const fileExt = file.name.split('.').pop();
    const fileName = `pm_${profile.id}_${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from('profiles')
      .upload(fileName, file);

    if (!uploadError) {
      const { data: urlData } = supabase.storage
        .from('profiles')
        .getPublicUrl(fileName);

      await supabase
        .from('project_managers')
        .update({ profile_image: urlData.publicUrl })
        .eq('id', profile.id);

      setProfile({ ...profile, profile_image: urlData.publicUrl });
    }
  };

  // 체크리스트 아이템 필터링
  const getFilteredChecklist = () => {
    if (!selectedProject?.checklist_data) return [];

    let items = selectedProject.checklist_data;

    if (selectedChecklistCategory) {
      items = items.filter(item => item.category === selectedChecklistCategory);
    }

    return items;
  };

  // 걱정/도움 필요 항목 수
  const getWorryCount = () => {
    return selectedProject?.checklist_data?.filter(i => i.status === 'worry').length || 0;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="animate-spin text-brand-600" size={40} />
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-100 flex flex-col md:flex-row">
      {/* 사이드바 - 프로필 & 프로젝트 목록 */}
      <aside className={`w-full md:w-80 bg-white border-r flex flex-col ${selectedProject && !showMobileSidebar ? 'hidden md:flex' : 'flex'}`}>
        {/* PM 프로필 */}
        <div className="p-4 border-b">
          <div className="flex items-center gap-3 mb-4">
            <div className="relative">
              <img
                src={profile?.profile_image || '/favicon-new.png'}
                alt={profile?.name}
                className="w-14 h-14 rounded-full object-cover border-2 border-brand-100"
              />
              <label className="absolute bottom-0 right-0 w-6 h-6 bg-brand-600 rounded-full flex items-center justify-center cursor-pointer hover:bg-brand-700 transition-colors">
                <Camera size={12} className="text-white" />
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => e.target.files?.[0] && uploadProfileImage(e.target.files[0])}
                />
              </label>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-lg">{profile?.name || 'PM'}</h2>
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Star size={14} className="text-yellow-500 fill-yellow-500" />
                <span>{profile?.rating || 5.0}</span>
                <span>·</span>
                <span>{profile?.completed_projects || 0}건 완료</span>
              </div>
            </div>
          </div>

          {editingProfile ? (
            <div className="space-y-2">
              <input
                type="text"
                placeholder="이름"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={profileForm.name || ''}
                onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
              />
              <input
                type="tel"
                placeholder="연락처"
                className="w-full px-3 py-2 border rounded-lg text-sm"
                value={profileForm.phone || ''}
                onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
              />
              <textarea
                placeholder="자기소개"
                className="w-full px-3 py-2 border rounded-lg text-sm resize-none h-16"
                value={profileForm.introduction || ''}
                onChange={(e) => setProfileForm({ ...profileForm, introduction: e.target.value })}
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={updateProfile}>
                  <Save size={14} className="mr-1" /> 저장
                </Button>
                <Button size="sm" variant="outline" onClick={() => setEditingProfile(false)}>
                  취소
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-sm text-gray-600">{profile?.introduction || '자기소개를 입력하세요'}</p>
              <button
                onClick={() => setEditingProfile(true)}
                className="text-xs text-brand-600 font-bold hover:underline"
              >
                프로필 수정
              </button>
            </div>
          )}
        </div>

        {/* 프로젝트 목록 */}
        <div className="flex-1 overflow-y-auto">
          <div className="px-4 py-2 bg-gray-50 border-b">
            <h3 className="font-bold text-sm text-gray-700">담당 프로젝트 ({projects.length})</h3>
          </div>
          {projects.length === 0 ? (
            <div className="p-4 text-center text-gray-400 text-sm">
              배정된 프로젝트가 없습니다
            </div>
          ) : (
            <div className="divide-y">
              {projects.map(project => {
                const worryItems = project.checklist_data?.filter(i => i.status === 'worry').length || 0;
                return (
                  <button
                    key={project.id}
                    onClick={() => {
                      setSelectedProject(project);
                      setShowMobileSidebar(false); // 모바일에서 프로젝트 선택 시 메인으로 전환
                    }}
                    className={`w-full p-4 text-left hover:bg-gray-50 transition-colors ${
                      selectedProject?.id === project.id ? 'bg-brand-50 border-l-4 border-brand-600' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-sm">{project.business_category}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        project.current_step >= 8 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {STEP_LABELS[project.current_step]}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500">
                      강남구 {project.location_dong} · {project.store_size}평
                    </p>
                    {worryItems > 0 && (
                      <div className="mt-2 flex items-center gap-1 text-xs text-orange-600">
                        <AlertCircle size={12} />
                        <span>도움 필요 {worryItems}건</span>
                      </div>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(project.created_at).toLocaleDateString()}
                    </p>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* 로그아웃 */}
        <div className="p-4 border-t">
          <button
            onClick={onLogout}
            className="w-full flex items-center justify-center gap-2 py-2 text-gray-500 hover:text-red-600 transition-colors"
          >
            <LogOut size={18} />
            로그아웃
          </button>
        </div>
      </aside>

      {/* 메인 - 프로젝트 상세 */}
      <main className={`flex-1 flex flex-col min-h-0 ${showMobileSidebar ? 'hidden md:flex' : 'flex'}`}>
        {selectedProject ? (
          <>
            {/* 프로젝트 헤더 */}
            <div className="bg-white border-b px-4 md:px-6 py-4">
              <div className="flex items-center justify-between gap-2">
                {/* 모바일 뒤로가기 버튼 */}
                <button
                  onClick={() => setShowMobileSidebar(true)}
                  className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900"
                >
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <div className="flex-1 min-w-0">
                  <h1 className="text-lg md:text-xl font-bold truncate">
                    {selectedProject.business_category} 창업 프로젝트
                  </h1>
                  <p className="text-sm text-gray-500">
                    강남구 {selectedProject.location_dong} · {selectedProject.store_size}평 ·
                    예상 {(selectedProject.estimated_total / 10000).toFixed(0)}만원
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {getWorryCount() > 0 && (
                    <span className="px-3 py-1 rounded-full text-sm font-bold bg-orange-100 text-orange-700">
                      도움 필요 {getWorryCount()}건
                    </span>
                  )}
                  <button
                    onClick={() => setShowStepModal(true)}
                    className={`px-3 py-1 rounded-full text-sm font-bold cursor-pointer hover:opacity-80 transition-opacity ${
                      selectedProject.current_step >= 11
                        ? 'bg-green-100 text-green-700'
                        : selectedProject.current_step >= 7
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-yellow-100 text-yellow-700'
                    }`}
                  >
                    📍 {STEP_LABELS[selectedProject.current_step]} ▼
                  </button>
                  {selectedProject.current_step >= 7 && selectedProject.current_step < 12 && (
                    <Button onClick={advanceProjectStep} className="text-sm">
                      <ArrowRight size={16} className="mr-1" />
                      다음 단계
                    </Button>
                  )}
                  {selectedProject.current_step === 8 && (
                    <Button onClick={() => setShowReportModal(true)} className="text-sm bg-purple-600 hover:bg-purple-700">
                      📊 비용 보고서
                    </Button>
                  )}
                  {selectedProject.current_step >= 11 && (
                    <Button onClick={sendHappyCallMessage} className="text-sm bg-pink-600 hover:bg-pink-700">
                      📞 해피콜
                    </Button>
                  )}
                </div>
              </div>

              {/* 고객 상담 조건 요약 */}
              <div className="mt-4 p-4 bg-slate-50 rounded-xl">
                <div className="flex items-center gap-2 mb-3">
                  <User size={16} className="text-brand-600" />
                  <span className="font-bold text-sm">고객 상담 조건</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400 text-xs mb-1">고객명</p>
                    <p className="font-bold">{selectedProject.user_name || '미입력'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">연락처</p>
                    <p className="font-bold">{selectedProject.user_phone || '미입력'}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">업종</p>
                    <p className="font-bold">{selectedProject.business_category}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-xs mb-1">위치/평수</p>
                    <p className="font-bold">강남구 {selectedProject.location_dong} · {selectedProject.store_size}평</p>
                  </div>
                </div>

                {/* 체크리스트 현황 */}
                <div className="mt-4 pt-3 border-t border-slate-200">
                  <p className="text-xs text-gray-400 mb-2">체크리스트 현황</p>
                  <div className="flex gap-3 flex-wrap">
                    <span className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-bold">
                      ✓ 준비됨 {selectedProject.checklist_data?.filter(i => i.status === 'done').length || 0}건
                    </span>
                    <span className="px-2 py-1 bg-orange-100 text-orange-700 rounded text-xs font-bold">
                      ⚠ 도움 필요 {selectedProject.checklist_data?.filter(i => i.status === 'worry').length || 0}건
                    </span>
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 rounded text-xs font-bold">
                      미확인 {selectedProject.checklist_data?.filter(i => i.status === 'unchecked').length || 0}건
                    </span>
                  </div>
                </div>

                {/* 도움 필요 항목 */}
                {selectedProject.checklist_data?.filter(i => i.status === 'worry').length > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200">
                    <p className="text-xs text-orange-600 font-bold mb-2">⚠ 고객이 도움 요청한 항목</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedProject.checklist_data
                        .filter(i => i.status === 'worry')
                        .map(item => (
                          <span key={item.id} className="px-2 py-1 bg-orange-50 text-orange-700 rounded text-xs">
                            {item.title}
                          </span>
                        ))
                      }
                    </div>
                  </div>
                )}
              </div>

              {/* 탭 */}
              <div className="mt-4 flex gap-2">
                <button
                  onClick={() => setActiveTab('checklist')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'checklist'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <ClipboardList size={16} />
                  체크리스트
                  {getWorryCount() > 0 && (
                    <span className={`px-1.5 py-0.5 rounded-full text-xs ${
                      activeTab === 'checklist' ? 'bg-white/20' : 'bg-orange-100 text-orange-700'
                    }`}>
                      {getWorryCount()}
                    </span>
                  )}
                </button>
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition-colors ${
                    activeTab === 'chat'
                      ? 'bg-brand-600 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  <MessageCircle size={16} />
                  채팅
                </button>
              </div>
            </div>

            {/* 체크리스트 탭 */}
            {activeTab === 'checklist' && (
              <div className="flex-1 overflow-y-auto p-6 bg-gray-50">
                {/* 카테고리 필터 */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setSelectedChecklistCategory(null)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      !selectedChecklistCategory
                        ? 'bg-slate-900 text-white'
                        : 'bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    전체
                  </button>
                  <button
                    onClick={() => setSelectedChecklistCategory('worry')}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors ${
                      selectedChecklistCategory === 'worry'
                        ? 'bg-orange-600 text-white'
                        : 'bg-white text-orange-600 border border-orange-200 hover:bg-orange-50'
                    }`}
                  >
                    <AlertCircle size={14} />
                    도움 필요
                  </button>
                  {CHECKLIST_CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedChecklistCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        selectedChecklistCategory === cat.id
                          ? 'bg-slate-900 text-white'
                          : 'bg-white text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>

                {/* 체크리스트 아이템 */}
                <div className="space-y-3">
                  {(selectedChecklistCategory === 'worry'
                    ? selectedProject.checklist_data?.filter(i => i.status === 'worry')
                    : getFilteredChecklist()
                  )?.map(item => {
                    const assignment = getPartnerForItem(item.id);
                    return (
                      <div
                        key={item.id}
                        className={`bg-white rounded-xl border p-4 ${
                          item.status === 'worry' ? 'border-orange-300 bg-orange-50/50' : ''
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              {item.status === 'done' && (
                                <CheckCircle size={18} className="text-green-600" />
                              )}
                              {item.status === 'worry' && (
                                <AlertCircle size={18} className="text-orange-600" />
                              )}
                              {item.status === 'unchecked' && (
                                <div className="w-4.5 h-4.5 border-2 border-gray-300 rounded" />
                              )}
                              <h3 className="font-bold">{item.title}</h3>
                              <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                                {CHECKLIST_CATEGORIES.find(c => c.id === item.category)?.label || item.category}
                              </span>
                              {item.id.startsWith('custom_') && (
                                <>
                                  <span className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full font-medium">
                                    커스텀
                                  </span>
                                  <button
                                    onClick={() => deleteCustomChecklistItem(item.id)}
                                    className="p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                    title="항목 삭제"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-sm text-gray-500 ml-6 mb-2">{item.description}</p>
                            )}
                            {item.estimatedCost && (
                              <p className="text-sm text-gray-600 ml-6">
                                예상 비용: {item.estimatedCost.min}~{item.estimatedCost.max}{item.estimatedCost.unit}
                              </p>
                            )}
                          </div>

                          {/* 파트너 배정 */}
                          <div className="flex items-center gap-2">
                            {assignment?.partner ? (
                              <div className="text-right">
                                <div className="flex items-center gap-2">
                                  <div className="text-sm">
                                    <p className="font-bold text-brand-700">{assignment.partner.name}</p>
                                    <p className="text-xs text-gray-500">{assignment.partner.contact_phone}</p>
                                  </div>
                                  <select
                                    value={assignment.status}
                                    onChange={(e) => updateAssignmentStatus(assignment.id, e.target.value as any)}
                                    className="px-2 py-1 border rounded text-xs"
                                  >
                                    <option value="pending">대기중</option>
                                    <option value="contacted">연락완료</option>
                                    <option value="confirmed">확정</option>
                                    <option value="completed">완료</option>
                                  </select>
                                </div>
                                <button
                                  onClick={() => setShowPartnerModal(item.id)}
                                  className="text-xs text-brand-600 hover:underline mt-1"
                                >
                                  업체 변경
                                </button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                onClick={() => setShowPartnerModal(item.id)}
                              >
                                <Building2 size={14} className="mr-1" />
                                업체 배정
                              </Button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}

                  {getFilteredChecklist().length === 0 && (
                    <div className="text-center py-12 text-gray-400">
                      <ClipboardList size={48} className="mx-auto mb-4 opacity-50" />
                      <p>체크리스트 항목이 없습니다</p>
                    </div>
                  )}

                  {/* 커스텀 항목 추가 버튼 */}
                  <button
                    onClick={() => setShowCustomItemModal(true)}
                    className="w-full mt-4 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-500 hover:border-brand-500 hover:text-brand-600 transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus size={18} />
                    특이 케이스 항목 추가
                  </button>
                </div>
              </div>
            )}

            {/* 채팅 탭 */}
            {activeTab === 'chat' && (
              <>
                <div className="flex-1 overflow-y-auto p-6 bg-gray-50 space-y-3 max-h-[calc(100vh-280px)]">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-gray-400">
                      <MessageCircle size={48} className="mx-auto mb-4 opacity-50" />
                      <p>메시지가 없습니다</p>
                      <p className="text-sm">고객에게 먼저 인사를 건네보세요</p>
                    </div>
                  ) : (
                    messages.map(msg => (
                      <div
                        key={msg.id}
                        className={`flex ${msg.sender_type === 'PM' ? 'justify-end' : 'justify-start'}`}
                      >
                        {/* 고객 메시지에 읽음 토글 버튼 */}
                        {msg.sender_type === 'USER' && (
                          <button
                            onClick={() => toggleReadStatus(msg.id, msg.is_read)}
                            className={`mr-2 p-1.5 rounded-full self-end mb-1 transition-colors ${
                              msg.is_read
                                ? 'bg-brand-100 text-brand-600 hover:bg-brand-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            }`}
                            title={msg.is_read ? '읽음 표시 해제' : '읽음 표시'}
                          >
                            {msg.is_read ? <Eye size={14} /> : <EyeOff size={14} />}
                          </button>
                        )}
                        <div
                          className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                            msg.sender_type === 'PM'
                              ? 'bg-brand-600 text-white rounded-br-md'
                              : msg.sender_type === 'USER'
                                ? 'bg-white border shadow-sm rounded-bl-md'
                                : 'bg-gray-200 text-gray-600 text-sm'
                          }`}
                        >
                          {msg.sender_type === 'USER' && (
                            <p className="text-xs text-gray-400 font-bold mb-1">고객</p>
                          )}
                          {/* 이미지 첨부파일 표시 */}
                          {msg.attachments && msg.attachments.length > 0 && (
                            <div className="mb-2">
                              {msg.attachments.map((att, idx) => (
                                <img
                                  key={idx}
                                  src={att.url}
                                  alt={att.name}
                                  className="max-w-full rounded-lg cursor-pointer hover:opacity-90"
                                  onClick={() => window.open(att.url, '_blank')}
                                />
                              ))}
                            </div>
                          )}
                          {msg.message !== '📷 이미지' && (
                            <p className="whitespace-pre-wrap text-sm">{msg.message}</p>
                          )}
                          <div className={`flex items-center gap-2 mt-1 ${
                            msg.sender_type === 'PM' ? 'text-white/70' : 'text-gray-400'
                          }`}>
                            <span className="text-[10px]">
                              {new Date(msg.created_at).toLocaleTimeString('ko-KR', {
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </span>
                            {msg.sender_type === 'USER' && msg.is_read && (
                              <span className="text-[10px] text-brand-500 font-bold">읽음</span>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* 이미지 미리보기 */}
                {imagePreview && (
                  <div className="bg-gray-100 border-t p-3">
                    <div className="relative inline-block">
                      <img src={imagePreview} alt="미리보기" className="h-20 rounded-lg" />
                      <button
                        onClick={cancelImageUpload}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  </div>
                )}

                {/* 메시지 입력 */}
                <div className="bg-white border-t p-4">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageSelect}
                  />
                  <div className="flex gap-3">
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors"
                      disabled={uploadingImage}
                    >
                      {uploadingImage ? <Loader2 className="animate-spin" size={20} /> : <Image size={20} className="text-gray-500" />}
                    </button>
                    <input
                      type="text"
                      placeholder="메시지를 입력하세요..."
                      className="flex-1 px-4 py-3 bg-gray-100 rounded-xl"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                    />
                    <Button onClick={sendMessage} disabled={sending || (!newMessage.trim() && !selectedImage)}>
                      {sending ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    </Button>
                  </div>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <Briefcase size={48} className="mx-auto mb-4 opacity-50" />
              <p>프로젝트를 선택하세요</p>
            </div>
          </div>
        )}
      </main>

      {/* 파트너 배정 모달 */}
      {showPartnerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">협력 업체 배정</h2>
              <button
                onClick={() => setShowPartnerModal(null)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              {partners.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Building2 size={48} className="mx-auto mb-4 opacity-50" />
                  <p>등록된 협력 업체가 없습니다</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {partners.map(partner => (
                    <div
                      key={partner.id}
                      className="border rounded-xl p-4 hover:border-brand-300 hover:bg-brand-50/50 cursor-pointer transition-colors"
                      onClick={() => assignPartner(showPartnerModal, partner.id)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-bold">{partner.name}</h3>
                          <p className="text-sm text-gray-500">{partner.description}</p>
                          <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                            <span>{partner.subcategory || partner.category}</span>
                            <span>·</span>
                            <span>{partner.price_min}~{partner.price_max}{partner.price_unit}</span>
                            <span>·</span>
                            <span>{partner.contact_phone}</span>
                          </div>
                        </div>
                        <ChevronRight className="text-gray-400" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 체크리스트 항목 추가 모달 */}
      {showCustomItemModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">특이 케이스 항목 추가</h2>
              <button
                onClick={() => {
                  setShowCustomItemModal(false);
                  setCustomItemForm({ title: '', category: 'PLANNING', description: '' });
                }}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">항목명 *</label>
                <input
                  type="text"
                  value={customItemForm.title}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, title: e.target.value })}
                  placeholder="예: 특수 환기 시스템 설치"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">카테고리</label>
                <select
                  value={customItemForm.category}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, category: e.target.value })}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                >
                  {CHECKLIST_CATEGORIES.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-1">설명 (선택)</label>
                <textarea
                  value={customItemForm.description}
                  onChange={(e) => setCustomItemForm({ ...customItemForm, description: e.target.value })}
                  placeholder="추가 설명이 필요한 경우 입력하세요"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-transparent resize-none h-24"
                />
              </div>
              <Button
                fullWidth
                onClick={addCustomChecklistItem}
                disabled={!customItemForm.title.trim()}
              >
                <Plus size={18} className="mr-2" />
                항목 추가
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 단계 선택 모달 */}
      {showStepModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">진행 단계 설정</h2>
              <button
                onClick={() => setShowStepModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[60vh]">
              <p className="text-sm text-gray-500 mb-4">단계를 선택하면 고객에게 알림이 전송됩니다.</p>
              <div className="space-y-2">
                {[7, 8, 9, 10, 11, 12].map(step => (
                  <button
                    key={step}
                    onClick={() => setProjectStep(step)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-colors ${
                      selectedProject.current_step === step
                        ? 'border-brand-500 bg-brand-50'
                        : 'border-gray-200 hover:border-brand-300 hover:bg-gray-50'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold">{step - 6}단계: {STEP_LABELS[step]}</p>
                        <p className="text-sm text-gray-500">{STEP_DETAILS[step]?.description}</p>
                      </div>
                      {selectedProject.current_step === step && (
                        <Check className="text-brand-600" size={20} />
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 비용 보고서 전송 모달 */}
      {showReportModal && selectedProject && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white rounded-2xl w-full max-w-lg max-h-[80vh] overflow-hidden m-4">
            <div className="px-6 py-4 border-b flex items-center justify-between">
              <h2 className="text-xl font-bold">📊 비용 컨설팅 보고서</h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-6">
              <div className="bg-gray-50 rounded-xl p-4 mb-4">
                <p className="font-bold mb-2">{selectedProject.business_category} 창업</p>
                <p className="text-sm text-gray-600">강남구 {selectedProject.location_dong} · {selectedProject.store_size}평</p>
                <p className="text-2xl font-black text-brand-600 mt-2">
                  예상 {(selectedProject.estimated_total / 10000).toFixed(0)}만원
                </p>
              </div>

              {assignments.length > 0 && (
                <div className="mb-4">
                  <p className="text-sm font-bold text-gray-700 mb-2">배정된 협력업체</p>
                  <div className="space-y-2">
                    {assignments.map(a => (
                      <div key={a.id} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded">
                        <span>{a.partner?.name}</span>
                        <span className="text-gray-500">{a.partner?.price_min}~{a.partner?.price_max}{a.partner?.price_unit}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-sm text-gray-500 mb-4">
                위 내용을 고객에게 채팅으로 전송합니다.
              </p>

              <div className="flex gap-3">
                <Button onClick={() => setShowReportModal(false)} className="flex-1 bg-gray-200 text-gray-700 hover:bg-gray-300">
                  취소
                </Button>
                <Button onClick={sendCostReport} className="flex-1">
                  <Send size={18} className="mr-2" />
                  전송하기
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
