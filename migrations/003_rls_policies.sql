-- ============================================
-- RLS 정책 설정 (모든 핵심 테이블)
-- Supabase Dashboard > SQL Editor에서 실행하세요
-- ============================================

-- ============================================
-- 1. startup_projects (핵심 - 프로젝트)
-- ============================================
ALTER TABLE startup_projects ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 프로젝트 조회
CREATE POLICY "Users can read own projects"
  ON startup_projects FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자: 프로젝트 생성 (자기 user_id로만)
CREATE POLICY "Users can insert own projects"
  ON startup_projects FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자: 자기 프로젝트 수정
CREATE POLICY "Users can update own projects"
  ON startup_projects FOR UPDATE
  USING (auth.uid() = user_id);

-- PM/Admin: 배정된 프로젝트 조회 (service_role 또는 PM이 접근)
-- PM은 pm_id로 매칭되는 프로젝트 조회
CREATE POLICY "PMs can read assigned projects"
  ON startup_projects FOR SELECT
  USING (
    pm_id IN (
      SELECT id FROM project_managers WHERE email = auth.jwt()->>'email'
    )
  );

-- PM: 배정된 프로젝트 수정 (step 변경, status 변경 등)
CREATE POLICY "PMs can update assigned projects"
  ON startup_projects FOR UPDATE
  USING (
    pm_id IN (
      SELECT id FROM project_managers WHERE email = auth.jwt()->>'email'
    )
  );

-- ============================================
-- 2. project_messages (채팅)
-- ============================================
ALTER TABLE project_messages ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 프로젝트의 메시지 조회
CREATE POLICY "Users can read own project messages"
  ON project_messages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM startup_projects WHERE user_id = auth.uid()
    )
  );

-- 사용자: 자기 프로젝트에 메시지 작성
CREATE POLICY "Users can insert own project messages"
  ON project_messages FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM startup_projects WHERE user_id = auth.uid()
    )
  );

-- PM: 배정된 프로젝트 메시지 조회
CREATE POLICY "PMs can read assigned project messages"
  ON project_messages FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM startup_projects
      WHERE pm_id IN (
        SELECT id FROM project_managers WHERE email = auth.jwt()->>'email'
      )
    )
  );

-- PM: 배정된 프로젝트에 메시지 작성
CREATE POLICY "PMs can insert assigned project messages"
  ON project_messages FOR INSERT
  WITH CHECK (
    project_id IN (
      SELECT id FROM startup_projects
      WHERE pm_id IN (
        SELECT id FROM project_managers WHERE email = auth.jwt()->>'email'
      )
    )
  );

-- 시스템 메시지 삽입 허용 (SYSTEM sender_type)
CREATE POLICY "System can insert messages"
  ON project_messages FOR INSERT
  WITH CHECK (sender_type = 'SYSTEM');

-- ============================================
-- 3. project_milestones (마일스톤)
-- ============================================
ALTER TABLE project_milestones ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 프로젝트 마일스톤 조회
CREATE POLICY "Users can read own milestones"
  ON project_milestones FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM startup_projects WHERE user_id = auth.uid()
    )
  );

-- 누구나 INSERT 가능 (프로젝트 생성 시 자동 생성)
CREATE POLICY "Anyone can insert milestones"
  ON project_milestones FOR INSERT
  WITH CHECK (TRUE);

-- PM: 마일스톤 수정
CREATE POLICY "PMs can update milestones"
  ON project_milestones FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM startup_projects
      WHERE pm_id IN (
        SELECT id FROM project_managers WHERE email = auth.jwt()->>'email'
      )
    )
  );

-- ============================================
-- 4. profiles (사용자 프로필)
-- ============================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 프로필 조회/수정
CREATE POLICY "Users can read own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id OR auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.uid() = user_id);

-- Admin: 모든 프로필 조회 (통계용)
CREATE POLICY "Admin can read all profiles"
  ON profiles FOR SELECT
  USING (auth.jwt()->>'email' = 'admin@opening.run');

-- ============================================
-- 5. consultings (상담 예약)
-- ============================================
ALTER TABLE consultings ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 상담 조회
CREATE POLICY "Users can read own consultings"
  ON consultings FOR SELECT
  USING (auth.uid() = user_id);

-- 사용자: 상담 생성
CREATE POLICY "Users can insert own consultings"
  ON consultings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- 사용자: 자기 상담 수정
CREATE POLICY "Users can update own consultings"
  ON consultings FOR UPDATE
  USING (auth.uid() = user_id);

-- PM: 모든 상담 조회/수정
CREATE POLICY "PMs can read all consultings"
  ON consultings FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM project_managers WHERE email = auth.jwt()->>'email'
    )
  );

