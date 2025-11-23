import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass';
import { FilmPass } from 'three/examples/jsm/postprocessing/FilmPass';
import { VibeConfig } from '../types';

interface VibeRendererProps {
  config: VibeConfig;
  isPlaying: boolean;
}

// Global Texture Cache
const textureCache: Record<string, THREE.Texture> = {};

// Helper: Create a texture from a character
const getCharTexture = (char: string, color: string) => {
  const key = `${char}-${color}`;
  if (textureCache[key]) return textureCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, 128, 128);
    ctx.fillStyle = color;
    ctx.font = '80px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(char, 64, 64);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.needsUpdate = true;
  textureCache[key] = tex;
  return tex;
};

// --- RENDER COMPONENT ---
const VibeRenderer: React.FC<VibeRendererProps> = ({ config, isPlaying }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const frameIdRef = useRef<number>(0);
  const timeRef = useRef<number>(0);
  
  // Store objects and their specific animation data
  const objectsRef = useRef<{ mesh: THREE.Object3D, data?: any }[]>([]);

  // Initialize Three.js
  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(75, mountRef.current.clientWidth / mountRef.current.clientHeight, 0.1, 1000);
    camera.position.z = 20;
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
    renderer.setSize(mountRef.current.clientWidth, mountRef.current.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    mountRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    
    // Bloom Pass
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 1.5, 0.4, 0.85);
    composer.addPass(bloomPass);

    // Film Grain Pass
    const filmPass = new FilmPass(0.35, 0.025, 648, false);
    composer.addPass(filmPass);

    composerRef.current = composer;

    const handleResize = () => {
      if (!mountRef.current) return;
      const width = mountRef.current.clientWidth;
      const height = mountRef.current.clientHeight;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
      composer.setSize(width, height);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(frameIdRef.current);
      if (rendererRef.current && mountRef.current) {
        mountRef.current.removeChild(rendererRef.current.domElement);
      }
      renderer.dispose();
    };
  }, []);

  // --- SCENE BUILDER ---
  useEffect(() => {
    if (!sceneRef.current || !composerRef.current) return;
    const scene = sceneRef.current;

    // Cleanup
    objectsRef.current.forEach(item => scene.remove(item.mesh));
    objectsRef.current = [];
    while(scene.children.length > 0) scene.remove(scene.children[0]);

    // Background
    if (config.assets?.backgroundImageUrl) {
      new THREE.TextureLoader().load(config.assets.backgroundImageUrl, (texture) => {
        scene.background = texture;
      });
    } else {
        if (config.background.type === 'solid') {
            scene.background = new THREE.Color(config.background.color1 || '#000');
            scene.fog = null;
        } else if (config.background.type === 'grid') {
            scene.background = new THREE.Color('#000');
            scene.fog = new THREE.Fog(config.background.color1 || '#000', 5, 60);
            const grid = new THREE.GridHelper(200, 100, config.background.color1, config.background.color2);
            grid.position.y = -10;
            scene.add(grid);
        } else if (config.background.type === 'nebula') {
            scene.background = new THREE.Color(config.background.color1 || '#000');
            scene.fog = new THREE.FogExp2(config.background.color2 || '#000', 0.015);
        } else {
            scene.background = new THREE.Color(config.background.color1 || '#000');
            scene.fog = null;
        }
    }

    const paletteColors = config.palette.map(c => new THREE.Color(c));
    const getRandomColor = () => paletteColors[Math.floor(Math.random() * paletteColors.length)];
    const getRandomHex = () => config.palette[Math.floor(Math.random() * config.palette.length)];

    // --- GEOMETRY ENGINES ---

    if (config.geometry.type === 'collidingWorlds') {
        const group = new THREE.Group();
        
        // Two spheres that will collide
        const sphereGeo = new THREE.SphereGeometry(3, 32, 32);
        const matLeft = new THREE.MeshPhysicalMaterial({ color: config.palette[0], transmission: 0.5, roughness: 0.1 });
        const matRight = new THREE.MeshPhysicalMaterial({ color: config.palette[1], transmission: 0.5, roughness: 0.1 });
        
        const sphereLeft = new THREE.Mesh(sphereGeo, matLeft);
        sphereLeft.position.x = -10;
        const sphereRight = new THREE.Mesh(sphereGeo, matRight);
        sphereRight.position.x = 10;
        
        group.add(sphereLeft);
        group.add(sphereRight);

        // Debris field (initially hidden)
        const debrisCount = config.geometry.count;
        const debrisGeo = new THREE.TetrahedronGeometry(0.2);
        const debrisMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const debrisMesh = new THREE.InstancedMesh(debrisGeo, debrisMat, debrisCount);
        debrisMesh.visible = false;
        
        // Pre-calculate random velocities for debris
        const debrisVels = [];
        const dummy = new THREE.Object3D();
        for(let i=0; i<debrisCount; i++) {
            dummy.position.set(0,0,0);
            dummy.updateMatrix();
            debrisMesh.setMatrixAt(i, dummy.matrix);
            debrisMesh.setColorAt(i, getRandomColor());
            debrisVels.push(new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).normalize().multiplyScalar(Math.random()*0.5));
        }

        group.add(debrisMesh);
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'collidingWorlds', sphereLeft, sphereRight, debrisMesh, debrisVels, state: 'approach', timer: 0 } });

    } else if (config.geometry.type === 'siegeFire') {
        const group = new THREE.Group();
        // Castle Blocks (Voxels)
        const castleGeo = new THREE.BoxGeometry(1,1,1);
        const castleMat = new THREE.MeshStandardMaterial({ color: 0x333333 });
        const castle = new THREE.InstancedMesh(castleGeo, castleMat, 200);
        const castlePos = [];
        const dummy = new THREE.Object3D();
        let idx = 0;
        for(let x=-5; x<=5; x++) {
            for(let y=0; y<5; y++) {
                for(let z=-2; z<=2; z++) {
                    if (idx < 200) {
                        dummy.position.set(x, y-5, z);
                        castlePos.push({y: y-5, active: true});
                        dummy.updateMatrix();
                        castle.setMatrixAt(idx++, dummy.matrix);
                    }
                }
            }
        }
        group.add(castle);

        // Arrows
        const arrowCount = config.geometry.count;
        const arrowGeo = new THREE.ConeGeometry(0.05, 0.5, 4);
        arrowGeo.rotateX(Math.PI/2); // Point forward
        const arrowMat = new THREE.MeshBasicMaterial({ color: 0x8b4513 });
        const arrows = new THREE.InstancedMesh(arrowGeo, arrowMat, arrowCount);
        const arrowData = [];
        for(let i=0; i<arrowCount; i++) {
            arrowData.push({
                pos: new THREE.Vector3((Math.random()-0.5)*20, -5, 20 + Math.random()*10),
                vel: new THREE.Vector3((Math.random()-0.5)*0.5, 0.5+Math.random()*0.5, -0.5 - Math.random()*0.3),
                active: false,
                delay: Math.random() * 200
            });
            dummy.position.set(0, -100, 0); // Hide initially
            dummy.updateMatrix();
            arrows.setMatrixAt(i, dummy.matrix);
        }
        group.add(arrows);
        
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'siegeFire', castle, arrows, arrowData, castlePos } });

    } else if (config.geometry.type === 'blackHole') {
        const group = new THREE.Group();
        // Black Hole Core
        const coreGeo = new THREE.SphereGeometry(2, 32, 32);
        const coreMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
        const core = new THREE.Mesh(coreGeo, coreMat);
        group.add(core);

        // Accretion Disk (Particles)
        const diskCount = config.geometry.count;
        const diskGeo = new THREE.BufferGeometry();
        const pos = [];
        const col = [];
        const colorObj = new THREE.Color();
        for(let i=0; i<diskCount; i++) {
            const angle = Math.random() * Math.PI * 2;
            const radius = 3 + Math.random() * 8;
            pos.push(Math.cos(angle)*radius, (Math.random()-0.5)*0.2, Math.sin(angle)*radius);
            colorObj.set(config.palette[i%config.palette.length]);
            col.push(colorObj.r, colorObj.g, colorObj.b);
        }
        diskGeo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        diskGeo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        const diskMat = new THREE.PointsMaterial({ size: 0.1, vertexColors: true, blending: THREE.AdditiveBlending });
        const disk = new THREE.Points(diskGeo, diskMat);
        group.add(disk);

        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'blackHole', disk } });

    } else if (config.geometry.type === 'tornado') {
        const count = config.geometry.count;
        const geo = new THREE.BufferGeometry();
        const pos = [];
        const initData = [];
        for(let i=0; i<count; i++) {
            const y = (Math.random() - 0.5) * 20;
            const radius = 1 + (y + 10) * 0.3; // Cone shape
            const angle = Math.random() * Math.PI * 2;
            pos.push(Math.cos(angle)*radius, y, Math.sin(angle)*radius);
            initData.push({ y, angle, radius, speed: 0.05 + Math.random()*0.05 });
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        const mat = new THREE.PointsMaterial({ color: config.palette[0], size: 0.2 });
        const points = new THREE.Points(geo, mat);
        scene.add(points);
        objectsRef.current.push({ mesh: points, data: { type: 'tornado', initData } });

    } else if (config.geometry.type === 'neonCity') {
        const count = config.geometry.count;
        const geo = new THREE.BoxGeometry(1, 1, 1);
        const mat = new THREE.MeshPhysicalMaterial({ color: 0x111111, emissive: config.palette[0], emissiveIntensity: 0.5 });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const cityData = [];
        
        for(let i=0; i<count; i++) {
            const x = (Math.random()-0.5) * 40;
            // Leave a gap in the middle for "road"
            const finalX = x > 0 ? x + 2 : x - 2;
            const z = (Math.random()-0.5) * 100;
            const h = 1 + Math.random() * 8;
            dummy.position.set(finalX, h/2 - 10, z);
            dummy.scale.set(1 + Math.random(), h, 1 + Math.random());
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, getRandomColor());
            cityData.push({ x: finalX, z, h, speed: 1.0 });
        }
        scene.add(mesh);
        objectsRef.current.push({ mesh: mesh, data: { type: 'neonCity', cityData } });

    } else if (config.geometry.type === 'solarSphere') {
        // ... (Existing Solar Logic)
        const group = new THREE.Group();
        const geometry = new THREE.IcosahedronGeometry(config.geometry.sizeRange[0], 20); 
        const material = new THREE.MeshBasicMaterial({ color: config.palette[0] });
        const star = new THREE.Mesh(geometry, material);
        group.add(star);
        const loopsGroup = new THREE.Group();
        for(let i=0; i<15; i++) {
            const torusGeo = new THREE.TorusGeometry(config.geometry.sizeRange[0] * 1.2, 0.05, 8, 30, Math.PI);
            const torusMat = new THREE.MeshBasicMaterial({ color: config.palette[1], transparent: true, opacity: 0.6 });
            const loop = new THREE.Mesh(torusGeo, torusMat);
            loop.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI, Math.random()*Math.PI);
            loopsGroup.add(loop);
        }
        group.add(loopsGroup);
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'solar', loops: loopsGroup } });

    } else if (config.geometry.type === 'bioluminescentAbyss') {
        // Instanced Lines or thin boxes acting as seaweed
        const count = config.geometry.count;
        const geo = new THREE.CylinderGeometry(0.05, 0.05, 5, 4);
        const mat = new THREE.MeshBasicMaterial({ color: config.palette[0] });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const weedData = [];
        for(let i=0; i<count; i++) {
            const x = (Math.random()-0.5)*30;
            const z = (Math.random()-0.5)*30;
            dummy.position.set(x, -5, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, getRandomColor());
            weedData.push({ x, z, offset: Math.random()*Math.PI });
        }
        scene.add(mesh);
        objectsRef.current.push({ mesh: mesh, data: { type: 'abyss', weedData } });

    } else if (config.geometry.type === 'liquidField') {
        const count = config.geometry.count;
        const geometry = new THREE.SphereGeometry(config.geometry.sizeRange[0], 16, 16);
        const material = new THREE.MeshPhysicalMaterial({ color: config.palette[0], transmission: 0.9, roughness: 0, ior: 1.5 });
        const mesh = new THREE.InstancedMesh(geometry, material, count);
        const dummy = new THREE.Object3D();
        const positions = []; 
        for (let i = 0; i < count; i++) {
            dummy.position.set((Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40, (Math.random() - 0.5) * 40);
            positions.push(dummy.position.clone());
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
        }
        scene.add(mesh);
        objectsRef.current.push({ mesh: mesh, data: { type: 'liquidField', positions } });

    } else if (config.geometry.type === 'voxelFall') {
        const count = config.geometry.count;
        const geo = new THREE.BoxGeometry(config.geometry.sizeRange[0], config.geometry.sizeRange[0], config.geometry.sizeRange[0]);
        const mat = new THREE.MeshStandardMaterial({ color: config.palette[0] });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const vels = [];
        for(let i=0; i<count; i++) {
            const x = Math.floor((Math.random()-0.5) * 40);
            const z = Math.floor((Math.random()-0.5) * 20);
            const y = Math.floor((Math.random()-0.5) * 40);
            dummy.position.set(x, y, z);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, getRandomColor());
            vels.push({ x: 0, y: -0.05 - Math.random()*0.1, z: 0, limit: -20 });
        }
        scene.add(mesh);
        objectsRef.current.push({ mesh: mesh, data: { type: 'voxelFall', vels } });
        
    } else if (config.geometry.type === 'glassRain') {
        const count = config.geometry.count;
        const geo = new THREE.TetrahedronGeometry(config.geometry.sizeRange[0]);
        const mat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transmission: 0.9, roughness: 0.1 });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const vels = [];
        for(let i=0; i<count; i++) {
            dummy.position.set((Math.random()-0.5)*30, (Math.random()-0.5)*30, (Math.random()-0.5)*30);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            mesh.setColorAt(i, getRandomColor());
            vels.push({ rot: new THREE.Vector3(Math.random()*0.05, Math.random()*0.05, 0), speed: 0.1 + Math.random()*0.2 });
        }
        scene.add(mesh);
        objectsRef.current.push({ mesh: mesh, data: { type: 'glassRain', vels } });
    } else if (config.geometry.type === 'stoneStack') {
        const group = new THREE.Group();
        const stackCount = 8;
        for(let s=0; s<stackCount; s++) {
            const stackGroup = new THREE.Group();
            const stonesInStack = 4 + Math.floor(Math.random() * 3);
            let currentY = 0;
            const stackPos = new THREE.Vector3((Math.random()-0.5)*20, (Math.random()-0.5)*10, (Math.random()-0.5)*10);
            for(let i=0; i<stonesInStack; i++) {
                const w = 1.5 - (i * 0.2); 
                const h = 0.4 + Math.random() * 0.2;
                const geo = new THREE.SphereGeometry(w, 16, 12);
                geo.scale(1, h/w, 1);
                const mat = new THREE.MeshStandardMaterial({ color: config.palette[i % config.palette.length], roughness: 0.9 });
                const stone = new THREE.Mesh(geo, mat);
                stone.position.y = currentY + (h/2);
                currentY += h;
                stone.rotation.set((Math.random()-0.5) * 0.1, 0, (Math.random()-0.5) * 0.1);
                stackGroup.add(stone);
            }
            stackGroup.position.copy(stackPos);
            stackGroup.userData = { rotSpeed: new THREE.Vector3((Math.random()-0.5)*0.01, (Math.random()-0.5)*0.01, 0), floatOffset: Math.random() * Math.PI * 2 };
            group.add(stackGroup);
        }
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'stoneStack' } });
    } else if (config.geometry.type === 'warpTunnel') {
        const group = new THREE.Group();
        const count = config.geometry.count;
        for(let i=0; i<count; i++) {
            const geo = new THREE.RingGeometry(2, 2.2, 6); 
            const mat = new THREE.MeshBasicMaterial({ color: config.palette[i % config.palette.length], side: THREE.DoubleSide, transparent: true, opacity: 0.8 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.z = -i * 2; 
            mesh.rotation.z = i * 0.1;
            group.add(mesh);
        }
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'warpTunnel', segmentDist: 2, totalSegments: count } });
    } else if (config.geometry.type === 'ribbonWave') {
        const group = new THREE.Group();
        const count = config.geometry.count;
        for(let i=0; i<count; i++) {
            const geo = new THREE.PlaneGeometry(30, 5, 60, 10);
            const mat = new THREE.MeshPhysicalMaterial({ color: config.palette[i%config.palette.length], side: THREE.DoubleSide, transparent: true, opacity: 0.4, metalness: 0.5 });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.z = (i - count/2) * 2;
            mesh.rotation.x = -Math.PI/4;
            mesh.userData = { originalPos: geo.attributes.position.clone(), offset: i };
            group.add(mesh);
        }
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'ribbonWave' } });
    } else if (config.geometry.type === 'embers') {
        const group = new THREE.Group();
        const eGeo = new THREE.BufferGeometry();
        const eCount = config.geometry.count;
        const ePos = [];
        const eVel = [];
        for(let i=0; i<eCount; i++) {
            ePos.push((Math.random()-0.5)*10, -5, (Math.random()-0.5)*10);
            eVel.push({ x: (Math.random()-0.5)*0.05, y: 0.05 + Math.random()*0.1, z: (Math.random()-0.5)*0.05 });
        }
        eGeo.setAttribute('position', new THREE.Float32BufferAttribute(ePos, 3));
        const eMat = new THREE.PointsMaterial({ color: config.palette[0], size: 0.15, blending: THREE.AdditiveBlending });
        const emberPoints = new THREE.Points(eGeo, eMat);
        group.add(emberPoints);
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'embers', eVel } });
    }
    // New types handling
    else if (config.geometry.type === 'thunderstorm') {
        const count = config.geometry.count;
        const geo = new THREE.SphereGeometry(1, 7, 7);
        const mat = new THREE.MeshLambertMaterial({ color: 0x555555, transparent: true, opacity: 0.6 });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const clouds = [];
        for(let i=0; i<count; i++) {
            const x = (Math.random()-0.5)*50;
            const y = 10 + Math.random()*5;
            const z = (Math.random()-0.5)*30;
            dummy.position.set(x, y, z);
            dummy.scale.set(2+Math.random()*3, 1+Math.random(), 2+Math.random()*3);
            dummy.updateMatrix();
            mesh.setMatrixAt(i, dummy.matrix);
            clouds.push({ x, y, z });
        }
        scene.add(mesh);
        // Lightning light
        const lightning = new THREE.PointLight(0xffffff, 0, 100);
        scene.add(lightning);
        objectsRef.current.push({ mesh: mesh, data: { type: 'thunderstorm', lightning } });
    } else if (config.geometry.type === 'supernova') {
        const group = new THREE.Group();
        const count = config.geometry.count;
        const geo = new THREE.BufferGeometry();
        const pos = [];
        const col = [];
        const vels = [];
        const colorObj = new THREE.Color();
        for(let i=0; i<count; i++) {
            pos.push(0,0,0);
            vels.push(new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).normalize().multiplyScalar(0.2 + Math.random()*0.3));
            colorObj.set(config.palette[i%config.palette.length]);
            col.push(colorObj.r, colorObj.g, colorObj.b);
        }
        geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
        geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
        const mat = new THREE.PointsMaterial({ size: 0.2, vertexColors: true, blending: THREE.AdditiveBlending });
        const points = new THREE.Points(geo, mat);
        group.add(points);
        scene.add(group);
        objectsRef.current.push({ mesh: group, data: { type: 'supernova', vels } });
    } else if (config.geometry.type === 'pixelSort') {
        const count = 40 * 40; // Grid
        const geo = new THREE.PlaneGeometry(0.4, 0.4);
        const mat = new THREE.MeshBasicMaterial({ color: 0xffffff });
        const mesh = new THREE.InstancedMesh(geo, mat, count);
        const dummy = new THREE.Object3D();
        const sortData = [];
        let i=0;
        for(let x=0; x<40; x++) {
            for(let y=0; y<40; y++) {
                dummy.position.set(x-20, y-20, 0);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
                mesh.setColorAt(i, getRandomColor());
                sortData.push({ x: x-20, y: y-20, val: Math.random() });
                i++;
            }
        }
        scene.add(mesh);
        objectsRef.current.push({ mesh: mesh, data: { type: 'pixelSort', sortData } });
    }
    // Fallback for "Particles", "Orbits", "Emoji", "Matrix", "Code Geyser", "Fracture Road" 
    // and ensuring any other type renders *something*
    else {
        // Generic Text / Sprite particle system logic for Emoji/Geyser/Matrix
        if (config.geometry.textChar) {
            const group = new THREE.Group();
            const charSet = config.geometry.textChar.split('');
            const isGeyser = config.geometry.type === 'characterGeyser';
            const isMatrix = config.geometry.type === 'matrixRain';
            
            for(let i=0; i<config.geometry.count / (isMatrix ? 5 : 1); i++) {
                const char = charSet[i%charSet.length];
                const mat = new THREE.SpriteMaterial({ 
                    map: getCharTexture(char, config.palette[i%config.palette.length]), 
                    transparent: true, 
                    blending: THREE.AdditiveBlending 
                });
                const sprite = new THREE.Sprite(mat);
                
                if (isGeyser) {
                    sprite.position.set(0, -5, 0);
                    sprite.userData = { vel: new THREE.Vector3((Math.random()-0.5)*0.5, 0.3+Math.random()*0.3, (Math.random()-0.5)*0.5), type: 'geyser' };
                } else if (isMatrix) {
                    sprite.position.set((Math.random()-0.5)*40, 10 + Math.random()*20, (Math.random()-0.5)*20);
                    sprite.userData = { vel: new THREE.Vector3(0, -0.1-Math.random()*0.2, 0), type: 'matrix' };
                } else {
                    // Emoji Explosion
                    sprite.position.set(0,0,0);
                    sprite.userData = { vel: new THREE.Vector3((Math.random()-0.5), (Math.random()-0.5), (Math.random()-0.5)).normalize().multiplyScalar(0.2), type: 'explode' };
                }
                group.add(sprite);
            }
            scene.add(group);
            objectsRef.current.push({ mesh: group, data: { type: 'sprites' } });
        } else {
            // Default Fallback Particles
            const count = config.geometry.count;
            const geo = new THREE.SphereGeometry(0.1, 4, 4);
            const mat = new THREE.MeshBasicMaterial({ color: config.palette[0] });
            const mesh = new THREE.InstancedMesh(geo, mat, count);
            const dummy = new THREE.Object3D();
            for(let i=0; i<count; i++) {
                dummy.position.set((Math.random()-0.5)*30, (Math.random()-0.5)*30, (Math.random()-0.5)*30);
                dummy.updateMatrix();
                mesh.setMatrixAt(i, dummy.matrix);
                mesh.setColorAt(i, getRandomColor());
            }
            scene.add(mesh);
            objectsRef.current.push({ mesh: mesh, data: { type: 'simple' } });
        }
    }

    // LIGHTING
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);
    const dirLight = new THREE.DirectionalLight(0xffffff, 1);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);
    const pLight = new THREE.PointLight(config.palette[0] || 0xffffff, 5, 50);
    pLight.position.set(0,0,0);
    scene.add(pLight);

    // Update PostFX
    // @ts-ignore
    const bloom = composerRef.current.passes.find(p => p instanceof UnrealBloomPass);
    if (bloom) {
        bloom.strength = config.postProcessing.bloom * 2.0;
        bloom.radius = config.postProcessing.glow;
    }

  }, [config]);

  // --- ANIMATION LOOP ---
  useEffect(() => {
    const animate = () => {
      frameIdRef.current = requestAnimationFrame(animate);
      if (!isPlaying || !sceneRef.current || !cameraRef.current || !composerRef.current) return;

      timeRef.current += 0.01 * config.motion.intensity;
      const t = timeRef.current;

      // Camera
      if (config.motion.cameraDrift) {
        cameraRef.current.position.x = Math.sin(t * 0.1) * (config.geometry.type === 'collidingWorlds' ? 25 : 8);
        cameraRef.current.position.y = Math.cos(t * 0.1) * 8;
        cameraRef.current.lookAt(0,0,0);
      }

      objectsRef.current.forEach((objInfo) => {
        const { mesh, data } = objInfo;

        if (data.type === 'collidingWorlds') {
            const imesh = data.debrisMesh as THREE.InstancedMesh;
            const dummy = new THREE.Object3D();
            const matrix = new THREE.Matrix4();
            const pos = new THREE.Vector3();

            if (data.state === 'approach') {
                data.sphereLeft.position.x += 0.05 * config.motion.intensity;
                data.sphereRight.position.x -= 0.05 * config.motion.intensity;
                
                if (data.sphereLeft.position.x >= -3) { // Impact
                     data.state = 'shatter';
                     data.sphereLeft.visible = false;
                     data.sphereRight.visible = false;
                     imesh.visible = true;
                     // Reset debris positions to center
                     for(let i=0; i<config.geometry.count; i++) {
                         dummy.position.set(0,0,0);
                         dummy.updateMatrix();
                         imesh.setMatrixAt(i, dummy.matrix);
                     }
                     imesh.instanceMatrix.needsUpdate = true;
                }
            } else if (data.state === 'shatter') {
                 // Expand debris
                 for(let i=0; i<config.geometry.count; i++) {
                     imesh.getMatrixAt(i, matrix);
                     pos.setFromMatrixPosition(matrix);
                     pos.add(data.debrisVels[i].clone().multiplyScalar(config.motion.intensity));
                     dummy.position.copy(pos);
                     // Spin shards
                     dummy.rotation.set(t*i, t*i, t*i);
                     dummy.updateMatrix();
                     imesh.setMatrixAt(i, dummy.matrix);
                 }
                 imesh.instanceMatrix.needsUpdate = true;
                 
                 data.timer += 0.01;
                 if (data.timer > 3) {
                     // Reset
                     data.state = 'approach';
                     data.timer = 0;
                     data.sphereLeft.position.x = -15;
                     data.sphereRight.position.x = 15;
                     data.sphereLeft.visible = true;
                     data.sphereRight.visible = true;
                     imesh.visible = false;
                 }
            }

        } else if (data.type === 'siegeFire') {
            const arrows = data.arrows as THREE.InstancedMesh;
            const castle = data.castle as THREE.InstancedMesh;
            const dummy = new THREE.Object3D();
            
            // Animate Arrows
            for(let i=0; i<data.arrowData.length; i++) {
                const arr = data.arrowData[i];
                if (arr.delay > 0) {
                    arr.delay -= 1;
                } else {
                    arr.active = true;
                    arr.vel.y -= 0.01; // Gravity
                    arr.pos.add(arr.vel);
                    
                    // Rotation follows velocity
                    dummy.position.copy(arr.pos);
                    dummy.lookAt(arr.pos.clone().add(arr.vel));
                    dummy.updateMatrix();
                    arrows.setMatrixAt(i, dummy.matrix);
                    
                    // Collision with castle (approx y=0 for demo)
                    if (arr.pos.y < 0 && arr.active) {
                        arr.active = false;
                        arr.pos.y = -100; // hide
                        
                        // Pick random castle block to "destroy"
                        const blockIdx = Math.floor(Math.random() * 200);
                        if (data.castlePos[blockIdx] && data.castlePos[blockIdx].active) {
                             data.castlePos[blockIdx].active = false;
                             castle.setColorAt(blockIdx, new THREE.Color(0xff0000)); // Burn
                        }
                    }
                    if (arr.pos.y < -50) { // Reset arrow
                        arr.pos.set((Math.random()-0.5)*20, -5, 20 + Math.random()*10);
                        arr.vel.set((Math.random()-0.5)*0.5, 0.5+Math.random()*0.5, -0.5 - Math.random()*0.3);
                        arr.delay = Math.random() * 50;
                    }
                }
            }
            arrows.instanceMatrix.needsUpdate = true;
            
            // Animate Castle Collapse
            for(let i=0; i<200; i++) {
                 if (data.castlePos[i] && !data.castlePos[i].active) {
                     // Make it fall
                     castle.getMatrixAt(i, dummy.matrix);
                     dummy.matrix.decompose(dummy.position, dummy.quaternion, dummy.scale);
                     if (dummy.position.y > -10) {
                         dummy.position.y -= 0.1;
                         dummy.updateMatrix();
                         castle.setMatrixAt(i, dummy.matrix);
                     }
                 }
            }
            castle.instanceMatrix.needsUpdate = true;
            castle.instanceColor && (castle.instanceColor.needsUpdate = true);

        } else if (data.type === 'tornado') {
            // Update particle positions
            // @ts-ignore
            const positions = mesh.geometry.attributes.position.array;
            for(let i=0; i<data.initData.length; i++) {
                const d = data.initData[i];
                d.angle += d.speed * config.motion.intensity;
                d.y += 0.02;
                if (d.y > 10) d.y = -10;
                
                const r = 1 + (d.y + 10) * 0.3;
                positions[i*3] = Math.cos(d.angle) * r;
                positions[i*3+1] = d.y;
                positions[i*3+2] = Math.sin(d.angle) * r;
            }
            // @ts-ignore
            mesh.geometry.attributes.position.needsUpdate = true;
            mesh.rotation.y += 0.05;

        } else if (data.type === 'neonCity') {
            const imesh = mesh as THREE.InstancedMesh;
            const dummy = new THREE.Object3D();
            for(let i=0; i<data.cityData.length; i++) {
                const d = data.cityData[i];
                d.z += d.speed * config.motion.intensity;
                if (d.z > 50) d.z = -50;
                
                dummy.position.set(d.x, d.h/2 - 10, d.z);
                dummy.scale.set(1, d.h, 1);
                dummy.updateMatrix();
                imesh.setMatrixAt(i, dummy.matrix);
            }
            imesh.instanceMatrix.needsUpdate = true;
            
        } else if (data.type === 'supernova') {
             // @ts-ignore
             const pos = mesh.children[0].geometry.attributes.position.array;
             for(let i=0; i<data.vels.length; i++) {
                 pos[i*3] += data.vels[i].x * config.motion.intensity;
                 pos[i*3+1] += data.vels[i].y * config.motion.intensity;
                 pos[i*3+2] += data.vels[i].z * config.motion.intensity;
                 
                 // Reset
                 if (Math.abs(pos[i*3]) > 20) {
                     pos[i*3] = 0; pos[i*3+1] = 0; pos[i*3+2] = 0;
                 }
             }
             // @ts-ignore
             mesh.children[0].geometry.attributes.position.needsUpdate = true;

        } else if (data.type === 'thunderstorm') {
            // Random lightning
            if (Math.random() > 0.95) {
                data.lightning.intensity = 5 + Math.random()*5;
                data.lightning.position.set((Math.random()-0.5)*20, 10, (Math.random()-0.5)*20);
            } else {
                data.lightning.intensity *= 0.8;
            }
            
        } else if (data.type === 'solar') {
            mesh.children[0].rotation.y += 0.005; 
            data.loops.rotation.z += 0.002;
            data.loops.children.forEach((l: THREE.Object3D, i: number) => {
                 l.rotation.z += 0.01 * (i%2===0?1:-1);
            });
            const s = 1 + Math.sin(t*2) * 0.05;
            mesh.scale.set(s,s,s);
            
        } else if (data.type === 'liquidField') {
            const imesh = mesh as THREE.InstancedMesh;
            const dummy = new THREE.Object3D();
            for(let i=0; i<data.positions.length; i++) {
                const orig = data.positions[i];
                const x = orig.x + Math.sin(t + orig.y * 0.1) * 2;
                const y = orig.y + Math.cos(t + orig.z * 0.1) * 2;
                dummy.position.set(x, y, orig.z);
                dummy.rotation.set(t, t, 0);
                dummy.updateMatrix();
                imesh.setMatrixAt(i, dummy.matrix);
            }
            imesh.instanceMatrix.needsUpdate = true;
            
        } else if (data.type === 'blackHole') {
            data.disk.rotation.y += 0.02 * config.motion.intensity;
            
        } else if (data.type === 'stoneStack') {
            mesh.children.forEach((stack: any) => {
                stack.position.y += Math.sin(t + stack.userData.floatOffset) * 0.005;
                stack.rotation.x += stack.userData.rotSpeed.x;
                stack.rotation.y += stack.userData.rotSpeed.y;
            });
            
        } else if (data.type === 'voxelFall' || data.type === 'glassRain') {
            const imesh = mesh as THREE.InstancedMesh;
            const dummy = new THREE.Object3D();
            const matrix = new THREE.Matrix4();
            const position = new THREE.Vector3();
            const rotation = new THREE.Quaternion();
            const scale = new THREE.Vector3();

            for(let i=0; i<data.vels.length; i++) {
                 imesh.getMatrixAt(i, matrix);
                 matrix.decompose(position, rotation, scale);
                 
                 position.y -= data.vels[i].speed || 0.1;
                 if(position.y < -20) position.y = 20;

                 if (data.type === 'glassRain') {
                     dummy.position.copy(position);
                     dummy.rotation.setFromQuaternion(rotation);
                     dummy.rotation.x += data.vels[i].rot.x;
                     dummy.rotation.y += data.vels[i].rot.y;
                     dummy.updateMatrix();
                     imesh.setMatrixAt(i, dummy.matrix);
                 } else {
                     dummy.position.copy(position);
                     dummy.updateMatrix();
                     imesh.setMatrixAt(i, dummy.matrix);
                 }
            }
            imesh.instanceMatrix.needsUpdate = true;
            
        } else if (data.type === 'ribbonWave') {
            mesh.children.forEach((strip: any) => {
                const positions = strip.geometry.attributes.position;
                const orig = strip.userData.originalPos;
                for(let i=0; i<positions.count; i++) {
                    const x = orig.getX(i);
                    const z = Math.sin(x * 0.5 + t + strip.userData.offset) * 2;
                    positions.setZ(i, z);
                }
                positions.needsUpdate = true;
            });
            
        } else if (data.type === 'embers') {
             // @ts-ignore
             const pos = mesh.children[0].geometry.attributes.position.array;
             const vels = data.eVel;
             for(let i=0; i<pos.length/3; i++) {
                 pos[i*3] += vels[i].x;
                 pos[i*3+1] += vels[i].y;
                 pos[i*3+2] += vels[i].z;
                 if(pos[i*3+1] > 10) pos[i*3+1] = -5;
             }
             // @ts-ignore
             mesh.children[0].geometry.attributes.position.needsUpdate = true;
             
        } else if (data.type === 'sprites') {
             mesh.children.forEach((c: any) => {
                 c.position.add(c.userData.vel);
                 if (c.userData.type === 'geyser') {
                     c.userData.vel.y -= 0.005;
                     if(c.position.y < -10) { c.position.set(0,-5,0); c.userData.vel.y = 0.3+Math.random()*0.3; }
                 } else if (c.userData.type === 'matrix') {
                     if(c.position.y < -10) c.position.y = 20;
                 } else if (c.userData.type === 'explode') {
                     if(c.position.length() > 20) c.position.set(0,0,0);
                 }
             });
        }
      });

      composerRef.current.render();
    };
    animate();
    return () => cancelAnimationFrame(frameIdRef.current);
  }, [config, isPlaying]);

  return <div ref={mountRef} style={{ width: '100%', height: '100%' }} />;
};

export default VibeRenderer;