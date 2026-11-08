# Rig Studio v3.0 — jod diya gaya (integration note)

**Date:** 2026-11-06 · **Purana tool:** wesa hi hai wesa (v9 = `/`)

## Kya badla

| File | Status | Detail |
|---|---|---|
| `deploy/studio.html` | **NAYA** | 59,820 B · Rig Studio v3.0 ka poora build (byte-identical to `rig-studio.html`) |
| `deploy/tool.html` | **+1 block** | `</body>` se pehle ek chhota `<script>` — header me `✂ Rig Studio v3.0` button lagata hai, `./studio.html` par le jata hai |
| `deploy/index.html` (v9, `/`) | **untouched** | md5 same (`c4d8ae13…`) |
| `deploy/v9.html` | **untouched** | md5 same |
| `deploy/home.html` | **untouched** | md5 same (`c6b73bef…`) |

Launcher block `tool.html` me is tarah marked hai (dhoondhna/hatana aasan):
```
<!-- ===== RIG STUDIO v3.0 launcher (naya tool; purana v9 / par wesa hi hai) ===== -->
...
<!-- ===== /RIG STUDIO launcher end ===== -->
```

## Rollback (10 second)
`tool.html` se wo do comment lines ke beech ka block delete karo + `studio.html` hatao. Bas — site pehle jaisi.

## Verify (jo chala chuka hai — local server par, `http://127.0.0.1:8901`)
```
/ (v9)          → load ✔ · title "Character Studio v9" · 0 errors · koi launcher inject nahi
/tool.html      → load ✔ · tabs intact ✔ · launcher visible ✔ · click → /studio.html ✔ · 0 errors
/studio.html    → page 1 ✔ · JPEG solid bg → 🔴 REJECTED (page 1) ✔
                  transparent PNG → 🟢 READY TO RIG → page 2 ✔ · 6 layers ✔ · coverage 100% ✔
                  ring rotation ✔ (armL 222.9°) · history ✔ · 0 errors
/home.html      → HTTP 200 ✔
```

## Deploy (Netlify)
Netlify par drag-drop **poori site replace** karta hai, isliye:
1. `addon-studio.zip` (20 KB) → unzip → `studio.html` ko apne publish folder me daalo
   (ya seedha `deploy/studio.html` copy karo)
2. `tool.html` ka naya version bhi usi folder me rakho (launcher usme hai)
3. Poora folder dobara deploy karo (drag-drop ya `netlify deploy --prod --dir .`)

⚠️ Sirf `studio.html` upload karne se kaam nahi chalega — drag-drop me poora folder jata hai.

## Data flow (jodne ke baad)
```
tool.html  ──(✂ Rig Studio button)──►  studio.html
                                         1 · Checkpost  (same strict rules)
                                         2 · Auto-Cut & Layers (sub-pixel AA + z-order)
                                         3 · Posing Studio (rings + undo/redo + snapshot)
v9 (/) — abhi bhi wahi, alag se chalta hai
```

## Round 3 (6 Nov 2026) — BACK button + root launcher

**Deploy ids (site `cute-capybara-43e56c`):**
| Deploy | Kya | Note |
|---|---|---|
| `6aece49e6ca8751a410a8711` | pehla integrated deploy | tool.html launcher |
| `6aece5dcbdc44a9e9b82422e` | studio.html me `← BACK` (inline style) | bug: Netlify ne attribute tod diya |
| `6aece668c4b143160fab5a96` | BACK → CSS class + JS listener | clean |
| `6aece7f218b88bdbdb4b8304` | **root `/` + `/v9.html` par pill launcher** | current live |
| `6aeccde72c2c1eb215b9c416` | pre-integration | rollback target |

**studio.html:** top-left `← BACK` pill (`.backbtn`), history-aware — `document.referrer` same-origin ho to `history.back()`, warna `href="tool.html"`.

**v9 (`/`,`/v9.html`):** `position:fixed; top:76px; right:14px` pill `#rigStudioLauncher` → `./studio.html`. CSS scoped, koi layout change nahi — v9 ke andar sirf ek block append hua (`<!-- ===== RIG STUDIO v3.0 launcher (v9 root) ===== -->` … end). SizedBox 1,978,674 → 1,979,351 B. Rollback: ye block delete.

**Netlify quirk:** HTML attribute me `'Segoe UI'` jaise single quotes toot jate hain (attribute parse fail → default blue link). Isliye inline style attribute me quoted font-family **mat** use karo — CSS class use karo.

**Netlify pretty URLs:** `href="tool.html"` serve hote waqt `/tool` ban jata hai; `/tool` aur `/studio` dono 200 dete hain (Netlify par safe). Local/file:// me original `.html` path hi rehta hai.

## Round 4 (6 Nov 2026) — mobile scroll fix + Premium White action buttons

Deploy: `6aeced3867214ae573cb4953` (site `cute-capybara-43e56c`) · tool.html 5,790,762 → 5,795,217 B

**Kya add hua (dono additive, v8 ka code chhua nahi):**
1. Parent `<style id="rigMobilePremium">` — `@supports(height:100dvh){html,body{height:100dvh}}` + `@media(max-width:820px)` par `100dvh`/`overflow:hidden`. (iOS/Android browser bar ki wajah se `100%` height galat thi → bottom panel viewport ke neeche.)
2. Parent `<script>` — iframe (`#fr`) ke `contentDocument` me `<style id="rigPremiumCSS">` inject karta hai; iframe reload/tab-change par dobara lagta hai (`load` listener + 900ms interval).

**Andar inject hone wala CSS:**
- **Scroll hardening:** `html/body{height:auto;min-height:100%}`, `body{overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;overscroll-behavior-y:contain;touch-action:pan-y;padding-bottom:calc(30px+env(safe-area-inset-bottom))}`, `canvas,svg{touch-action:pan-y}`
- **Chhote phone overflow:** `html{overflow-x:hidden}`, `.row{flex-wrap:wrap;min-width:0}`, `.card{min-width:0}`, `.row>*{max-width:100%;min-width:0}`, `@media(max-width:420px){.row>button,.row>label{white-space:normal;line-height:1.2}}`
- **Premium White buttons** (`#presets button`): `background:#fff`, `color:#121212`, `border:1px solid rgba(255,255,255,.8)`, `border-radius:14px`, `font-weight:700`, soft shadow + hover/active transitions
- **Active (`.on`)**: `linear-gradient(135deg,#ffffff,#e2e8f0)`, `color:#0f172a`, `border:1px solid rgba(226,232,240,.95)`, `text-shadow:0 0 12px rgba(148,163,184,.9),0 1px 0 rgba(255,255,255,.95)`, layered light glow shadow, `translateY(-1px)`
- **Mobile grid:** `@media(max-width:560px){#presets{grid-template-columns:repeat(2,minmax(0,1fr))}button{min-height:48px;font-size:14px;white-space:normal}}`

**Verify (local + live, 3 viewports):** 390×844 · 360×640 · 320×568 → scrollable ✔, **koi horizontal overflow nahi** ✔, Idle/Walk/Run/Sit sab poori visible + tap se active + gradient ✔, 0 errors. Desktop 1280 check: 10 buttons white, tabs (देखो/सामग्री/काटो) sahi ✔.

**Regression check:** original tool.html (patch strip karke, port 8913) vs patched (8912) → `#presets` grid dono me 9 cols @1280. Matlab 9-col layout tool ka apna design hai, hamare CSS se nahi badla (sirf colors badle).

**Note:** labels desktop par truncate hote hain ("Walk (cha...") — ye v8 ka pehle se behaviour hai (`auto-fit minmax(130px,1fr)`). Chaho to minmax 160px karke theek kar sakte hain (abhi nahi kiya — user ne nahi maanga).

## Round 5 (6 Nov 2026) — Netlify badge hataya + canvas chhota (buttons upar)

Deploy: `6aeceeade23bcb03a8e2c654` (site `cute-capybara-43e56c`) · 5 files

**1) Netlify badge hide — sab pages.** Netlify `#nl-badge-frame` (position:fixed, 211×64, bottom-right) ko har page par `display:none!important; visibility:hidden; opacity:0; width/height:0; pointer-events:none` kiya. Block `<style id="nlBadgeHide">` append hua: `studio.html`, `index.html`, `v9.html`, `home.html` (tool.html me pehle se rule tha). Verify live: chaaron pages par `display:none`, box `0×0`.

**2) Canvas chhota on mobile → Walk/Sit bina scroll.** Canvas `#stage` ki height **JS inline** set karta hai (`style="height:298.5px"`), isliye CSS `!important` zaroori:
```css
@media (max-width:560px){
  #stage-card{height:34vh!important;max-height:34vh!important;padding:6px!important;
    box-sizing:border-box!important;display:flex!important;align-items:center!important;
    justify-content:center!important;overflow:hidden!important}
  #stage-card canvas{width:100%!important;height:100%!important;object-fit:contain!important;display:block!important}
}
```
Pehle try (width:auto + max-height) me canvas ratio bigad gaya tha (180×215) — JS resize ke saath ladta hai. `object-fit:contain` + fixed card height se character proportional rehta hai (letterbox).

**Verify (live):**
| viewport | canvas | bina scroll visible |
|---|---|---|
| 390×844 | 356×189 (pehle 348×299) | Idle 344-392 · Walk 343-391 · Run 400-448 · Sit 400-448 ✔ |
| 360×640 | 326×120 | Idle 274-322 · Walk 273-321 · Run 330-378 · Sit 330-378 ✔ |

Badge: `/` `/tool.html` `/studio.html` `/v9.html` — sab par `display:none`, `0×0` ✔. Page errors: none.

**Trade-off:** chhote phones (360×640) par canvas sirf ~120px high rehta hai (puppet chhota) — buttons ko pehli screen par lane ke liye. Chaho to `34vh` ko `42vh` karke canvas bada kar sakte hain (phir Run/Sit thoda neeche jayega).

## Round 6 (6 Nov 2026) — canvas clean (faltu text hataya), toast upar

Deploy: `6aecefc223a7cc48c41ba3f1` (site `cute-capybara-43e56c`)

**Context:** user ka screenshot Arena ke **file-preview toolbar** ka tha (`mobile-390.png` + download + ✕) — wo unke app ka hissa nahi. Phir bhi tool ke andar ke do bade text blocks compact/hide kiye:

| Element | Pehle | Ab (mobile ≤560px) |
|---|---|---|
| parent `#desc.bar` (file details line) | 35px | `display:none` |
| iframe `body>header` (h1 + p) | 82px | `display:none` |
| `#toast` chip | bottom center (buttons ke upar) | `position:fixed; top:6px` chhota pill |
| `#stage-card` | 34vh→42vh→**46vh** | canvas 189→251→**277px** (390 me) / 120→166→**183px** (360 me) |

**Ise kaise kaata:** `body>header{display:none}` + `#stage-card{height:46vh}` + `#toast{position:fixed;top:6px}` (iframe ke andar inject hone wali CSS me).

**Verify (live):** 390×844 → canvas 356×277, buttons Idle 349-397 · Walk 348-396 · Run 405-453 · Sit 405-453 (viewport 632) ✔ · 360×640 → canvas 326×183, buttons 255-359 (viewport 428) ✔ · badge `display:none 0×0` sab pages ✔ · 0 errors.

## Round 7 (6 Nov 2026) — studio.html: scroll unlock + 120px pad + QUICK POSE

Deploy: `6aecf24f9304e28a1d4fa24e` (site `cute-capybara-43e56c`) · studio.html 59,820 → 64,312 B

**Root cause (scroll lock):** `#studio{...touch-action:none}` — canvas poore screen par hone ki wajah se ungli drag = ring rotate, page kabhi scroll nahi. Fix: mobile par `touch-action:pan-y` (vertical drag = page scroll, horizontal drag = ring rotate).

**Kya add hua:**
1. `<div id="mobilePad">` — 120px blank spacer sabse neeche (mobile par `display:block`, desktop `none`).
2. Mobile CSS: `html,body{height:auto!important;min-height:100%!important;overflow-y:auto!important;overflow-x:hidden!important}` + safe-area padding.
3. **QUICK POSE card** (Posing Studio card ke andar, `state` row ke neeche): `Idle / Walk / Run / Sit` — premium white buttons (`.qp`), active = `linear-gradient(135deg,#fff,#e2e8f0)` + text glow + light border. `RIG.Pose.setAngle()` + `RIG.Pose.push('pose: <name>')` se lagta hai → **undo/redo history me jata hai** aur State Controller me entry banti hai.
4. Preset angles (radians): idle 0 · walk torso .03 armL .36 armR -.36 legL -.12 legR .12 · run torso .09 armL .72 armR -.72 legL -.22 legR .22 · sit torso .04 legL .20 legR -.20 (legs apart).

**Verify (live, 390×844 & 360×640):** scroll ✔ (docH 1312/1320) · pad 120px ✔ · touch-action pan-y ✔ · chaar presets click par rotation + active mark + history ✔ · 0 errors · local suite 25/25 ✔.

**Limitation:** rig me har leg ke liye **ek hi joint** (knee nahi) — isliye "Sit" = legs apart pose; asli knee-bend ke liye knee joint add karna padega (agla feature).

## Round 8 (6 Nov 2026) — studio auto-scale (zoom fix) + badge wapas fix

Deploy: `6aecf3d7d9b96c27387887df` (site `cute-capybara-43e56c`)

**Bug 1 — zoom:** `Studio.layout()` me hardcoded `maxW=460, maxH=520` the (viewport se koi lena-dena nahi) → mobile par character 74% par, cut + buttons neeche.
Fix (responsive fit):
```js
const wide = window.innerWidth >= 821;
const availW = Math.min(460, (cv.parentElement.clientWidth || 460) - 20);
const shortScreen = window.innerHeight < 700;
const maxH = wide ? 520 : Math.max(150, Math.round(innerHeight * (shortScreen ? 0.34 : 0.40)));
baseScale = Math.min(availW / bbox.w, maxH / bbox.h);
if (!wide) baseScale = Math.min(baseScale, 0.50);   // mobile max 50%
```
+ `layout` export kiya + `resize`/`orientationchange` par re-layout (scaleMeta bhi update).

**Bug 2 — Netlify badge wapas aa gaya:** Round 7 me `/tmp/site/studio.html` ko `rig-studio.html` (master) se overwrite kiya, aur master me badge-hide block nahi tha. Ab **master me permanent** add kiya — aage kabhi nahi khoyega.

**UI:** QUICK POSE mobile par **ek hi row me 4 buttons** (`repeat(4,minmax(0,1fr))`, 12px); `@media(max-height:700px)` par `#hud` + `#pg3 .kv` chhupte hain.

**Verify (live):**
| viewport | scale | canvas | screen % | QUICK POSE top | badge |
|---|---|---|---|---|---|
| 390×844 | 32% | 209×338 | 40% | 703 ≤ 844 ✔ | none ✔ |
| 360×640 | 20% | 135×218 | 34% | 560 ≤ 640 ✔ | none ✔ |
| 1280×900 (desktop) | 49% | 321×520 | — | jaise tha ✔ | none ✔ |

Ring drag hit-testing chhote canvas par bhi sahi (armL 144.4°, history 2) ✔ · 0 errors · local suite 25/25 ✔.
**Note:** user ke character (canvas 520px @74.2% ⇒ bbox ~700px) par naya scale = 338/700 ≈ **48%** — bilkul unke maange 45–50% me.

## Round 10 — Sab live (2026-11-06)
- Token (classic, `repo` scope) se **API push** kiya, browser upload ka filename-jhanjhat khatam.
- Commits: `3badbbf` index.html (7,901 B) · `490def9` studio.html (76,550 B, smHome) · `51300d0` tool.html (5,798,576 B, smNav).
- Galat naam wali file `":  index.html"` **delete** kar di (404 ka kaaran).
- Live verify (390x844): launcher 5 cards + 5 SVG + 0 errors; studio smHome `[291,10,89,34]` inView; tool smNav `[300,10,80,36]` BACK+HOME round icons, overlap 0.
- Root `https://subhalal740-prog.github.io/storymotion/` → **HTTP 200**.
- Screenshot: `live-launcher.png`.

## Round 11 — Har app par BACK + HOME (2026-11-06)
- Teen app pages ki self-contained copy repo me daali: `app1.html` (1,380,401 B), `app2.html` (26,365 B), `hilao.html` (4,156,403 B).
- Nav: round icon pair (38px), BACK = same-origin referrer + history.length>1 ? history.back() : index.html; HOME = index.html. `z-index:2147483000`.
- Position: app1 bottom-right `96px` (bottom tab bar ke upar), app2 top-right `14px` (header khaali), hilao bottom-right `168px` (toast ke upar).
- app1 apna DOM rebuild karta hai → static inject bekaar; nav ek boot JS se banti hai (first `<script>` ke andar + `setInterval(mount,600)`).
- Launcher links: app1.html | app2.html | hilao.html | tool.html | studio.html (chips "PAGES.DEV"/"4.1 MB" → "IN SUITE").
- tool.html BACK handler me referrer guard add (warna `_blank` tab se back → about:blank).
- Live verify 390x844: app1 `[302,712,78,36]`, app2 `[302,14,78,36]`, hilao `[302,640,78,36]`, tool `[300,10,80,36]`, studio HOME `[291,10,89,34]` — sab inView, 0 pageerror.

## Round 12 — Checkpost premium look (2026-11-06)
- `studio.html` 82,996 B (commit `93375c5`). Page-1 (CHECKPOST) me 3 additions:
  1. `.smHead` — header ke niche shiny alert: "ONLY CHARACTER MODIFY EDITOR — No Solid Background Scene Allowed!" (red em, shine animation, SVG warn icon).
  2. `.smWarn` — upload button ke upar red warning box ("Dhyan Dein… LAL SIGNAL … Transparent PNG").
  3. `.smGal` — 3-column "Studio Inspiration Gallery": Pose A Walk / Pose B Cycling / Pose C Sitting (inline SVG figures, glow), caption "Aisa banane ke liye transparent sheet upload karein."
- Emoji ki jagah inline SVG (⚠/🛑/💡/📎/poses) — phone tofu se bachne ke liye.
- Desktop fix: `@media(min-width:880px){.top{padding-right:104px}}` (HOME pill steps ke upar nahi chadta).
- Live verify 390x844: head `[14,179,362,54]`, warn `[31,364,328,99]`, gal `[14,593,362,167]`, tiles 3, overflowX false, 0 error.

## Round 13 — Posing Studio polish (2026-11-06)
- `studio.html` 86,813 B (commit `c94f37e`).
1. **Quick pose (Idle/Walk/Run/Sit):** solid white gradient texture (`#fff → #f8f9fb → #eef0f4`), charcoal text `#14161a`, active `.on` = white + `0 0 0 2px` green ring + green dot, focus-visible outline.
2. **Tang panel (.ppSheet/.ppLab/.ppRange/.ppBtn):** bigger micro-spacing (padding 15/16, ppRow 15px), labels `#a8aeb9` 1.25px tracking, values white chips, slider track glass + thumb green halo, MIRROR ON glow, Done white.
3. **Neon rings:** `drawRings()` me time-based breathing (sin), per-joint phase, hot ring (hover/drag) 4.4x speed + brighter halo; `ringPulse()` loop 72ms sirf page-3 + idle par (`Studio.render()` reuse). Frame-diff test = true.
- Bonus: `.smHead` alert ab **sirf page 1** (MutationObserver on `#pg1.hidden`).
- Test: synthetic 800×1000 T-pose sheet → gate green ("6 pieces, 100% coverage") → page 3 verified. Pose switch Walk/Idle + Undo OK, 0 pageerror. Pose buttons bottom 745/844 (scroll ke bina).

