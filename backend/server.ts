import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import archiver from 'archiver';
import { VibeConfig } from '../types';
import { presets } from '../presets';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize Gemini
// Guidelines: Use process.env.API_KEY directly.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

app.get('/api/presets', (req: Request, res: Response) => {
  res.json(presets);
});

// AI Generation Endpoint
app.post('/api/generate-config', async (req: Request, res: Response) => {
  const { prompt } = req.body;
  if (!prompt) {
    res.status(400).json({ error: "Prompt required" });
    return;
  }

  try {
    const model = 'gemini-2.5-flash';
    const schema = `
    {
      "name": "string",
      "description": "string",
      "palette": ["hex_string"],
      "background": { "type": "string enum(solid, gradient, nebula, grid)", "color1": "hex", "color2": "hex" },
      "geometry": { 
          "type": "string enum(particles, spheres, gridWaves, ribbonWave, orbits, fireworks, asciiShell, emojiExplosion, characterGeyser, fractureRoad, rocketLaunch, dnaSpiral, matrixRain, polyLandscape, cityLights, solarSphere, liquidField, warpTunnel, voxelFall, stoneStack, embers, glassRain, collidingWorlds, siegeFire, blackHole, tornado, neonCity, bioluminescentAbyss, thunderstorm, crystalGrowth, pixelSort, supernova)", 
          "count": "number", 
          "sizeRange": ["number", "number"], 
          "material": "string enum(glass, neon, metallic, hologram, matte, physical)",
          "textChar": "string (optional, for ascii/emoji/geyser/matrix)"
      },
      "motion": { "cameraDrift": "boolean", "cameraSpeed": "number 0-1", "pattern": "string enum(breathing, orbiting, drifting, pulsing, noiseFlow, explosion, linearFast, spiral)", "intensity": "number 0-1" },
      "overlay": { "glyphsEnabled": "boolean", "glyphStyle": "string enum(none, zenRunes, matrixCode, circuits)", "glyphOpacity": "number 0-1" },
      "postProcessing": { "bloom": "number 0-1", "glow": "number 0-1", "grain": "number 0-1", "chromaticAberration": "number 0-1" },
      "performance": { "targetFPS": 60, "quality": "medium", "maxParticles": 1000 }
    }
    `;

    const result = await ai.models.generateContent({
      model: model,
      contents: `Generate a VibeConfig JSON for a screensaver based on this vibe: "${prompt}". 
      Strictly follow this JSON schema structure: ${schema}
      Ensure colors are valid hex codes.`,
      config: {
        responseMimeType: 'application/json',
      }
    });

    const text = result.text || "{}";
    const config = JSON.parse(text);
    config.id = "ai-gen-" + Date.now();
    res.json(config);

  } catch (error) {
    console.error("Gemini Error:", error);
    res.status(500).json({ error: "Failed to generate config" });
  }
});

// Nano Banana Stub
app.post('/api/generate-image', (req: Request, res: Response) => {
    // Stub
    res.json({
        url: `https://picsum.photos/1024/1024?random=${Date.now()}`
    });
});

// Export Bundle Endpoint
app.post('/api/export-bundle', (req: Request, res: Response) => {
  const config = req.body as VibeConfig;

  const archive = archiver('zip', { zlib: { level: 9 } });
  
  res.attachment(`ZEN-VibeSaver-${config.id}.zip`);
  archive.pipe(res as any);

  // Standalone HTML export stub
  const htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>${config.name} - ZEN VibeSaver</title>
    <style>body { margin: 0; overflow: hidden; background: #000; }</style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
</head>
<body>
    <script>
        // Simplified fallback for export
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
        camera.position.z = 10;
        const renderer = new THREE.WebGLRenderer({antialias:true});
        renderer.setSize(window.innerWidth, window.innerHeight);
        document.body.appendChild(renderer.domElement);
        
        const geo = new THREE.BoxGeometry(1,1,1);
        const mat = new THREE.MeshBasicMaterial({color: "${config.palette[0]}"});
        const cube = new THREE.Mesh(geo, mat);
        scene.add(cube);
        
        function animate() {
            requestAnimationFrame(animate);
            cube.rotation.x += 0.01;
            cube.rotation.y += 0.01;
            renderer.render(scene, camera);
        }
        animate();
    </script>
</body>
</html>
  `;

  archive.append(htmlContent, { name: 'index.html' });
  archive.finalize();
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});