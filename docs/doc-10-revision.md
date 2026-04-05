# Doc 10 — Revision & Gap Analysis

## PachinkoParlor

**Date:** April 5, 2026
**Status:** Complete (pre-implementation review)

---

## 1. Purpose

This document reviews the complete design suite for internal consistency, identifies gaps between documents, flags unresolved design decisions, and tracks revisions made during the design process.

---

## 2. Revisions Log

| Date | Document | Change | Reason |
|---|---|---|---|
| Apr 5, 2026 | Doc 00 | Replaced "SpinTheory" with "Roulette" throughout | Name correction — the roulette sim is called "Roulette" |
| Apr 5, 2026 | Doc 00 | Added §4.8 Theming System + §4.8.1 Ukiyo-e design brief | Chris requested themeable board faces (standard in real pachinko) |
| Apr 5, 2026 | Doc 00 | Updated playing field aspect ratio from 9:16 to 4:5 | Corrected based on real machine glass dimensions from pachinkoman.com |
| Apr 5, 2026 | Doc 00 | Added exact ball specs (11mm, 5.75g) to §4.1 | Physical measurements confirmed from pachinkoman.com FAQ |
| Apr 5, 2026 | Doc 00 | Expanded tulip gate toggle mechanic with linked triggers | Behavior confirmed from pachinkoman.com parts documentation |
| Apr 5, 2026 | Doc 00 | Rewrote §3 Architecture for DOM+Phaser split | Architecture change: Phaser only on game canvas, all UI is DOM |
| Apr 5, 2026 | Doc 01 | Updated scaffold to include `views/`, `ui/`, `bridge.ts` | Architecture alignment with DOM+Phaser split |
| Apr 5, 2026 | Appendix A | Added §8 Pachi Puro section | Pro pachinko player research for educational content |
| Apr 5, 2026 | Doc 00, 07 | Added shared Metaincognita CSS design system | Suite consistency: same dark-mode design as Hold'em, Video Poker |
| Apr 5, 2026 | Doc 04 | Replaced StatsScene (Phaser) with DOM stats via StatsColumn + Chart.js | ADR-002 compliance: stats are DOM, not Phaser scenes |
| Apr 5, 2026 | Doc 05 | Replaced MenuScene (Phaser) with SetupView (DOM) | ADR-002 compliance: menu is a DOM view, not a Phaser scene |
| Apr 5, 2026 | Doc 05 | Reduced bundled themes from 5 to 2 (Classic Gold, Neon Drift) | Scope reduction: ship with 2, theme system extensible for future additions |
| Apr 5, 2026 | Doc 00, 01 | Fixed pin radius (2px) and ball radius (5px) for realistic ratio | Real pins ~3mm, balls ~11mm. Previous docs had both at 3px (same size). |
| Apr 5, 2026 | Doc 00 | Added per-tier kakuhen/jitan values to preset table in §8 | Values were scattered — only in Doc 07. Now consolidated in authoritative table. |
| Apr 5, 2026 | Doc 00 | Resolved open questions 1-3, 5-6 in §10 | Most were already answered by subsequent docs but §10 was never updated. |
| Apr 5, 2026 | Doc 00 | Removed orphaned "probability tier comparison tool" from Phase 4 deliverables | Feature was not specified in Doc 04 or Doc 07. Can be added later if needed. |
| Apr 5, 2026 | Doc 09 | Added CSP headers from Doc 06 to netlify.toml | Headers were specified in Doc 06 but missing from the deployment config. |
| Apr 5, 2026 | Doc 07 | Updated to reflect all clarifications: ball/pin radius, per-tier values, reach probabilities, normal spin payout, starting balance, default spec | Authoritative build prompt now addresses previously ambiguous specs. |

---

## 3. Cross-Document Consistency Check

