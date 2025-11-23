import React, { useState, ChangeEvent } from 'react';
import { VibeConfig } from '../types';

interface ControlsProps {
  config: VibeConfig;
  mode: 'preset' | 'custom';
  setMode: (m: 'preset' | 'custom') => void;
  onPresetSelect: (id: string) => void;
  onConfigChange: (c: Partial<VibeConfig>) => void;
  presets: VibeConfig[];
}

const Controls: React.FC<ControlsProps> = ({ 
  config, mode, setMode, onPresetSelect, onConfigChange, presets 
}) => {
  const [prompt, setPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [genError, setGenError] = useState('');

  const handleGenerate = async () => {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setGenError('');

    try {
      const res = await fetch('http://localhost:3001/api/generate-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt })
      });
      if (!res.ok) throw new Error("Failed to generate");
      const data = await res.json();
      onConfigChange(data);
    } catch (e) {
      setGenError('AI generation failed. Check API key.');
      console.error(e);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleNanoBanana = async () => {
    const res = await fetch('http://localhost:3001/api/generate-image', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ prompt: "Exotic texture based on " + config.name })
    });
    const data = await res.json();
    if(data.url) {
        onConfigChange({ assets: { ...config.assets, textureImageUrl: data.url }});
    }
  };

  const handleExport = async (type: 'json' | 'zip') => {
    if (type === 'json') {
      const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${config.name.replace(/\s+/g, '-')}.json`;
      a.click();
    } else {
      const res = await fetch('http://localhost:3001/api/export-bundle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `ZEN-VibeSaver-${config.name.replace(/\s+/g, '-')}.zip`;
      a.click();
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>, key: 'backgroundImageUrl' | 'textureImageUrl') => {
    if (e.target.files && e.target.files[0]) {
      const url = URL.createObjectURL(e.target.files[0]);
      onConfigChange({ assets: { ...config.assets, [key]: url } });
    }
  };

  return (
    <div className="controls-container">
      <div className="tabs">
        <button 
          className={mode === 'preset' ? 'active-tab' : ''} 
          onClick={() => setMode('preset')}
        >
          Presets
        </button>
        <button 
          className={mode === 'custom' ? 'active-tab' : ''} 
          onClick={() => setMode('custom')}
        >
          Designer
        </button>
      </div>

      <div className="content">
        {mode === 'preset' ? (
          <div className="preset-list">
            {presets.map(p => (
              <button 
                key={p.id} 
                className={`preset-item ${config.id === p.id ? 'selected' : ''}`}
                onClick={() => onPresetSelect(p.id)}
              >
                <span className="preset-name">{p.name}</span>
                <span className="preset-desc">{p.description}</span>
              </button>
            ))}
          </div>
        ) : (
          <div className="custom-controls">
            <div className="section">
              <h3>AI Vibe Generator</h3>
              <textarea 
                value={prompt} 
                onChange={e => setPrompt(e.target.value)}
                placeholder="Describe your vibe (e.g. 'Cyberpunk forest with neon rain')..."
                className="prompt-input"
              />
              <button 
                onClick={handleGenerate} 
                disabled={isGenerating}
                className="gen-btn"
              >
                {isGenerating ? 'Dreaming...' : '✨ Generate with Gemini'}
              </button>
              {genError && <div className="error">{genError}</div>}
            </div>

            <div className="section">
              <h3>Geometry</h3>
              <div className="row">
                <label>Type</label>
                <select 
                  value={config.geometry.type}
                  onChange={e => onConfigChange({ geometry: { ...config.geometry, type: e.target.value as any }})}
                >
                  <optgroup label="Simulations">
                    <option value="collidingWorlds">Colliding Worlds</option>
                    <option value="siegeFire">Siege of Fire</option>
                    <option value="blackHole">Black Hole</option>
                    <option value="tornado">Tornado</option>
                    <option value="neonCity">Neon City</option>
                    <option value="thunderstorm">Thunderstorm</option>
                    <option value="bioluminescentAbyss">Bio Abyss</option>
                    <option value="supernova">Supernova</option>
                    <option value="pixelSort">Pixel Sort</option>
                    <option value="crystalGrowth">Crystal Growth</option>
                  </optgroup>
                  <optgroup label="Standard">
                    <option value="solarSphere">Solar Sphere</option>
                    <option value="liquidField">Liquid Field</option>
                    <option value="warpTunnel">Warp Tunnel</option>
                    <option value="ribbonWave">Ribbon Wave</option>
                    <option value="stoneStack">Stone Stack</option>
                    <option value="voxelFall">Voxel Fall</option>
                    <option value="glassRain">Glass Rain</option>
                    <option value="embers">Embers</option>
                    <option value="particles">Particles</option>
                    <option value="spheres">Spheres</option>
                    <option value="characterGeyser">Char Geyser</option>
                    <option value="matrixRain">Matrix Rain</option>
                    <option value="emojiExplosion">Emoji Explosion</option>
                  </optgroup>
                </select>
              </div>
              
              {['asciiShell', 'emojiExplosion', 'characterGeyser', 'matrixRain'].includes(config.geometry.type) && (
                <div className="row">
                    <label>Chars/Emojis</label>
                    <input 
                        type="text" 
                        value={config.geometry.textChar || ""} 
                        onChange={e => onConfigChange({ geometry: { ...config.geometry, textChar: e.target.value }})}
                        placeholder="e.g. @#$% or 🔥😎"
                        style={{background: '#000', border: '1px solid #333', color: '#fff', padding: '4px', width: '120px'}}
                    />
                </div>
              )}

              <div className="row">
                <label>Material</label>
                <select 
                  value={config.geometry.material}
                  onChange={e => onConfigChange({ geometry: { ...config.geometry, material: e.target.value as any }})}
                >
                  <option value="glass">Glass</option>
                  <option value="physical">Physical (High Quality)</option>
                  <option value="neon">Neon</option>
                  <option value="metallic">Metallic</option>
                  <option value="hologram">Hologram</option>
                  <option value="matte">Matte</option>
                </select>
              </div>
            </div>

            <div className="section">
                <h3>Post-Processing</h3>
                <div className="slider-group">
                    <label>Bloom</label>
                    <input type="range" min="0" max="1" step="0.1" 
                        value={config.postProcessing.bloom}
                        onChange={e => onConfigChange({ postProcessing: { ...config.postProcessing, bloom: parseFloat(e.target.value) }})}
                    />
                </div>
                <div className="slider-group">
                    <label>Grain</label>
                    <input type="range" min="0" max="1" step="0.1" 
                        value={config.postProcessing.grain}
                        onChange={e => onConfigChange({ postProcessing: { ...config.postProcessing, grain: parseFloat(e.target.value) }})}
                    />
                </div>
            </div>

            <div className="section">
                <h3>Assets</h3>
                <label className="file-label">
                    Background Image
                    <input type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'backgroundImageUrl')} />
                </label>
                <button onClick={handleNanoBanana} className="secondary-btn">🍌 Generate Exotic Texture</button>
            </div>
          </div>
        )}
      </div>

      <div className="footer">
        <button onClick={() => handleExport('json')} className="export-btn">JSON</button>
        <button onClick={() => handleExport('zip')} className="export-btn-main">Export Bundle (ZIP)</button>
      </div>
    </div>
  );
};

export default Controls;