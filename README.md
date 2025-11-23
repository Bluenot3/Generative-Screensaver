# ZEN VibeSaver Studio

A production-ready web application for designing, previewing, and exporting AI-generated animated screensavers.

## Features

- **Real-time 3D Preview**: Powered by Three.js with post-processing (Bloom, Grain).
- **20 Built-in Presets**: Exotic visual effects ranging from "Liquid Glass Nebula" to "Cyberpunk Matrix".
- **AI Vibe Generator**: Describe a mood in plain text, and Google Gemini generates the 3D configuration.
- **Custom Designer**: Fine-tune geometry, motion, materials, and colors manually.
- **Export**: Download your creation as a JSON config or a standalone `.zip` web screensaver bundle that runs in any browser.

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite, Three.js, CSS Modules.
- **Backend**: Node.js, Express, TypeScript, Google GenAI SDK (`@google/genai`).
- **Data**: In-memory state, Static Presets.

## Setup & Running

This project is structured as a monorepo simulation.

### Prerequisites
- Node.js (v18+)
- A Google Gemini API Key

### 1. Environment Setup

Create a `.env` file in the `backend` directory:
```
PORT=3001
GEMINI_API_KEY=your_actual_api_key_here
```

### 2. Install Dependencies

**Frontend:**
```bash
cd frontend
npm install
# You will need: three @types/three react react-dom vite @vitejs/plugin-react typescript
```

**Backend:**
```bash
cd backend
npm install
# You will need: express cors dotenv @google/genai archiver ts-node typescript @types/express @types/node @types/cors @types/archiver
```

### 3. Run the App

**Start Backend:**
```bash
cd backend
npm run dev
```

**Start Frontend:**
```bash
cd frontend
npm run dev
```

Open your browser to the URL shown by Vite (usually `http://localhost:5173`).

## Usage Guide

1.  **Select a Preset**: Click any of the 20 styles on the left to instantly load a vibe.
2.  **Custom Mode**: Switch to "Custom" tab to tweak sliders for bloom, speed, and geometry.
3.  **AI Generation**:
    - Enter a prompt like "A calming underwater temple with glowing jellyfish".
    - Click "Generate".
    - The app calls Gemini to produce a configuration matching your description.
4.  **Export**: Click "Download Bundle (ZIP)" to get a standalone HTML file you can run fullscreen.

## API Endpoints

- `GET /api/presets`: List all built-in styles.
- `POST /api/generate-config`: Converts text prompt to VibeConfig JSON using Gemini.
- `POST /api/generate-image`: Stub for Nano Banana exotic texture generation.
- `POST /api/export-bundle`: Generates the standalone ZIP package.
