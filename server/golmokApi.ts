/**
 * 골목상권 실시간 분석 API 미들웨어
 * Vite dev server의 connect 미들웨어에 등록하여 사용합니다.
 */

import type { Connect } from 'vite';
import crypto from 'crypto';

// --- Job Types ---

interface Job {
  id: string;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  progress: number;
  message: string;
  result: any | null;
  error: string | null;
  createdAt: number;
}

// --- In-memory Store ---

const jobs = new Map<string, Job>();
let scraperBusy = false;

// Clean up old jobs (older than 10 minutes)
function cleanupJobs() {
  const now = Date.now();
  for (const [id, job] of jobs) {
    if (now - job.createdAt > 10 * 60 * 1000) {
      jobs.delete(id);
    }
  }
}

// --- Helper: parse JSON body ---

function parseBody(req: Connect.IncomingMessage): Promise<any> {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk: Buffer) => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (e) {
        reject(new Error('Invalid JSON'));
      }
    });
    req.on('error', reject);
  });
}

// --- Run scraper in background ---

async function runScraper(job: Job, request: { address: string; businessCategory: string; lat?: number; lon?: number }) {
  try {
    job.status = 'RUNNING';
    job.progress = 5;
    job.message = '스크래퍼 모듈 로딩 중...';

    // Dynamic import to avoid bundling Puppeteer in client
    const { GolmokScraper } = await import('../scripts/golmokScraper');

    const scraper = new GolmokScraper({ headless: true });

    job.progress = 10;
    job.message = '브라우저 초기화 중...';

    await scraper.init();

    try {
      const result = await scraper.analyze(
        {
          address: request.address,
          businessCategory: request.businessCategory as any,
          lat: request.lat,
          lon: request.lon,
          radiusMeters: 500,
        },
        (percent, message) => {
          job.progress = percent;
          job.message = message;
        },
      );

      job.status = 'COMPLETED';
      job.progress = 100;
      job.message = '분석 완료';
      job.result = result;
    } finally {
      await scraper.close();
    }
  } catch (err) {
    job.status = 'FAILED';
    job.progress = 0;
    job.error = err instanceof Error ? err.message : 'Unknown error';
    job.message = '분석 실패';
  } finally {
    scraperBusy = false;
  }
}

// --- Register Routes ---

export function registerGolmokRoutes(middlewares: Connect.Server) {
  middlewares.use((req, res, next) => {
    const url = req.url || '';

    // POST /api/golmok/scrape
    if (req.method === 'POST' && url === '/api/golmok/scrape') {
      if (scraperBusy) {
        res.statusCode = 429;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: '분석이 이미 진행 중입니다. 잠시 후 다시 시도해주세요.' }));
        return;
      }

      parseBody(req).then((body) => {
        const { address, businessCategory, lat, lon } = body;

        if (!address) {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(JSON.stringify({ error: '주소를 입력해주세요.' }));
          return;
        }

        cleanupJobs();

        const jobId = crypto.randomUUID();
        const job: Job = {
          id: jobId,
          status: 'PENDING',
          progress: 0,
          message: '분석 대기 중...',
          result: null,
          error: null,
          createdAt: Date.now(),
        };

        jobs.set(jobId, job);
        scraperBusy = true;

        // Run scraper asynchronously
        runScraper(job, { address, businessCategory: businessCategory || '전체', lat, lon });

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ jobId }));
      }).catch((err) => {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: err.message }));
      });
      return;
    }

    // GET /api/golmok/status/:jobId
    const statusMatch = url.match(/^\/api\/golmok\/status\/(.+)$/);
    if (req.method === 'GET' && statusMatch) {
      const jobId = statusMatch[1];
      const job = jobs.get(jobId);

      if (!job) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Job not found' }));
        return;
      }

      res.statusCode = 200;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({
        jobId: job.id,
        status: job.status,
        progress: job.progress,
        message: job.message,
        result: job.result,
        error: job.error,
      }));
      return;
    }

    next();
  });
}
