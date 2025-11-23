import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

// Inject Global Styles
const styles = `
/* Global Reset */
* { box-sizing: border-box; margin: 0; padding: 0; }
body { background: #050505; color: #e0e0e0; font-family: 'Inter', system-ui, sans-serif; overflow: hidden; }

/* App Styles */
.app-container { display: flex; height: 100vh; width: 100vw; background-color: #080808; color: #c0c0c0; }
.sidebar { width: 360px; background-color: #111; border-right: 1px solid #222; display: flex; flex-direction: column; overflow-y: auto; flex-shrink: 0; transition: transform 0.3s ease; z-index: 10; }
.sidebar.hidden { transform: translateX(-100%); position: absolute; }
.header { padding: 20px; background: #000; border-bottom: 1px solid #222; }
.header h1 { font-size: 1.2rem; color: #fff; font-weight: 700; letter-spacing: -0.5px; }
.header p { font-size: 0.8rem; color: #666; text-transform: uppercase; letter-spacing: 1px; }
.preview-container { flex-grow: 1; position: relative; overflow: hidden; background: #000; }
.preview-toolbar { position: absolute; top: 20px; right: 20px; z-index: 20; display: flex; gap: 10px; }
.btn-icon { background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); border: 1px solid rgba(255, 255, 255, 0.2); color: #fff; padding: 8px 16px; border-radius: 20px; cursor: pointer; font-size: 0.8rem; transition: all 0.2s; }
.btn-icon:hover { background: #fff; color: #000; }

/* Controls Styles */
.controls-container { display: flex; flex-direction: column; height: 100%; }
.tabs { display: flex; border-bottom: 1px solid #333; }
.tabs button { flex: 1; padding: 15px; background: transparent; border: none; color: #666; cursor: pointer; font-weight: 600; }
.tabs button.active-tab { color: #fff; border-bottom: 2px solid #fff; background: #1a1a1a; }
.content { flex-grow: 1; overflow-y: auto; padding: 20px; }
.preset-list { display: grid; gap: 10px; }
.preset-item { background: #1a1a1a; border: 1px solid #333; padding: 12px; text-align: left; cursor: pointer; border-radius: 6px; transition: all 0.2s; }
.preset-item:hover { background: #252525; }
.preset-item.selected { border-color: #007aff; background: #1a1a2e; }
.preset-name { display: block; color: #fff; font-weight: 600; margin-bottom: 4px; }
.preset-desc { display: block; color: #888; font-size: 0.8rem; }
.section { margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #222; }
.section h3 { font-size: 0.9rem; color: #888; text-transform: uppercase; margin-bottom: 12px; }
.prompt-input { width: 100%; height: 80px; background: #000; border: 1px solid #333; color: #fff; padding: 8px; border-radius: 4px; margin-bottom: 8px; font-family: inherit; resize: none; }
.gen-btn { width: 100%; padding: 10px; background: linear-gradient(90deg, #4b6cb7 0%, #182848 100%); color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: 600; }
.gen-btn:disabled { opacity: 0.7; cursor: wait; }
.error { color: #ff4d4d; font-size: 0.8rem; margin-top: 8px; }
.row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.row select { background: #000; color: #fff; border: 1px solid #333; padding: 4px 8px; border-radius: 4px; }
.slider-group { margin-bottom: 10px; }
.slider-group label { display: block; font-size: 0.8rem; margin-bottom: 4px; }
.slider-group input { width: 100%; }
.file-label { display: block; font-size: 0.8rem; margin-bottom: 8px; background: #1a1a1a; padding: 8px; border-radius: 4px; border: 1px dashed #444; cursor: pointer; }
.file-label input { display: none; }
.secondary-btn { width: 100%; padding: 8px; background: #333; color: #ddd; border: none; border-radius: 4px; cursor: pointer; margin-top: 8px; font-size: 0.8rem; }
.footer { padding: 20px; border-top: 1px solid #222; display: flex; gap: 10px; }
.export-btn { flex: 1; background: #1a1a1a; color: #fff; border: 1px solid #333; padding: 12px; border-radius: 4px; cursor: pointer; }
.export-btn-main { flex: 2; background: #fff; color: #000; border: none; padding: 12px; border-radius: 4px; font-weight: 700; cursor: pointer; }
`;

const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);