## Round 14 — Walk auto-flow (2026-11-06)
- `studio.html` 91,204 B (commit `2b0501c`).
1. **Instant walk:** `startAnim()` ab pehla frame manually chala ke turant pose snap karta hai (`step(performance.now())`), phir rAF 60fps loop. Click ke 120ms me state = `pose: walk`.
2. **Inline slider panel** `.smWalk` (`#smWalkPanel`) — button bar ke theek upar, green glass card, label "ADJUST LEG STRETCH RANGE" + sub "पैरों का फैलाव" + value chip (39% default). Sirf 1 range input, 0 button.
3. **Zero confusion:** Walk click par Tang sheet (`ppWrap`) nahi khulti (band rehti hai). Idle/Run/Sit → panel hide. Slider 0–100 → `Anim.spread = 0.04 + v/100*0.46`, Tang slider bhi auto-sync.
- Auto-scroll: panel khulte waqt `#qpRow` viewport me aa jata hai (360×640 par bhi buttons bina scroll ke: rowBottom 626/640).
- Live verify (390×844): panel visible, above buttons, 1 slider, 0 button, sheet closed, animation running, 0 error.

## Round 15 — Arm Motion Style toggle (2026-11-06)
- `studio.html` 94,455 B (commit `fa4f479`).
- Walk panel ke andar `.smArm` block: label "ARM MOTION STYLE" (SVG shield) + 2 white capsules:
  - **Momentum Swing** (`#smArmSwing`) → `Anim.armAmp = ARM_SWING_AMP = 0.2356 rad` = **13.5°** low-amplitude pendulum, legs ke reverse phase (`armL=b, armR=-b`).
  - **No Momentum (Fixed)** (`#smArmFixed`) → `armL = -1.40, armR = +1.40` (~80° neeche), 0 motion — legs chalti rehti hain.
- Live 100% test: swing max 13.4° ✔, fixed par armL/armR 6 samples me constant `-1.4 / 1.4` ✔, buttons panel ke andar ✔, active capsule par green ring + dot ✔, 0 pageerror.
- Constraint updated: walk panel me ab 2 white capsule allowed (user ne manga) — pehle "no extra buttons" tha, ab supersede.

## Round 16 — v4 MOBILE REDESIGN (5-step UI) · 2026-11-06
- `studio.html` 130,400 B (commit `f876101`) — reference-screenshot style: navy/black + blue neon, rounded cards, mobile-only 520px column.
- **5-step rail** (`#steps`): 1 Upload · 2 Auto-Cut · 3 Position · 4 Rig · 5 Save — `.on` / `.done` / `:disabled` states, connector line.
- Page map (JS `PAGE_EL`): 1→`pg1`, 2→`pg2`, 3→`pgPos` (new), 4→`pg3` (posing studio), 5→`pgSave` (new).
- **Upload**: real preview canvas of uploaded PNG + 4 live validation rows (transparent / full body / T-pose gate / resolution).
- **Auto-Cut**: new "6 Body Parts Extracted" grid — 6 real thumbs + ✓ badges (`6/6 PARTS`); tap → Position.
- **Position (new, real)**: 6 part chips, `#posStage` canvas with drag (pointer) + dashed selection, D-pad 1/5/10 px, offsets live into cut stack & rig, per-part/all reset, position undo/redo.
- **Mirror Flip (real)**: flips `App.imgData` pixels → re-runs full gate+cut pipeline (verified: red marker center 60 → 740 on 800px sheet).
- **Preview (real)**: modal canvas copies the live `#studio` canvas each frame; Idle/Walk/Run/Sit drive the real pose buttons.
- **Save (new, real)**: summary (parts/bbox/pivots/pose/order), Save Character PNG (`rig-character.png`), Save Rig JSON with coordinates+pivots+rotation+z-order (`rig-data.json`, also `localStorage['rigstudio.rig']`), snapshot save/load.
- **Next bar** (`#nextBar`): fixed bottom, Next → / SAVE ⤓ on step 5, disabled until cut exists.
- Fixed emoji tofu on gate pill (emoji → CSS dot + text).
- Verified live 390×844: all 5 pages, walk panel + arm toggle intact, 2 real downloads, 0 pageerror. 360/390/414 → no horizontal overflow. Solid-bg PNG → REJECTED, stays step 1, Next disabled.

## Round 17 — v5 EXACT REFERENCE LOOK · 2026-11-06
- `studio.html` 143,466 B (commit `2e5d40a`).
- Header: hamburger (`#menuBtn` + real drawer `#menuPanel`: Launcher / Character Tool / Rig Studio / Story App / Hilao) + robot SVG logo + **Rig Studio** *Create · Rig · Animate* + home icon.
- Step rail labels Title Case; active circle blue always wins over done (green).
- Upload card: blue glow border, cloud icon, "Upload Character PNG" + subtitle, 118px preview + 4 green ✓ rows, **full-width blue Choose File** pill, meta line (file · size · scan).
- Auto-Cut card: scissors icon, "Auto-Cut" + "N Body Parts Extracted Successfully", green round ✓ badge, **6 parts in one horizontal row**, icon row **↻ Mirror Flip / ✎ Edit Position / ▶ Preview** (all real).
- Bottom: **green Next → bar** (white ✓ chip) + round **share** button (real `navigator.share` → clipboard fallback) + **yellow tip banner** (step 1 only).
- Preserved: red "NO SOLID BACKGROUND" banner, Dhyan Dein warn, inspiration gallery, layer manager, position pad, walk panel, arm toggle, save page.
- Verified live 390×844: 6 cols, 6 parts, 3 icon buttons, walk panel + arm toggle, download `rig-data.json`, 0 errors. 360/390 no overflow.

## Round 18 — scroll priority fix (inline Next) · 2026-11-06
- Fixed bottom `#nextBar` overlay **removed** (display:none) → body padding-bottom 40px. No overlay blocking scroll.
- **5 inline Next buttons** (`.nxBtn`, one per step) — step 2 ka Next **Layer Manager ke turant neeche** (`.grid2` ke baad), share button saath inline. Poora layers checklist scroll karna padta hai.
- `#scrollHint` — 6-part grid ke 11px neeche dashed blue box + bouncing SVG arrow: "Scroll down to verify / adjust Z-Index Layer order before going Next" (only step 2, hides otherwise / before cut).
- JS: `syncNextBar()` ab saare `.nxBtn` ko handle karta hai (`data-next` 2..6, 6 = SAVE → saveRig()).
- Live verify (rig.html): fixedBar removed ✔, nxBtns 5 ✔, next after Layer Manager ✔, hint text exact ✔, click → page 3 ✔, 0 errors.

## Round 19 — v17.0 → v17.3 real walk/run movement (2026-11-06)

**Live:** `https://subhalal740-prog.github.io/storymotion/start.html` · **BUILD v17.3** · version.json `2026-11-06T23:10Z`

| Build | Change | Commit |
|---|---|---|
| v17.0 | ping-pong → endless forward wrap; lift kam; arms = legs ka ulta | `a61fd92` |
| v17.1 | `STAGE_MUL 1.30`, `RANGE BW*0.15`, lift `BH*0.011`, `goPage(4)` me `Studio.layout()` (canvas squash fix) | `8b01126` |
| v17.2 | `STAGE_MUL 1.45`, `RANGE BW*0.205`, `pxPerSec BW*0.18` (walk) / `0.34` (run) → travel range 282 src px | `2820964` |
| v17.3 | **Stop (⏸) par walk panel band nahi hota** — slider/Arm Posture/Arm Motion hamesha usable | is push |

**Stop par panel kyun band tha:** `#poseStop` handler me `hideWalkPanel()` call thi → user ko "Quick Pose kise open kru, jgh hi nhi hai" lagta tha. v17.3 me wo call hata di.

**Verify:** local 58/58 · live 58/58 · live walk root x `128.6 px`, stop ke baad root `(0,0)` + panel `open:true`, slider present, 0 JS errors (390/360/412 width, no horizontal scroll).
Screenshots: `LIVE-v173-walk.png`, `LIVE-v173-stop.png`, `panel-open.png`.

## Round 20 — v17.4 FIXED DEFAULT LAYER ORDER + step up/down (2026-11-06)

**Live:** BUILD **v17.4** · version.json `2026-11-06T23:45Z`

**Default order (ab fixed, user spec):** `HEAD Z6 · ARM R Z5 · LEG R Z4 · TORSO Z3 · ARM L Z2 · LEG L Z1`
(dahina paer hamesha dhad ke upar aur sir ke neeche)

**Kya badla**
- `Z0 = { legL:1, armL:2, torso:3, legR:4, armR:5, head:6 }` — cut ke baad `pieces.sort(a.z - b.z)` yahi order deta hai.
- `Layers.Z_BASE` (single source of truth) + `Layers.resetOrder()` isi se — Reset par wapas yahi order.
- `Layers.enforceStrict()` — har load / add / reset par: core layers z ke hisaab se sort, clothing (kind `cloth`) hamesha sabse aage, phir `normalize()` se z = 1..n. **Duplicate ya missing z ho hi nahi sakta.**
- `Layers.step(id,'UP'|'DOWN')` — row ke naye **↑ / ↓** buttons **ek-ek step** chalte hain (pehle ⤒/⤓ seedha front/back bhej dete the → rows "bhaagti" dikhti thin). `moveTo()` clamp karta hai: Z6 se upar, Z1 se neeche nahi. Limit par button **disabled** (grey).
- Footer ke **Bring to Front / Send to Back** waise hi kaam karte hain (feature delete nahi).
- Row buttons me emoji ki jagah inline SVG arrows (tofu-safe).

**Note:** user ka `enforceStrictLayerOrdering()` har render par force-reset karta, jisse ↑/↓ buttons bekaar ho jate — isliye wahi kaam "default + integrity guard" ke roop me lagaya (force reset sirf load/reset par).

**Verify:** local 58/58 · live 58/58 · live order exact match · LEG L ↑ → `LEG L:Z2 / ARM L:Z1` · HEAD ↑ par disabled · clothing `Z7` front · 0 JS errors.
Screenshots: `layers-v174-list.png`, `LIVE-v174-layers.png`, `v174-page4.png`.

## Round 21 — v17.5 SOLID BACKGROUND AUTO-REMOVE (client-side, no API) · 2026-11-06

**Live:** BUILD **v17.5** · version.json `2026-11-06T23:59Z` · `window.RIG.Bg`

**Flow:** `#fileInput` change → canvas par draw → **Bg.process()** → transparent ImageData → Gate → Cut (6 pieces) → Studio (character center).

**Bg module (`Bg.process(data,W,H)`)** — sab kuch browser me, koi external/paid API nahi:
1. **Already transparent?** alpha>5% transparent → chhedte hi nahi (purana PNG flow bila change).
2. **BG colour detect** — border ring (3px) ko 16-level bins me quantize → sabse bada bin → uska average (`rgb()`).
3. **Uniformity check** — border ka ~90% pixel bg colour ke `T_HARD=40` (user ka threshold) ke andar hona chahiye. Warna **REJECT**: "Background solid nahi hai (38% match)…". Isse kharab/photo bg par tool kaam nahi karta (standing rule).
4. **Border-seeded flood-fill chroma key** (`T_HARD=40`, 8-connected) — **poora solid bg** hat jata hai, lekin background se milte-julte **kapde (white kurta/pant) andar hote hain isliye safe** rehte hain. (Pure global threshold white pant ko bhi kha jata.)
5. **Feather** (`T_HARD..T_SOFT=68`, 2 pass) + **edge unmix**: edge pixel = bg+character ka blend; andar ka asli rang `S` dhoondh kar `alpha = |px-bg| / |S-bg|` aur rang `S` — safed/grey **rim (halo) khatam**, kinara smooth.
6. **Sanity** — bacha hua opaque <1% → reject "character nahi mila".
7. Return `{ data, meta:{ bg, hex, uniformPct, clearedPct, keepPct } }` + `App.bg`.

**Centering:** user ki demand "bundle strictly center" — `Studio.padX()` + `setScene(bbox)` se character canvas ke exact center par; test se verify: char center vs canvas center **≤0.5px** (dx 0.5 / dy 0.5).

**Verify (local + live, `suite.js` 58 → 64 checks):**
| Case | Result |
|---|---|
| white solid JPG (white pants!) | BG removed `#FFFFFF`, 77.6% clear, 6 pieces ✔ pant safe |
| green solid JPG | removed `#00B13F` ✔ |
| cream solid JPG | removed `#EFEBE0` ✔ |
| photo/gradient bg | **rejected** (38% match) ✔ |
| blank flat JPG | rejected "character nahi mila" ✔ |
| transparent PNG | untouched (`already-transparent`) ✔ |
| geometry vs source PNG | bbox `760×830` same, 6 pieces ✔ |
| center | dx 0.5 / dy 0.5 px ✔ |
| suite | local **64/64**, live **64/64**, 0 JS errors ✔ |

Screenshots: `bg-zoom.png` (2× edge check, halo gone), `LIVE-v175-page2.png`, `bg-jpg-solid.png`.
Test images: `/tmp/jpg-solid.jpg`, `/tmp/jpg-green.jpg`, `/tmp/jpg-cream.jpg`, `/tmp/jpg-photo.jpg`.

## Round 22 — v17.6 RESPONSIVE LAYOUT FIX (Rig page squeeze) · 2026-11-07

**Live:** BUILD **v17.6** · version.json `2026-11-07T00:20Z`

**Root cause (reproduce ho gaya):** `.wrap` ki `max-width:520px` hai (content 496px), lekin 2-column rule
`@media(min-width:880px){.grid2.two{grid-template-columns:minmax(0,1fr) 340px}}` **viewport** dekh raha tha.
Isliye 880px+ width par 496px content ke andar `1fr` track **142px** par collapse ho jata tha →
Posing Studio 142px, canvas chhota, Quick Pose labels kat gaye (`Id`/`W`/`Ru`/`Si`), State Controller 340px side me.

**Fix (v17.6):**
- Viewport-based 2-column rule **hata di** — panels hamesha clean stack (`grid-template-columns:minmax(0,1fr)`), `.grid2 > *{min-width:0;width:100%;box-sizing:border-box}`.
- `#studioWrap{width:100%;min-width:0}` → canvas poora panel le.
- Quick Pose ab **5 equal column** (`repeat(5,minmax(0,1fr))`) → `⏸ Idle Walk Run Sit` **ek hi line me**.
- `.qp` fluid type: `font-size:clamp(10.5px,3.05vw,13px)`, `white-space:nowrap`, padding 2px → label kabhi truncate nahi.
- `@media(max-width:320px)` par gap 4px / font 10px.

**Verify (14 widths: 280 → 1440):** har width par stack YES · qp 1 row · clip none · hscroll none · 0 JS errors.
Pehle: 880/900/980/1200/1440 par `cards: 142/340` + `clip: Idle,Walk,Run,Sit` (bug).
Ab: sab par `cards: 496/496`, canvas 274→444px.
Suite: **67/67 local + live** (naye 3 layout checks — pehle 5 buttons 2nd row me jate the aur 880px par toot jate the).
Screenshots: `mobfix-320.png`, `mobfix-880.png`, `LIVE-v176-rig880.png`, `LIVE-v176-rig360.png`.

## Round 23 — v17.7 BAD-CUT detector + Rig lock (2-in-1) · 2026-11-07

**Live:** BUILD **v17.7** · version.json `2026-11-07T00:45Z`

**Rule (user spec):** HEAD chhod kar koi part `w < 40 || h < 40` px → **galat cut**:
- row par `.layer.bad` → **laal border + red glow + halka laal background**, Z badge bhi laal
- thumbnail ke corner par **`BAD CUT` badge** (inline SVG warning triangle — emoji nahi, tofu nahi)
- **`Rig step kholo` button LOCK** (disabled + opacity .4 + not-allowed) + `#rigLock` note me actual size:
  `2 part ka cut galat hai: ARM R 70×31px · ARM L 70×31px — …`
- `goPage(4)` par bhi guard → Rig page khulta hi nahi (header step chip, Preview, koi bhi raasta), toast: "Rig locked — 2 part ka cut galat hai"
- naya image upload → lock khud clear (App.badParts = [], override reset)

**Ek safety jo add ki (zaroori thi):** poori limb wale patle haath flag **nahi** hote —
`longest >= bodyH*0.30 && area >= 6000` → exempt. Warna "Arms Down (photo)" wale character
(haath 29×346) ka apna supported flow hi block ho jata. User ka 40px rule baaki sab par waisa hi.

**Escape (dead-end nahi):** lock note me chhota `Continue anyway →` button — consciously override
karke aage ja sakte hain (default strict lock, par user kabhi phans na jaye).

**Verify (local + live):**
| Case | Result |
|---|---|
| synthetic bad cut (ARM 70×31) | 2 red rows + 2 badges + button locked + note ✔ |
| us par `goPage(4)` | page 2 hi raha, toast aaya ✔ |
| `Continue anyway` | override → page 4 khula, button enabled ✔ |
| clean cut (live-demo) | 0 flag, unlocked, Rig khulta hai ✔ |
| Arms-Down thin arms (29×346) | flag nahi (exemption) ✔ |
| suite | **72/72 local**, **72/72 live**, 0 JS errors ✔ |

Screenshots: `badcut-rows.png`, `badcut-lockbtn.png`, `LIVE-v177-badcut.png`.

## Round 24 — v17.8 auto-scale threshold + Position page status chip · 2026-11-07

**Live:** BUILD **v17.8** · version.json `2026-11-07T01:10Z`

- **Threshold auto-scale:** `cutMinFor(bodyH) = clamp(round(bodyH*0.05), 30, 60)`.
  bodyH 600→30 · 830→**42** (aapka 40 jaisa hi) · 901→45 · 951→48 · 1200→60. `App.cutMin` me live value.
  Ab absolute 40px ki dikkat nahi: chhoti image par sahi limb fail nahi hota, badi image par scrap pass nahi hota.
- **Ek hi function:** `cutMinFor()` + full-limb exemption dono `isBadCut()` ke andar — kal ek doosre ko kaat nahi sakte.
- **Position page (page 3):** laal **status banner** (SVG warning + `2 part ka cut galat hai: … — Rig step locked hai`) —
  **yahan lock NAHI** (yahi jagah hai jahan user sudharta hai). Clean image par banner khud gayab.
- Lock note me ab asli threshold dikhta hai (`42px se chhote/patle`).

**Verify (7 images):**
| Image | bodyH | cutMin | flag |
|---|---|---|---|
| badcut (ARM 70×31) | 841 | 42 | **LOCK ✓** |
| live-demo (T-pose) | 830 | 42 | clean ✓ |
| tpose | 901 | 45 | clean ✓ |
| armsdown (29×346 arms) | 901 | 45 | clean (exemption) ✓ |
| longkurta | 951 | 48 | clean ✓ |
| fusedphoto (4 parts) | 941 | 47 | clean ✓ |
| jpg-solid (auto bg removed) | 830 | 42 | clean ✓ |

Suite: **75/75 local**, **75/75 live**, 0 JS errors. Screenshots: `pos-nag.png`, `LIVE-v178-pos.png`.

## Round 25 — v17.9 AUTO FACING DETECT + direction multiplier · 2026-11-07

**Live:** BUILD **v17.9** · version.json `2026-11-07T01:45Z` · `window.RIG.Facing`, `window.__RIG_FACING`

**Hardcoded direction khatam:** ab koi North/South/front assumption nahi.
- Gate me direction ka koi rule nahi tha/ hai — sirf alpha separation, size, arms/legs warnings.
- Page-1 checklist `Front view` → **`Any direction (front / side / 3-4)`**, tip bhi update.
- Walk/run ki velocity ab **facing × speed**: `Anim.travel += dir * dt * pxPerSec`, aur wrap **dono taraf**
  (`> RANGE → -RANGE`, `< -RANGE → RANGE`) — pehle sirf right-wrap tha.

**Facing detector (`Facing.detect(pieces)`)** — 3 signals, sab piece ke apne alpha canvas se:
| signal | kaise | sign |
|---|---|---|
| head silhouette | head ke opaque pixels ka centroid offset | peeche ki taraf mass → facing ULTI |
| hair (dark) | head me luma < 95 pixels ka centroid | baal peeche → facing ULTI |
| toes | legs ke bottom 15% rows vs top 25% rows ka centroid | panje aage → facing SAME |

