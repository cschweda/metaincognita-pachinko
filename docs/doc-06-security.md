# Doc 06 — Security Considerations

## PachinkoParlor

**Date:** April 5, 2026
**Status:** Complete

---

## 1. Threat Model

PachinkoParlor is a **client-side-only static web application** with no server components, no user accounts, no authentication, no database, and no real money. The attack surface is minimal compared to server-backed applications. However, several security considerations apply.

### 1.1 What PachinkoParlor Does NOT Have

- No server-side code (no API, no backend, no serverless functions)
- No user accounts or authentication
- No real money, no payment processing, no financial transactions
- No user-generated content storage
- No database (all state is in-memory, lost on page refresh)
- No cookies, no localStorage for sensitive data
- No third-party API calls from the application

### 1.2 What PachinkoParlor DOES Have

- Client-side JavaScript executing in the browser
- Third-party dependencies (Phaser, Chart.js, Vite toolchain)
- Static assets served from Netlify CDN
- A game that simulates gambling (content sensitivity)

---

## 2. Dependency Security

### 2.1 Supply Chain Risk

The primary security concern is **dependency compromise** — a malicious update to Phaser, Chart.js, or a transitive dependency.

**Mitigations:**
- Pin exact versions in `package.json` (no `^` or `~` for production dependencies)
- Run `yarn audit` before each deployment
- Review Phaser and Chart.js changelogs before upgrading
- Use `yarn.lock` to ensure deterministic installs
- Limit dependencies to the minimum required (Phaser, Chart.js, Vite toolchain, Vitest)

### 2.2 Dependency Inventory

| Dependency | Type | Risk Level | Notes |
|---|---|---|---|
| phaser | Production | Low | Mature, well-maintained, MIT licensed, large community |
| chart.js | Production | Low | Mature, well-maintained, MIT licensed |
| vite | Dev only | Low | Build tool, not shipped to production |
| vitest | Dev only | Low | Test runner, not shipped to production |
| typescript | Dev only | Low | Compiler, not shipped to production |
| eslint | Dev only | Low | Linter, not shipped to production |

---

## 3. Content Security

### 3.1 Gambling Simulation Disclaimer

PachinkoParlor simulates gambling but involves no real money. The application must include:

- A clear disclaimer on the setup screen: "This is an educational simulator. No real money is used or exchanged."
- Responsible gambling messaging in the educational overlay (consistent with other Metaincognita sims)
- No mechanism to connect to real-money gambling services
- No advertising for gambling services

### 3.2 Content Security Policy (CSP)

Netlify should serve the following CSP headers via `netlify.toml` or `_headers`:

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-eval';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:;
  media-src 'self';
  font-src 'self';
  connect-src 'self';
  frame-ancestors 'none';
```

Note: `'unsafe-eval'` may be required by Phaser's internal module loading. Test without it first; add only if Phaser requires it. `'unsafe-inline'` is needed for Phaser's dynamic style injection.

### 3.3 No External Data Loading

PachinkoParlor loads no external resources at runtime. All assets (images, audio, fonts) are bundled in the build output and served from the same origin. No CDN references, no external API calls, no analytics scripts, no tracking pixels.

---

## 4. Client-Side Integrity

### 4.1 RNG Integrity

The `LotteryEngine` uses `Math.random()` for RNG. This is adequate for a simulator — cryptographic randomness is not required because no real money is at stake. The RNG transparency mode explicitly exposes the RNG state for educational purposes.

If a user inspects the JavaScript or manipulates the RNG via browser devtools, they can "cheat" — but this is a single-player educational tool, not a competitive or financial application. Cheating harms no one.

### 4.2 State Manipulation

All game state (ball economy, spin history, mode state) is held in JavaScript memory. A user with devtools access can modify any value. This is acceptable — the application is a teaching tool, not a secure gambling platform.

---

## 5. Deployment Security

### 5.1 Netlify Configuration

```toml
# netlify.toml
[build]
  command = "yarn build"
  publish = "dist"

[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

### 5.2 HTTPS

Netlify provides automatic HTTPS via Let's Encrypt for custom domains. The subdomain `pachinko.metaincognita.com` will have HTTPS enforced with automatic HTTP→HTTPS redirect.

---

## 6. Privacy

PachinkoParlor collects no user data. No analytics, no cookies, no fingerprinting, no tracking. Session data exists only in browser memory and is lost on page close.

If analytics are added in the future, they must be privacy-respecting (no PII collection) and clearly disclosed.

---

*PachinkoParlor — Doc 06: Security Considerations*
