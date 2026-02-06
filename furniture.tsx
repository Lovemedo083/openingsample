import React from 'react';
import { createRoot } from 'react-dom/client';
import { Furniture3DView } from './components/Furniture3DView';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Furniture3DView />
  </React.StrictMode>
);
