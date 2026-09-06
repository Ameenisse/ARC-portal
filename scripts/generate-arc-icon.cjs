const fs = require('fs');
const path = require('path');
const { Resvg } = require('@resvg/resvg-js');

// Ensure public directory exists
const publicDir = path.join(__dirname, '..', 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Exact ARC (Aanandha Recreation Club) App Icon SVG
const arcSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <!-- Background Gradient: Warm Champagne / Cream to Golden Sand -->
    <linearGradient id="bgGrad" x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0%" stop-color="#FFF8EC"/>
      <stop offset="35%" stop-color="#FDF3E3"/>
      <stop offset="70%" stop-color="#F6E4CA"/>
      <stop offset="100%" stop-color="#ECD3B0"/>
    </linearGradient>

    <!-- Radial Ambient Top-Left Highlight -->
    <radialGradient id="ambientLight" cx="30%" cy="25%" r="65%">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.6"/>
      <stop offset="50%" stop-color="#FFFFFF" stop-opacity="0.1"/>
      <stop offset="100%" stop-color="#E2C79F" stop-opacity="0.3"/>
    </radialGradient>

    <!-- Outer Bezel / Border Gradient -->
    <linearGradient id="bezelGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2D2D2D"/>
      <stop offset="100%" stop-color="#181818"/>
    </linearGradient>

    <!-- Flame Base Under-Ribbon Gradient -->
    <linearGradient id="flameBaseGrad" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#7B1818"/>
      <stop offset="50%" stop-color="#A52222"/>
      <stop offset="100%" stop-color="#C62828"/>
    </linearGradient>

    <!-- Main Flame Gradient (Red to Scarlet to Orange to Golden Amber) -->
    <linearGradient id="flameMainGrad" x1="0.1" y1="1" x2="0.6" y2="0">
      <stop offset="0%" stop-color="#B71C1C"/>
      <stop offset="25%" stop-color="#D32F2F"/>
      <stop offset="55%" stop-color="#E64A19"/>
      <stop offset="78%" stop-color="#FF5722"/>
      <stop offset="92%" stop-color="#FF9800"/>
      <stop offset="100%" stop-color="#FFB300"/>
    </linearGradient>

    <!-- Inner Flame Highlight Tongue Gradient -->
    <linearGradient id="flameInnerGrad" x1="0" y1="1" x2="0.5" y2="0">
      <stop offset="0%" stop-color="#FFFFFF" stop-opacity="0.95"/>
      <stop offset="25%" stop-color="#FFF9C4"/>
      <stop offset="60%" stop-color="#FFE082"/>
      <stop offset="85%" stop-color="#FFA726"/>
      <stop offset="100%" stop-color="#FF5722"/>
    </linearGradient>

    <!-- Orange Ribbon Gradient -->
    <linearGradient id="orangeRibbonGrad" x1="0" y1="0.8" x2="1" y2="0.2">
      <stop offset="0%" stop-color="#BF360C"/>
      <stop offset="20%" stop-color="#E64A19"/>
      <stop offset="50%" stop-color="#F57C00"/>
      <stop offset="80%" stop-color="#FFA000"/>
      <stop offset="100%" stop-color="#FFB300"/>
    </linearGradient>

    <!-- Green Ribbon Top Face Gradient -->
    <linearGradient id="greenRibbonTopGrad" x1="0" y1="0.9" x2="1" y2="0.1">
      <stop offset="0%" stop-color="#33691E"/>
      <stop offset="25%" stop-color="#558B2F"/>
      <stop offset="60%" stop-color="#689F38"/>
      <stop offset="85%" stop-color="#7CB342"/>
      <stop offset="100%" stop-color="#8BC34A"/>
    </linearGradient>

    <!-- Green Ribbon Under-Fold (Dark Olive) -->
    <linearGradient id="greenRibbonUnderGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#254D14"/>
      <stop offset="100%" stop-color="#33691E"/>
    </linearGradient>

    <!-- Diamond 1 (Green) -->
    <linearGradient id="diamond1Grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#66BB6A"/>
      <stop offset="45%" stop-color="#388E3C"/>
      <stop offset="100%" stop-color="#1B5E20"/>
    </linearGradient>

    <!-- Diamond 2 (Orange-Red) -->
    <linearGradient id="diamond2Grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#FFA726"/>
      <stop offset="40%" stop-color="#F57C00"/>
      <stop offset="75%" stop-color="#E64A19"/>
      <stop offset="100%" stop-color="#BF360C"/>
    </linearGradient>

    <!-- Diamond 3 (Lime-Green) -->
    <linearGradient id="diamond3Grad" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#9CCC65"/>
      <stop offset="50%" stop-color="#558B2F"/>
      <stop offset="100%" stop-color="#2E7D32"/>
    </linearGradient>

    <!-- Drop Shadow Filter for Diamonds -->
    <filter id="badgeShadow" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" flood-color="#795548" flood-opacity="0.35"/>
    </filter>

    <!-- Subtle Drop Shadow for Flame & Ribbons -->
    <filter id="softShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="1" dy="3" stdDeviation="3" flood-color="#5D4037" flood-opacity="0.25"/>
    </filter>
  </defs>

  <!-- Outer Dark App Frame / Squircle (like iOS / Android icon with outer frame) -->
  <rect x="6" y="6" width="500" height="500" rx="108" ry="108" fill="#1C1B1B" stroke="#2B2B2B" stroke-width="4"/>
  
  <!-- Main Squircle Canvas -->
  <rect x="12" y="12" width="488" height="488" rx="100" ry="100" fill="url(#bgGrad)"/>
  <rect x="12" y="12" width="488" height="488" rx="100" ry="100" fill="url(#ambientLight)"/>
  
  <!-- Subtle Inner Border highlight -->
  <rect x="13.5" y="13.5" width="485" height="485" rx="98" ry="98" fill="none" stroke="#FFFFFF" stroke-opacity="0.5" stroke-width="2"/>

  <!-- ==================== LOGO GROUP ==================== -->
  <g transform="translate(14, 0)">
    
    <!-- 1. Flame Base Fold Curve (Crimson Ribbon at bottom-left) -->
    <path d="M 36 288 C 42 322, 68 332, 108 330 C 95 316, 85 304, 76 288 Z"
          fill="url(#flameBaseGrad)" opacity="0.95" filter="url(#softShadow)"/>

    <!-- 2. Green Ribbon Under-Fold / Shadow Layer -->
    <path d="M 98 330 C 138 332, 168 322, 198 298 C 218 282, 238 258, 260 236 C 242 254, 222 278, 198 296 C 168 316, 136 326, 98 330 Z"
          fill="url(#greenRibbonUnderGrad)"/>

    <!-- 3. Dynamic Green Ribbon (Sweeping up and over) -->
    <path d="M 96 298 C 120 318, 150 326, 182 312 C 212 298, 238 266, 266 230 C 286 204, 308 192, 336 196 L 332 208 C 304 206, 282 216, 260 242 C 234 274, 206 308, 178 322 C 148 334, 118 326, 96 298 Z"
          fill="url(#greenRibbonTopGrad)" filter="url(#softShadow)"/>

    <!-- 4. Dynamic Orange Ribbon (Sweeping arching fold) -->
    <path d="M 124 286 C 144 268, 170 242, 202 218 C 230 196, 256 190, 284 192 L 278 204 C 252 202, 228 208, 202 228 C 174 250, 148 274, 126 294 Z"
          fill="url(#orangeRibbonGrad)" filter="url(#softShadow)"/>

    <!-- 5. Main Red/Orange Flame Symbol -->
    <g filter="url(#softShadow)">
      <!-- Flame Outer Shape -->
      <path d="M 80 292
               C 62 268, 54 238, 58 206
               C 64 168, 82 142, 94 116
               C 98 108, 102 98, 104 90
               C 107 106, 108 122, 106 138
               C 103 158, 98 174, 105 192
               C 112 168, 122 146, 130 124
               C 134 114, 138 102, 140 92
               C 144 112, 145 132, 142 152
               C 138 176, 128 198, 136 222
               C 144 196, 158 174, 170 150
               C 168 182, 158 214, 150 242
               C 142 270, 134 290, 120 304
               C 106 318, 92 312, 80 292 Z"
            fill="url(#flameMainGrad)"/>

      <!-- Inner Glowing Core of the Flame -->
      <path d="M 86 270
               C 74 246, 72 224, 76 202
               C 82 174, 94 154, 102 132
               C 103 148, 102 164, 100 178
               C 97 194, 95 208, 100 222
               C 106 204, 114 186, 122 168
               C 123 182, 122 196, 118 210
               C 112 232, 104 250, 96 264
               C 92 270, 88 274, 86 270 Z"
            fill="url(#flameInnerGrad)" opacity="0.92"/>
    </g>

    <!-- 6. Ribbon End Highlights (Right side) -->
    <path d="M 276 192 C 298 191, 318 194, 334 196 L 328 208 C 314 206, 296 203, 276 204 Z"
          fill="#FFA726"/>
    <path d="M 274 228 C 294 204, 316 198, 336 200 L 330 212 C 312 210, 292 216, 272 238 Z"
          fill="#8BC34A"/>

    <!-- ==================== THREE DIAMOND BADGES ==================== -->
    
    <!-- DIAMOND 1: GREEN (Profile & Info 'i') -->
    <g transform="translate(290, 246)" filter="url(#badgeShadow)">
      <!-- Diamond base rotated 45 deg -->
      <rect x="-24" y="-24" width="48" height="48" rx="7" transform="rotate(45)" fill="url(#diamond1Grad)"/>
      <rect x="-24" y="-24" width="48" height="48" rx="7" transform="rotate(45)" fill="none" stroke="#A5D6A7" stroke-width="1.2" stroke-opacity="0.6"/>
      
      <!-- Icon Inside: Person silhouette with info badge -->
      <!-- Head -->
      <circle cx="-5" cy="-7" r="5" fill="#FFFFFF"/>
      <!-- Body/Shoulder -->
      <path d="M -15 9 C -15 1, -11 -2, -5 -2 C 1 -2, 4 1, 4 9 Z" fill="#FFFFFF"/>
      <!-- Info Circle Badge -->
      <circle cx="7" cy="4" r="6.5" fill="#FFFFFF"/>
      <circle cx="7" cy="4" r="5" fill="#2E7D32"/>
      <!-- 'i' letter -->
      <rect x="6.2" y="2.5" width="1.6" height="4" rx="0.5" fill="#FFFFFF"/>
      <circle cx="7" cy="0.8" r="0.9" fill="#FFFFFF"/>
    </g>

    <!-- DIAMOND 2: ORANGE-RED (Handshake / Partnership) -->
    <g transform="translate(366, 246)" filter="url(#badgeShadow)">
      <!-- Diamond base rotated 45 deg -->
      <rect x="-24" y="-24" width="48" height="48" rx="7" transform="rotate(45)" fill="url(#diamond2Grad)"/>
      <rect x="-24" y="-24" width="48" height="48" rx="7" transform="rotate(45)" fill="none" stroke="#FFCC80" stroke-width="1.2" stroke-opacity="0.6"/>
      
      <!-- Handshake Silhouette (Crisp White) -->
      <g fill="#FFFFFF">
        <!-- Left Arm/Cuff -->
        <path d="M -15 3 L -11 -2 L -7 1 L -11 6 Z"/>
        <!-- Right Arm/Cuff -->
        <path d="M 15 3 L 11 -2 L 7 1 L 11 6 Z"/>
        <!-- Interlocked Hands / Grip -->
        <path d="M -9 0 L -4 -5 C -2 -7, 2 -7, 4 -5 L 9 0 C 10 1, 10 3, 8 4 L 5 7 C 4 8, 2 8, 1 7 L 0 6 L -1 7 C -2 8, -4 8, -5 7 L -8 4 C -10 3, -10 1, -9 0 Z"/>
        <!-- Fingers Detail Cuts -->
        <path d="M -3 -1 L 3 -1 L 1 3 L -1 3 Z" fill="url(#diamond2Grad)"/>
      </g>
    </g>

    <!-- DIAMOND 3: LIME GREEN (Three Rejoicing Community Figures) -->
    <g transform="translate(442, 246)" filter="url(#badgeShadow)">
      <!-- Diamond base rotated 45 deg -->
      <rect x="-24" y="-24" width="48" height="48" rx="7" transform="rotate(45)" fill="url(#diamond3Grad)"/>
      <rect x="-24" y="-24" width="48" height="48" rx="7" transform="rotate(45)" fill="none" stroke="#C8E6C9" stroke-width="1.2" stroke-opacity="0.6"/>
      
      <!-- Three Active Figures (Raised Hands) -->
      <g fill="#FFFFFF">
        <!-- Center Figure (Taller) -->
        <circle cx="0" cy="-8" r="3.2"/>
        <path d="M 0 -3 L 0 9 M -6 -5 L 0 -1 L 6 -5" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
        <path d="M 0 9 L -4 14 M 0 9 L 4 14" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round"/>

        <!-- Left Figure -->
        <circle cx="-10" cy="-4" r="2.5"/>
        <path d="M -10 -1 L -10 8 M -14 -4 L -10 0 L -6 -3" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>

        <!-- Right Figure -->
        <circle cx="10" cy="-4" r="2.5"/>
        <path d="M 10 -1 L 10 8 M 6 -3 L 10 0 L 14 -4" stroke="#FFFFFF" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" fill="none"/>
      </g>
    </g>

    <!-- ==================== BRANDING TEXT ==================== -->
    <!-- "aanandha" -->
    <text x="365" y="322"
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          font-size="52"
          font-weight="800"
          letter-spacing="-1.2"
          text-anchor="middle"
          fill="#1C1C1C">aanandha</text>

    <!-- "recreation club" -->
    <text x="365" y="344"
          font-family="system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif"
          font-size="14"
          font-weight="600"
          letter-spacing="5.5"
          text-anchor="middle"
          fill="#3E3E3E">recreation club</text>

  </g>
</svg>`;

// Write the master SVG files
fs.writeFileSync(path.join(publicDir, 'arc-app-icon.svg'), arcSvg);
fs.writeFileSync(path.join(publicDir, 'favicon.svg'), arcSvg);
console.log('Saved public/arc-app-icon.svg and public/favicon.svg');

// Render PNGs at various sizes using Resvg
const sizes = [
  { name: 'arc-app-icon.png', size: 512 },
  { name: 'pwa-512x512.png', size: 512 },
  { name: 'pwa-192x192.png', size: 192 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-64.png', size: 64 },
  { name: 'favicon-32.png', size: 32 }
];

for (const { name, size } of sizes) {
  const resvg = new Resvg(arcSvg, {
    fitTo: { mode: 'width', value: size }
  });
  const pngData = resvg.render();
  const pngBuffer = pngData.asPng();
  fs.writeFileSync(path.join(publicDir, name), pngBuffer);
  console.log(`Rendered ${name} (${size}x${size})`);
}

// Copy 64x64 or 512x512 to root app-favicon.ico and public/favicon.ico
fs.copyFileSync(path.join(publicDir, 'favicon-64.png'), path.join(__dirname, '..', 'app-favicon.ico'));
fs.copyFileSync(path.join(publicDir, 'favicon-64.png'), path.join(publicDir, 'favicon.ico'));
console.log('Updated app-favicon.ico and public/favicon.ico');
