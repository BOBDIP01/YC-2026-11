import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Suppress benign C++ INFO/WARNING messages emitted via console.error by MediaPipe / TensorFlow Lite WASM
const origConsoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  const first = typeof args[0] === 'string' ? args[0] : '';
  if (
    first.includes('Created TensorFlow Lite XNNPACK delegate') ||
    first.includes('INFO: Created TensorFlow Lite') ||
    first.startsWith('INFO:') ||
    first.startsWith('I0000 ') ||
    first.startsWith('W0000 ')
  ) {
    return;
  }
  origConsoleError(...args);
};

createRoot(document.getElementById('root')!).render(<App />);