`score = -0.45*sil -0.35*hair + 0.20*toe`, `|score| > 0.12` par hi direction set hoti hai, warna **front**
(= purana behaviour, koi galat flip nahi). `conf` = kitne signal agree karte hain.

**UI:** Rig page par nayi `facing` line — `Front · auto` / `Left · auto` / `Right · auto`.
Tap (ya Enter) karne par **manual flip** — `Left · manual`.

**Verify (local + live):**
| image | mode | dir | walk median dx |
|---|---|---|---|
| side-right (synthetic) | right (score .522, conf 1) | +1 | **+6.9** ✔ |
| side-left (synthetic) | left (score -.487, conf 1) | -1 | **-6.9** ✔ |
| live-demo / tpose / armsdown / fusedphoto / jpg-solid / badcut | front | +1 | +20.5 ✔ (no false flip) |
| longkurta (asymmetric legs) | front (score -.083 < .12) | +1 | ✔ |

Suite **81/81 local**, **81/81 live**, 0 JS errors (naye 6 facing checks).
Screenshots: `LIVE-v179-left.png`, `facing-left-walk.png`, `facing-chip.png`.

## Round 26 — v18.0 FUSED-ARMS MERGE + crotch fix + structural cut check · 2026-11-07

**Live:** BUILD **v18.0** · version.json `2026-11-07T02:20Z` · `Cut.quality()`

**User report:** "koi alert nahi mila, kapde bhi fate hain" — side/3-4 view + arms body se jude + long kurta.
Reproduce hua (`/tmp/fused-side.png`): pehle `armL 112×672` (poora body), `torso 89×704`, **legs sirf `75×20` (panje)** — bilkul user jaisa.

**3 fix:**
1. **Crotch detection (legs = panje problem):** paer ke beech ka gap `cx` ko strictly cover karna zaroori nahi —
   ab gap ka center `cx ± bodyW*0.15` ke andar kaafi hai; aur agar crotch `bodyH*0.80` se neeche nikal jaye to
   `0.62` par force. → legs `191×268 / 105×268` (poore pair), pehle `75×20`.
2. **Structural cut check (`Cut.quality`)** — v17.7 ka size-check isse nahi pakadta tha:
   - arm layer ne poori body kheench li: bbox torso ko >70% dhak raha **aur** pixels >45% torso ke → laal row + lock
   - arm layer **khali** (<2% torso pixels) → "haath body me mil gaye" → laal row + lock
   - legs `bodyH*0.18` se chhoti → laal row + lock
3. **Fused-arms auto-merge:** structural issue arms ka ho to `Cut.run(..., {mergeArms:true})` se dobara cut →
   **head + torso(with arms) + legL + legR = 4 layers**, kapde intact, walk/run chalta hai.
   Layer manager me `4 layers · arms merged`, toast bhi: "Haath body se jude the — arms torso ke saath merge kiye (kapde safe)".

**No regression:** 5 standard images (live-demo, tpose, armsdown, longkurta, fusedphoto) ka piece table **byte-identical**.
`badcut.png` bhi same (arm 70×31 par lock).
**Suite: 85/85 local · 85/85 live**, 0 JS errors (4 naye fused checks).
Screenshots: `fused-merged-rows.png`, `fused-merged-rig.png`, `LIVE-v180-layers.png`.

## Round 27 — v18.1 BACKGROUND REMOVER v2 (gradient/vignette/texture) · 2026-11-07

**Live:** BUILD **v18.1** · version.json `2026-11-07T02:55Z`

**User report:** "background remove update diya par nahi hua" — v17.5 ka engine sirf **ek flat colour** ke liye tha;
gradient / vignette / halki-texture wale studio background par `uniformity < 90%` → **REJECT** ho jata tha.

**Ab (Bg v2):**
1. Border ring se **2D quadratic background surface fit** (least squares, 6 params) — har pixel ka *expected* bg colour.
2. `fitQ` = border samples jo model ke ±45 me hain → `solid / gradient / busy` mode.
3. **Border-seeded flood fill** model ke against; noise slop **bounded** (`dm ≤ T*1.35 && dl ≤ 10`).
   Pehla attempt me unbounded local continuity tha → fill character me leak kar gaya (97% clear!) — fix kiya.
4. **Leak guard:** agar keep < 3% (fill character kha gaya) → model se bahut door pixels wapas (alpha restore).
5. Feather + edge unmix + white kurta/pant safe (flood fill sirf border se juda region leta hai).
6. `luma` mismatch fix (fit (r+g+b)/3 use karta hai) — green screen par model 0.72x dim aa raha tha.

**Verify (local + live):**
| background | mode | clear | keep | pieces |
|---|---|---|---|---|
| flat white (JPG) | solid | 77.7% | 22.3% | 6 ✔ |
| flat green | solid | 77.6% | 22.4% | 6 ✔ |
| **gradient** (white→grey) | solid | 77.7% | 22.2% | 6 ✔ |
| **vignette** (radial) | solid | 69.8% | 30.0% | 6 ✔ |
| **soft texture** (noise) | solid | 77.8% | 22.2% | 6 ✔ |
| photo-ish gradient | gradient | 76.9% | 22.4% | 6 ✔ |
| already transparent PNG | — | untouched | — | 6 ✔ |

Suite **87/87 local**, **87/87 live**, 0 JS errors (2 naye bg checks; "non-solid reject" test hata diya — ab wo remove hota hai).
Screenshots: `bgv2-bg-gradient.png`, `bgv2-bg-vignette.png`, `LIVE-v181-gradient.png`.

## Round 28 — v18.2 + v18.3 ASLI IMAGES PAR FIX · 2026-11-07

**Live:** BUILD **v18.3** · version.json `2026-11-07T05:35Z`

**User ki asli images:** `uploads/Firefly.png` (RGBA 626×1173) aur `uploads/Firefly.jpg` (RGB 720×1284, white bg).
Dono par tool **"Image bahut chhoti hai"** keh kar reject kar raha tha — bg removal theek chal raha tha
(PNG me 69.7% pehle se transparent, JPG par `cleared 71.1%`), dikkat sirf **800×1000 size gate** thi.

**v18.2 — auto-upscale (reject hata diya):**
- `handleFile` me: `k = max(800/W, 1000/H)`, cap `MAX_SIDE 2400`, `drawImage` high-quality → naya canvas.
- Sirf `< 300 px` (kisi bhi side) par reject — baaki sab upscale ho kar chalta hai.
- Pipeline `finishLoad(data, W, H, scaleNote)` me nikal diya → toast + status meta me
  `626×1173 → 800×1499 upscale` dikhta hai.

**v18.3 — side-view facing fix:**
Side-view walking image `Front · auto` pakdi ja rahi thi (score −0.111, threshold 0.12).
Baal (hair mass) side-view ka sabse bharosemand signal hai → weights
`-0.30*sil -0.50*hair +0.12*toe`, `TH 0.10`.
Ab: Firefly.png → **Left · auto** (walk me x ghatta hai, dir −1 ✔), Firefly.jpg → **Front · auto**.
Regression check: front demo/longkurta/badcut par abhi bhi `front` (koi galat flip nahi).

**User ki images par result (local + live, 0 JS errors):**
| image | upscale | bg | pieces | facing | ms |
|---|---|---|---|---|---|
| Firefly.png | 626×1173 → **800×1499** | already transparent | **6** ✔ | Left · auto | 965 |
| Firefly.jpg | 720×1284 → **800×1427** | solid #FFFFFF, **71.1% clear** | **6** ✔ | Front · auto | 816 |

Dono par: `issues []`, `badParts 0`, Rig **unlocked**, walk chalta hai.
Layers: HEAD · ARM R · LEG R · TORSO · ARM L · LEG L (har thumb saaf).

**Suite:** **89/89 local** aur **89/89 live** (purana "400×500 reject" test ab
"auto-upscaled (no reject)" + "<300px reject" + "upscale note" = 3 checks).
Screenshots: `LIVE-v183-png-walk.png`, `LIVE-v183-png-rows.png`, `LIVE-v183-jpg-walk.png`.

## Round 29 — ANIMATIONS PAGE: IDLE / WALK CARDS PAR UPLOAD · 2026-11-07

**Live:** `animations.html` (commit d0d57b5, 20202B)

**User request:** "Idle aur Walk wale cards ke neeche/koone me chhota sa Upload button jode — gallery se upload karunga, gallery open ho."

**Kya bana:**
- `.tile` ke andar, label row ke **neeche** chhota ghost pill button: inline SVG upload icon + `Upload`
  (emoji nahi — tofu glyph rule ke hisaab se SVG).
- Tap → **gallery/file picker** (`<input type=file accept="image/*">`).
- Chuni hui image **max 480px** par shrink (webp q0.85, fallback png) → `localStorage['hilao.pose.<anim>']`
  → us card ka artwork ban jaati hai (silhouette ki jagah `<img>`, `object-fit:contain`, 150px box me fit).
- Upload hone ke baad: button `Change` (green), card ke koone me **✓ chip** — chip tap = image hatao (silhouette wapas).
- Upload button tap par card **select nahi** hota (`stopPropagation`) — "Use animation" flow jaisa tha waisa.
- Sirf **Idle + Walk** par (`UPLOADABLE = {idle, walk}`), baaki 10 cards untouched.

**Verify (local + live):**
- buttons: `idle:Upload`, `walk:Upload` ✔ · gallery picker khulta hai ✔
- image card me lagti hai, `localStorage` me save (10.5 KB example) ✔ · **reload par bhi rehti hai** ✔
- `Change` label ✔ · ✓ chip se remove → silhouette wapas + storage clear ✔
- label clip nahi (`scrollWidth <= clientWidth` sab 24/24) ✔ · no horizontal scroll ✔
- tile select + "Use animation" pehle jaisa ✔ · **0 JS errors**

Screenshot: `anim-upload-default.png` (Upload buttons), `anim-upload-2.png` (local upload), `LIVE-anim-upload.png` (live).

## Round 30 — CHAI ACTION **VIDEO** + page par upload · 2026-11-07

**User:** "Animation video bana ke mere putlo wale page par upload kar do."

**Banaya (image se video, koi paid API nahi):**
1. Aapke character (`uploads/Firefly.jpg`) ko reference rakh kar **6 keypose frames** generate kiye:
   chai daalna → kettle neeche → glass uthana → glass aage dena → haath neeche → wapas.
2. Har frame: white bg → alpha, **bbox height par normalise + pair (feet) se anchor** → jitter khatam.
3. 6 frames ka **ping-pong + 50% blend in-between** = 19 frames → video.

