export interface VibeConfig {
  id: string;
  name: string;
  description: string;

  palette: string[]; // hex colors

  background: {
    type: "solid" | "gradient" | "nebula" | "grid";
    color1?: string;
    color2?: string;
  };

  geometry: {
    type: 
      | "particles" 
      | "spheres" 
      | "gridWaves" 
      | "ribbonWave" 
      | "orbits" 
      | "fireworks" 
      | "asciiShell" 
      | "emojiExplosion" 
      | "characterGeyser" 
      | "fractureRoad" 
      | "rocketLaunch" 
      | "dnaSpiral" 
      | "matrixRain" 
      | "polyLandscape" 
      | "cityLights"
      | "solarSphere"
      | "liquidField"
      | "warpTunnel"
      | "voxelFall"
      | "stoneStack"
      | "embers"
      | "glassRain"
      | "nebulaCloud"
      // New Exotic Simulations
      | "collidingWorlds"
      | "siegeFire"
      | "blackHole"
      | "neonCity"
      | "bioluminescentAbyss"
      | "thunderstorm"
      | "crystalGrowth"
      | "tornado"
      | "pixelSort"
      | "supernova";
    count: number;
    sizeRange: [number, number]; // [min, max]
    material: "glass" | "neon" | "metallic" | "hologram" | "matte" | "physical";
    textChar?: string; // For ASCII/Emoji/Geyser modes
  };

  motion: {
    cameraDrift: boolean;
    cameraSpeed: number; // 0.0–1.0
    pattern: "breathing" | "orbiting" | "drifting" | "pulsing" | "noiseFlow" | "explosion" | "linearFast" | "spiral";
    intensity: number; // 0.0–1.0
  };

  overlay: {
    glyphsEnabled: boolean;
    glyphStyle: "none" | "zenRunes" | "matrixCode" | "circuits";
    glyphOpacity: number; // 0.0–1.0
  };

  postProcessing: {
    bloom: number; // 0.0–1.0
    glow: number;  // 0.0–1.0
    grain: number; // 0.0–1.0
    chromaticAberration: number; // 0.0–1.0
  };

  performance: {
    targetFPS: number;
    quality: "low" | "medium" | "high" | "auto";
    maxParticles: number;
  };

  assets?: {
    backgroundImageUrl?: string;
    textureImageUrl?: string;
  };
}