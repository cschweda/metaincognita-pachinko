# Doc 09 — Website & Deployment

## PachinkoParlor

**Date:** April 5, 2026
**Status:** Complete

---

## 1. Deployment Target

**Platform:** Netlify (static SPA)
**Domain:** `pachinko.metaincognita.com` (subdomain of suite site)
**Build output:** Static HTML + JS + CSS + assets in `dist/`
**No server-side components.** No serverless functions, no SSR, no database.

---

## 2. Netlify Configuration

### 2.1 `netlify.toml`

```toml
[build]
  command = "yarn build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "20"    # Pinned to 20.x LTS (matches Doc 00 tech stack)

# SPA redirect — all routes serve index.html
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Security headers (see Doc 06 for rationale)
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
    Content-Security-Policy = "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; media-src 'self'; font-src 'self'; connect-src 'self'; frame-ancestors 'none'"

# Cache static assets aggressively
[[headers]]
  for = "/assets/*"
  [headers.values]
    Cache-Control = "public, max-age=31536000, immutable"
```

### 2.2 Custom Domain

1. Add `pachinko.metaincognita.com` as a custom domain in Netlify site settings
2. Create CNAME record: `pachinko` → Netlify's load balancer
3. Netlify auto-provisions Let's Encrypt SSL certificate
4. Enable HTTPS-only (force redirect)

---

## 3. Build Pipeline

```bash
# Install dependencies
yarn install --frozen-lockfile

# Type check
yarn tsc --noEmit

# Lint
yarn eslint src/

# Test
yarn vitest run

# Build
yarn vite build
# Output: dist/ (HTML + JS + CSS + assets)
```

### 3.1 Vite Configuration

```typescript
// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/',
  build: {
    outDir: 'dist',
    sourcemap: false,      // No sourcemaps in production
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks: {
          phaser: ['phaser'],     // Separate chunk for Phaser (~1.5MB)
          charts: ['chart.js'],   // Separate chunk for Chart.js (~200KB)
        },
      },
    },
  },
});
```

### 3.2 Bundle Size Budget

| Chunk | Expected Size (gzipped) | Notes |
|---|---|---|
| Phaser | ~500KB | Large but unavoidable; lazy-load after setup screen |
| Chart.js | ~70KB | Only loaded when stats/analysis views open |
| App code | ~50KB | Game logic, views, types |
| Theme assets | ~200KB–1MB per theme | Images, audio; loaded on demand per selected theme |
| **Total initial load** | ~600KB | Setup screen + Phaser core; theme assets load after selection |

---

## 4. Suite Integration

### 4.1 Metaincognita Main Site

The main site at `metaincognita.com` links to all simulators. PachinkoParlor is added as a card in the simulator grid with:
- Title: "Pachinko"
- Subtitle: "Physics-based Digipachi simulator"
- Link: `https://pachinko.metaincognita.com`
- Preview image: screenshot of the game board with Classic Gold theme

### 4.2 Cross-Simulator Navigation

The top bar in PachinkoParlor includes the Metaincognita logo and links to other sims:
- Hold'em | Video Poker | Craps | Blackjack | Roulette | **Pachinko** (current, highlighted)

### 4.3 SEO & Social

```html
<title>PachinkoParlor — Physics-Based Pachinko Simulator | Metaincognita</title>
<meta name="description" content="A faithful browser-based simulation of modern Japanese Digipachi pachinko with real ball physics, digital lottery, fever mode, and educational statistical analysis.">
<meta property="og:title" content="PachinkoParlor — Pachinko Simulator">
<meta property="og:description" content="The pins are physics. The payoff is predetermined.">
<meta property="og:image" content="/assets/brand/og-image.png">
<meta property="og:type" content="website">
<meta property="og:url" content="https://pachinko.metaincognita.com">
```

---

## 5. Environment Variables

None required. PachinkoParlor is entirely client-side with no API keys, no secrets, and no server configuration. All configuration is embedded in the built JavaScript.

---

*PachinkoParlor — Doc 09: Website & Deployment*
