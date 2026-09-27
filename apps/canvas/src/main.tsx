import './index.css';

import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';

import { CanvasPage } from './canvas-page';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <CanvasPage />
  </StrictMode>,
);
