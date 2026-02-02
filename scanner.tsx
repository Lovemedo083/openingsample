import React from 'react';
import { createRoot } from 'react-dom/client';
import { Scanner3DView } from './components/Scanner3DView';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Scanner3DView />
  </React.StrictMode>
);
