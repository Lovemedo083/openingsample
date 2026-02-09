/**
 * 골목상권 실시간 분석 API 클라이언트
 * 서버의 /api/golmok/* 엔드포인트와 통신합니다.
 */

import type { GolmokScrapeRequest, GolmokJobResponse } from '../types';

/** 스크래핑 작업 시작 */
export async function startGolmokScrape(request: GolmokScrapeRequest): Promise<{ jobId: string }> {
  const res = await fetch('/api/golmok/scrape', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  if (res.status === 429) {
    throw new Error('분석이 이미 진행 중입니다. 잠시 후 다시 시도해주세요.');
  }

  if (!res.ok) {
    const data = await res.json().catch(() => ({ error: '서버 오류가 발생했습니다.' }));
    throw new Error(data.error || `서버 오류 (${res.status})`);
  }

  return res.json();
}

/** 작업 상태 조회 */
export async function getGolmokJobStatus(jobId: string): Promise<GolmokJobResponse> {
  const res = await fetch(`/api/golmok/status/${jobId}`);

  if (!res.ok) {
    throw new Error(`상태 조회 실패 (${res.status})`);
  }

  return res.json();
}

/** 완료까지 폴링 */
export async function pollGolmokJob(
  jobId: string,
  onProgress: (progress: number, message: string) => void,
  intervalMs = 3000,
  timeoutMs = 120000,
): Promise<GolmokJobResponse> {
  const startTime = Date.now();

  return new Promise((resolve, reject) => {
    const poll = async () => {
      try {
        if (Date.now() - startTime > timeoutMs) {
          reject(new Error('분석 시간이 초과되었습니다 (2분). 다시 시도해주세요.'));
          return;
        }

        const status = await getGolmokJobStatus(jobId);
        onProgress(status.progress, status.message || '');

        if (status.status === 'COMPLETED') {
          resolve(status);
          return;
        }

        if (status.status === 'FAILED') {
          reject(new Error(status.error || '분석 중 오류가 발생했습니다.'));
          return;
        }

        // Continue polling
        setTimeout(poll, intervalMs);
      } catch (err) {
        reject(err);
      }
    };

    poll();
  });
}