CREATE POLICY "PMs can update consultings"
  ON consultings FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM project_managers WHERE email = auth.jwt()->>'email'
    )
  );

-- ============================================
-- 6. quotes (견적)
-- ============================================
ALTER TABLE quotes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own quotes"
  ON quotes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own quotes"
  ON quotes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- PM: 견적 생성/조회
CREATE POLICY "PMs can manage quotes"
  ON quotes FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_managers WHERE email = auth.jwt()->>'email'
    )
  );

-- ============================================
-- 7. payments (결제)
-- ============================================
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 프로젝트 결제 조회
CREATE POLICY "Users can read own payments"
  ON payments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM startup_projects WHERE user_id = auth.uid()
    )
  );

-- 사용자: 결제 상태 업데이트 (결제 완료 처리)
CREATE POLICY "Users can update own payments"
  ON payments FOR UPDATE
  USING (
    project_id IN (
      SELECT id FROM startup_projects WHERE user_id = auth.uid()
    )
  );

-- PM: 결제 요청 생성/조회/수정
CREATE POLICY "PMs can manage payments"
  ON payments FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM project_managers WHERE email = auth.jwt()->>'email'
    )
  );

-- ============================================
-- 8. cost_standards (비용 기준 - 공개 읽기)
-- ============================================
ALTER TABLE cost_standards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read cost standards"
  ON cost_standards FOR SELECT
  USING (TRUE);

-- ============================================
-- 9. project_managers (PM 정보 - 공개 읽기)
-- ============================================
ALTER TABLE project_managers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read project managers"
  ON project_managers FOR SELECT
  USING (TRUE);

-- PM: 자기 정보 수정
CREATE POLICY "PMs can update own profile"
  ON project_managers FOR UPDATE
  USING (email = auth.jwt()->>'email');

-- Admin: PM 생성/삭제
CREATE POLICY "Admin can manage PMs"
  ON project_managers FOR ALL
  USING (auth.jwt()->>'email' = 'admin@opening.run');

-- ============================================
-- 10. vendors (업체 정보 - 공개 읽기)
-- ============================================
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read vendors"
  ON vendors FOR SELECT
  USING (TRUE);

-- ============================================
-- 11. gangnam_districts (강남 지역 - 공개 읽기)
-- ============================================
ALTER TABLE gangnam_districts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read gangnam districts"
  ON gangnam_districts FOR SELECT
  USING (TRUE);

-- ============================================
-- 12. government_programs (정부 지원 - 공개 읽기)
-- ============================================
ALTER TABLE government_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read government programs"
  ON government_programs FOR SELECT
  USING (TRUE);

-- ============================================
-- 13. startup_checklists (체크리스트)
-- ============================================
ALTER TABLE startup_checklists ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 체크리스트 조회/수정
CREATE POLICY "Users can read own checklists"
  ON startup_checklists FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own checklists"
  ON startup_checklists FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own checklists"
  ON startup_checklists FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================
-- 14. partners (파트너 업체)
-- ============================================
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;

-- 공개 읽기 (PM/사용자 모두 파트너 목록 조회)
CREATE POLICY "Anyone can read partners"
  ON partners FOR SELECT
  USING (TRUE);

-- Admin만 파트너 생성/수정/삭제
CREATE POLICY "Admin can manage partners"
  ON partners FOR ALL
  USING (auth.jwt()->>'email' = 'admin@opening.run');

-- ============================================
-- 15. project_partner_assignments (파트너 배정)
-- ============================================
ALTER TABLE project_partner_assignments ENABLE ROW LEVEL SECURITY;

-- 사용자: 자기 프로젝트 파트너 배정 조회
CREATE POLICY "Users can read own partner assignments"
  ON project_partner_assignments FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM startup_projects WHERE user_id = auth.uid()
    )
  );

-- PM: 배정된 프로젝트의 파트너 관리
CREATE POLICY "PMs can manage partner assignments"
  ON project_partner_assignments FOR ALL
  USING (
    project_id IN (
      SELECT id FROM startup_projects
      WHERE pm_id IN (
        SELECT id FROM project_managers WHERE email = auth.jwt()->>'email'
      )
    )
  );

-- ============================================
-- 16. furniture_listings (중고가구)
-- ============================================
ALTER TABLE furniture_listings ENABLE ROW LEVEL SECURITY;

-- 공개 읽기
CREATE POLICY "Anyone can read furniture listings"
  ON furniture_listings FOR SELECT
  USING (TRUE);

-- 사용자: 자기 매물 등록/수정/삭제
CREATE POLICY "Users can insert own listings"
  ON furniture_listings FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own listings"
  ON furniture_listings FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own listings"
  ON furniture_listings FOR DELETE
  USING (auth.uid() = user_id);