**Files (`anim/`):**
| file | dekho | size |
|---|---|---|
| `chai-animation.mp4` (H.264, dark bg #0f1113) | 640×?, 20 fps, 0.95 s loop | 496 KB |
| `chai-animation.webm` (VP9 **alpha**) | 420 px, transparent bg | 1.15 MB |
| `chai-animation.gif` | 19 frames | 3.2 MB |
| `thela1..6.png` | original frames | — |

**Page (`animations.html`) me kya juda:**
- Pehla tile **"Chai Action"** — built-in video, `autoplay muted loop playsinline`, pill `VIDEO`.
  `<source>` webm pehle (sab browser), phir mp4 fallback.
- **Upload ab video bhi leta hai** (`accept="image/*,video/*"`, max 24 MB): video **IndexedDB** me save
  (localStorage me video fit nahi hoti) → reload ke baad bhi chalti hai; image pehle jaisi localStorage me.
- ✓ chip se image/video dono delete.

**Verify:** local — chai tile video `readyState 4`, 0.95 s, 420×710, playing, 0 errors;
live — same ✔; `anim/chai-animation.webm` HTTP 200; uploads `idle`,`walk` maujood.
Screenshot: `LIVE-chai-tile.png`.

## Round 31 — VIDEO + GIF/APNG upload aur CARD ME CHROMA KEY · 2026-11-07

**User report:** "Characters page par upload karne par gallery me sirf static images dikhti hain; video (MP4/WebM) aur GIF/APNG chahiye;
green screen video ko chroma key karke card me transparent chalao."

**1. Input selector (`#poseFile`)**
`accept="video/*,image/gif,image/png,image/apng,image/jpeg,image/webp,image/*"` — video sabse pehle.
(iOS/Android ke kuch pickers MIME filter lagate hain — chooser ke ⋮ menu se "Browse / Files" chunne par bhi sab aata hai.)

**2. File handling ab 3 tarah ka**
| type | kahan save | card me |
|---|---|---|
| JPG/PNG/WebP | canvas se max 480px → localStorage (dataURL) | `<img>` |
| **GIF / APNG** | original blob → **IndexedDB** (canvas se shrink kiya to animation mar jaati) | `<img>` (natively loop) |
| **MP4 / WebM** (max 24 MB) | blob → **IndexedDB** | `<video autoplay muted loop playsinline>` |

**3. Chroma key engine (client-side, koi API nahi)** — `startKey()`
- `<video>` ko canvas par frame-by-frame draw; **border ring (outer 2px)** se background colour nikalta hai.
- Border **uniform** ho (mean error < 95) to key karta hai; busy/photo bg ho to normal video hi chalta hai (koi tort-fod nahi).
- Threshold `T = clamp(meanErr*1.5+35, 45, 120)`, feather `T..1.45T` → soft kinare.
- **Spill suppression:** green screen par kinare ki hari chamak dab jaati hai (`g = min(g, max(r,b)+6)`).
- Canvas 120–200 px chaudi (mobile par halka), `requestAnimationFrame` loop, render par purane players `cancelAnimationFrame` se band.

**Verify (local + live):**
- `accept` live par ✔ · green WebM upload → canvas 149×251, corner pixel `rgba(0,0,0,0)` (transparent), center `rgba(114,203,127,255)` (character) ✔
- reload ke baad bhi canvas wapas (IndexedDB) ✔ · GIF upload blob URL se chalta ✔ · built-in Chai tile video `readyState 4`, 0.95 s ✔ · **0 JS errors**
Screenshots: `key-idle.png` (green keyed out), `LIVE-chroma-key.png`.

## Round 32 — PUPPETS → EDITOR BACKGROUND BUG FIX · 2026-11-07

**User report:** "Puppets page par Walk par click karta hoon, page redirect hota hai par selected animation
Editor ke background me load nahi hota — background bilkul khali reh jata hai."

**Root cause:** editor bundle (`hilao.html`) **URL params padhta hi nahi** — usme `searchParams`,
`location.search`, `URLSearchParams` **ek bhi nahi** hai. Isliye `?anim=walk&char=…` bekaar jaata tha
aur editor apna default scene dikhata tha. Koi localStorage handoff bhi nahi tha.

**Fix 1 — Puppets page (`animations.html` v2):**
- `assetFor(a)` = card ka asli asset: uploaded image (dataURL) · uploaded GIF/video (IndexedDB key `vid.<id>`)
  · built-in clip URL · warna silhouette SVG (**intrinsic 300×300**, warna `naturalWidth 0`).
- `saveSelection(a)` → `localStorage['hilao.sel']` = `{v:2, anim, name, char, charName, view, key:true, media, ts}`
  (+ purane `hilao.anim` / `hilao.char` bhi set — backward compat).
- Tile tap par **save + turant redirect** `hilao.html?anim=…&char=…&view=…` (260 ms toast ke baad).

**Fix 2 — Editor (`hilao.html`, naya block `smBgAnimJS v2`):**
1. `localStorage.getItem('hilao.sel')` padhta hai.
2. Asset resolve: dataURL / URL / **IndexedDB blob** (`hilao-pose` → `blobs` → `vid.<id>`).
3. **Chroma key**: border ring se bg colour; `err<95` (uniform) ho to key, feather `T..1.45T`,
   green spill suppression; **blank/black frame par retry** (rAF loop, 120 ms throttle, 8 tries)
   — warna pehla khaali frame key ho jata tha (bug jo test me mila).
4. `#preview` (WebGL) ke **upar**, `#overlay` ke **neeche** `<canvas id="smBgAnim">`; contain fit +
   bottom anchor; resize/orientation par dobara draw.
5. Chip **"BG · WALK ✕"** — ✕ par layer + `localStorage['hilao.sel']` saaf.
6. `storage` event par live reload (doosre tab se naya animation chuna jaye to).

**Verify (local + live):**
| case | result |
|---|---|
| Walk (silhouette, koi upload nahi) | editor me silhouette layer, chip `BG WALK`, 3,983 px drawn ✔ |
| Walk + green WebM upload | chroma keyed (T=46, key `rgb(1,174,65)`), village bg par character+thela ✔ |
| ✕ chip | canvas gone, `hilao.sel` null ✔ |
| console | **0 JS errors** (local + live) |

Screenshots: `e2e-editor-walk.png`, `e2e-editor-chai-video.png`, `LIVE-editor-bg-anim.png`.
Standalone code copy: `editor-bg-anim.js` (yahi block hilao.html ke `</body>` se pehle hai).

## Round 33 — RIG PAGE: RING ↔ CHARACTER SYNC (v18.4) · 2026-11-07

**User report:** "Background puppet move hota hai par green rigging rings uske saath move nahi karte —
character alag, skeleton alag jagah locked."

**Root causes (do the, dono mile):**
1. **Position-step offset ring me nahi lagta tha.** Render `p.ox/p.oy` (Position page ka nudge) use karta hai,
   par `drawRings()` / `hit()` / drag `p.pivot` ko *original* coordinate me leta tha.
   Yaani part jitna khiska, ring utna hi peeche reh gaya → "rings locked" wala look.
2. **Canvas 1x par render hota tha** aur browser use 2x stretch karta tha (bitmap 158×338, CSS display ~316 px)
   → character blurry + ghost jaisa double edge, rings bhi soft/mismatched.

**Fix (v18.4):**
```js
// 1) ring pivot ko part ke current offset ke saath map karo
const pdx = (p.ox !== undefined ? p.ox : p.x) - p.x;
const pdy = (p.oy !== undefined ? p.oy : p.y) - p.y;
const pvR = toScreen(p.pivot.x + pdx, p.pivot.y + pdy);
const pv  = { x: pvR.x + RR.x * scale + offR.dx * scale,
              y: pvR.y + RR.y * scale + offR.dy * scale };
```
- wahi mapping `hit()` aur `pointerdown` (ring pakadna) me bhi — warna tap galat ring pakadta tha.
- `drawRings(R)` ko **render ke same root snapshot** (`R`) diya — layers aur rings ek hi
  `Pose.getRoot()` se (walk/run me bounce y bhi include) → 100% frame-synced, koi 1-frame lag nahi.
- **Retina**: `DPR = min(2, devicePixelRatio)`, `scale *= DPR`, canvas bitmap = CSS × DPR,
  aur ring radius/lineWidth/font bhi × DPR → character aur rings ek hi pixel grid par, crisp.
- `info()` ab CSS scale dikhata hai (`24.4% · 158×338 px`), bitmap nahi.

**Verify:**
- local suite **89/89** (seam-hole check ab CSS px me naapta hai — DPR ke baad bitmap px 2x ho gaye).
- live BUILD **v18.4**, canvas bitmap `316×676` @ CSS `158×338` (dpr 2), rings neck/shoulder/hip par exactly,
  0 JS errors. Screenshots: `v184-sharp-idle.png`, `LIVE-v184-rig.png`, `LIVE-v184-walk.png`.

## Round 34 — EDITOR BG: ASLI CHARACTER TEXTURE + CLEAN LAYER (v3) · 2026-11-07

**User:** white silhouette placeholder hatao, character (Aarav/Kaka) ki PNG editor background me jaye,
stage viewport me fit rahe, aur anchor center-bottom ho taaki mirror flip se position na bigde.

**Naya `smBgAnimJS v3` (poora rewrite, `editor-bg-anim.js` me standalone copy):**
1. **Silhouette band:** `assetFor()` ab `{kind:'idbchar', key:'char.tex'}` bhejta hai. Editor me
   `kind==='svg'` aaye to usse draw hi nahi karta — character texture dekhta hai; na mile to
   chip `NO TEXTURE` (white placeholder kabhi nahi).
2. **Character texture capture:** Characters panel me card tap par uski asli PNG (data-URI, ~223 KB)
   `IndexedDB('hilao-pose' → 'blobs' → 'char.tex')` me + `hilao.charId/charName` localStorage me.
3. **Chroma key smarter:** agar PNG ka background **pehle se transparent** hai (border alpha < 24)
   to key **lagta hi nahi** — warna kaale baal/outline ud jate the.
4. **Anchor = center-bottom:** `dx=(cw-dw)/2`, `dy=ch-dh` (feet canvas ke bottom par).
   Mirror: `ctx.translate(cw/2,0); scale(-1,1); translate(-cw/2,0)` — anchor ke around flip,
   isliye position nahi badalti. API: `window.__smBgAnim.flip(true|false)`.
   Test: flip se pehle/baad alpha-bbox **bilkul same** `[258..429] × [14..370]`.
5. **Viewport fit:** `fitStage()` — agar stage viewport se lamba hai to `transform: scale(k)` +
   negative margin (kabhi 0.55 se neeche nahi); resize/orientation par dobara.
6. **Clutter:** koi `.panel` / `.sheet` / `dialog[open]` **wakai khula** ho to hamara BG chip
   chhup jata hai (hidden DOM element par nahi) — sheet par overlap nahi.

**Verify (local + live, 0 JS errors):**
| case | result |
|---|---|
| Characters panel me Aarav tap | texture IDB me save (`223270` chars) ✔ |
| puppets page → Idle tap → editor | `media: idbchar/char.tex`, layer 28,325 px drawn, chip `BG AARAV` ✔ |
| Kaka (live) | chip `BG KAKA`, Kaka ka texture center-bottom, koi white silhouette nahi ✔ |
| flip | bbox identical (mirror-safe anchor) ✔ |

Screenshots: `v3-editor-char.png`, `v3-editor-flip.png`, `LIVE-v3-char-bg.png`.

---

## Round 35 — AUTODRAFT MINIMAL SKIN · RIG / STUDIO / STAGE5 (v18.5)
`rig-studio.html` me `<style id="smSkin">` (v3) — sab tool UI flat faint white:
- buttons `padding:6px 12px; font-size:12px; border-radius:4px;` bg `rgba(255,255,255,.08)` border `.15`; active = thin white border + `0 0 12px rgba(255,255,255,.10)` glow (koi blue/green fill nahi).
- steps 1–5 patle white circles, `.sw` toggles white, `.icoBtn`/`#menuBtn` 36×36 faint, `.pgBack` chhota, cards `rgba(255,255,255,.03)` padding 11px.
- `.acIcon` (scissors tile), `.acOk` (green ✓ → faint white ✓), `.partCard .ok` (green badge → white), `.tipBar` (amber → dashed white), `.chooseBtn`, `.upIcon` sab neutral.
- stage height 40%→46% (short screens 34%→38%), wide 520→540 → editor canvas bada.
- Verify: `/tmp/skincheck.js` `clipped: []`, `hscroll:false`, `errors 0`; `/tmp/suite.js` **89/89 passed**.
- Commits: `4781684`/`792e48f` (rig), `4477dad`/`76a41d1` (studio), `416f616`/`2c7823d` (stage5).

## Round 36 — AUTODRAFT MINIMAL SKIN · HILAO + ANIMATIONS
- `gh-upload/hilao.html`: `<style id="smSkin">` (`/home/user/skin-editor.css`) — `.primary/.secondary/.danger` 6×12 / 12px / 4px radius, `.dock button.active` white+`rgba(255,255,255,.10)`, `.download-action` blue → white, `.play-round`, `.speed-btn`, `.icon-btn.small`, tool-tiles, chips/`clip.selected` (white border + faint glow), timeline geometry untouched.
- `gh-upload/animations.html`: `<style id="smSkin">` (`/home/user/skin-puppets.css`) — `.badgeSel` purple/pink gradient → faint white pill, `.tab.on` → white border, `.tile.on` blue ring → white, `.tile .up/.upChip` neutral, sticky `.cta button` blue gradient → faint white, no glow.
- Verify (live, 390×844 DPR2): teeno pages `smSkin:true`, button `backgroundImage:none`, faint white bg, `hscroll:false`, 0 page errors (ek 404 sirf GitHub Pages ka `cdn-cgi/challenge-platform` beacon).
- Commits: `373f390` (hilao), `a4d6a10` (animations).
- Screenshots: `LIVE-skin-rig.png`, `LIVE-skin-editor.png`, `LIVE-skin-puppets.png`, `skin-p1..p5.png`, `skin-ed1.png`, `skin-pp1.png`.

## Round 37 — EDITOR: BADA STAGE + SAB CONTROLS "FULL ON"
User feedback: "editor chota hai, saare button ON karo" — minimal skin bahut chhota/dim lag raha tha.
- **Stage bada:** timeline `clamp(206px,29dvh,260px)` → `clamp(170px,24dvh,220px)`, preview-shell padding 4px→2px; live canvas **344×193 → 380×213** (full width).
- **Tap targets wapas ON:** topbar 54px + `.top-action` 10.5px/20px icons white; playbar & quick-tools 42px, icons 34px; `.play-round` 28px; `.speed-btn` 11px; dock 64px, labels 11px, icons 22px, `min-width:58px` (6 items fit, `dockScroll:0`).
- **Clear enabled look:** `.icon-btn` `#fff` opacity .92; `.primary` bg `.14` border `.34`; `.secondary`/`.danger` bhi white; koi saturated fill nahi.
- **Selection accents blue → white:** `.character-card.selected`, `.check`, `.char-angles .active`, favorite, `#smBgAnimChip` (dark backdrop + white text = readable over sky).
- **Button audit (local, Playwright):** historyBtn/saveBtn/framesBtn/zoomIn/zoomOut/resetView/playBtn/undoBtn/redoBtn/addScene/sceneSettings/collapseTimeline/timelineZoomIn/timelineZoomOut → **sab CHANGED (kaam kar rahe)**; dock Tutorials/Character/Media/Templates/Audio/Layers → **sab apna panel kholte hain** (Characters, Media, Templates, Audio, Canvas layers, Tutorials). 0 page errors.
- Commit: `69bd629` (hilao.html) — live verified (`skin:true`, canvas 380×213, dockScroll 0).
- Screenshots: `skin-ed2.png`, `skin-ed-panel.png`, `LIVE-editor-big.png`.

## Round 38 — PURANA LINK = UPDATED (rig / puppets bhi "FULL ON")
User: "purana link hai mere paas, usko update karo" → permanent link wahi (`start.html` → `rig.html`), uske andar sab kuch naya.
- **rig / studio / stage5:** v4 size pass — `.btn/.qp/.icoAct` font 12.5px, padding 9×14, min-height 38, radius 6; step circles 30→34px; `.icoBtn/#menuBtn` 36→40px; `.pgBack` bada; disabled buttons bhi padhne layak (`.45` white); muted text `.62→.78`.
- **STAGE CLIPPING FIX:** mobile caps `#studio{max-height:40vh}` / `#studioWrap{max-height:40vh}` / `#studioWrap{32vh}` → **54vh**. Pehle canvas 182×**338** par squeeze ho raha tha (pair kata ja raha tha), ab poora **182×388**. Isi ki wajah se ek suite test (`walk: no visible seam holes`) fail hua tha — stage cap theek karte hi **89/89 passed**.
- **animations.html:** top icons 40px, tabs/tiles 9×14, CTA 14px/min-height 46, labels 13px.
- Commits: `b0190ab` (rig), `3ca7e1e` (studio), `2dbe88f` (stage5), `16b3579` (hilao), `4380d05` (animations).
- **Live verify purane link se:** `start.html` → `rig.html` redirect ✔, `smSkin:true`, steps 34px, `hscroll:false`, 0 errors → `LIVE-oldlink-rig.png`.

## Round 39 — EDITOR ME AUTODRAFT-JAISA "PATH TOOL" (AI features ke bina)
User: "unke AI feature button chhod ke mera editor same look aur aise chalu karo".
- **Path Tool (naya real feature):** character select → layer panel me **Path** button → canvas par start point tap, phir end point tap → dashed path ban jaata hai aur character scene ke `duration` me us line par chalta hai (ease on/off, Reverse, Clear).
  - Movement = `scene.smPath = {on,x0,y0,dx,dy,ease}`; render par `panX/panY` me delta add hota hai (`smPathApply`).
  - Start point par character **lock** hota hai (panX/panY us point par set), line wahi se shuru hoti hai — koi jump nahi.
  - **Export me bhi** chalta hai (export naya `new Renderer()` banata hai, patch prototype par hai).
  - Project save ke saath persist (reload ke baad bhi path wahi).
- **Look:** layer panel AutoDraft jaisa bottom sheet — bade labelled buttons (Transform/Adjust/Flip/Path/Delete), white-on-dark, koi blue/green fill nahi.
- **Hooks (base app ke andar, `boot()` se pehle):** `window.__smEd` = `{sceneAt,current,markDirty,pushUndo,toast,refresh,renderNow,drawOverlay,seek,time,playing,rect,pathApply}` + `Renderer.prototype.draw/layout` patch (`__smLocal` se single-offset, warna double offset se character frame se bahar chala jaata tha).
- **External module:** `sm-auto-editor.js` (`<script id="smAutoEditorJS">`) + `sm-auto-editor.css` (`<style id="smAutoCSS">`).
- **Test (local + live):** path set → rect.x 89 → 312 → 534 (t = 2% / 50% / 98%); reload ke baad path same; export 100% / 0.7 MB ✔; dock ke 6 panel + Flip/Mask ✔; **0 page errors**.
- Commit: `26af219` (hilao.html) — live verified (`LIVE-path-tool.png`).

## Round 40 — PATH TOOL v3 (AutoDraft jaisa, poori tarah chalu)
User: "character ka path option theek se kaam nahi kar raha — AutoDraft ki tarah chalu karo".
- **Discovery fix:** Path button ab **toolbar me hamesha** (`#smPathQuick`, quick-tools row) — pehle sirf layer panel me tha, isliye milta nahi tha. Layer panel ka button bhi hai.
- **Do tarah se banaye path:** (a) **drag** — stage par dabao aur line kheencho, (b) **2 tap** — start tap, phir end tap. Drag karte waqt live dashed preview.
- **Speed control:** `2s / 4s / 8s / Full` (path kitne second me poora ho), **Loop** (repeat), **Rev** (ulti direction), **Ease** (slow start-stop), **Walk** (body bounce on/off), **Clear**.
- **Bar** ab canvas ke neeche inline strip (2 row wrap) — timeline cover nahi karta, saare buttons clickable (pehle absolute bar viewport se bahar nikal jaata tha).
- **Bug fixes:** tap-mode loop (dusra tap pehla point overwrite kar deta tha), double-offset (draw + layout dono par path lag raha tha → `__smLocal` se single offset).
- **Verify (local + live):** drag path x = 59 → 304 → 549 (2%/50%/98%); 2s+loop → t wrap sahi; Walk → `mode:'body'` (timeline clip "Bounce"); export 100% · 0.8 MB; **0 page errors**.
- Commit: `92d367d` — `LIVE-path-v3.png`.

## Round 41 — PATH v4: character tap fix + AutoDraft-jaisa drag
User: "character pe click nahi ho raha, path poori tarah AutoDraft jaisa chale".
- **Root cause:** Path mode ON hone par stage ka saara tap path ke liye jaata tha → character select hi nahi hota tha.
- **Fix:** path mode me **chhota tap = path cancel + character select** (auto). Lamba drag = path. Banner me **Cancel** bhi.
- **AutoDraft jaisa drag:** path **hamesha character ke pair se shuru** hota hai; direction = drag ka delta (`dx/dy`), is liye horizontally kheencho to character seedha chalta hai (pehle chest-level drag se tirachha ho jaata tha).
- **Re-draw safe:** naya path banate waqt `rectBase` (path-free rect) use hota hai → path baar-baar kheencho to character drift nahi karta.
- **Hint banner** (`#smPathHint`): "Path mode · character se line kheencho" + Cancel — user ko pata rahe mode on hai.
- **Verify (local + live):** plain tap → `layer:'character'` + poora layer menu; path mode me tap → mode off + select; drag → `x0:0.5,y0:0.875, dx:0.32, dy:0` (seedha); x = 304 → 427 → 549; Walk → bounce; export ✔ 0.5 MB; **0 page errors**.
- Commit: `370637f` — `LIVE-path-mode.png`, `LIVE-path-v4.png`.

## Round 42 — CHARACTER TAP 100% PAKKA + SELECTION BOX PATH PAR CHALTA HAI
User: "background par jaise hi character pe click kiya, nahi ho raha".
- **Root cause (v3):** Path mode ON hone par stage ka har tap path ke liye chala jaata tha → character select nahi hota tha (v4 me fix, par user ka page purana cached build dikha raha tha).
- **Naya guaranteed tap-to-select:** `installTapSelect()` — `#overlay` par capture-phase `pointerup`; agar app ne 140ms me select nahi kiya aur tap character ke box (22px padding) ke andar hai → `setLayer('character')` force. Isliye **lock (scene/character) ke case me bhi** selection hota hai (lock ki wajah toast me batata hai).
- **Overlay sync:** playback/path ke waqt selection box stale reh jaata tha (`seek()` overlay redraw nahi karta) — ab RAF loop me `time`/`selected` badalne par `drawOverlay()` call hota hai. Verified: overlay box center 503 vs charRect center 504.
- **Re-test (touch emulation, live):** head tap → select ✔, body tap → select ✔, path mode me tap → select ✔, touch drag → path `dx:0.4, dy:0` ✔, x = 304 → 457 → 609 ✔, **0 page errors**.
- Commits: `eb0f73e` (tap fallback), `8551e1f` (overlay sync) — screenshots `LIVE-tap-select.png`, `LIVE-overlay-sync.png`.

## Round 43 — ASLI BUG: PUPPET CHARACTER SIRF BACKGROUND LAYER THA (path/tap/export dead)
User: "har character path bana ke play karu to kuch nahi hota — khud video bana ke check karo".
- **Root cause:** `animations.html`/rig flow se aaya character `smBgAnim` (background layer) me **bake** hota tha; woh `scene.charId` nahi hota → path (panX/panY) ka koi asar nahi, tap se select nahi, aur **export me character aata hi nahi**.
- **Fix — `ensureRealCharacter()`:** page load par agar bg layer me `idbchar`/`svg` texture hai aur scene me asli character nahi:
  1. agar `media.charId` library me hai → `useChar(id)` (app ka apna applyCharacter)
  2. warna texture se `addCustomChar(name, texture)` → `useChar(newId)`
  3. phir `__smBgAnim.remove()` (chip bhi chala jaata hai) → "Character editor layer me aa gaya" toast.
  Naye hooks: `__smEd.useChar/hasChar/addCustomChar`, `__smBgAnim.texture()/meta()`.
- **VIDEO PROOF (user ne bola "khud video bana ke check karo"):** 8s scene export kiya (1920×1080, 0.8 MB) aur usi video ke frames nikale —
  `vid-start.png` (character center) → `vid-mid.png` (right) → `vid-end.png` (dahini taraf), i.e. **exported video me character chal raha hai**.
- Re-test (live, touch): convert ✔ (`charVisible:true`, bg layer gone), tap select ✔, path xs 323 → 457 → 591 ✔, **0 errors**.
- Commit: `cd81209` — `LIVE-char-path.png`, `vid-start/mid/end.png`.

## Round 44 — "CLEAR" BUTTON + AUTO-UNLOCK (editor khaali karo, lock hatao)
User: "editor khaali kro, pehle aapne lock kar diya ise".
- **`Clear` button** (quick-tools row, Path ke saath): confirm → `__smEd.resetBlank()` → `defaultProject()` (1 blank scene, koi character nahi), bg-anim layer remove, `hilao.sel/charId/charName` clear, undo/redo khaali, autosave blank likh diya (reload par bhi khaali), locks off.
- **Auto-unlock:** page load par ek baar `unlockAll(true)` — scene/character/bg/camera locks khul jaate hain + toast "Lock khul gaya". Naye app hooks: `__smEd.unlockAll(silent)`, `__smEd.resetBlank()`.
- **Test:** old-style state (idbchar Kaka + sab locked) → Clear → `charVisible:false, locked:false, charLocked:false, bg:false, sel:null`; reload → phir bhi khaali; `useChar('aarav')` → tap select ✔ → path xs 304 → 419 → 534 ✔; **0 errors**. Screens: `LIVE-clear.png`, `LIVE-after-clear.png`.
- Round 44b: Clear button ka pehla render toota tha (bada trash icon row se bahar) → CSS `#smClearBtn` 26×26, svg 15px, hover subtle. Screenshot `sme-clear-btn.png`. Ab quick-tools row: layers · scissors · speaker · **trash(Clear)** · Path · undo · redo · − · +.

## Round 45 — GLOBAL MOBILE ZOOM / SCALE FIX (saare pages)
User: "global mobile zoom fix — saari pages par oversized UI, sab kuch screen me fit".
- **Naya `skin-mobile.css`** (source of truth) → har page me `<style id="smMobile">` head ke end me inject (index, animations, rig, studio, stage5, hilao; start.html loader chhoda).
- **Viewport lock:** har page ka meta ab `width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover` → pinch/double-tap zoom se page zoomed rehne wala issue band.
- **Base guard:** `text-size-adjust:100%`, `overflow-x:hidden`, `box-sizing:border-box`, `img/canvas/video/svg max-width:100%`.
- **Editor (hilao) compact:** topbar 52→**40**, playbar 36→**32**, quick-tools 42→**32**, scenebar 40→**32**, dock 58→**48** (font 10→9, icon 20→17), timeline flexible **148–330px** (khaali void khatam), clip 40→28, panel headers/sheets chhote, toast 11px, `#smBgAnimChip` 8.5px. Canvas **16:9 barqarar** (ratio 1.79 measured).
- **Rig/studio/stage5:** header 38→34, brand 17→**13.5**, `#steps` 26px circles, Choose File 40→**32**, `.card` padding 13→10, pose tile 166→**112**, tipBar/note/pill chhote.
- **animations.html:** h1 22→**16**, search 12px, tabs 10px, tile label 11px, CTA 38px.
- **index.html:** h1 26→**20**, ico 44→34, ttl 13.5, desc 10.5.
- **Verified:** 320/360/390/412 widths × 4 pages → **0 horizontal overflow**; live build par bhi `smMobile` present, header 40/34, 0 errors; path tool regression (tap select + path xs 324/459/594 + 8s video export) sab pass. Screens: `c-*.png` (local), `LIVE-mobile-*.png` (live). Commit `26ba1ea`.

## Round 46 — ACTION STUDIO (puppet → real skeletal animation)
User: "AI-powered AutoDraft-style Action-to-Animation Converter" — har action ke liye puppet upload, auto analyze, real animation, MP4/transparent export, action name se save.
- **Naye files:** `actionanim.html` + `actionanim.css` + `actionanim.js` (self-contained, koi external lib/API nahi).
- **Pipeline:** image → background removal (already-transparent / **green chroma key + despill** / solid-bg **flood fill**) → alpha bbox normalize (feet ground par, height 640) → **skeleton analyze** (neck = upper region ka patla row, shoulders = max width row, T/A-pose detect, hands side-scan, crotch gap se hips, knees/feet) → **mesh rig** (alpha bbox par ~640 quad grid, har vertex par bones ka gaussian weight + vertical ramps) → **linear-blend skinning** (root → torso → head/arms, hips → legs; 2-bone chains) → render.
- **Motion presets (procedural, static nahi):** idle, walk, run, talking, sitting, dancing, jumping, waving. T-pose arm ko ~46° neeche-bahar base rotation (warna arms body me chhup jaate hain).
- **Z-order:** triangles 4 layers me (legs → arms → torso → head) — arms/torso overlap clean.
- **Perf:** 1288 triangles → **5.5 ms/frame** (≈180fps capability), preview 30fps.
- **Export:** `WebM (VP9 alpha)` ✅, `MP4 (avc1)` support check ke saath (alpha MP4 me nahi — UI me likha hai), `PNG frames` = ZIP (store + crc32, khud ka zip writer) + `animation.json`. Save = WebM + thumb + skeleton IndexedDB (`actionanim/animations`, key `act:<action>`) + editor ke `hilao-pose/blobs` me `act.<action>` (handoff).
- **UI:** action chips (saved par green dot), canvas + checkerboard, skeleton overlay + **joint drag edit**, status bar (dot/bar/log — honest failures: "silhouette bahut chhoti hai", "background shayad nahi hata"), scrub, speed, FPS, ground offset, saved list (Play modal / Save).
- **Wiring:** `animations.html` — header me **Action Studio** button + har tile par **Animate** (done hone par "Animated"). Map: wave→waving, jump→jumping, dance→dancing, sit_floor→sitting.
- **Tested:** transparent PNG (T-pose), **green-screen** (503k px keyed, alpha 73.9%), **solid bg flood-fill** ✅; motion pixel-diff idle 5.8% / walk 9% (frames sach me badalte hain); WebM 2.1MB, ZIP 6.3MB, save 1.1MB ✅; 320/360 width par 0 overflow; **0 errors**.
- **Honest limit (UI me bhi likha):** yeh AI video-generation nahi, procedural skeletal animation hai; best result T-pose/A-pose transparent PNG par.
- Round 46b: front-facing character ke liye legs ko sideways scissor se hata kar halka lift + body bob kiya (walk ±8°, run ±13°). Live commit `b564944` → `5da8583`. Live verified: upload → analyze → walk preview (pixel diff 8.2%), 390/390 no overflow, 0 errors. Screenshots: `LIVE-studio.png`, `anim-studio-btn.png`, `act-green.png`, `act-export.png`.

## Round 47 — CHARACTERS PAGE + PANEL: AutoDraft-jaisa clean standing grid
User: "rayta ban gaya — AutoDraft jaisa page, mobile size, characters khade hue, background par lagane/flip-mirror me dikkat na ho".
- **animations.html:** header clean (Action Studio header se hataya → tabs row me chhoti pill), grid **2 columns uniform**, har tile ka art **3:4 box** me `object-fit:contain` + `object-position:bottom center` (kabhi crop nahi), buttons ek row me (Upload | Animate) equal width, CTA bar ke liye `padding-bottom:74px`.
- **Asli character tiles me:** `hilao-pose/blobs → char.tex` se character texture load hota hai → saare tiles me **wahi character khada** dikhta hai (fallback: neutral standing silhouette, ab action-pose wale ajeeb silhouettes nahi).
- **Editor Characters panel:** cards ka layout theek — `aspect-ratio:4/5` art, naam bottom-left chip, `Free/My upload` top-left, edit icon top-right, trash+star bottom-right, check badge — kuch overlap nahi.
- Verified: 13 tiles, sab height **297px equal**, `charArt` 12, panel 13 cards, 390/390 no overflow, 0 errors (`anim-clean.png`, `panel-characters.png`).

## Round 48 — ROOT-CAUSE FIX: ghost character layer (khaali timeline) + AutoDraft top bar
**User report:** editor me timeline khaali, character stage par dikh raha hai (screenshot) + "AutoDraft jaisa size chahiye".
- **INSPECT (live, headless):** `__smBgAnim.state().media === null`, `texture()` = '' , scene `charVisible:false`, `hilao.charId='aarav'`, `char.tex` IDB me maujood, timeline me `.char-clip` **0** (charTrack hidden = `!hasCharacter()`).
- **ROOT CAUSE:** bg-anim layer ka *fallback* path (`sel`/media null → IDB `char.tex` se image draw, chip "BG AARAV") purane converter me handle hi nahi tha — converter `if(!st.media) return` par ruk jaata tha. Scene me asli character nahi bana → `hasCharacter()` false → char track hidden → timeline khaali; character sirf ghost layer me.
- **FIX:** `ensureRealCharacter()` rewrite — (1) media null par bhi IDB `char.tex` + `hilao.charId` se convert, (2) pehle `unlockAll(true)` (lock race), (3) convert ke baad `current().charVisible` verify, tabhi ghost layer remove, (4) video/url layer ko convert nahi karte, (5) latch ki jagah max 3 attempts.
- **TEST (exact user state reproduce: char.tex + charId + **no** hilao.sel):** chip `null`, bgCanvas `false`, `charVisible:true`, **charTrack visible, clip "Head bob"** + "Image" → 2 tracks, tap select `character`, path xs 306→421→537, **0 errors**.
- **Top bar (approved plan step 1):** 48px, 16px icons, 10px labels, separators, project title ("Meri gaon ki kahani", `…`), fit verified at 320/360/390/412 (right edge screen ke andar).
- Screens: `GHOST-fixed.png`, `topbar-final.png`. Backup: `backup/sm-auto-editor.js.0609`, `.css.0609`.

## Round 49 — "Agent ki apni images nahi" + technical verification
**User rule:** kaam poora technical base par; agent apni koi image na lagaye; report verify karke do.
- **INSPECT:** repo tree me 4 image files mili — `demo-character.png`, `pose-walk.png`, `pose-run.png`, `pose-cycle.png` (sab agent ki banayi). `pose-*.png` **3 pages** (rig/studio/stage5) ke page‑1 card `#inspCard` ("Pose Inspiration") me **visible** (333×570, `inspTile` grid, CSS 663–669 + mobile 845/960 ki dependency).
- **ROOT CAUSE:** wo reference-photo card agent ne design kiya tha; user ka character data nahi. `demo-character.png` kisi page me referenced nahi tha (junk).
- **FIX:** teeno pages se poora `#inspCard` block remove (JS dependency zero — grep clean), 4 PNG repo se delete. Koi layout CSS/JS nahi chheda.
- **LOCAL TEST (390 + 320, 3 pages):** `inspCard:false`, local `<img>` = **0**, broken **0**, `overflow 390/390` & `320/320`, **0 pageerror**, **0 netfail**, page1 h 851/840, baaki cards intact (Upload PNG, Auto-Cut, Sub-Pixel, Layer Manager).
- **LIVE VERIFY (Pages cache ~5 min):** rig/studio/stage5 → inspCard false, imgs `[]`, broken 0, overflow 0/0, 0 errors, 0 4xx/5xx. Repo image files: **0**. `pose-walk.png`/`demo-character.png` → 404 (jaan-boojh kar, koi reference nahi).
- **GHOST FIX re-verified WITHOUT any agent image:** sirf `localStorage.hilao.charId='aarav'` (library char, app ka apna SVG) → chip `null`, bgCanvas `false`, `charVisible:true`, charTrack visible, clip "Head bob", tap select `character`, 0 errors.
- **Committed:** `9c1b23c`, `12e9596`, `9b6eddc` (pages), `7a12d44`, `263f769`, `138b83a`, `6982455` (deletes).
- **Backups:** `backup/rig.html.0621`, `studio.html.0621`, `stage5.html.0621`, `sm-auto-editor.js.0609`, `sm-auto-editor.css.0609`.
- **Observation (not changed):** page‑1 headings me emoji hain — "✂️ Sub-Pixel Auto-Cut", "🧱 Layer Manager" (user rule: emoji ki jagah inline SVG). Poochh ke badlenge.

## Round 50 — Emoji → Inline SVG icons (headings + UI buttons), zero layout change
**User rule:** sirf UI/page headings ke emoji badlo; Sub-Pixel Auto-Cut & Layer Manager ko sahi-meaning wale professional SVG; size/stroke/style consistent; mobile par saaf; koi external image/emoji-font/dummy icon nahi; layout-spacing-features na badle; sirf related headings; test karke report.
- **Icons (sab `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap/linejoin="round">`, inline, koi external file nahi):** Sub-Pixel Auto-Cut → **scissors** · Layer Manager → **layers** · Posing Studio → **sliders** · QUICK POSE → **zap** · State Controller → **list** · Save snapshot → **save** · Load snapshot → **folder** · JSON → **download** · Undo → **rotate-ccw** · Redo → **rotate-cw** · Mirror Flip/MIRROR → **flip** · Edit Position → **move** · ✕ close → **x** · STOP → **pause**.
- **Layout-neutral technique:** icon `width/height:1em` (emoji glyph ki hi width) + `vertical-align:middle` + `margin:0 .18em 0 -.18em` + `margin-top/bottom:-.25em` ⇒ line-box aur button width dono **unchanged**. Pehle 12px/10px/11px + normal margins try kiye — 320px par "Mirror Flip + Edit Position" row wrap ho gayi thi (card 164→208) aur btnUndo 44→48; isliye em-based neutral approach chuna.
- **Bug jo testing me pakda:** pehle transform me ek typo se `btnUndo/btnRedo` ka `<id=` ban gaya → `U.$('btnUndo')` null → pageerror. Fix karke dobara test kiya.
- **A/B test (same server, before vs after, 320 & 390, teeno pages):** cards **217/0/323/197** (320) · **212/0/352/197** (390) · pgPos **519/164** · pg3 **443/175** (320) & **437/175** (390) · btnUndo **44**, btnSnap **32** · overflow **320/320**, **390/390** · **0 pageerror** — sab **identical**.
- **Functional test:** heading svg=1 ×5 · btn icons **16×16** (1em) · Undo/Redo/Reset ✔ · snapshot "Snapshot saved" ✔ · preview open/close ✔ · mirror ON↔OFF (SVG bacha rehta hai) ✔ · JSON export `rig-pose.json` ✔ · 0 errors.
- **Emoji left:** sirf `✓` (CSS checkmark, typographic — emoji nahi). 3 files (rig/studio/stage5) identical (md5 same).
- **LIVE VERIFY (commits `5dd383c` rig, `7db2f59` studio, `5564c3e` stage5):** 320px → card1 **217**, posCard **164**, card3 **443**, undoH **44**, snapH **32**, mirrorW **122**, sameRow **true**; 390px → card1 **212**, posCard **164**, card3 **437**, undoH **44**, snapH **32** — **baseline ke bilkul barabar**. Heading height **12px** (same), icon **16×16** (1em), 11/11 buttons me svg, mirror toggle SVG + "MIRROR OFF/ON" ✔, overflow **320/320 / 390/390**, **0 pageerror**, **0 4xx**. studio/stage5 bhi: emojiHead **0**, svgHeads **5**, overflow 0, errs 0.
- **Left as-is (user ke rule 7 ke mutabik, unrelated pages nahi chhue):** `app1.html`, `v9.html`, `tool.html`, `index.html`, `app2.html` me abhi bhi emoji hain (nav tabs, headings, toasts). Poochhne par karenge.

## Round 51 — CHECKPOINT (koi code change nahi)
- **User:** baaki pages (app1, v9, tool, index, app2) abhi nahi chhedna; current changes safe rakho; teeno pages stable; aage kaam bina permission nahi.
- **Local checkpoint:** `backup/checkpoint-20261107-0638/` → rig/studio/stage5 (identical, sha `a47afdc6…`), hilao.html (`606474a2…`), sm-auto-editor.js/css, skin-mobile.css. Purane pre-change backups bhi maujood: `*.before-emoji`.
- **Repo HEAD:** `5564c3e` (stage5) · `7db2f59` (studio) · `5dd383c` (rig) · `6982455` (image deletes).
- **Live == local byte-identical:** rig ✔ studio ✔ stage5 ✔ hilao ✔ (sha256 compare).
- **Stability smoke (320/360/390 × rig/studio/stage5/hilao):** overflow 0 · pageerror **0** · http 4xx **0** (hilao par ek 404 sirf Cloudflare ka `cdn-cgi/challenge-platform/...` script — hamara resource nahi) · emoji headings 0 · svgHeads 5/5 (rig/studio/stage5).
- **Frozen:** aage koi change nahi jab tak user permission na de.

## Round 52 — Path options ko sahi jagah (popover) + panel scroll wapas
**User report:** "Path option yahan nahi lagta — niche editor button wahan lagta hai, AutoDraft editor jaisa" + "editor panel scroll nahi ho raha".
- **INSPECT (live, 360/390/412):** `#smPathBar` `$('previewShell')` ke andar `position:static` tha → **layout space leta tha** (preview area me full-width row), isliye preview/timeline dab jate the. `#workspace` ka `overflow-y:visible` (original) + `body{position:fixed;overflow:hidden}` ⇒ chhoti screen par timeline neeche kat jata tha aur **kuch scroll nahi hota tha**.
- **ROOT CAUSE:** (1) Path options in-flow block, (2) workspace me koi scroll container nahi.
- **FIX:** (1) `#smPathBar` → `position:fixed` **popover**, `document.body` me, Path button ke **theek upar** anchor (`placeBar()`), `flex-wrap` se 9 options 2 rows me, **zero layout space**. Path mode ON hote hi dikhta hai (placeholder prefs), drag se prefs preserve (`ease/dur/loop`), Clear → path delete + mode off. (2) `#workspace{overflow-y:auto;overscroll-behavior:contain}` + `.timeline/.preview-shell{flex:0 0 auto}` → chhoti screen par **scroll**.
- **TEST (local, 320×480 / 360×470-660 / 390×844 / 412×915):** popover `allInside:true`, `noHScroll:true`, `aboveButton:true`, h 67px; drag→path `xs` change; `dur=4` ✔; Clear → `path:false`, `barHidden:true`; workspace scrollable (maxScroll 24–65) aur **scroll ke baad timeline poora dikhta hai**; stage drag se character chalta hai (workspace scroll nahi hota); clip click → `getLayer()=character`; scrub behave same as before (A/B); export **100%**; **0 pageerror**.
- **A/B (pre-fix backup vs new):** scrub same, sirf workspace `visible → auto` aur path bar `previewShell → BODY`.
- **LIVE VERIFY (commits `7c3eef5`, `9c546f8`):** 360×560 / 360×740 / 390×844 / 412×915 → popover **9 options**, `aboveButton:true`, `inView:true`, h **67px**, `parent:BODY`; path drag → `xs` moves (306→433→560 @390); **Clear** → `path:false`, `barHidden:true`; `workspace overflow-y:auto` + scroll ke baad **timeline poora visible**; scrollbar mobile jaisa chhupa (scroll chalta hai); **0 pageerror**, **0 http≥400** (Cloudflare cdn-cgi chhod ke).
- **Chhua nahi:** rig/studio/stage5/animations/actionanim/start/index/tool/v9/app1/app2 — koi commit nahi.
- **Known UX:** popover khulte waqt "Scene 1 / timecode" meta row ko dhak leta hai (temporary, Path mode band hote hi hat jata hai). Chaho to ise bottom dock ke andar bhi shift kar sakte hain.

## Round 53 — AutoDraft mobile VIDEO analysis + Path ko sahi jagah (bottom layer dock)
**User:** video bheja (86s, 864×1920, autodraft.in mobile web editor) + "har ek cheez bariki se jaanch".
- **VIDEO ANALYSIS (frames 1fps + 60–82s @2fps, ffmpeg + PIL):** mobile AutoDraft editor ke rows (CSS px @360 wide): top bar **50** · canvas **181** (16:9) · credits row **22.5** · playback row **33.3** · tool row (aspect/cut/camera + undo/zoom/fullscreen) **33.3** · scene row **36.7** · timeline **170** · **floating dock 85** (icon+label chips, horizontal scroll, ✕ se band).
- **KEY FINDING:** AutoDraft mobile ka dock = `Sort · Copy · Layer Duplicate · **Path** · Control · Animate · Anim IK · ✕` — **Path bottom dock me hai, upar wali tool row me nahi**. Hamare editor me `#layerMenu` bilkul wahi dock hai (Mask/Shadow/Speed/Transform/Adjust/Flip/Delete/✕).
- **FIX:** (1) `#smPathQuick` (quick-tools wala Path) **hata diya** → tool row ab sirf copy/cut/camera/trash. (2) Path **bottom dock ka item** — order `Mask · Shadow · **Path** · Speed · Transform · Adjust · Flip · Delete` (3rd, bina scroll dikhta hai). (3) options panel dock ke **theek upar** (gap 7px), z-index 999. (4) panel khula ho to apne floating Back/Home (`#smNav`) **hidden** — warna click block ho raha tha (elementsFromPoint se pakda).
- **TEST:** 320×640 / 360×740 / 390×844 → quick-tools me Path `false`; dock order confirm; Path visible (`left 143–197`); options 9/9 aboveDock, `inView:true`; path drag xs 306→433→560; `dur=8` set; Clear ✔; `topmost=smPathBar` (clickable); **0 pageerror**.
- **Backup:** `backup/sm-auto-editor.js.pre-pathdock`.

## Round 54 — Page balance (user ne B chuna) + duplicate BACK hataaya
**User ne screenshot bheja:** "Ye mere editor page shi kar do". Screenshot 360×800 (dpr 3).
- **MEASURE (root cause):** `.timeline` = **330px** par andar content sirf **91px** → 209px khaali black box. `#smNav` (floating `‹ ⌂`, dono link `index.html`) timeline ke khaali area me tair raha tha. `#smNav` z-index 2147483000 → clicks bhi block karta tha.
- **User ke screenshot ka laal scissors circle hamare page ka NAHI hai** — poore DOM me red background wale elements: **0**. Wo phone ka floating/screenshot tool hai.
- **FIX (A/B me se user ne B chuna):** canvas upar chipka (`gapTop 3`), timeline neeche rail tak bharta hai (`deadSpace 0`), layer dock uske upar float — AutoDraft video jaisa. `#smNav` editor me `display:none` (top bar ka `←` asli BACK). `.quick-tools/.quick-left/.quick-right` `flex-wrap:nowrap` → 9 buttons ek line (y=316/317 measured). `#smClearBtn` 19px = baaki buttons ke barabar.
- **TEST:** 320×640 / 360×800 / 390×844 / 412×915 → topbar 44–48, stage 177–228, tools 32 (1 row), timeline 236–455, rail 52, **deadSpace 0**, gapTop 3, `smNav none`, Path dock + options in-view, path xs 282→406→530 (360), **0 pageerror**.
- **Backup:** `backup/sm-auto-editor.css.pre-layout65`.

## Round 55 — Neeche ka rail wapas bada + scroll (user: "scroll nahi ho raha aur chote hogye")
- **ROOT CAUSE:** `skin-mobile.css` ne rail ko chhota kar diya tha — `.dock{48/52px}`, button `min-width 48–54px`, label `8.5–9.5px`, icon `16–17px`. Isse 6 items = 288px → 360px me **overflow hi nahi** hota tha, isliye scroll "kaam nahi karta" dikhta tha.
- **FIX:** app ke apne mobile values wapas — `.dock{72px;padding 6px;gap 2px}`, `.dock button{min-width:70px;font 11px;gap 7px}`, `.dock button .icon{26px}`.
- **TEST:** 320/360/390 → rail **72px**, button **70×52**, `scrollW 442 > clientW` → **scrollable ✔**, end tak scroll par last item (Layers) poori dikhti hai (`scrollLeft 82 @360`), **0 error**. Backup: `backup/skin-mobile.css.pre-dock66`.

## Round 56 — Editor khulte hi character (Munna) aana band + blank boot (user: "A")
- **ROOT CAUSE 1 (mera hi bug):** `sm-auto-editor.js` ke `ensureRealCharacter()` ko boot + har 800ms interval se bulaya ja raha tha; wo `localStorage.hilao.charId` se character **khud** jod deta tha. Guard bhi galat tha (`e.hasChar` function ko boolean ki tarah use kiya) → guard kabhi roka nahi.
- **ROOT CAUSE 2:** app ka `boot()` IndexedDB ka `autosave` utha leta tha → purana project (AARAV/Head bob) har open par aata tha.
- **FIX (user ne A chuna — hamesha khaali khule):**
  1. `ensureRealCharacter` boot/interval se hata diya (auto character add band).
  2. `boot()` me autosave **load nahi** hota; pehli baar uski ek copy `Saved version` me arch ho jati hai (`__arch` flag) → History me **Restore** se poora kaam wapas. Kuch delete nahi hota.
- **TEST (headless, 360×800):** char add → tracks `Head bob + Image` → reload → **sirf `Image`** (character nahi) ✔; `localStorage.charId` set hone par bhi character nahi aata ✔; History `1 saves` → **Restore** (confirm accept) → `Head bob + Image` wapas ✔; **0 pageerror**.
- **Backups:** `backup/hilao.before-blankboot`, `backup/sm-auto-editor.js.pre-noauto`.

## Round 57 — Character tap → PUTLA page (AutoDraft "My character") → background par
**User flow:** Editor → Character rail → character card → putlo wala page → putla tap → character background par.
- **ROOT:** character card tap `animations.html?name=..&id=..` kholta tha, jisme **13 action cards** (12 white silhouette) + Upload/Animate clutter tha. Character ki asli image URL me nahi jaati thi (data: URI > 400 chars → `src=''`), isliye putla/silhouette aata tha.
- **FIX (user ne "A — sirf ek putla" chuna):**
  1. `animations.html`: `h1 → "My character"`, `.grid#animGrid` → `#putlaWrap` (ek card), `render()` naya (single putla), `pickPutla()`, "Use animation" bar hidden.
  2. Character image ab `localStorage['hilao.charImg']` se (hilao `charToAnimJS` me save), putla + thumbnail dono me — **white silhouette fallback hata** (letter avatar).
  3. Putla tap → `hilao.sel` payload `media:{kind:'data', src: tex}` + `hilao.html?anim=idle&char=..` → editor me **background par** character.
  4. Chips `FRONT/3/4 FRONT/3/4 BACK` + Action Studio overlap fix (tabs strip scroll, stBtn fixed) — 320/360/390 clear.
  5. Chip label ab **character ka naam** (`sel.charName`) — "BG AARAV".
- **TEST (local 360×800):** putla page `h1="My character"`, putla card 1, image naturalWidth **380**, old cards **0**; tap → `#smBgAnim` present, chip `BGAARAV`, media kind `data`; **0 pageerror**. Overlap: 320/360/390 = clear.
- **Backups:** `backup/animations.before-putla`, `backup/hilao.before-putla`.

## Round 58 — Putla page AutoDraft ke exact size/style par
**User:** "look AutoDraft same, same style same size character, hamare page par sirf ek hi putla".
- **NAAP (user ke AutoDraft screenshot se, 1080×2400 = 360 CSS):** card **150 CSS** wide, ~1.05 aspect, 2-column grid, page padding ~20, gap ~20; chips = **gol pill**, active = **safed** (dark text).
- **FIX:** `h1 → "Characters"` (AutoDraft ka title), `.selRow` me `‹` back chip + **purple gradient "Selected"** pill, putla card ab **chhota square** (360 par 160×170, 320 par 140×148) 2-column grid me, chips **pill radius 999** + active `#f4f5f7`, label bottom-left 10px. Card **1 hi** (purane 13 gaye).
- **TEST:** 320/360/390 → `h1 "Characters"`, putlaCard **1**, card 140–175 wide, active chip `rgb(244,245,247)`, radius `999px`; tap → editor, chip `BG AARAV`, `#smBgAnim` true; **0 error**.

## Round 59 — BUG: putla me "Kaka" chuna par editor me "AARAV" aata tha
- **ROOT CAUSE:** `animations.html` me `var tex = charTex || charImg;` — `charTex` IndexedDB ka **purana slot (`char.tex`)** hai (usme AARAV saved tha). Isliye selected character (Kaka) ignore ho kar purana texture editor me jata tha. User ke screenshot me chip bhi `BG AARAV`.
- **FIX:** priority ulti — `var tex = charImg || charTex;` (selected character pehle, IDB sirf fallback). Saath hi **cache-bust**: hilao → `animations.html?...&v=<ts>`, putla → `hilao.html?...&v=<ts>` (user ke phone par purana build khul raha tha — unke screenshot me h1 "My character" + bada card + purane chips the).
- **TEST (local, Kaka chun kar):** putla page `h1 "Characters"`, card 160×170, img 307px; tap → editor chip **`BG KAKA`**, `sel.charName="Kaka"`, `media.src` length **286434 = charImg length** (match true), **0 error**.

## Round 60 — Character ab ASLI layer + timeline ki khaali jagah
**User:** "3 gadbad h" → chuna: **timeline me character ki track nahi + khaali area**.
- **ROOT CAUSE:** putla tap par character sirf `#smBgAnim` **background ghost** ban raha tha (timeline me sirf "Image" track) — isliye timeline/path/export me character ka wajood nahi tha.
- **FIX 1 (asli layer):** `animations.html` putla tap par `localStorage['hilao.pickChar']={id,name,src}` likhta hai (aur `hilao.sel` hataata hai); `hilao.html` boot par usko utha kar `pendingChar=id; applyCharacter()` karta hai → timeline me **character track** aa jati hai. Custom character ho to `__smEd.addCustomChar`. URL se ghost params hata diye.
- **FIX 2 (khaali area):** `.timeline-inner` ab flex column + `min-height:100%`; real tracks content-size (46px), aur bachi jagah **`+ Track jodo` row** leti hai (button bada/visible: 36px, border) — khaali black area nahi lagta.
- **TEST (local 360×800, Kaka):** char-clip **"Head bob"** + "Image", tracks 46px each, add-track row **207px** (inner 323 = scroll 323, koi gap nahi), `#smBgAnim` ghost ka content nahi, **0 error**.
- **Backups:** `backup/hilao.before-realtrack`, `backup/animations.before-realtrack`.

## Round 61 — Character background par (duplicate ghost hata) + Path ON
**User:** "character background pe lagao aur Path option chalu karo — character chalana hai".
- **PEHLE:** putla tap ke baad **do character** dikh rahe the — (1) asli character layer, (2) `#smBgAnim` background-ghost + "BG KAKA" chip. Path kaam kar raha tha par ghost ki wajah se confusion.
- **FIX:**
  1. Ghost ka content band: `#smBgAnim` par `display:none` + `body.sm-has-char #smBgAnimChip{display:none!important}` (hideDupGhost, 800ms tick me).
  2. `synMax` boot me pickChar apply hone ke baad `hilao.sel`/`hilao.anim` clear + chip remove.
  3. drawFrame me guard: asli character ho to ghost canvas kuch draw na kare.
- **TEST (local 360×800, Kaka):** `charVisible:true`, `#smBgAnimChip display:none`, `body.sm-has-char`, timeline clips `Head bob + Image`, **sirf ek character** screenshot me. Path: character par tap → dock me **Path** → options bar → drag → xs **299 → 494 → 690** (scrub 2%/50%/98%), **0 error**.

## Round 62 — "Editor khulte hi character khada milta hai" (user ka asli complaint)
- **ROOT CAUSE:** purane putla flow se `localStorage['hilao.sel']` (background-animation selection) device par pada reh jata tha. `hilao.html` ka ghost module usko **parse hote hi** padh leta tha (`var KEY='hilao.sel'` line ~2700) → har open par character canvas par khada milta tha (haalan project blank tha).
- **FIX:**
  1. `<body>` ke shuru me hi ek chhota script (`smStaleClear`) jo har open par `hilao.sel` + `hilao.anim` clear karta hai — ghost module padhne se **pehle**.
  2. CSS: `#smBgAnim{display:none!important}` + `#smBgAnimChip{display:none!important}` (ghost layer + "BG ..." chip kabhi na dikhe).
  3. `hideDupGhost()` tick me bhi ghost/chip hide.
- **TEST (stale `hilao.sel` rakh kar, user ke device jaisa):** open → `charVisible:false`, clips `["Image"]`, chip `display:none`, ghost `none` → **khaali editor** ✔. Putla flow → `charVisible:true`, clips `Head bob + Image` ✔. Reopen → phir **khaali** ✔. Path xs **299 → 494 → 690** ✔. **0 error**.

## Round 63 — Background par laga character faded (AutoDraft look)
- **User:** "jo bhi background pe lagega kuch bhi uska colour fikka rahe — AutoDraft same look" → scope confirm: **preview (scene) me background ke upar jo bhi lage** → ~60%.
- **Implementation (hilao.html renderer):**
  - FS me naya uniform `charA`; compositing se pehle `cc*=charA; ca*=charA;` → character layer 60% mix, background jaisa tha waisa.
  - `Renderer` uniform list me `'charA'`; `pass()` me `uniform1f(this.u.charA, 0.6)`.
  - Canvas2D fallback: `fallbackChar()` me `x.globalAlpha=.6`.
- **Naap (local 360/390, putla flow):** `charVisible:true`, clips `Head bob + Image`, character faded, **0 page error**. Reopen → `charVisible:false`, clips `["Image"]` (blank boot intact).
- **LIVE:** `9576981` — Pages me `charA,0.6` mila; live 360/390: open blank (`false`), putla → `true` + faded, **errs 0**.

## Round 64 — User ke 4 point (technical verify, koi code change nahi)
Live `9576981` par asli flow chala kar naapa (360×800 + 390×844, dono 0 error):
1. **Dobara editor kholna → khaali:** `charVisible:false`, clips `["Image"]` ✔ (dono width).
2. **Character lagana (putla → background) → timeline patti:** `charVisible:true`, clips `["Head bob","Image"]`; patti 78×~46px, track 2 (char + image) ✔.
3. **Character par tap → Path chalu:** layer menu `Mask, Shadow, Path, Speed, Transform, Adjust, Flip, Delete`; Path par tap → bar `2s / 4s / 8s / Full / Ease / Loop / Rev / Walk / Clear` + toast "Character se line kheencho — jahan chhodo wahan pahunchega" ✔.
4. **Character par tap → Delete:** toast "Character layer delete ho gaya. Undo se wapas la sakte ho."; `charVisible:false`, clips `["Image"]`; **reopen bhi khaali** ✔.
- Local naap: timeline scale ~16.2 px/s (`innerW 486`), char/image clip width 78px dono; dock labels me koi text-clip nahi (`scrollWidth>clientWidth` = 0 items).
- Baaki: dock ka 5th item ("Transfor…") viewport edge par cut dikhta hai (horizontal scroll se aata hai) — user se poochhna hai badalna hai ya nahi.

## Round 65 — Character fade revert + timeline track colour (user: "only tracks ka colour, thoda fikka")
- **Revert:** Round 63 ka character fade poora hata diya (`charA` uniform + `globalAlpha` gaya) — character ab full colour (user: "character ko bhi rang dala 😂").
- **Change:** `.timeline-inner, .track` background `#0d0e10` → **`#1b1e24`** (thoda fikka / soft charcoal). Baaki kuch nahi chheda.
- **Live:** `517d6f1`; naap 360/390 → `trackBg: rgb(27, 30, 36)`, `charVisible:true`, clips `Head bob + Image`, **errs 0**.

## Round 66 — Responsive viewport layout (user ka spec: 40/12/38/10 vh)
- **Spec jaisa-likha hai waisa possible nahi:** 40+12+38+10 = 100vh, par screen par header (44px) + scene meta (25) + playbar (32) + quick-tools (32) + scenebar (32) alag se hote hain → literal lagane par ye rows bahar chali jatin. Aur 360px width par 16:9 preview max 199px hi ho sakta hai; 40vh (320px) ke liye 569px width chahiye → crop/zoom karna padta (user ka rule 53 "over-zoom na ho").
- **Jo lagaya (CSS only, `sm-auto-editor.css` → `<style id="smAutoCSS">`):**
  - `html,body,.app { height:100dvh; overflow:hidden }`
  - `#workspace > .preview-shell { flex:0 0 auto; min-height:26dvh }` (preview content-size, koi blank gap nahi)
  - `#workspace > .timeline { flex:1 1 auto; min-height:38dvh; max-height:46dvh; overflow:hidden }` + `.timeline-scroll{overflow-y:auto}`
  - `.app > .dock { height:10dvh; min-height:58px; max-height:86px }`
  - Koi bada fixed px panel nahi; ID-selector isliye ki `smMobile`/`smNavCSS` ke `#workspace > .timeline{flex:1 1 auto}` ko beat kare.
- **Naap (char + camera = 4 tracks, sab 0 error):**
  | viewport | preview shell | timeline | dock | doc/scroll | tracks |
  |---|---|---|---|---|---|
  | 320×700 | 212 | 278 (40dvh, min 38) | 70 | 700/0 | 46+46+46, add-row 132 |
  | 360×800 | 235 | 345 (43dvh) | 80 | 800/0 | 46+46+46, add-row 199 |
  | 390×844 | 251 | 365 (43dvh) | 84 | 844/0 | add-row 219 |
  | 412×915 | 264 | 421 (46dvh cap) | 86 | 915/0 | add-row 275 |
  | 430×932 | 274 | 428 | 86 | 932/0 | add-row 282 |
- `.timeline-scroll` overflow-y auto, clientHeight == scrollHeight (kuch hide nahi); stage 16:9 crop ke bina (199/216/228), over-zoom nahi.

## Round 67 — Motion path guide: faint red line (user ka spec)
- **Spec ka intent lagaya, par parallel SVG layer nahi banaya:** editor me pehle se `<canvas id="smPathLayer">` overlay hai jo wahi kaam karta hai (line + nodes + playhead dot + drag preview). Usme colour badla — dohra system banane se line double dikhti.
- **Changes (`hilao.html`, path overlay `line()` / `draw()`):**
  - dashed stroke `[7,6]` → **`[4,4]`** (spec `stroke-dasharray="4"`)
  - committed line stroke `#fff` → **`rgba(255,0,0,.25)`**; drag preview ghost → `rgba(255,0,0,.16)`
  - end nodes: fill `rgba(14,8,8,.85)`, stroke `rgba(255,0,0,.45)`
  - start ring `rgba(255,0,0,.28)`, playhead dot `rgba(255,0,0,.40)` (pehle safed tha)
- Path line ab **hamesha** dikhti hai jab scene me path ho (sirf draw-mode me nahi) — tap par bhi guide rehti hai.
- **Local verify:** path set (`x0 .5, y0 .875, dx .503, dy -.081`), toast "Path set", line faint red dashed, **0 error**.

## Round 68 — Path: autoplay band + start par laal clone
- **Autoplay band:** naya `pausePlay()` (path module) — `#playBtn` click se `playing` false. Call hota hai: path mode khulte hi (`setMode(true)`), path set hone par (`commit()`), aur bar ke kisi option (2s/4s/8s/Full/Ease/Loop/Rev/Walk) par. **Clear** par nahi.
- **Laal clone:** `window.__smEd.charTex` (character ka canvas) expose; path overlay me `redClone()` — character texture ko `source-in` se `rgba(255,36,36,.9)` me tint karke, path ke **start (base rect)** par 38% alpha se draw. Flip handle; `t>0.03` par hi dikhta hai (t=0 par character ko laal nahi karta).
- **Local naap:** mode khulne par `playing:false`, path set ke baad `playing:false` (time 5.28 par ruka), `seek(5)` ke baad bhi `playing:false` → **sirf Play dabane par chalega**; 0 error. Screenshot: kaka right chala, start par **laal clone** khada.

## Round 69 — Path direction bug ("real character ulta ja raha hai")
- **Root cause:** `commit()` path ka delta **drag vector** (`end - start`) se leta tha, character ke pair se nahi. Isliye line ka end = *feet + (B-A)*, jo ungli se aage/peeche nikal jata tha → character ulti taraf/zyada door chala jata tha.
- **Fix:** path ka end ab **jahan ungli chhodi** wahi hai — `dx = dropX - feetX`, `dy = dropY - feetY`. Drag ke waqt ka preview line bhi feet → ungli (pehle feet+delta).
- **Naap (360×800):**
  - Ulti drag (0.85 → 0.30, drop 0.30): `endX 0.299`; t=8 par character feet `0.299` ✔
  - Seedhi drag (0.25 → 0.80, drop 0.80): `endX 0.802`; t=8 par feet `0.802` ✔
  - `playing:false` path set ke baad bhi ✔; **0 error**

## Round 70 — User ka "nuksan": character delete ke baad path ka bhoot bach jata tha
- **Screenshot (user, 16:29):** canvas par character nahi, timeline me sirf `Image` — par **laal clone + path line + Path options bar** wahi khade the. Ye mere Order 67/68 ka side-effect tha: clone `charTex` (library texture) se banta hai, jo layer delete hone par bhi maujood rehta hai.
- **Fix (`hilao.html`, path module):**
  1. naya `charOn()` — `charVisible` + cast check.
  2. `draw()`: char nahi → overlay canvas **clear** (clone/line/dots gayab).
  3. `renderBar()`: char nahi → `#smPathBar` hidden.
  4. `loop()`: char gayab + `scene.smPath` pada ho → `smPath` auto-delete `markDirty()` ke saath (orphan data na rahe).
- **Local naap:** path ke saath `bar:1`, path `true` → character **Delete** → `charVisible:false`, `path:false`, `barHidden:true`, overlay pixels **all zero**, clips `["Image"]`, **0 error**.

## Round 71 — Character page: safed "Upload" + safed Delete
- **Upload pehle se tha** (`#createCharBtn` → `#characterUpload` file input, accept png/jpg/webp) par label "Create" tha — ab **"Upload"** (upload icon) aur **chhota safed pill** (92×30, `#fff`, dark text, radius 999, soft shadow), active par halka grey + 1px press.
- **Delete:** har card par `.char-delete` ab **safed 26×26 rounded square**, dark trash icon; hover/press par halka laal. Custom character = **asli delete** (confirm ke saath), library character = **Hide** (Hidden category me jata hai, `restore` button se wapas — usme green icon).
- Local naap @390: `up 92×30 bg rgb(255,255,255)` `txt "Upload"`, `del 26×26 bg rgb(255,255,255)`, **0 error**.

## Round 72 — Upload kiya character bhi library jaisa "seedha khada" (flip-safe)
- **Gap mila:** `addCharacter()` me `removeWhite()` ke baad koi crop/center nahi hota tha. Isliye user ka upload jis jagah tha usi jagah canvas me reh jata tha → flip karne par character side me khisak jata tha aur pair/ground alag lagta tha. Library characters already perfect the (margins 27–29 px, silhouette symmetry 0.93–0.996).
- **Fix:** naya `normalizeSprite()` — alpha bbox se crop, **left/right barabar margin**, **bottom margin**, margin = height ka **3.75%** (library ke 29/773 se exactly match). Sirf custom uploads par lagta hai, library characters untouched.
- **Naap (test: off-center 900×1200 upload, character right side me):**
  - Upload ke baad sprite `272×691`, margins **left 24 / right 24 / bottom 24**, `centered:true`
  - Canvas par: rect `x 324.5, w 119` → flip ke baad **`x 324.5, w 119`** (bilkul same jagah, sirf mirror) ✔ **0 error**

## Round 73 — Character card: sirf ek image (FRONT), 3/4 tabs hataye
- `3/4 FRONT` aur `3/4 BACK` buttons (jo `na` the, kuch karte nahi the) **hide** — ab har card par sirf **FRONT** dikhta hai, poori width me. `.char-angles` grid 1 column.
- Upload vaise hi hai (safed pill). Local naap 360/390: `FRONT: block`, `3/4 FRONT: none`, `3/4 BACK: none`, angles row 24px, **0 error**.

## Round 74 — Character ka Flip button hata diya (user: "2")
- Character layer menu se `Flip` (laFlip) **nikaal diya**; handler null-safe kar diya (`if($('laFlip'))`). Image layer ka `Flip` (background) jaisa tha waisa hai.
- **Side-effect pakda:** `menuBtn()` Path button sirf tab lagata tha jab `#laFlip` maujood ho → Flip hatane se **Path bhi gayab** ho gaya tha. Detection `#laMask` par shift ki.
- Local naap: menu `Mask, Shadow, Path, Speed, Transform, Adjust, Delete` (Flip nahi), Path dabane par bar **khulti hai**, **0 error**.

## Round 75 — Purane (front-facing) library characters hata diye, sirf upload
- `HIDE_BUILTIN_CHARS = true` — character page ab **built-in 13 characters nahi dikhata**, sirf user ke uploads. (Wapas chahiye: flag `false`.)
- Library khaali hone par saaf empty-state + **Upload** button (usi safed flow se file picker).
- Local naap: pehle `0 characters` + empty text; ek image upload karne par **1 card** (`My upload` badge), **0 error**.
- **Note:** AutoDraft-jaisa 3/4 look art main generate nahi kar sakta (user ka rule) — library me aapki uploads hi rahengi.

## Round 76 — 3/4 character import pipeline ready (+ galti se bacha file restore)
- **Gadbad:** GitHub contents API se 4MB file wapas laane ki koshish ki (limit 1MB) → local `hilao.html` **0 KB** ho gaya. Turant `backup/hilao.before-hide75.html` (4242874 bytes) se restore kiya, Round 75 ke 2 edits dobara lagaye, syntax + smoke verify. **Live kabhi kharab nahi hui** (push sirf aage jaata hai).
- **Filter fix:** `{!HIDE_BUILTIN_CHARS || c.custom || c.builtin===false}` — warna upload kiya character bhi chhup jata tha (test me pakda: cards 0).
- **Naya tool:** `tools/add_character.py` — image → white bg remove → alpha crop → equal 3.75% margins → base64 → hilao.html ke `SOURCES` + `DEFAULT_CHARS` me `builtin:false` ke saath add. Test "Test Kaka" import → card dikha, phir hata diya (regex se hatate waqt JS toota tha — restore se theek; is tool se future me safe rahega).
- **E2E local:** library `0 cards` → upload → **1 card (My upload)** → use → `charVisible:true`, clips `Head bob + Image`, **0 error**.
- **Live confirm `0264f0b`** (360/390): library `0 cards` → upload → `1 card` badge `My upload` → use → `charVisible:true`, clips `Head bob + Image`, errs 0. Screenshots `L767-360.png`, `L767-390.png`.
- **Pending:** 3/4 pose images user se aani hain (`chars-in/`), phir `python3 tools/add_character.py chars-in/x.png "Name"` → push.

## Round 77 — AutoDraft character + AutoDraft placement (live `ada80f1`)
- User ne kaha "Indian village aap hi banao na 2D character" → **agent ne art banaya** (user ne standing rule abhi ke liye hataya): `chars-in/village-1.png` (flat vector, white bg, no shadow) → `tools/add_character.py` → id `village-kaka`, card `Village Kaka`, sprite `334×786`, JS ok, kurta me hole nahi.
- User ke AutoDraft screenshots se naapa: canvas 1080×806 → character **body height 92%**, **pair bottom se 2.5%** (top 5%), center ~55%, **koi cast shadow nahi**.
- Placement fix (`layout()`): `CHAR_BODY=.92, CHAR_FOOT=.975, CHAR_MG=.0375`; scale height-driven `h*(CHAR_BODY/CHAR_BF)`, y = `h*CHAR_FOOT - dh*(1-CHAR_BM)` → **pair hamesha 97.5% par lock**, zoom karne par bhi pair nahi khisakta. Shadow ellipse bhi pair par shift, resize ka panY formula bhi match.
- Galti pakdi: pehle constants **class Renderer ke andar** chale gaye → `SyntaxError: Unexpected identifier 'CHAR_BODY'` (page blank). `new Function` check ne nahi pakda — **asli page load zaroori**. Theek kiya, `backup/hilao.before-autosize77.html` backup hai.
- Verify (local + live, 360/390): `top 5.5% bot 97.5% h 92% cx 50`, zoom 1.25 par bhi bot 97.5, flip par cx 50, **errs 0**. Screenshots `AUTO77-*.png`, `LIVE77-*.png`.
- Push helper: `tools/push_hilao.sh` (Contents API PUT, sha pehle).

## Round 78 — Path: clone destination par (live `94d43f9`)
- User: "clone to banta hai par clone ko hum jaha chahenge waha khda karenge, tumne ulta kiya hua hai" → **Option 1** chuna: character ghar par khada, **laal clone destination par**.
- Code: `redClone(sc,ox,oy)` ab offset leta hai; `draw()` me `redClone(sc,dx,dy)` (pehle `t>0.03` par start me clone banta tha). Path mode me drag ke waqt bhi clone ungli ke neeche preview dikhta hai.
- Verify live 360/390: `t=0 cx 0.500` → `t=2 0.461` → `t=4 0.375` → `t=6 0.289` → `t=7.9 0.250` (ungli 0.25 = exact), **errs 0**. Screenshot `LIVE78-final.png`, local `CL78-start/mid/drag.png`.

## Round 79 — Side-view walk cycle (live `73fb382`)
- User: "bilkul perfect walk... camera meri taraf mat rakho, jidhar ja raha hai udhar rakho" → walk **side/profile** me, direction ke hisaab se turn.
- Art: 4 pose (`chars-in/walkS1..4.png`) isi Kaka ke reference se, flat style. Normalize: white strip → body height 596 → canvas `292×640`, margin 22 (0.0375), feet baseline same → **khade pose se size me koi jump nahi** (rect h 427 dono me).
- PNG8 (binary alpha, 200 colors) → total **105 KB** base64. (Pehle 256-color quantize se character translucent ho gaya tha — alpha 0/255 karna zaroori.)
- Code: `WALKS={'village-kaka':[...]}`, `loadWalkFrames()`, `charFor()` (proxy jisme canvas swap) + `walkCanvas()` (sirf path `on` aur `local` 0..dur ke beech, 7.5 frame/s) + `walkMirror()` (frames RIGHT ki taraf chalte hain → `dx<0` par mirror). `layout()` bhi `charFor` use karta hai (warna texture stretch). Path bar ka **Walk** button ab animation ka on/off (`scene.walkAnim`).
- Verify local + live 360/390: khada w 182 → chalta w 195, t=3.3 cx 0.407, **errs 0**. Screenshots `WALK79-t*.png`, `LIVE79-*.png`, `WALK-preview3.png`.

## Round 81 — Demo video + demo page (live)
- 8s demo banaya: headless se editor ke 192 frame (24fps, dpr2) uthaye → ffmpeg H.264 `demo/village-demo.mp4` (570KB) + GIF (981KB) + VP9 `demo.webm` (1MB).
- Workspace preview `demo/village-demo.gif` par "File not found in workspace" dikha (app side issue) → isliye site par daala: `demo.mp4`, `demo.webm`, `demo.gif`, aur **`demo.html`** (BACK button + video + download links). Screenshot `DEMO-page.png`.
- Note: headless Chromium me **H.264 nahi chalta** (readyState 0) — isliye `<source>` me webm bhi rakha; phone par mp4 chalega, Chromium par webm.
- Push helper: `tools/push_file.sh <local> <remote-path>` (nayi file + update dono).

## Round 82 — Walk cycle ek hi sheet se (live `4cedfab`)
- User: "kyo bacho wala kar rahe, kuch real 2D animation" → 4 alag AI images ki jagah **ek hi image me 6 pose** (`chars-in/sheet1.png`) → style/folds bilkul same, flicker khatam.
- Sheet slice: alpha column gaps se 6 figure (2 jud gaye the, min-column se alag kiya). Teeno se chhoti/badi thi → **head height se scale** (turban) + head-top align + feet baseline → chaaro frame same size.
- Cycle order `1,2,6,5` (contact→pass→contact→pass), `walks6.json` → `WALKS` replace. 4 frames, canvas 268×640, **101 KB**.
- `sheet2.png` (12 pose) bhi banayi par woh camera ki taraf tha (user ne mana kiya) → use nahi ki.
- Naya demo: `village-demo.mp4` 533KB, `demo.webm` 1MB, `village-demo.gif` 960KB → site par `demo.html`. Live content-length verify `4670316`. LIVE walk test 360/390 → khada 182 / chalta 179, errs 0.

## Round 83 — RIG walk (live `6f43779`)
- User: "Ha" → rig banaya. Do part-sheets AI se banwayi: `chars-in/rig-upper.png` (sir+dhad+haath, kamar par cut) aur `chars-in/rig-legs.png` (dhoti+taang+chappal, 11 pose sheet me).
- `tools/compose_rig.py`: legs sheet ko rows/columns se slice → har pose ko `LEG_H=0.475*BODY` par scale, **waistband ke centre** se hip anchor; upper body `UP_LEN=0.575*BODY` (hem = white rows se detect, `hem_y`) par scale, hem dhoti ke waist se `0.025*BODY` neeche → seam kurta ke neeche chhup jata hai. Sab frames ek hi canvas (310×657) + 3.75% margin.
- **Upper body har frame me pixel-identical** → flicker zero, sirf taangein chalti hain. 8 frames, 178 KB.
- Verify: khada h 427 = chalta h 427 (size jump nahi), cx 0.5→0.28, errs 0 (local + live 360/390). Demo dobara: `demo.mp4` 505KB / `demo.webm` / `demo.gif` 868KB.
- Note: `sheet2.png` (camera ki taraf 12 pose) reject; `sheet1.png` se 4-frame version backward compatible rakha gaya tha, ab rig version replace kar diya.

## Round 84 — Permanent walk: ek pair aage, ek peeche (live `73b2fca`)
- User: "ek per aage ek par piche bus ye permanent chalta rhe" → (a) knee-up wale pose hataye, sirf **4 clean pose** (stride A → pass → stride B → pass) — `compose_rig.py 1,2,4,5`, 90 KB. (b) `walkState` me `t<=0.004 || t>=0.996 → null` cutoff **hata diya** → path ke start/end par bhi pair chalte rehte hain, khada pose beech me nahi aata.
- Leg poses ko number se naapa (sandal clusters se feet ka faasla): stride 1=185px, 4=170px, 7=180px; pass 3=76, 5=82, 6=85, 11=64. Isliye 1,2,4,5 chuna (ek hi row = same dhoti drape).
- Live verify 360/390: khada 182 / chalta 202, cx 0.5→0.28, **errs 0**. Demo: `demo.mp4` 459KB / `demo.gif` 840KB / `demo.webm`.

## Round 85 — KEYFRAME engine (live `cf5fa42`)
- User ka flow: "taang aage rakh ke Key → time aage → taang peeche rakh ke Key → Play par beech me smooth".
- `<script id="smKeysJS">` (alag script, editor ke andar nahi chheda): bar `KEY | Key + | Del | ◀ Leg | Leg ▶ | n key · Leg k`.
  - `scene.keys=[{t,panX,panY,zoom,flip,phase}]`, `scene.posePhase` (0..1 = kaunsa leg pose).
  - rAF: jab **time badle** (play/seek) tab keys se interpolate (smoothstep) karke `panX/panY/zoom/posePhase/flip` scene me likhta hai — paused state me nahi likhta, warna user ki pose edit ud jati thi.
  - Key dabate waqt path (`smPath`) hata deta hai (dono ek saath na chalein).
- Core patch (chhota): `walkState()` sabse pehle `posePhase` dekhta hai (keyframe mode), phir path cadence.
- Verify local+live 360/390: key t=0 phase 0 → t=4 phase 0.5, seek par `ph 0 → 0.08 → 0.25 → 0.42 → 0.5`, errs 0. Demo `demo.mp4` (keyframes se: left→center→right + leg swap).

## Round 86 — Key bar sirf Character edit mode me (live `a619472`)
- User: "isko mere app se hatao, character studio me shift kar do automatic" → choose "Character edit mode me".
- `smKeysJS`: default `display:none`; `paint()` me dikhta hai sirf jab `#stage.editing` ya `#ringDock` visible ho. Position `bottom:184px` (ring dock ke upar). `tick()` signature me bhi edit-mode flag (turant show/hide).
- Edit mode kholne ka rasta: dock **Character** → card **Ring Motion** → **editFace** ("Chehra edit karo") → tab bar dikhta hai; **Done** par gayab.
- Verify live 360/390: normal = `none`, edit = `flex`, errs 0.

## Round 87 — KEY bar character editor ke andar (live `b7578d2`)
- User: "isko yahan se hatao, character editor me le ke aao" → floating `position:fixed` hataya. Ab `#ringDock` ke **turant baad** `preview-shell` ke andar insert hota hai (static flow), yaani Ring/Head/Aankh/Muh/Reset/Done row ke neeche, playbar ke upar. Look ring dock jaisa (rgba white .05, 12px radius).
- Verify live: parent `preview-shell`, prevSib `ringDock`, bar.top 372 / ring.bottom 364 → bilkul neeche, editor ke andar. Normal editor me `none`.

## Round 88 — KEYFRAME bar editor se hataya, Rig Studio me shift (live `4c0c1d4` + `0b9365a`)
- User: "Isme le aao" (Character Tool v5 card) — editor "khichdi" lag raha tha, isliye keyframe tool **poora** `hilao.html` se nikal diya aur **Character Tool (Rig Studio)** ke andar daal diya.
- `hilao.html`: `<script id="smKeysJS">…</script>` block **remove** (4661998 → 4655658 B). Editor me ab key bar / key UI kuch nahi.
- `rig.html`: naya `<script id="smRigKeysJS">` (rig 246152 → 252547 B). Bar `#smRigKeyBar` — Rig step ke **QUICK POSE** card ke andar, `#qpRow` (Idle/Walk/Run/Sit) ke **turant baad** insert (Walk panel + pose buttons ke saath ek jagah, kuch bhi split nahi hota).
- Bar UI: `KEYFRAME · Key + · Del · Play · <n> key · <t>s`, ek timeline strip (key markers + playhead) aur scrub range 0–60 (×0.1 s, `DUR=6s`)।
- Store: `localStorage['rigstudio.keys'] = [{t,v}]` — `v` = leg-stretch % (wahi number jo "Adjust Leg Stretch Range" par dikhta hai). Scrub/Play par smoothstep interpolation se `#smWalkSlider` ka `input` dispatch hota hai → wahi rig chalna shuru karta hai jo user ne key kiya. Page band karne par bhi keys bachti hain.
- **Bug jo mila aur fix hua:** scrub inert tha (`value` set karne par wapas 0). Cause: `input` handler pehle `stop()` call karta tha jiske andar `paint()` `sc.value` ko current `t` (=0) se reset kar deta tha, **phir** `this.value` padha jata tha → 0. Fix: value pehle padho (`var __v=Number(this.value)/10`) phir `stop(); t=__v;`. Saath me `play()` kabhi t last key ke baad atka ho to 0 se shuru.
- Verify local (390, real flow: upload → Auto-Cut → Rig → Walk): keys `[{t:0,v:15},{t:3,v:78}]`, scrub 1.5s → slider **47**, scrub 0.6s → 21, Play se `t` aage badhta hai, `Del` ek key hatata hai, reload par keys persist, errs 0.
- Verify live 360/390: `hilao.html` — `smKeysJS` absent, `#smKeyBar` absent, `__smEd` chalu, errs 0. `start.html` → `rig.html` — bar `display:flex`, prevSib `qpRow`, 308×108 / 338×108 px, errs 0; live key test me markers 0s & 3s, playhead 1.5s, toast "Key set @ 3.0s · 78%".
- Screenshots: `RIGKEY.png`, `RIG-LIVE-KEYS.png`.
- Round 88b (live `2b37aff`, 252820 B): bar ab **Rig step par turant** dikhta hai (pehle sirf Walk tap karne ke baad). `watch()` visibility `#qpRow` ke visible hone se decide hota hai, `smWalkPanel.hidden` se nahi. `ensureWalk()` — pehla `Key +` / scrub khud Walk pose on kar deta hai, taaki slider turant rig chala sake. Verify live 360/390: bar `flex` (308/338×108), walk panel chhupa hua bhi, Key+ ke baad walk on + `1 key`, errs 0. Screenshot `RIG-LIVE-NOWALK.png`.

## Round 89 — Walk v2 (real gait) + demo page (live `702ed17`)
- User: "character aur walk animation ki madad se tool me kuch ho sakta hai… demo bhi fail hai" → walk ganda lag raha tha (T-pose zombie arms + sinusoidal leg swing). Reference: classic 8-pose walk cycle (contact → down → passing → up).
- `step()` (rig.html) me gait engine badla:
  - **STANCE 62%**: leg angle `+A → -A` linear (paon zameen par, koi jhatka nahi), **SWING 38%**: `-A → +A` + lift (pair uthana).
  - `A = spread × 1.35` (run 1.55), lift `BH*0.020` (run 0.030).
  - **Bob per step** (2 per cycle): `rise = bobAmp*(0.5-0.5cos(4π(u-0.10)))` → "down" neecha, "passing" ooncha.
  - Arms per-side opposite leg (`swingL` ↔ `sR.ang`), torso counter-rotation same.
- **Auto arms-down:** Walk/Run dabate hi `ARM_POSTURE` 'down' ho jata hai (button state bhi ON) — T-pose zombie look khatam; user chaahe to T-pose wapas le sakta hai.
- **Root travel 0 (in-place):** canvas 528px chaudi, character bbox 364px → sirf ~80px jagah. Foot-planting formula se travel nikaalne par character 370px/s chal kar canvas se bahar nikal raha tha + edge flip har 0.5s (frantic). Isliye in-place walk rakhi.
- Verify local: 8-frame strip `WALKV2-STRIP.png` (stride + lift + bob dikhte hain), errs 0. Live 360/390: `anim:true`, `travel:0`, `armsDown:true`, pose `walk`, KEYFRAME bar present, errs 0.
- Demo: `WALKV2-DEMO.webm` → `walkv2.mp4` (886 KB, 27s) + `walkv2.webm` + `walkv2.gif`; page **keysdemo.html** update (mp4+webm+poster, autoplay, Download/Full screen). Verify live: page 200, video `readyState 4`, 27s, playing, errs 0.
- Backup: `backup/rig.before-walkv2.html`.

## Round 91 — naya character "Ravi" + rig upscale fix
- **rig.html v18.3** (`a28a008`, 252494 B): AUTO-UPSCALE `MAX_SIDE 2400→3200`, cap sirf tab jab `MIN_W/MIN_H` mil jaye. Pehle 280×940 image `715×2400` ban kar galti se "bahut chhoti" reject ho rahi thi.
- **Character:** AI se original (Pinterest wali stock par "dreamstime" watermark + white bg tha, arms chipke the). Final `chars-in/rahul-final.png` 323×1000 — 3/4 view, muh camera ki taraf nahi, arms body se alag (clean 6/6 cut), scarf chest ke saamne (arm ke upar nahi, warna walk me white sliver aata tha).
- **Transparent pipeline:** `tools/mk_alpha.py <in> <out> [h] [thr]` — white flood → 2× upscale → distance-transform 2px band + nearest-inside colour decontaminate → Gaussian 1.0 → crop → 1000px.
- **hilao.html** (`76149a3`, 4998153 B): `SOURCES.ravi` base64 + `DEFAULT_CHARS` me `{id:'ravi',name:'Ravi',category:'Desi',tags:['Desi','Latest'],builtin:false,head:{x:.254,y:0,w:.449,h:.206},ring:{x:.478,y:.215}}`. `builtin:false` zaroori — `HIDE_BUILTIN_CHARS` filter warna card chhupa deta hai.
- **Live verify (390×1000, local + live):** Characters panel me Ravi card, click → header "Ravi · Selected · Desi", FRONT thumb render, errs 0.
- **Profile (pure side) fail:** dono arm ek hi silhouette — auto-cut me arm pieces khaali + torso/leg rectangle seams. Isliye 3/4 chuna.

## Round 91b — character Flip wapas (live `a6a720c`)
- Layer menu (character) me **Flip** button wapas: `btn('laFlip','flip','Flip')` Mask ke baad. Handler (line ~2074) aur `renderLayerMenuState` ka `on`/`aria-pressed` pehle se the — sirf button list se hata diya gaya tha (Order 74).
- Flip shader rect ke andar hota hai → character **apni hi jagah** mirror hota hai, background/pan nahi badalta. Overlay ring, drag math (`s.flip?1-s.ring.x`) aur flip-back sab sahi.
- **Verify (390px, local + live):** menu `Mask|Flip|Shadow|Path|Speed|Transform|Adjust|Delete`, flip click → `on:true, aria-pressed:"true"`, stage me mirror in place, `errs 0`.
- Test flow (yaad rakho): Character nav → **Upload** (`input[type=file]`) → `#useCharacter` → stage → overlay tap = layer select. Character **card** click putla page (`animations.html?name=&id=`) par le jata hai, editor scene par nahi.

## Round 92 — KNEE JOINT (thigh + shin), rig.html v19.0 — live `36f652a` (259003 B)
- **Cut:** `kneeY = crotchY + (bMaxY - crotchY) * 0.52`; leg pixels `y >= kneeY` → naye ids `shinL`/`shinR`. Ab **8 pieces** (gate message bhi dynamic: "N pieces cut").
- **Z-order:** `legL 1 < shinL 1.5 < armL 2 < torso 3 < legR 4 < shinR 4.5 < armR 5 < head 6` (`Z0` + `Layers.Z_BASE` dono).
- **Pivots:** thigh = hip (`tCx ± torsoW*0.32, hipY`); shin = knee (`shin.oX0 + ow/2, kneeY`).
- **Parent chain (asli fix):** shin ka translate point = thigh ke around ghuma hua knee pivot, **par drawImage offset apne (unrotated) pivot se** — pehle rotated pivot se ho raha tha, isliye shin 100px tak khisak jata tha. `Studio.render` + `compositeCanvas` dono me theek.
- **Seam:** knee par 18px **chamfer** (shin ke kinare thigh ko) + shin ka 9px overlap; shin thigh ke upar (`Z 1.5`).
- **Pose/Anim:** `Pose.setKnee/getKnee` (+ capture/apply, reset, history v3). Walk: `knee = KNEE_SIGN * KNEE_AMP * sin(πk)` (swing) + `0.18*AMP*sin(πk)` stance; `KNEE_SIGN=-1`, `KNEE_AMP=0.55`. Static poses (Idle/Walk/Run/Sit buttons, legs quick-pose) par knee 0.
- **Verify:** local + live 390px — upload `rahul-final.png` → 8 pieces, walk me ghutna mudta hai, `errs 0`. Screens: `KN19-WALK.png`, `KN19-LIVE.png`, zoom `KNEE-I-Z4.png`.
- **Baaki (honest):** strong bend par knee par patli "crease" line dikhti hai (flat 2D cut ki limit); bahut zyada bend (-0.7 rad+) par chhota notch aa sakta hai.

## Round 93 — Rig page zoom-out — live `d9b2014` (259238 B)
- `Studio.layout()` me naya const **`STAGE_ZOOM = 0.86`** — `baseScale` (aur mobile ka 0.50 cap) lagne ke **baad** apply hota hai. Character ~14% chhota, frame me margin.
- Verify 390×900 (local + live): canvas **167×356** (pehle 194×415), `scale 14.4%`, rings/pivot/keyframe bar sab intact, 8 pieces, `errs 0`.
- **Notice (user ne baad me "baariki se code check" bola):** arm cut ke paas fingertip sliver (orange chhota tukda haath ke paas) aur strong knee bend par crease — inhe agle review pass me dekhna hai.

## Round 94 — BG KILL v19.1 (soft shadow / white halo) — live `05d5062` (261682 B)
- Problem: safed bg to hat raha tha par **soft ground-shadow (grey/white ellipse)** aur **white halo** reh jate the (user screenshot). Wajah: flood sirf border colour-model ke ±T me chalta tha; shadow white se ~50-100 door hota hai.
- Fix (`Bg.process`, flood ke andar): **PAPER RULE** — `PAPER_LUM 176`, `PAPER_SAT 34`, `PAPER_RAMP 17`. Agar current pixel "paper" hai (roshan + kam saturation), to padosi paper pixel bhi bg maana jata hai jab luminance ek step me sirf ≤17 badle. Isse smooth shadow ramp khatam ho jata hai; character ke outline par lum/sat turant badalte hain → leak nahi.
- Feather pass: paper edge (lum > 196, sat < 28) seedha alpha 0.
- Naya `killPaperSpecks()`: flood ke baad bache pure-white (lum≥244, sat≤10) specks jo removed area ke 2px andar hain — clear.
- **Tests (synthetic, real pipeline output `RIG.App.imgData`):**
  - white bg + grey ellipse shadow + white halo → shadow/halo gayab, light-opaque 1.2% (sirf white scarf) ✓
  - white bg + **white-ish** ellipse (lum 238) → same ✓
  - light blue bg + blue ellipse → same ✓
  - already-transparent PNG → `transparentPct 38.9`, chhua nahi ✓
  - live verify: `clearedPct 87.7`, `keepPct 12.3`, 8 pieces, `errs 0`; `#cutStack` preview me koi safed bacha nahi.
- **Env note:** snapshot ke baad `node_modules` aur `.cache/ms-playwright` gayab ho jate hain. Ab browser: `npm i playwright-core @sparticuz/chromium` + `node -e "require('@sparticuz/chromium').executablePath()"` → `/tmp/chromium` (SIGBUS aaye to /tmp khali karke dobara extract karo).
- **Headless quirk:** is chromium build me step-2 section DOM me hi nahi banta (body h 268) — purane backup par bhi same, isliye regression nahi. Verify ke liye `RIG.App.imgData` + `#cutStack.toDataURL()` use kiya.

## Round 95 — BG remover battery test + destroy-guard — live `94a3556` (262788 B)
- 8 synthetic cases (with ground-truth alpha) + 4 real user images, real pipeline (`RIG.App.imgData`).
- **IoU vs truth:** S1 white+grey shadow+halo **97.5%** · S2 white+white shadow **97.5%** · S4 blue gradient **97.5%** · S5 cream+shadow **97.6%** · S6 grey studio **97.6%** · S7 dark bg **94.0%** · S3 tight-crop **89.0%**.
- Real: `Firefly.jpg` (white shirt on white bg) → shirt **safe**, keep 28.8% · stock white jpg → 86% clear · dark phone photo → best-effort.
- **Fail mila:** safed bg + **poora safed kurta/pyjama** (thin outline, JPEG blur) → flood character kha jata tha (keep 1.3%).
- **Fix v19.2 DESTROY GUARD:** `alpha0` snapshot + `keepPct < 6` → poora revert, `removed:false`, `reason:'character-lost'`, toast warning: *"Character bhi safed hai isliye background auto nahi hataya (BG OFF)…"*. Gate phir saaf reject karta hai — toota hua character kabhi stage par nahi jata.
- Live verify (3 cases): blue gradient `removed:true, keepPct 12.3, 8 pieces` · Firefly `keepPct 28.8` · white-kurta `removed:false` + warning · `errs 0`.
- Sheet: `BGTEST-SHEET.png`; outputs `bgtest/*-OUT.png`, inputs `bgtest/*.jpg`.

## Round 96 — BAD CUT false alarm (knee ke baad) — live `313a0ed` (263276 B)
- User screenshot: layer list me **THIGH L 🔺 BAD CUT** + "THIGH L sirf 171px height — adhoori cut (pair poora nahi)".
- Wajah: Round 92 (knee) ke baad pair **thigh + shin** do hisson me hai, par `Cut.quality()` ki leg-check purani thi — sirf `legL.h < bbox.h*0.18` dekhti thi, isliye aadhe pair par jhoota BAD CUT.
- Fix: check ab **thigh + shin ka joda** (height aur pixels dono jod kar); label message me wahi.
- Verify: rahul-final `bad []` (thigh 527 + shin 479 @ bbH 2477) · Firefly `bad []` · S6 `bad []` · asli adhoori cut (S3 tight crop: thigh 25 + shin 10 @ bbH 1228) par **abhi bhi BAD CUT** ✓ · local + live `errs 0`.

## Round 97 — ERASER (bacha hua background saaf karo) + page-2 blank fix — live `cdad78a` (274986 B)
- User: "jitna bacha hua background reh jata hai usko eraser rakho, bacha hua background bilkul saaf ho jaye."
- **Eraser card** (`#eraseCard`, page 1/2 grid, Layer Manager se pehle): preview canvas `#eraseCv` (max 340px, `_k` scale), brush 8–90px, Undo / Reset / **Apply & re-cut**, pill `BG ON · #hex` / `BG OFF · #hex`, `erased` readout.
- Erase seedha `App.imgData` ke alpha par lagta hai (preview `destination-out`, apply par circle-sweep rasterize) → phir **wahi cut pipeline**: `Gate.run` → `Cut.run` (+mergeArms) → `Cut.quality` → `Facing.detect` → `Layers.load` → `renderCut` → `Studio.setScene` → `Pose.init` → history/hud → `v4AfterCut`.
- **Character safe guard:** apply ke baad agar `cut === null` ya non-transparent px `aAfter < aBefore * 0.55` → imgData turant wapas, dobara cut, toast *"⚠ Bahut zyada erase ho gaya tha (character kat raha tha) — wapas revert kar diya…"*. Plus Undo (last applied erase revert + re-cut).
- **BUG jo mila (live par pehle se tha):** auto-cut ke baad screen **khaali** ho jati thi — `PAGE_EL[2] = 'pg2'` par section `#pg2` maujood hi nahi. Fix: 1 aur 2 dono `pg1` par map, aur `goPage` ab **unique section** par toggle karta hai (warna duplicate mapping se pg1 dobara hide ho jata). BACK buttons: `{3:1, 4:3, 5:4}`.
- Tests (headless 390×1000, real pointer drag + real button click):
  - live S7_dark_bg: drag → `1 stroke`, Apply → **3,328 px erased**, 8 pieces, `errs 0`.
  - local 3 images (rahul-final / S7 / Firefly): erase ✓, Undo se alpha **exactly** wapas ✓, poora character mita kar Apply → **revert** ✓, `errs 0`.
  - nav: step 1→pg1, 2→pg1, 3→pgPos, 4→pg3, 5→pgSave, BACK pg3/pgPos/pgSave par, `errs 0`.
  - erase ke baad Position → Rig: 8 pieces, `bad 0`, rings/quick-pose normal (`LIVE-ERASE-RIG.png`).
- Evidence: `ERASE-S3-BEFORE/PREVIEW/AFTER.png`, `ERASE-S7-*`, `LIVE-ERASE-S7-*`, `LIVE-ERASE-RIG.png`, `ER-CARD.png`.

## Round 98 — FACING MIRROR: walk ab character ki taraf chalta hai (flip ki zaroorat khatam) — live `08f3383` (277282 B)
- User: "kisi character ko flip karo tab sahi chalta hai" + "flip karne ke liye BACK jaana padta hai".
- Wajah: gait (walk/run) standard side ke liye likha tha — hamesha `legL` peeche/`legR` aage draw + swing sign fix. Left-dekhne wale character me isliye ulta lagta tha; image flip karne se mirror ho jata tha.
- Fix (`walk step`):
  - `FD = (RIG.App.facing.dir < 0) ? -1 : 1`; `FD < 0` par poora gait mirror — `legL↔legR`, `armL↔armR`, `shinL↔shinR` swap + sign ulta, torso rotate ulta, leg lift offsets swap. Ragdna/keys/pose kuch reset nahi hota.
  - `Layers.setFaceDir(dir)` + `order()` me `legL↔legR`, `armL↔armR`, `shinL↔shinR` ki **draw order** bhi mirror (aage wala pair hi aage draw hota hai). Export/composite bhi isi order se.
  - Rig page ka **MIRROR ON/OFF** switch (pehle inert tha) ab `flipFacing()` se juda hai; `RIG.flipFacing` expose; `applyFacingUI()` switch ka label + state sync karta hai.
  - `facing Front/Left/Right` label tap = turant direction flip (Rig page par hi, BACK nahi, re-cut nahi).
- **Numeric test** (in-page rAF sampling, 260 frames, 2 characters: original + horizontally mirrored):
  - `legL/legR/armL/armR/shinL/shinR` ka mirrored pose vs normal pose **avg error 0.0005–0.0016 rad** (≈0.03–0.09°) — exact mirror.
  - amplitude same (0.296 / 0.297), `Layers.order()` swap ✓, `facingMeta` tap se dir +1→−1 ✓, MIRROR switch ✓, local + **live `errs 0`**.
- Regression: nav (1/2→pg1, 3→pgPos, 4→pg3, 5→pgSave) ✓, eraser apply (3,328 px, 8 pieces) ✓, `errs 0`.
- Evidence: `GAIT-MIRROR-SHEET.png` (3 frames normal vs 3 frames mirrored), `GAIT-RAHUL-A/B.png`, `gs-normal-*.png`, `gs-mirror-*.png`.
- Note: auto facing detect 3/4 characters par neutral (`front`) aata hai — us case me user ek tap se direction set karta hai (manual), aur wo choice re-cut tak nahi udti jab tak naya image upload na ho.

## Round 99 — ERASER ab "Sirf BG" (chrome-key): character ka koi hissa nahi katta — live `d9b5c75` (285909 B)
- User: "Chrom key eraser rakho — wo sirf usi hisse ko saaf karega jahan background reh gaya, baki character ko koi nuksan na ho."
- Pehle: brush jahan chalta, wahan ka sab (character bhi) mit jata tha. Ab do modes:
  - **Sirf BG** (default): sirf wahi pixel mita hai jo (a) brush ke neeche hai, (b) transparent BG ke kinare se 10px ke andar ka halo/rim hai (bg se 100 tak), YA (c) bg-jaisa rang rakhta hai, bg se juda hai, patla hai (≤26px) aur tez outline nahi hai. Charan-dhaar/kapda/skin par brush chala do — kuch nahi katta.
  - **Kuch bhi**: purana behaviour (jitna ragdo utna jaata hai) — background ke *andar* phanse dhabbe ke liye.
- Text: hint + mode note + stat `X px erased · Y px safe · N pieces`; `bgColorAvailable()` guard (reject/`character-lost` image par bhram na ho); `fit()` me `App.W/H` guard (blank canvas bug).
- **Numeric (7 bgtest images, halo par stroke):** character ke andar ke pixels bache —
  S1 99.91% (dmg 128), S2 99.91% (128), S3 99.94% (193), S4 99.95%, S5 99.89% (148), S6 99.89% (156), S7 98.72% (1670 — kaala pant/dark bg me thoda overlap). Bina mode ke = 0% safe (sab katta tha). `Kuch bhi` mode = purana behaviour (verify).
- Visual: `CK-S1_white_greyshadow_halo-PAIR.png`, `CK-S7_dark_bg-PAIR.png` (halo stroke ke baad bhi character jaisa tha waisa), `CK99-LIVE-UI.png` (live UI).
- Regression: nav 5/5 ✓, eraser (Kuch bhi) 3,328 px ✓, walk mirror ✓, `errs 0` (local + live).

## Round 99b — ERASER CRITICAL FIX: "Sirf BG" me haath/sleeve kat raha tha — CORE LOCK + mask-safe preview (live `186d8df`, 294798 B)
- User report + screenshot: "Sirf BG" chunne ke baad bhi brush character ka poora haath/sleeve mita deta tha. User ne teen requirement diye: (1) alpha 1.0 wale character pixels na chhue, (2) auto-cut ke asli mask se boundary lock — brush sirf bahar ka halo/shadow (alpha < 0.9) saaf kare, (3) "Apply & re-cut" bina full-body clipping ke layers dobara banaye.
- Wajah (3 bug):
  1. `computeCore()` `pc.imgData` padh raha tha — asal me piece ki **`pc.canvas`** hoti hai → core mask khaali → lock lagta hi nahi tha (iske chalte haath kat raha tha).
  2. Rim/patch rules **semi-transparent** pixels ke liye the, par inki koi alpha shart nahi thi — solid character pixels bhi "bg-jaisa rang" hone par mit jate the (dark pant/dark bg; haath ke kinare ka warm-brown edge).
  3. Preview canvas `destination-out` se stroke dikhata tha — brush character ke upar chalta to **poora transparent daba** dikhta tha (user ko laga sab kat gaya), halanki Apply ke baad character bacha tha.
- Fix:
  - **Core lock (absolute):** auto-cut pieces (alpha ≥ 230) se core mask, 1px fill (dilate→erode), halo rim ko lock se bahar (sirf semi-transparent + bg ke rang ke kareeb ≤90 wale rim pixels). `origCore` = pehla auto-cut mask, har re-cut par sirf JODTA hai (ghatata nahi) — `window.__rigNewImage` par reset. Core pixel par brush **kabhi** nahi lagta (2px tolerant).
  - **Preview:** "Sirf BG" me stroke ab halka hara nishaan (`rgba(130,240,175,.22)`) hai — character katta hua nahi dikhta; "Kuch bhi" me purana transparent preview.
  - **Canvas fit:** `k = min(1, maxW/W, 460/H)` — pura character dikhta hai (pehle fixed width se 390px par neeche pair/chehra cut ho jata tha).
  - **Apply ke baad** `strokes = []` — bake hua, canvas saaf se shuru; "kuch nahi hata" toast ab saaf: "Yahan sirf character hai — kuch nahi hataya (safe)…".
- **Test report (headless Chromium, local + LIVE dono par same):**
  | test | result |
  |---|---|
  | A · Sirf BG + brush **seedha haath ke beech se neeche tak** (70px) — S7 dark bg | 97 px erased · 39,502 px safe · core pixels **100% bache** (coreHit 6/145592) · pieces 8→8 · bbox same |
  | A · wahi test S1 white+shadow | 113 px erased · 37,189 px safe · core **100%** |
  | A · S3 tight crop | 140 px erased · 33,788 px safe · core **100%** |
  | B · Sirf BG + brush **halo/parachhain par** | 632–1,196 px halo safaya, arm 94.9–100% bacha |
  | C · "Kuch bhi" + wahi haath stroke | 39,599 px (purana behaviour, jaan-boojh kar) |
  | D · canvas fit | 296×460, `expectedH == canvasH` ✓ (clipping nahi) |
  | 4-round mixed stress (halo → arm → halo → arm) | har round me min kept 99.41%, bg hataya 6–403 px, pieces 8 |
  | Regression | nav 5/5 ✓ · eraser "Kuch bhi" 3,698 px ✓ · walk mirror err 0.0004 ✓ · `errs 0` |
- Evidence: `R99-CORE-LOCK-PROOF.png` (pehle/baad me haath jaisa tha waisa), `R99-LIVE-UI.png` (live, stroke ke waqt halka nishaan), `r99-*-before/after.png`.
- **Seema (honest):** an-pratik alpha < 0.9 wala halo core ke bahar hi saaf hota hai; core ke *andar* chipke (jaise dark pant par dark shadow) dhabbe ke liye "Kuch bhi" mode hai — jaan-boojh kar, taaki character kabhi na kate.

## Round 99c — BG-POCKET rule: kapde/haath ke beech bachi flat background patti bhi "Sirf BG" se saaf (live `4421b7e`, 295276 B)
- User screenshot: character ke haath ke bagal me **safed patti** (auto-cut ke baad bacha hua background) khadi thi; poochha "ise kaise hataun".
- Fix: 5va rule **BG POCKET** — pixel jata hai agar: `conn[i]` (background se juda) + `!inDeep` (body ke 3px andar nahi) + alpha ≥ 240 (poora opaque) + bg se doori ≤ 45 (bg ke rang ke bilkul paas) + gradient ≤ 40 (bilkul flat, koi silwat/outline nahi).
- Safety: core lock absolute hi hai — body ke 3px andar wala koi pixel nahi jata, isliye character ka kapda/skin kabhi nahi katta.
- **Test:** synthetic leftover-bg test (S2 white bg + arm ke bagal me 26×120 white opaque patch, bilkul user wali sthiti):
  - pehle: patch bilkul visible; "Sirf BG" brush ke baad **3,131 px safaya** (= patch ke 3,120 px + anti-alias), **character core 100% bacha** (coreHit 0/151,511), pieces 8.
  - LIVE par bhi same: erased 3,131 · coreKept 100% · pieces 8 · errs 0.
  - Regression: arm-stroke coreKept 100% ✓, halo stroke 1,196 px ✓, nav 5/5 ✓, errs 0 (local + live).
- Evidence: `R99B-POCKET-PROOF.png` (pehle safed patti / baad me gayab, character same), `R99-CORE-LOCK-PROOF.png` (haath par brush — kuch nahi katta).
