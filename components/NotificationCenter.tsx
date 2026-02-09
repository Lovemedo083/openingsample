import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../utils/supabaseClient';
import {
  Bell, X, Check, CheckCheck, UserPlus, MessageCircle,
  ArrowUpRight, CreditCard, Shield, Clock, Trash2
} from 'lucide-react';

interface Notification {
  id: string;
  user_id: string;
  project_id: string | null;
  type: 'PM_ASSIGNED' | 'NEW_MESSAGE' | 'STEP_CHANGED' | 'PAYMENT_REQUEST' | 'PAYMENT_COMPLETED' | 'REMINDER';
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationCenterProps {
  userId: string;
  onOpenChat?: () => void;
  dark?: boolean; // 그라데이션 헤더 위에서 사용 시
}

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  PM_ASSIGNED: { icon: UserPlus, color: 'text-brand-600', bg: 'bg-brand-50' },
  NEW_MESSAGE: { icon: MessageCircle, color: 'text-blue-600', bg: 'bg-blue-50' },
  STEP_CHANGED: { icon: ArrowUpRight, color: 'text-emerald-600', bg: 'bg-emerald-50' },
  PAYMENT_REQUEST: { icon: CreditCard, color: 'text-orange-600', bg: 'bg-orange-50' },
  PAYMENT_COMPLETED: { icon: Check, color: 'text-green-600', bg: 'bg-green-50' },
  REMINDER: { icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
};

export const NotificationCenter: React.FC<NotificationCenterProps> = ({ userId, onOpenChat, dark }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  const unreadCount = notifications.filter(n => !n.is_read).length;

  // 알림 로드
  useEffect(() => {
    if (!userId || userId.startsWith('guest-')) return;
    loadNotifications();
    const channel = subscribeToNotifications();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [userId]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const { data } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(30);
      if (data) setNotifications(data);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
    setLoading(false);
  };

  const subscribeToNotifications = () => {
    return supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'notifications',
        filter: `user_id=eq.${userId}`
      }, (payload) => {
        setNotifications(prev => [payload.new as Notification, ...prev]);
      })
      .subscribe();
  };

  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    await supabase.from('notifications').update({ is_read: true }).eq('id', id);
  };

  const markAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', userId)
      .eq('is_read', false);
  };

  const formatTime = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return '방금';
    if (mins < 60) return `${mins}분 전`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}시간 전`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}일 전`;
    return new Date(dateStr).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
  };

  const handleNotificationClick = (notif: Notification) => {
    markAsRead(notif.id);
    if (notif.type === 'NEW_MESSAGE' || notif.type === 'PAYMENT_REQUEST') {
      onOpenChat?.();
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={panelRef}>
      {/* Bell 버튼 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`relative p-2 transition-colors ${
          dark ? 'text-white/80 hover:text-white bg-white/15 rounded-full' : 'text-slate-400 hover:text-slate-600'
        }`}
      >
        <Bell size={dark ? 18 : 20} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 animate-scale-in">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* 알림 패널 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-[min(340px,calc(100vw-32px))] max-h-[70vh] bg-white rounded-2xl shadow-2xl border border-slate-100 overflow-hidden z-50 animate-fade-in">
          {/* 헤더 */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-white sticky top-0 z-10">
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-slate-900">알림</h3>
              {unreadCount > 0 && (
                <span className="px-1.5 py-0.5 bg-red-100 text-red-600 text-xs font-bold rounded-full">
                  {unreadCount}
                </span>
              )}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-brand-600 font-medium px-2 py-1 hover:bg-brand-50 rounded-lg transition-colors"
                >
                  모두 읽음
                </button>
              )}
              <button onClick={() => setIsOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
          </div>

          {/* 알림 목록 */}
          <div className="overflow-y-auto max-h-[calc(70vh-52px)]">
            {notifications.length === 0 ? (
              <div className="py-12 text-center">
                <Bell size={32} className="mx-auto mb-3 text-slate-200" />
                <p className="text-sm text-slate-400">알림이 없습니다</p>
              </div>
            ) : (
              notifications.map(notif => {
                const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.REMINDER;
                const IconComp = config.icon;

                return (
                  <button
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors flex gap-3 ${
                      !notif.is_read ? 'bg-brand-50/30' : ''
                    }`}
                  >
                    <div className={`w-9 h-9 ${config.bg} rounded-full flex items-center justify-center shrink-0 mt-0.5`}>
                      <IconComp size={16} className={config.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <p className={`text-sm font-bold truncate ${!notif.is_read ? 'text-slate-900' : 'text-slate-600'}`}>
                          {notif.title}
                        </p>
                        {!notif.is_read && (
                          <span className="w-2 h-2 bg-brand-500 rounded-full shrink-0" />
                        )}
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">{notif.message}</p>
                      <p className="text-[10px] text-slate-300 mt-1">{formatTime(notif.created_at)}</p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};

// 알림 생성 유틸리티 함수 (다른 컴포넌트에서 import해서 사용)
// 앱 내 알림 + 브라우저 푸시 동시 발송
export const createNotification = async (params: {
  userId: string;
  projectId?: string;
  type: Notification['type'];
  title: string;
  message: string;
}) => {
  try {
    // 1. 앱 내 알림 생성
    await supabase.from('notifications').insert({
      user_id: params.userId,
      project_id: params.projectId || null,
      type: params.type,
      title: params.title,
      message: params.message,
    });

    // 2. 브라우저 푸시 발송 (Edge Function 호출 - JWT 인증 필요)
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (supabaseUrl) {
      const { data: { session } } = await supabase.auth.getSession();
      const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      fetch(`${supabaseUrl}/functions/v1/send-push`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token || anonKey}`,
          'apikey': anonKey,
        },
        body: JSON.stringify({
          user_id: params.userId,
          title: params.title,
          body: params.message,
          type: params.type,
          url: '/',
        }),
      }).catch(() => {}); // 푸시 실패해도 앱 내 알림은 이미 저장됨
    }
  } catch (e) {
    console.error('Failed to create notification:', e);
  }
};
