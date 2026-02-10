# REPORT 3 — 로그인 후 취소 시 로그아웃 상태로 보이는 버그 수정

**날짜:** 2026-02-10
**수정 파일:** `App.tsx`
**브랜치:** `main`

---

## 1. 증상

| 단계 | 동작 | 결과 |
|------|------|------|
| 1 | 로그아웃 상태에서 메인 페이지 진입 | 랜딩 페이지 정상 표시 |
| 2 | "내 프로젝트 보기" 등으로 로그인 수행 | 로그인 성공, ServiceJourneyView로 이동 |
| 3 | ServiceJourneyView에서 **"취소"** 클릭 | **랜딩 페이지(로그아웃 화면)로 돌아감** — 로그인이 풀린 것처럼 보임 |
| 4 | 브라우저 **새로고침** | "OOO 사장님 반갑습니다" 대시보드 정상 표시 |

- 실제 Supabase 세션은 유효한 상태이나, UI상으로는 로그아웃된 것처럼 보이는 현상
- 새로고침 없이는 인증 상태가 화면에 반영되지 않음

---

## 2. 원인

### 핵심: `onLoginSuccess` 콜백에서 React 인메모리 상태 미갱신

`LoginView`에서 `signInWithPassword()` 성공 후 호출되는 `onLoginSuccess` 콜백의 기존 코드:

```typescript
// App.tsx (수정 전)
onLoginSuccess={() => {
  setShowLogin(false);    // UI 플래그만 변경
  setShowLanding(false);  // UI 플래그만 변경
  // ❌ setIsAuthenticated(true) 호출 없음
  // ❌ setUser(...) 호출 없음
}}
```

**문제의 흐름:**

1. 로그인 성공 → Supabase SDK가 `localStorage`에 세션 저장 → **완료**
2. `onLoginSuccess()` 실행 → `showLogin`, `showLanding`만 `false`로 변경
3. React 상태 `isAuthenticated`는 여전히 `false`, `user`는 여전히 `null`
4. ServiceJourneyView에 `isGuestMode={!isAuthenticated}` → `isGuestMode = true` (게스트 취급)
5. 취소 클릭 → 게스트 모드 분기 → `setShowLanding(true)` → 랜딩 페이지 표시

**새로고침 시 정상인 이유:**

페이지 로드 시 `onAuthStateChange` 리스너가 Supabase 세션을 감지하여 `handleSession()`을 호출하고, 이 함수가 `setIsAuthenticated(true)`, `setUser(...)`, `loadUserData()` 등을 모두 수행하기 때문.

---

## 3. 수정 내역

### 파일: `App.tsx` (line 332–339)

`onLoginSuccess` 콜백에서 Supabase 세션을 조회한 뒤 `handleSession()`을 호출하여 인증 상태를 즉시 동기화하도록 수정.

```typescript
// App.tsx (수정 후)
onLoginSuccess={async () => {
  setShowLogin(false);
  setShowLanding(false);
  // Supabase 세션에서 인증 상태 즉시 동기화
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    await handleSession(session);
  }
}}
```

### `handleSession()`이 수행하는 작업

- `setIsAuthenticated(true)` — 인증 플래그 설정
- `setUser(...)` — 사용자 정보(이름, 전화번호 등) 설정
- `loadUserData()` — 사용자의 프로젝트, 견적, 상담 데이터 로드

### 부작용 검토

- `onAuthStateChange` 리스너와 중복 호출 가능성이 있으나, `handleSession` 내부 상태 설정은 멱등성(idempotent)이 보장되어 문제 없음
- `onLoginSuccess`가 먼저 실행되므로 `onAuthStateChange`의 `handled` 플래그 시점과 충돌하지 않음

---

## 4. 결과

### 빌드 검증

```
npm run build → ✓ built in 3.57s (에러 없음)
```

### 수정 후 예상 동작

| 단계 | 동작 | 수정 전 | 수정 후 |
|------|------|---------|---------|
| 1 | 로그아웃 → 로그인 | 세션 저장됨, React 상태 미갱신 | 세션 저장 + React 상태 즉시 갱신 |
| 2 | ServiceJourneyView 진입 | `isGuestMode = true` | `isGuestMode = false` |
| 3 | "취소" 클릭 | 랜딩 페이지(로그아웃 화면) | **대시보드(로그인 상태 유지)** |
| 4 | 새로고침 | 정상 (기존과 동일) | 정상 (기존과 동일) |

### 변경 범위

- 수정 파일: **1개** (`App.tsx`)
- 변경 라인: **3줄 추가** (기존 2줄 → 7줄)
- 영향 범위: 로그인 직후 상태 동기화에만 영향, 기존 로직 변경 없음
