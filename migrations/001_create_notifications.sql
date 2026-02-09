-- notifications 테이블 생성
-- Supabase Dashboard > SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  project_id UUID REFERENCES startup_projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('PM_ASSIGNED', 'NEW_MESSAGE', 'STEP_CHANGED', 'PAYMENT_REQUEST', 'PAYMENT_COMPLETED', 'REMINDER')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  is_read BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 인덱스
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_user_unread ON notifications(user_id, is_read) WHERE is_read = FALSE;

-- RLS 활성화
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 알림만 조회/수정 가능
CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- 인증된 사용자만 알림 생성 가능 (Edge Function은 service_role로 우회)
CREATE POLICY "Authenticated insert notifications"
  ON notifications FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Realtime 활성화
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
