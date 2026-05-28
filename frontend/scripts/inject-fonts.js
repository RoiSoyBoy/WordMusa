#!/usr/bin/env node
/**
 * Post-build script for dist/index.html:
 * 1. Injects ionicons web component (SVG icons, no font loading needed)
 * 2. Fixes iOS Safari viewport: viewport-fit=cover + 100dvh + text-size-adjust
 */

const fs = require('fs');
const path = require('path');

const distDir = path.join(__dirname, '..', 'dist');
const indexPath = path.join(distDir, 'index.html');

let html = fs.readFileSync(indexPath, 'utf8');

// 1. Fix viewport meta — add viewport-fit=cover for iPhone notch/home indicator
html = html.replace(
  'content="width=device-width, initial-scale=1, shrink-to-fit=no"',
  'content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"'
);

// 2. iOS Safari CSS fixes + ionicons web component (idempotent guard)
if (!html.includes('ionicons.esm.js')) {
  const injected = `<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<style>
  /* Prevent iOS Safari from auto-scaling text */
  html { -webkit-text-size-adjust: 100%; text-size-adjust: 100%; }
  /* Use dynamic viewport height so Safari's URL bar doesn't overlap content */
  @supports (height: 100dvh) { #root { height: 100dvh; } }
  /* iOS safe area: pad tab bar above home indicator */
  @supports (padding-bottom: env(safe-area-inset-bottom)) {
    [role="tablist"] { padding-bottom: env(safe-area-inset-bottom) !important; }
  }
</style>
<script type="module" src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.esm.js"></script>
<script nomodule src="https://unpkg.com/ionicons@7.1.0/dist/ionicons/ionicons.js"></script>`;
  html = html.replace('</head>', `${injected}\n</head>`);
}

fs.writeFileSync(indexPath, html, 'utf8');
console.log('[inject] Patched index.html: viewport-fit=cover, 100dvh, text-size-adjust, ionicons.');

// Sync frontend/dist → backend/dist so Firebase Hosting deploys the correct build
const backendDist = path.join(__dirname, '..', '..', 'backend', 'dist');
fs.cpSync(distDir, backendDist, { recursive: true, force: true });
console.log('[inject] Synced dist → backend/dist');
