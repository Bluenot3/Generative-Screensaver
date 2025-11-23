import React, { useState, useEffect } from 'react';
import { VibeConfig } from './types';
import { presets } from './presets';
import VibeRenderer from './components/VibeRenderer';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [config, setConfig] = useState<VibeConfig>(presets[0]);
  const [isPlaying, setIsPlaying] = useState(true);
  const [mode, setMode] = useState<'preset' | 'custom'>('preset');
  const [fullscreen, setFullscreen] = useState(false);

  const handlePresetSelect = (id: string) => {
    const preset = presets.find(p => p.id === id);
    if (preset) {
      setConfig(preset);
      setMode('preset');
    }
  };

  const handleConfigChange = (newConfig: Partial<VibeConfig>) => {
    setConfig(prev => ({ ...prev, ...newConfig }));
    setMode('custom');
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setFullscreen(true));
    } else {
      document.exitFullscreen().then(() => setFullscreen(false));
    }
  };

  // Sync fullscreen state listener
  useEffect(() => {
    const handler = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', handler);
    return () => document.removeEventListener('fullscreenchange', handler);
  }, []);

  return (
    <div className="app-container">
      {/* Sidebar Controls */}
      <div className={`sidebar ${fullscreen ? 'hidden' : ''}`}>
        <header className="header">
          <h1>ZEN VibeSaver</h1>
          <p>Studio Edition</p>
        </header>

        <Controls 
          config={config} 
          mode={mode}
          setMode={setMode}
          onPresetSelect={handlePresetSelect}
          onConfigChange={handleConfigChange}
          presets={presets}
        />
      </div>

      {/* Main Preview Area */}
      <div className="preview-container">
        <div className="preview-toolbar">
          <button onClick={() => setIsPlaying(!isPlaying)} className="btn-icon">
            {isPlaying ? '⏸ Pause' : '▶ Play'}
          </button>
          <button onClick={toggleFullscreen} className="btn-icon">
            {fullscreen ? '↙ Exit Fullscreen' : '↗ Fullscreen'}
          </button>
        </div>
        
        <VibeRenderer 
          config={config} 
          isPlaying={isPlaying} 
        />
      </div>
    </div>
  );
};

export default App;