| Check | Status | Notes |
|---|---|---|
| Tech stack matches across Doc 00, 01, 07 | ✅ | Phaser 3, Vite, TypeScript, Yarn, Netlify |
| Probability specs match across Doc 00, 02, 03, 07 | ✅ | 1/319, 1/199, 1/99. Per-tier kakuhen/jitan values consolidated in Doc 00 §8 preset table |
| Phase deliverables in Doc 00 §6 match individual phase docs | ✅ | Verified all five phases |
| Architecture in Doc 07 matches Doc 00 §3 | ✅ | Both describe DOM+Phaser split with GameBridge |
| Theme system in Doc 00 §4.8 matches Doc 05 deliverables | ✅ | 2 themes (Classic Gold, Neon Drift), ThemeManager, manifest system. Extensible for future themes. |
| Ball specs consistent (11mm, 5.75g) across docs | ✅ | Ball radius: 5px, pin radius: 2px. Consistent across Doc 00 §4.1, Doc 01 §3.3, Doc 07. |
| Design system CSS vars match across Doc 07 and Doc 05 | ✅ | Shared Metaincognita palette |
| Security considerations in Doc 06 align with architecture | ✅ | Client-only, no server, no auth |
| Deployment in Doc 09 matches tech stack | ✅ | Static SPA on Netlify, Yarn build. CSP headers from Doc 06 included. |
| Stats/menu are DOM views, not Phaser scenes (ADR-002) | ✅ | Doc 04 uses DOM StatsColumn + Chart.js. Doc 05 uses DOM SetupView. Fixed rev. Apr 5. |
| Pin/ball radius ratio is realistic | ✅ | Pin 2px, ball 5px (~2.5:1). Real ratio ~3.7:1. Compromise for visual clarity. Fixed rev. Apr 5. |

---

## 4. Identified Gaps

### 4.1 Resolved During Design

| Gap | Resolution |
|---|---|
| Phaser vs. Nuxt for game engine | Resolved: Phaser for canvas, DOM for UI. Not Nuxt. |
| Phaser licensing cost | Resolved: MIT license, completely free. Paid products (Editor, Compressor) not needed. |
| Board aspect ratio | Resolved: 4:5 based on real machine glass dimensions (16"×20") |
| Theme extensibility | Resolved: manifest-driven system, themes are self-contained asset directories |
| Pro pachinko player content | Resolved: pachi puro section added to Appendix A |
| Suite UI consistency | Resolved: shared CSS custom properties from Hold'em/Video Poker design system |

### 4.2 Open Items (To Be Resolved During Implementation)

| Gap | Impact | Recommended Resolution Phase |
|---|---|---|
| **Pin layout design** — No actual Masamura gauge coordinates exist in the docs. The `default.json` file needs to be designed by feel during Phase 1. | High — the pin layout IS the game feel | Phase 1: iterative design with physics tuning panel |
| **Audio asset sourcing** — No audio files exist. Need pin strike samples, lottery sounds, theme music. | Medium — game works without audio | Phase 5: source royalty-free or synthesize |
| **Theme art generation** — 2 themes × multiple assets each. AI-generated art needs prompting and curation. | Medium — game works with placeholder art | Phase 5: generate and curate iteratively |
| **Reach animation complexity** — Doc 00 describes elaborate Ukiyo-e reach sequences. Actual implementation complexity is unknown until Phase 5. | Low — can scale back to simpler animations | Phase 5: start simple, elaborate if time permits |
| **Mobile touch dial** — Rotary dial interaction on mobile touchscreens may need usability testing. | Medium — core input mechanism | Phase 1: test early on real devices |
| **Ball-to-ball collision performance** — Enabled by default but may need disabling on mobile. | Low — toggleable | Phase 1: benchmark on target devices |

---

## 5. Design Confidence Assessment

| Area | Confidence | Notes |
|---|---|---|
| Physics engine choice (Matter.js via Phaser) | High | Well-documented, existing pachinko examples, proven at this scale |
| Game state machine | High | Clear state graph, well-defined transitions, testable |
| Lottery math | High | Simple probability, well-understood, easy to verify |
| DOM+Phaser architecture | High | Clean separation, bridge pattern is standard |
| Pin layout design | Medium | No reference coordinates; must be designed by feel |
| Theme art quality | Medium | Depends on AI generation quality and curation effort |
| Audio design | Medium | Depends on asset sourcing |
| Mobile UX | Medium | Rotary dial on touchscreen needs real-device testing |
| Performance (30 balls, mobile) | Medium | Matter.js should handle it, but needs benchmarking |

---

*PachinkoParlor — Doc 10: Revision & Gap Analysis*
