-- push_subscriptions 테이블 생성
-- Supabase Dashboard > SQL Editor에서 실행하세요

CREATE TABLE IF NOT EXISTS push_subscriptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, endpoint)
);

-- 인덱스
CREATE INDEX idx_push_subs_user_id ON push_subscriptions(user_id);

-- RLS 활성화
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 구독만 관리 가능
CREATE POLICY "Users can manage own push subscriptions"
  ON push_subscriptions FOR ALL
  USING (auth.uid() = user_id);

-- Edge Function은 service_role key로 RLS 우회하여 조회 가능
-- 클라이언트에서는 자기 구독만 조회됨 (위 정책으로 제한)
