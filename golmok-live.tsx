/**
 * 골목상권 실시간 분석 엔트리포인트
 * 독립 실행: npm run dev 후 http://localhost:3000/golmok-live.html
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GolmokLiveAnalysisView } from './components/GolmokLiveAnalysisView';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GolmokLiveAnalysisView />
  </React.StrictMode>
);
