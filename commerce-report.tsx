/**
 * 골목상권 분석 보고서 엔트리포인트
 * 독립 실행: npm run dev 후 http://localhost:3000/commerce-report.html
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import { GolmokReportView } from './components/GolmokReportView';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <GolmokReportView />
  </React.StrictMode>
);
