/* ============================================================================
   Action Studio — puppet → real (procedural skeletal) animation
   ----------------------------------------------------------------------------
   • upload: transparent PNG ya green-screen image
   • analyze: alpha silhouette → joints (neck, shoulders, elbows, hands, hips,
     knees, feet) — user drag se correct kar sakta hai
   • animate: 2-bone limb chains, segmented strip warp — har frame par naye
     pixels bante hain (static image nahi)
   • export: WebM (alpha), MP4 (alpha nahi), PNG frame sequence (zip)
   • save: IndexedDB me action ke naam se + editor handoff
   NOTE: yeh procedural motion hai (skeletal + warp), AI video-generation nahi.
   ========================================================================== */
(function () {
  'use strict';

  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const D2R = Math.PI / 180;

  const CW = 540, CH = 720;                 // render surface
  const GROUND = CH - 24;                   // feet line

  /* action → motion preset + default duration (seconds) */
  const ACTIONS = [
    { id: 'idle',     name: 'Idle',     dur: 2.4 },
    { id: 'walk',     name: 'Walk',     dur: 1.0 },
    { id: 'run',      name: 'Run',      dur: 0.66 },
    { id: 'talking',  name: 'Talking',  dur: 2.0 },
    { id: 'sitting',  name: 'Sitting',  dur: 3.0 },
    { id: 'dancing',  name: 'Dancing',  dur: 1.2 },
    { id: 'jumping',  name: 'Jumping',  dur: 1.3 },
    { id: 'waving',   name: 'Waving',   dur: 1.6 }
  ];

  const S = {                                // app state
    clean: null,          // normalized transparent canvas
    src: null,            // processed (keyed) canvas
    skel: null,           // joints in clean-canvas space
    rig: null,            // prepared parts
    action: 'idle',
    playing: false,
    t: 0,
    speed: 1,
    fps: 30,
    groundOff: 0,
    skelEdit: false,
    dragging: null,
    info: {},
    charName: 'My character'
  };

  /* ───────────────────────── helpers ───────────────────────── */
  const out = $('out'), octx = out.getContext('2d');
  const skelCv = $('skel'), sctx = skelCv.getContext('2d');

  function toast(msg, ms) {
    const t = $('toast'); t.textContent = msg; t.classList.add('show');
    clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }
  function setStatus(kind, title, pct) {
    $('stDot').className = 'dot ' + kind;
    $('stTitle').textContent = title;
    $('stPct').textContent = pct == null ? '' : pct + '%';
    $('stBar').style.width = (pct == null ? 0 : pct) + '%';
  }
  function logLine(label, val, cls) {
    const ul = $('log');
    const li = document.createElement('li');
    li.innerHTML = '<b>' + label + '</b><span class="' + (cls || '') + '">' + val + '</span>';
    ul.appendChild(li); ul.scrollTop = ul.scrollHeight;
    while (ul.children.length > 40) ul.removeChild(ul.firstChild);
  }
  function mkCanvas(w, h) { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; }

  /* ───────────────────────── 1. image prep ───────────────────────── */
  function loadImg(file) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(file);
      const im = new Image();
      im.onload = () => { URL.revokeObjectURL(url); res(im); };
      im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('image load fail')); };
      im.src = url;
    });
  }

  /* background hatao: pehle alpha check, phir green key, phir border flood-fill */
  function prepImage(img) {
    const maxSide = 900;
    const k = Math.min(1, maxSide / Math.max(img.naturalWidth, img.naturalHeight));
    const w = Math.round(img.naturalWidth * k), h = Math.round(img.naturalHeight * k);
    const c = mkCanvas(w, h), x = c.getContext('2d', { willReadFrequently: true });
    x.drawImage(img, 0, 0, w, h);
    const id = x.getImageData(0, 0, w, h), d = id.data;

    /* kitne pixel already transparent hain */
    let transparent = 0;
    for (let i = 3; i < d.length; i += 4) if (d[i] < 12) transparent++;
    const alphaFrac = transparent / (w * h);

    const report = { w, h, alphaFrac: +alphaFrac.toFixed(3), mode: 'none', removed: 0, green: false };

    if (alphaFrac > 0.04) { report.mode = 'already-transparent'; return { canvas: c, report }; }

    /* border se background colour estimate */
    const border = [];
    const push = (px, py) => { const i = (py * w + px) * 4; border.push([d[i], d[i + 1], d[i + 2]]); };
    for (let X = 0; X < w; X += Math.max(1, (w / 48) | 0)) { push(X, 0); push(X, h - 1); }
    for (let Y = 0; Y < h; Y += Math.max(1, (h / 48) | 0)) { push(0, Y); push(w - 1, Y); }
    const avg = border.reduce((a, p) => [a[0] + p[0], a[1] + p[1], a[2] + p[2]], [0, 0, 0])
      .map(v => Math.round(v / border.length));
    const isGreen = avg[1] > avg[0] + 22 && avg[1] > avg[2] + 22;
    report.green = isGreen;
    report.bg = avg;

    let removed = 0;
    if (isGreen) {
      /* chroma key + despill */
      const t1 = 70, t2 = 104;
      for (let i = 0; i < d.length; i += 4) {
        const r = d[i], g = d[i + 1], b = d[i + 2];
        if (g <= r + 12 || g <= b + 12) continue;
        const dist = Math.abs(r - avg[0]) + Math.abs(g - avg[1]) + Math.abs(b - avg[2]);
        if (dist <= t1) { d[i + 3] = 0; removed++; }
        else if (dist < t2) { d[i + 3] = Math.round(d[i + 3] * (dist - t1) / (t2 - t1)); d[i + 1] = Math.round((r + b) / 2); }
        else if (g > r + 40 && g > b + 40) { d[i + 1] = Math.round((r + b) / 2); }   /* spill */
      }
      report.mode = 'green-key';
    } else {
      /* solid bg → edge flood fill (tolerance) */
      const tol = 46 * 46;
      const seen = new Uint8Array(w * h), q = [];
      const near = (i) => {
        const dr = d[i] - avg[0], dg = d[i + 1] - avg[1], db = d[i + 2] - avg[2];
        return dr * dr + dg * dg + db * db < tol;
      };
      for (let X = 0; X < w; X++) { q.push([X, 0], [X, h - 1]); }
      for (let Y = 0; Y < h; Y++) { q.push([0, Y], [w - 1, Y]); }
      while (q.length) {
        const [px, py] = q.pop();
        if (px < 0 || py < 0 || px >= w || py >= h) continue;
        const p = py * w + px;
        if (seen[p]) continue; seen[p] = 1;
        const i = p * 4;
        if (!near(i)) continue;
        d[i + 3] = 0; removed++;
        q.push([px + 1, py], [px - 1, py], [px, py + 1], [px, py - 1]);
      }
      report.mode = 'flood-fill';
    }
    report.removed = removed;
    x.putImageData(id, 0, 0);
    if (removed < (w * h) * 0.02) report.warn = 'background shayad nahi hata (bahut kam pixel hate)';
    return { canvas: c, report };
  }

  /* trim + scale + feet ko ground par lock */
  function normalizeCanvas(src) {
    const x = src.getContext('2d', { willReadFrequently: true });
    const id = x.getImageData(0, 0, src.width, src.height), d = id.data;
    let minX = 1e9, minY = 1e9, maxX = -1, maxY = -1;
    for (let py = 0; py < src.height; py++) {
      for (let px = 0; px < src.width; px++) {
        if (d[(py * src.width + px) * 4 + 3] > 24) {
          if (px < minX) minX = px; if (px > maxX) maxX = px;
          if (py < minY) minY = py; if (py > maxY) maxY = py;
        }
      }
    }
    if (maxX < 0) return null;
    const bw = maxX - minX + 1, bh = maxY - minY + 1;
    const targetH = Math.min(CH * 0.86, 640);
    const k = targetH / bh;
    const cw = Math.max(60, Math.round(bw * k)), chh = Math.round(bh * k);
    const c = mkCanvas(CW, CH), cx = c.getContext('2d');
    cx.imageSmoothingQuality = 'high';
    const dx = Math.round((CW - cw) / 2), dy = Math.round(GROUND - chh);
    cx.drawImage(src, minX, minY, bw, bh, dx, dy, cw, chh);
    return { canvas: c, box: { x: dx, y: dy, w: cw, h: chh }, scale: k, srcBox: { x: minX, y: minY, w: bw, h: bh } };
  }

  /* ───────────────────────── 2. skeleton analysis ───────────────────────── */
  function analyze(canvas, box) {
    const x = canvas.getContext('2d', { willReadFrequently: true });
    const id = x.getImageData(0, 0, canvas.width, canvas.height), d = id.data;
    const W = canvas.width, H = canvas.height;
    const A = (px, py) => d[((py | 0) * W + (px | 0)) * 4 + 3];

    /* per-row silhouette extents */
    const rows = [];
    for (let py = 0; py < H; py++) {
      let lo = -1, hi = -1, n = 0;
      for (let px = 0; px < W; px++) if (A(px, py) > 24) { if (lo < 0) lo = px; hi = px; n++; }
      rows.push(n > 3 ? { y: py, lo, hi, w: hi - lo + 1, n } : null);
    }
    const filled = rows.filter(Boolean);
    if (filled.length < 20) return { error: 'silhouette bahut chhoti hai' };
    const yTop = filled[0].y, yBot = filled[filled.length - 1].y;
    const Hc = yBot - yTop + 1;

    const wAt = (y) => { const r = rows[clamp(y | 0, 0, H - 1)]; return r ? r.w : 0; };
    const extAt = (y) => rows[clamp(y | 0, 0, H - 1)] || { lo: 0, hi: W - 1, w: 0 };

    /* smoothing */
    const smooth = (y, r) => { let s = 0, n = 0; for (let i = -r; i <= r; i++) { const v = wAt(y + i); if (v) { s += v; n++; } } return n ? s / n : 0; };

    /* neck = upper region me sabse patla row */
    let neckY = yTop + Hc * 0.22, neckW = 1e9;
    for (let y = yTop + Hc * 0.10; y < yTop + Hc * 0.36; y += 1) {
      const w = smooth(y, 3);
      if (w > 8 && w < neckW) { neckW = w; neckY = y; }
    }

    /* arms/chest band — R105 fix:
       Pehle yahan "sabse zyada width" wala row liya jata tha. Arms-down (A-pose) me
       sabse chauda hissa KURTA hota hai (chest ke neeche), isliye shoulder joint
       ~13% neeche baith jata tha aur walk par kurta beech se phool jata tha.
       Ab: neck ke baad PEHLA row jo max width ka 92% touch karta hai = shoulder line. */
    let shW = 0;
    for (let y = neckY + 2; y < neckY + Hc * 0.22; y += 1) {
      const w = smooth(y, 2);
      if (w > shW) shW = w;
    }
    let shY = neckY + Hc * 0.06;
    for (let y = neckY + 2; y < neckY + Hc * 0.22; y += 1) {
      if (smooth(y, 2) >= shW * 0.92) { shY = y; break; }
    }
    const shExt = extAt(shY);
    const cx = Math.round((shExt.lo + shExt.hi) / 2);

    /* torso width estimate (hips ke paas) */
    const torsoW = Math.max(neckW, aWidth());
    function aWidth() { const e = extAt(yTop + Hc * 0.62); return Math.round(e.w * 0.72); }

    /* T-pose ya arms-down: shoulder row se bahar kitna faila hua hai */
    const armSpan = Math.max(shExt.lo > 0 ? cx - shExt.lo : 0, shExt.hi > cx ? shExt.hi - cx : 0);
    const tPose = armSpan > torsoW * 0.95;

    /* shoulder joints */
    const halfT = Math.max(10, torsoW * 0.42);
    const shL = { x: cx - halfT, y: shY }, shR = { x: cx + halfT, y: shY };

    /* hands: shoulder band ke andar (tPose) ya neeche (arms down) */
    function findHand(side) {
      const dir = side === 'L' ? -1 : 1;
      if (tPose) {
        let best = side === 'L' ? shExt.lo : shExt.hi;
        /* band ke andar sabse door alpha pixel */
        let bx = cx, by = shY, bestDist = 0;
        for (let y = shY - Hc * 0.10; y <= shY + Hc * 0.10; y += 1) {
          const r = rows[clamp(y | 0, 0, H - 1)]; if (!r) continue;
          const px = dir < 0 ? r.lo : r.hi;
          const dist = Math.abs(px - cx);
          if (dist > bestDist) { bestDist = dist; bx = px; by = y; }
        }
        return { x: best || bx, y: by };
      }
      /* arms down: shoulder se neeche, side edge ko follow karo */
      let bx = cx + dir * halfT, by = shY, bestDist = 0;
      for (let y = shY; y < yTop + Hc * 0.82; y += 1) {
        const r = rows[clamp(y, 0, H - 1)]; if (!r) continue;
        const px = dir < 0 ? r.lo : r.hi;
        const dist = Math.abs(px - cx) + Math.abs(y - shY) * 0.35;
        if (Math.abs(px - cx) > halfT * 1.25 && dist > bestDist) { bestDist = dist; bx = px; by = y; }
      }
      return { x: bx, y: by };
    }
    const handL = findHand('L'), handR = findHand('R');

    /* crotch = legs ke beech pehla transparent gap (hips ke neeche) */
    let crotchY = yTop + Hc * 0.62;
    for (let y = Math.round(yTop + Hc * 0.45); y < yTop + Hc * 0.85; y++) {
      const r = rows[y]; if (!r) continue;
      /* middle me gap? */
      let gap = 0, run = 0, best = 0, at = -1;
      for (let px = r.lo + 4; px < r.hi - 4; px++) {
        if (A(px, y) <= 24) { run++; if (run > best) { best = run; at = px; } }
        else run = 0;
      }
      if (best > Math.max(4, r.w * 0.05)) { gap = best; crotchY = y; break; }
    }
    const hipY = Math.max(shY + Hc * 0.12, crotchY - Hc * 0.02);
    const hipHalf = Math.max(8, torsoW * 0.30);
    const hipL = { x: cx - hipHalf, y: hipY }, hipR = { x: cx + hipHalf, y: hipY };

    /* knees + feet */
    function legPoint(hip, fracY) {
      const y = Math.round(hip.y + (yBot - hip.y) * fracY);
      const r = rows[clamp(y, 0, H - 1)];
      if (!r) return { x: hip.x, y };
      /* side: hip cx side */
      const isL = hip.x < cx;
      let lo = isL ? r.lo : cx, hi = isL ? cx : r.hi;
      let s = 0, n = 0;
      for (let px = lo; px <= hi; px++) if (A(px, y) > 24) { s += px; n++; }
      return { x: n ? Math.round(s / n) : hip.x, y };
    }
    const kneeL = legPoint(hipL, 0.48), kneeR = legPoint(hipR, 0.48);
    const footL = { x: legPoint(hipL, 0.99).x, y: yBot };
    const footR = { x: legPoint(hipR, 0.99).x, y: yBot };

    const elbowL = { x: Math.round((shL.x + handL.x) / 2), y: Math.round((shL.y + handL.y) / 2) };
    const elbowR = { x: Math.round((shR.x + handR.x) / 2), y: Math.round((shR.y + handR.y) / 2) };

    /* quality check */
    const warn = [];
    if (armSpan < 12) warn.push('arms detect nahi hue');
    if (crotchY >= yBot - 10) warn.push('pair (legs) alag nahi dikhe');
    if (Hc < 120) warn.push('character bahut chhota');

    return {
      yTop, yBot, Hc, cx, neckY, neckW: Math.round(neckW), shY, torsoW: Math.round(torsoW),
      tPose, armSpan: Math.round(armSpan),
      neck: { x: cx, y: Math.round(neckY) },
      headTop: yTop,
      shoulderL: shL, shoulderR: shR, elbowL, elbowR, handL, handR,
      hipC: { x: cx, y: hipY }, hipL, hipR, kneeL, kneeR, footL, footR,
      warn
    };
  }

  /* ───────────────────────── 3. rig = deformable mesh ─────────────────────────
     Flat image ko ek grid mesh me baantte hain; har vertex ko bones ka weight
     milta hai (linear blend skinning). Isse seams nahi aate, pixels original
     image se hi aate hain → chehra/kapde/rang bilkul same.                     */
  const RIG = { mesh: null, bones: null };

  function segDist(px, py, a, b) {
    const vx = b.x - a.x, vy = b.y - a.y;
    const wx = px - a.x, wy = py - a.y;
    const L2 = vx * vx + vy * vy || 1;
    let t = (wx * vx + wy * vy) / L2;
    t = clamp(t, 0, 1);
    const dx = px - (a.x + vx * t), dy = py - (a.y + vy * t);
    return Math.hypot(dx, dy);
  }

  function alphaBBox(cv) {
    const c = cv.getContext('2d', { willReadFrequently: true });
    const d = c.getImageData(0, 0, cv.width, cv.height).data;
    let x0 = 1e9, y0 = 1e9, x1 = -1, y1 = -1;
    for (let y = 0; y < cv.height; y++) for (let x = 0; x < cv.width; x++) {
      if (d[(y * cv.width + x) * 4 + 3] > 24) {
        if (x < x0) x0 = x; if (x > x1) x1 = x;
        if (y < y0) y0 = y; if (y > y1) y1 = y;
      }
    }
    if (x1 < 0) return { x: 0, y: 0, w: cv.width, h: cv.height };
    return { x: x0, y: y0, w: x1 - x0 + 1, h: y1 - y0 + 1 };
  }

  function buildRig(clean, sk) {
    /* mesh grid — poore character ka alpha bbox (arms bhi andar aayein) */
    const ab = alphaBBox(clean);
    const bx = Math.max(0, ab.x - 4);
    const bw = Math.min(clean.width - bx, ab.w + 8);
    const by = Math.max(0, ab.y - 4);
    const bh = Math.min(clean.height - by, ab.h + 8);
    const targetQuads = 640;
    const ar = bw / bh;
    let cols = Math.round(Math.sqrt(targetQuads * ar)), rows = Math.round(targetQuads / Math.max(1, cols));
    cols = clamp(cols, 6, 26); rows = clamp(rows, 8, 32);
    const cw = bw / cols, ch = bh / rows;
    const verts = [];
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        verts.push({ x: bx + c * cw, y: by + r * ch });
      }
    }

    /* bone segments (rest pose) */
    const bones = [
      { id: 'head',  seg: [sk.neck, { x: sk.cx, y: sk.yTop }], kind: 'head' },
      { id: 'torso', seg: [sk.hipC, sk.neck], kind: 'torso' },
      { id: 'armUL', seg: [sk.shoulderL, sk.elbowL], kind: 'arm', side: 'L', part: 0 },
      { id: 'armLL', seg: [sk.elbowL, sk.handL], kind: 'arm', side: 'L', part: 1 },
      { id: 'armUR', seg: [sk.shoulderR, sk.elbowR], kind: 'arm', side: 'R', part: 0 },
      { id: 'armLR', seg: [sk.elbowR, sk.handR], kind: 'arm', side: 'R', part: 1 },
      { id: 'legUL', seg: [sk.hipL, sk.kneeL], kind: 'leg', side: 'L', part: 0 },
      { id: 'legLL', seg: [sk.kneeL, sk.footL], kind: 'leg', side: 'L', part: 1 },
      { id: 'legUR', seg: [sk.hipR, sk.kneeR], kind: 'leg', side: 'R', part: 0 },
      { id: 'legLR', seg: [sk.kneeR, sk.footR], kind: 'leg', side: 'R', part: 1 }
    ];

    /* vertex weights (gaussian distance to bones) */
    const SIG = Math.max(12, Math.min(30, sk.torsoW * 0.26));
    const shTop = sk.shY - sk.Hc * 0.015;         /* shoulders ke upar arm ka asar nahi */
    const hipTop = sk.hipC.y - sk.Hc * 0.06;      /* hips ke upar leg ka asar nahi */
    const neckBot = sk.neckY + sk.Hc * 0.05;      /* neck ke neeche head ka asar nahi */
    verts.forEach(v => {
      let sum = 0; const w = [];
      for (const b of bones) {
        const d = segDist(v.x, v.y, b.seg[0], b.seg[1]);
        let val = Math.exp(-(d * d) / (2 * SIG * SIG));
        /* smooth ramps — hard cutoff se image stretch hoti thi */
        const ramp = (y, y0, y1) => clamp((y - y0) / (y1 - y0), 0, 1);
        if (b.kind === 'arm') val *= ramp(v.y, shTop - sk.Hc * 0.14, shTop + sk.Hc * 0.05);
        if (b.kind === 'leg') val *= ramp(v.y, hipTop - sk.Hc * 0.07, hipTop + sk.Hc * 0.03);
        if (b.kind === 'head') val *= 1 - ramp(v.y, neckBot - sk.Hc * 0.04, neckBot + sk.Hc * 0.06);
        if (b.kind === 'torso' && v.y < sk.yTop + 4) val *= 0.15;
        w.push(val); sum += val;
      }
      if (sum < 1e-6) {                      /* door ka vertex — nearest bone */
        let bi = 0, bd = 1e9;
        bones.forEach((b, i) => { const d = segDist(v.x, v.y, b.seg[0], b.seg[1]); if (d < bd) { bd = d; bi = i; } });
        w.fill(0); w[bi] = 1; sum = 1;
      }
      v.w = w.map(x => x / sum);
      v.rest = { x: v.x, y: v.y };
    });

    /* quads → triangles (+ z-layer: legs → arms → torso → head) */
    const LAYER = { head: 3, torso: 2, arm: 1, leg: 0 };
    const domLayer = verts.map(v => {
      let bi = 0, bv = -1;
      v.w.forEach((w, i) => { if (w > bv) { bv = w; bi = i; } });
      return LAYER[bones[bi].kind];
    });
    const tris = [], triLayer = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const i0 = r * (cols + 1) + c, i1 = i0 + 1, i2 = i0 + cols + 1, i3 = i2 + 1;
        const a = [i0, i1, i3], b = [i0, i3, i2];
        tris.push(a, b);
        triLayer.push(Math.max(domLayer[i0], domLayer[i1], domLayer[i3]), Math.max(domLayer[i0], domLayer[i3], domLayer[i2]));
      }
    }
    /* arms ko natural "neeche latak" rest pose me laane ke liye base deltas */
    const norm = (a) => { while (a > Math.PI) a -= 2 * Math.PI; while (a < -Math.PI) a += 2 * Math.PI; return a; };
    const restL = Math.atan2(sk.elbowL.y - sk.shoulderL.y, sk.elbowL.x - sk.shoulderL.x);
    const restR = Math.atan2(sk.elbowR.y - sk.shoulderR.y, sk.elbowR.x - sk.shoulderR.x);
    /* T/A-pose arm ko ~30° neeche-bahar laao (kapde ke bahar dikhe, natural lage).
       Pehle se neeche latak rahi ho to kuch nahi badalte. */
    const armBase = (rest, side) => {
      const fromDown = Math.abs(norm(rest - Math.PI / 2));
      if (fromDown < 50 * D2R) return 0;
      const target = side === 'R' ? (Math.PI / 2 - 46 * D2R) : (Math.PI / 2 + 46 * D2R);
      return norm(target - rest);
    };
    const baseArmL = armBase(restL, 'L');
    const baseArmR = armBase(restR, 'R');
    return { clean, sk, cols, rows, verts, tris, triLayer, bones, baseArmL, baseArmR };
  }

  /* ───────────────────────── 4. drawing (skinned mesh) ───────────────────────── */
  const imgCache = { clean: null };
  const TW = (a) => Math.tan(a || 0) * 0;       /* noop keep */
  function rotP(p, piv, ang) {
    if (!ang) return { x: p.x, y: p.y };
    const s = Math.sin(ang), c = Math.cos(ang);
    const dx = p.x - piv.x, dy = p.y - piv.y;
    return { x: piv.x + dx * c - dy * s, y: piv.y + dx * s + dy * c };
  }
  function addP(p, dx, dy) { return { x: p.x + dx, y: p.y + dy }; }

  /* pose → bone transforms (functions of rest point) */
  function boneTransforms(rig, pose) {
    const sk = rig.sk;
    const t = {};
    const rootDx = pose.rootX || 0, rootDy = pose.rootY || 0;
    const torsoRot = (pose.torsoRot || 0) * D2R;
    const headRot = (pose.headRot || 0) * D2R;

    t.root = (p) => addP(p, rootDx, rootDy);
    t.torso = (p) => t.root(rotP(p, sk.hipC, torsoRot));
    t.head = (p) => rotP(t.torso(p), t.torso(sk.neck), headRot + (pose.headLean || 0) * D2R);

    ['L', 'R'].forEach(side => {
      const sh = side === 'L' ? sk.shoulderL : sk.shoulderR;
      const el = side === 'L' ? sk.elbowL : sk.elbowR;
      const base = side === 'L' ? rig.baseArmL : rig.baseArmR;
      const a = pose['arm' + side] || [0, 0];
      const a1 = base + a[0], a2 = a[1];
      const up = (p) => rotP(t.torso(p), t.torso(sh), a1);
      const elW = up(el);
      t['armU' + side] = up;
      t['armL' + side] = (p) => rotP(up(p), elW, a2);

      const hip = side === 'L' ? sk.hipL : sk.hipR;
      const kn = side === 'L' ? sk.kneeL : sk.kneeR;
      const lg = pose['leg' + side] || [0, 0];
      const lu = (p) => rotP(t.root(p), t.root(hip), lg[0]);
      const knW = lu(kn);
      t['legU' + side] = lu;
      t['legL' + side] = (p) => rotP(lu(p), knW, lg[1]);
    });
    return t;
  }

  const BONE_T = { head: 'head', torso: 'torso', armUL: 'armUL', armLL: 'armLL', armUR: 'armUR', armLR: 'armLR',
                   legUL: 'legU L', legLL: 'legL L', legUR: 'legU R', legLR: 'legL R' };

  function skin(rig, pose) {
    const T = boneTransforms(rig, pose);
    const fns = [T.head, T.torso, T.armUL, T.armLL, T.armUR, T.armLR, T.legUL, T.legLL, T.legUR, T.legLR];
    return rig.verts.map(v => {
      let x = 0, y = 0;
      for (let i = 0; i < 10; i++) {
        const w = v.w[i]; if (w < 1e-4) continue;
        const p = fns[i](v.rest);
        x += p.x * w; y += p.y * w;
      }
      return { x, y };
    });
  }

  /* textured triangle draw: src tri → dst tri affine */
  function drawTri(ctx, src, s0, s1, s2, d0, d1, d2, padPx) {
    /* dest triangle ko thoda inflate karo — hairline seams band */
    const ex = 0.7 + (padPx || 0);
    const gx = (d0.x + d1.x + d2.x) / 3, gy = (d0.y + d1.y + d2.y) / 3;
    const inf = (p) => {
      const vx = p.x - gx, vy = p.y - gy, L = Math.hypot(vx, vy) || 1;
      return { x: p.x + (vx / L) * ex, y: p.y + (vy / L) * ex };
    };
    const D0 = inf(d0), D1 = inf(d1), D2 = inf(d2);

    /* affine: src→dst */
    const x0 = s0.x, y0 = s0.y, x1 = s1.x, y1 = s1.y, x2 = s2.x, y2 = s2.y;
    const den = (x1 - x0) * (y2 - y0) - (x2 - x0) * (y1 - y0);
    if (Math.abs(den) < 1e-6) return;
    const a = ((D1.x - D0.x) * (y2 - y0) - (D2.x - D0.x) * (y1 - y0)) / den;
    const b = ((D2.x - D0.x) * (x1 - x0) - (D1.x - D0.x) * (x2 - x0)) / den;
    const c = ((D1.y - D0.y) * (y2 - y0) - (D2.y - D0.y) * (y1 - y0)) / den;
    const d = ((D2.y - D0.y) * (x1 - x0) - (D1.y - D0.y) * (x2 - x0)) / den;
    const e = D0.x - a * x0 - b * y0;
    const f = D0.y - c * x0 - d * y0;

    ctx.save();
    ctx.beginPath();
    ctx.moveTo(D0.x, D0.y); ctx.lineTo(D1.x, D1.y); ctx.lineTo(D2.x, D2.y); ctx.closePath();
    ctx.clip();
    ctx.transform(a, c, b, d, e, f);
    /* sirf triangle ka source bbox draw karo (fast) */
    const sx = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 1);
    const sy = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 1);
    const sw = Math.min(src.width - sx, Math.ceil(Math.max(x0, x1, x2) - sx) + 2);
    const sh = Math.min(src.height - sy, Math.ceil(Math.max(y0, y1, y2) - sy) + 2);
    if (sw > 0 && sh > 0) ctx.drawImage(src, sx, sy, sw, sh, sx, sy, sw, sh);
    ctx.restore();
  }

  function drawPose(ctx, pose) {
    const rig = S.rig; if (!rig) return;
    const sk = rig.sk;
    ctx.clearRect(0, 0, CW, CH);

    /* ground shadow */
    const shadowW = sk.torsoW * (pose.shadowScale || 1.0);
    const g = ctx.createRadialGradient(sk.cx, GROUND + 4, 2, sk.cx, GROUND + 4, shadowW * 0.9);
    g.addColorStop(0, 'rgba(0,0,0,.30)'); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(sk.cx, GROUND + 4, shadowW * 0.85, shadowW * 0.16, 0, 0, 6.2832); ctx.fill();

    const P = skin(rig, pose);
    const tris = rig.tris, verts = rig.verts, src = rig.clean, TL = rig.triLayer;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    for (let layer = 0; layer <= 3; layer++) {
      for (let i = 0; i < tris.length; i++) {
        if (TL[i] !== layer) continue;
        const [i0, i1, i2] = tris[i];
        drawTri(ctx, src, verts[i0].rest, verts[i1].rest, verts[i2].rest, P[i0], P[i1], P[i2]);
      }
    }
  }

  /* ───────────────────────── 5. motion presets ───────────────────────── */
  /* har preset: (t in 0..1 cycle, S) → pose */
  const SIN = Math.sin, PI = Math.PI;
  const MOTION = {
    idle(t) {
      const a = t * 2 * PI;
      const breath = SIN(a);
      return {
        armL: [(-6 - breath * 2) * D2R, (5 + breath * 2) * D2R],
        armR: [(6 + breath * 2) * D2R, (-5 - breath * 2) * D2R],
        legL: [0, 0], legR: [0, 0],
        torsoRot: breath * 0.7, torsoSquash: breath * 0.012,
        headRot: SIN(a + 0.6) * 1.6, headY: 0,
        rootY: breath * 1.6, rootX: SIN(a * 0.5) * 1.2,
        shadowScale: 1
      };
    },
    walk(t) {
      const a = t * 2 * PI;
      const sw = SIN(a), sw2 = SIN(a + PI);
      const bob = Math.abs(SIN(a * 2));
      /* R105 · dhoti/lungi wale character par bhi walk saaf dikhe:
         8° bahut kam tha (pair lagbhag sthir lagte the) — ab 13° swing,
         ghutna 18° tak, aur haath pair ke ULTE (sw vs sw2) jhoolte hain. */
      return {
        legL: [sw * 13 * D2R, clamp(-Math.max(0, SIN(a + 1.0)) * 18, -20, 0) * D2R],
        legR: [sw2 * 13 * D2R, clamp(-Math.max(0, SIN(a + 1.0 + PI)) * 18, -20, 0) * D2R],
        armL: [sw2 * 15 * D2R, 8 * D2R],
        armR: [sw * 15 * D2R, 8 * D2R],
        torsoRot: sw * 1.2, torsoSquash: -0.008 * bob,
        headRot: -sw * 0.8, headY: bob * 1.2,
        rootY: -bob * 5, rootX: 0, shadowScale: 1 + bob * 0.05
      };
    },
    run(t) {
      const a = t * 2 * PI;
      const sw = SIN(a), sw2 = SIN(a + PI);
      const bob = Math.abs(SIN(a * 2));
      return {
        legL: [sw * 13 * D2R, clamp(-Math.max(0, SIN(a + 0.8)) * 26, -28, 0) * D2R],
        legR: [sw2 * 13 * D2R, clamp(-Math.max(0, SIN(a + 0.8 + PI)) * 26, -28, 0) * D2R],
        armL: [sw * 34 * D2R, (55 + sw * 12) * D2R],
        armR: [sw2 * 34 * D2R, (55 + sw2 * 12) * D2R],
        torsoRot: sw * 2.4, torsoSquash: -0.02 * bob,
        headRot: -sw * 1.4, headY: bob * 2,
        rootY: -bob * 10 - 6, rootX: sw * 3, shadowScale: 1 + bob * 0.1
      };
    },
    talking(t) {
      const a = t * 2 * PI;
      const nod = SIN(a * 2.0), gest = SIN(a);
      return {
        armL: [(-4 - gest * 6) * D2R, (26 + gest * 16) * D2R],
        armR: [(4 + gest * 6) * D2R, (-26 - gest * 14) * D2R],
        legL: [0, 0], legR: [0, 0],
        torsoRot: gest * 1.2, torsoSquash: SIN(a * 3) * 0.006,
        headRot: nod * 2.6, headY: nod * 2.2,
        rootY: 0, rootX: 0, shadowScale: 1
      };
    },
    sitting(t) {
      const a = t * 2 * PI;
      const idle = SIN(a);
      return {
        /* baithne ke liye legs 90° — thighs aage, shins neeche */
        legL: [88 * D2R, -88 * D2R],
        legR: [88 * D2R, -88 * D2R],
        armL: [(-10 + idle * 2) * D2R, (46) * D2R],
        armR: [(10 - idle * 2) * D2R, (-46) * D2R],
        torsoRot: idle * 0.6, torsoSquash: idle * 0.01,
        headRot: SIN(a + 1) * 1.4, headY: 0,
        rootY: 0, rootX: 0, shadowScale: 1.1, sit: true
      };
    },
    dancing(t) {
      const a = t * 2 * PI;
      const s = SIN(a), c = Math.cos(a);
      return {
        legL: [(-6 + s * 12) * D2R, (10 + Math.max(0, s) * 26) * D2R],
        legR: [(-6 - s * 12) * D2R, (10 + Math.max(0, -s) * 26) * D2R],
        armL: [(-40 + c * 22) * D2R, (30 + s * 24) * D2R],
        armR: [(40 - c * 22) * D2R, (-30 - s * 24) * D2R],
        torsoRot: s * 5, torsoSquash: Math.abs(c) * 0.02,
        headRot: -s * 4, headY: -Math.abs(s) * 2,
        rootY: -Math.abs(s) * 6, rootX: s * 8, shadowScale: 1 + Math.abs(s) * 0.08
      };
    },
    jumping(t) {
      /* 0-0.18 crouch, 0.18-0.5 air, 0.5-0.75 land, 0.75-1 settle */
      let rootY = 0, legBend = 0, armSwing = 0, squash = 0;
      if (t < 0.18) { const k = t / 0.18; rootY = 12 * k; legBend = 26 * k; armSwing = 24 * k; squash = -0.03 * k; }
      else if (t < 0.5) { const k = (t - 0.18) / 0.32; rootY = 12 - 150 * SIN(k * PI * 0.9); legBend = 26 - 30 * k; armSwing = 24 + 60 * SIN(k * PI); squash = 0.02 * k; }
      else if (t < 0.75) { const k = (t - 0.5) / 0.25; rootY = -30 + 42 * k; legBend = -6 + 34 * k; armSwing = 84 - 70 * k; squash = -0.03 * k; }
      else { const k = (t - 0.75) / 0.25; rootY = 12 * (1 - k); legBend = 28 * (1 - k); armSwing = 14 * (1 - k); squash = -0.03 * (1 - k); }
      return {
        legL: [0, legBend * D2R], legR: [0, legBend * D2R],
        armL: [(-armSwing * 0.25) * D2R, (14 + armSwing * 0.5) * D2R],
        armR: [(armSwing * 0.25) * D2R, (-14 - armSwing * 0.5) * D2R],
        torsoRot: 0, torsoSquash: squash,
        headRot: 0, headY: -rootY * 0.04,
        rootY, rootX: 0, shadowScale: 1 - Math.min(0.5, Math.abs(rootY) / 300)
      };
    },
    waving(t) {
      const a = t * 2 * PI;
      const w = SIN(a * 2);
      return {
        armL: [(-4) * D2R, (6) * D2R],
        armR: [(150 + w * 10) * D2R, (-24 - w * 22) * D2R],
        legL: [0, 0], legR: [0, 0],
        torsoRot: w * 1.2, torsoSquash: 0,
        headRot: -w * 1.6, headY: 0,
        rootY: 0, rootX: 0, shadowScale: 1
      };
    }
  };

  function poseAt(actionId, tNorm) {
    const fn = MOTION[actionId] || MOTION.idle;
    const p = fn(((tNorm % 1) + 1) % 1);
    return p;
  }

  /* feet ground-lock: pose ke baad lowest foot ko GROUND par laao */
  function groundLock(pose) {
    const rig = S.rig; if (!rig) return pose;
    const sk = rig.sk;
    if (pose.sit) return pose;
    const tipY = (hip, knee, foot, ang) => {
      const kn = rotP(knee, hip, ang[0]);
      const ft = rotP(foot, kn, ang[1]);
      return ft.y;
    };
    const lowY = Math.max(
      tipY(sk.hipL, sk.kneeL, sk.footL, pose.legL || [0, 0]) + (pose.rootY || 0),
      tipY(sk.hipR, sk.kneeR, sk.footR, pose.legR || [0, 0]) + (pose.rootY || 0)
    );
    if (pose.rootY < -14) return pose;                 /* hawa me — lock nahi */
    const diff = (GROUND - S.groundOff) - lowY;
    if (Math.abs(diff) < 45) pose.rootY = (pose.rootY || 0) + diff;
    return pose;
  }

  /* ───────────────────────── 6. skeleton overlay ───────────────────────── */
  function drawSkeleton() {
    sctx.clearRect(0, 0, CW, CH);
    if (!S.skel) return;
    const k = S.skel;
    const L = (a, b, w, col) => {
      sctx.strokeStyle = col || 'rgba(120,220,255,.85)'; sctx.lineWidth = w || 2;
      sctx.beginPath(); sctx.moveTo(a.x, a.y); sctx.lineTo(b.x, b.y); sctx.stroke();
    };
    L(k.neck, k.shoulderL); L(k.neck, k.shoulderR);
    L(k.shoulderL, k.hipL); L(k.shoulderR, k.hipR); L(k.hipL, k.hipR);
    L(k.shoulderL, k.elbowL); L(k.elbowL, k.handL);
    L(k.shoulderR, k.elbowR); L(k.elbowR, k.handR);
    L(k.hipL, k.kneeL); L(k.kneeL, k.footL);
    L(k.hipR, k.kneeR); L(k.kneeR, k.footR);
    const J = (p, col) => {
      sctx.beginPath(); sctx.arc(p.x, p.y, 4.5, 0, 6.2832);
      sctx.fillStyle = col || 'rgba(255,255,255,.92)'; sctx.fill();
      sctx.lineWidth = 1.5; sctx.strokeStyle = 'rgba(0,0,0,.55)'; sctx.stroke();
    };
    [k.neck, k.shoulderL, k.shoulderR, k.elbowL, k.elbowR, k.handL, k.handR,
     k.hipL, k.hipR, k.kneeL, k.kneeR, k.footL, k.footR].forEach(p => J(p));
  }

  /* joint drag editing */
  const JOINTS = ['neck', 'shoulderL', 'shoulderR', 'elbowL', 'elbowR', 'handL', 'handR',
    'hipL', 'hipR', 'kneeL', 'kneeR', 'footL', 'footR'];
  function canvasPoint(ev) {
    const r = skelCv.getBoundingClientRect();
    const x = (ev.clientX - r.left) / r.width * CW;
    const y = (ev.clientY - r.top) / r.height * CH;
    return { x, y };
  }
  skelCv.addEventListener('pointerdown', (ev) => {
    if (!S.skelEdit || !S.skel) return;
    const p = canvasPoint(ev);
    let best = null, bd = 26;
    for (const j of JOINTS) {
      const q = S.skel[j]; if (!q) continue;
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bd) { bd = d; best = j; }
    }
    if (best) { S.dragging = best; skelCv.setPointerCapture(ev.pointerId); }
  });
  skelCv.addEventListener('pointermove', (ev) => {
    if (!S.dragging) return;
    const p = canvasPoint(ev);
    S.skel[S.dragging] = { x: Math.round(p.x), y: Math.round(p.y) };
    /* neck move → cx bhi */
    if (S.dragging === 'neck') S.skel.cx = Math.round(p.x);
    S.rig = buildRig(S.clean, S.skel);
    drawSkeleton(); renderNow();
  });
  skelCv.addEventListener('pointerup', () => { S.dragging = null; });

  /* ───────────────────────── 7. render loop ───────────────────────── */
  let raf = 0, lastT = 0;
  function actionDef() { return ACTIONS.find(a => a.id === S.action) || ACTIONS[0]; }
  let lastBigDraw = 0;
  function loop(now) {
    raf = requestAnimationFrame(loop);
    if (!lastT) lastT = now;
    const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now;
    if (S.playing && S.rig) {
      S.t += dt * S.speed;
      const d = actionDef().dur;
      if (S.t > d * 6) S.t = 0;                       /* preview safety */
      const paused = document.hidden;
      /* R106 · live tiles chalu hote hain to bada stage 12fps par — phone garam/bhara na ho */
      const minGap = document.getElementById('liveTiles') ? 84 : 0;
      if (!paused && (now - lastBigDraw) >= minGap) {
        lastBigDraw = now;
        renderNow();
        syncScrub();
      }
    }
  }
  function renderNow() {
    if (!S.rig) return;
    const d = actionDef().dur;
    const tn = S.t / d;
    const pose = groundLock(poseAt(S.action, tn));
    drawPose(octx, pose);
  }
  function syncScrub() {
    const d = actionDef().dur;
    const f = ((S.t / d) % 1 + 1) % 1;
    $('scrub').value = Math.round(f * 1000);
    $('tLabel').textContent = (S.t % d).toFixed(2) + 's';
  }

  /* ───────────────────────── 8. pipeline ───────────────────────── */
  async function processFile(file) {
    try {
      setStatus('run', 'Puppet analyze ho raha hai…', 8);
      $('log').innerHTML = '';
      logLine('file', file.name + ' · ' + Math.round(file.size / 1024) + ' KB');
      const img = await loadImg(file);
      logLine('size', img.naturalWidth + '×' + img.naturalHeight);
      const { canvas, report } = prepImage(img);
      logLine('background', report.mode + (report.green ? ' (green)' : '') + ' · ' + report.removed + ' px hate');
      S.info = report;

      setStatus('run', 'Character normalize…', 26);
      const norm = normalizeCanvas(canvas);
      if (!norm) throw new Error('transparent character mila nahi (poora frame khaali hai)');
      S.clean = norm.canvas; imgCache.clean = norm.canvas;
      logLine('normalize', Math.round(norm.box.w) + '×' + Math.round(norm.box.h) + ' px, feet ground par');

      setStatus('run', 'Joins detect…', 48);
      await tick();
      const sk = analyze(S.clean, norm.box);
      if (sk.error) throw new Error(sk.error);
      S.skel = sk;
      logLine('neck', 'y ' + sk.neck.y + ' · width ' + sk.neckW);
      logLine('shoulders', sk.shoulderL.x + '/' + sk.shoulderR.x + ' · y ' + sk.shY + (sk.tPose ? ' · T-pose' : ' · A-pose'));
      logLine('hands', sk.handL.x + ',' + sk.handL.y + ' → ' + sk.handR.x + ',' + sk.handR.y);
      logLine('hips', sk.hipL.x + '/' + sk.hipR.x + ' · y ' + sk.hipC.y);
      logLine('feet', sk.footL.x + '/' + sk.footR.x + ' · y ' + sk.yBot);
      if (sk.warn.length) sk.warn.forEach(w => logLine('⚠', w, 'warn'));

      setStatus('run', 'Rig ban raha hai…', 72);
      await tick();
      S.rig = buildRig(S.clean, sk);

      setStatus('run', 'Animation frames generate…', 90);
      await tick();
      S.t = 0; S.playing = true;
      $('playBtn').disabled = false; $('skelBtn').disabled = false;
      $('scrub').disabled = false;
      $('webmBtn').disabled = false; $('mp4Btn').disabled = false;
      $('framesBtn').disabled = false; $('saveBtn').disabled = false;
      $('emptyState').hidden = true;
      $('stageBadge').hidden = false;
      $('stageBadge').textContent = actionDef().name.toUpperCase() + ' · LIVE';
      $('playBtn').classList.add('on');
      $('playBtn').querySelector('span').textContent = 'Pause';
      renderBadges();
      renderNow(); drawSkeleton();
      setStatus(sk.warn.length ? 'ok' : 'ok', sk.warn.length ? 'Ready — skeleton edit karo' : 'Ready · animation chal rahi hai', 100);
      toast('Rig taiyaar — preview chal raha hai');
      try {
        if (new URLSearchParams(location.search).get('live') === '1') {
          window.__actionStudio.startLiveTiles();
          startLiveTiles();
        }
      } catch (e) {}
    } catch (e) {
      setStatus('err', 'Fail: ' + e.message, null);
      logLine('error', e.message, 'err');
      toast('Fail: ' + e.message, 3200);
    }
  }
  const tick = () => new Promise(r => setTimeout(r, 14));

  function renderBadges() {
    const i = S.info || {}, sk = S.skel || {};
    const b = [];
    b.push('<span class="tag ok">' + (i.mode || 'image') + '</span>');
    if (i.green) b.push('<span class="tag ok">green-screen keyed</span>');
    b.push('<span class="tag">' + (sk.tPose ? 'T-pose' : 'A-pose') + '</span>');
    b.push('<span class="tag">' + (sk.Hc || 0) + 'px char</span>');
    (sk.warn || []).forEach(w => b.push('<span class="tag warn">' + w + '</span>'));
    $('stageInfo').innerHTML = b.join('');
  }

  /* ───────────────────────── 9. export ───────────────────────── */
  function supported(mime) { try { return window.MediaRecorder && MediaRecorder.isTypeSupported(mime); } catch (e) { return false; } }

  function renderFrameAt(tNorm) {
    const pose = groundLock(poseAt(S.action, tNorm));
    drawPose(octx, pose);
    return pose;
  }

  async function record(mime, ext) {
    const fps = S.fps;
    const dur = Math.max(0.7, Math.min(4, actionDef().dur * 2));
    const total = Math.min(90, Math.round(dur * fps));
    $('expWrap').hidden = false; $('expBar').style.width = '0%';
    $('expTxt').textContent = 'Recording ' + total + ' frames…';
    const stream = out.captureStream(fps);
    const rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 2600000 });
    const chunks = [];
    rec.ondataavailable = e => { if (e.data && e.data.size) chunks.push(e.data); };
    const done = new Promise(res => { rec.onstop = () => res(new Blob(chunks, { type: mime.split(';')[0] })); });
    rec.start();
    for (let i = 0; i < total; i++) {
      renderFrameAt((i / total));
      $('expBar').style.width = Math.round((i + 1) / total * 100) + '%';
      await new Promise(r => setTimeout(r, 1000 / fps));
    }
    rec.stop();
    const blob = await done;
    $('expTxt').textContent = ext.toUpperCase() + ' taiyaar · ' + (blob.size / 1024).toFixed(0) + ' KB';
    return blob;
  }

  function download(blob, name) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
  }

  /* minimal ZIP (store) — PNG sequence ke liye */
  function crc32(buf) {
    let c, crc = 0xFFFFFFFF;
    for (let n = 0; n < buf.length; n++) {
      c = (crc ^ buf[n]) & 0xFF;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
      crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }
  function zipStore(files) {
    const enc = new TextEncoder();
    const parts = [], central = [];
    let offset = 0;
    files.forEach(f => {
      const nameB = enc.encode(f.name);
      const crc = crc32(f.data);
      const lh = new DataView(new ArrayBuffer(30));
      lh.setUint32(0, 0x04034b50, true); lh.setUint16(4, 20, true); lh.setUint16(6, 0, true);
      lh.setUint16(8, 0, true); lh.setUint16(10, 0, true); lh.setUint16(12, 0x21, true);
      lh.setUint32(14, crc, true); lh.setUint32(18, f.data.length, true); lh.setUint32(22, f.data.length, true);
      lh.setUint16(26, nameB.length, true); lh.setUint16(28, 0, true);
      parts.push(new Uint8Array(lh.buffer), nameB, f.data);
      const ch = new DataView(new ArrayBuffer(46));
      ch.setUint32(0, 0x02014b50, true); ch.setUint16(4, 20, true); ch.setUint16(6, 20, true);
      ch.setUint16(8, 0, true); ch.setUint16(10, 0, true); ch.setUint16(12, 0, true); ch.setUint16(14, 0x21, true);
      ch.setUint32(16, crc, true); ch.setUint32(20, f.data.length, true); ch.setUint32(24, f.data.length, true);
      ch.setUint16(28, nameB.length, true); ch.setUint16(30, 0, true); ch.setUint16(32, 0, true);
      ch.setUint16(34, 0, true); ch.setUint16(36, 0, true); ch.setUint32(38, 0, true);
      ch.setUint32(42, offset, true);
      central.push(new Uint8Array(ch.buffer), nameB);
      offset += 30 + nameB.length + f.data.length;
    });
    const centralSize = central.reduce((a, b) => a + b.length, 0);
    const end = new DataView(new ArrayBuffer(22));
    end.setUint32(0, 0x06054b50, true); end.setUint16(8, files.length, true);
    end.setUint16(10, files.length, true); end.setUint32(12, centralSize, true);
    end.setUint32(16, offset, true);
    return new Blob([...parts, ...central, new Uint8Array(end.buffer)], { type: 'application/zip' });
  }

  async function exportFrames() {
    const fps = S.fps;
    const dur = actionDef().dur;
    const total = clamp(Math.round(dur * fps), 12, 60);
    $('expWrap').hidden = false; $('expBar').style.width = '0%'; $('expTxt').textContent = 'Frames render…';
    const cv = mkCanvas(CW, CH), cx = cv.getContext('2d');
    const files = [];
    for (let i = 0; i < total; i++) {
      const pose = groundLock(poseAt(S.action, i / total));
      drawPose(cx, pose);
      const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
      const buf = new Uint8Array(await blob.arrayBuffer());
      files.push({ name: S.action + '-' + String(i).padStart(3, '0') + '.png', data: buf });
      $('expBar').style.width = Math.round((i + 1) / total * 100) + '%';
    }
    const meta = { action: S.action, fps, frames: total, size: [CW, CH], alpha: true, generated: new Date().toISOString() };
    files.push({ name: 'animation.json', data: new TextEncoder().encode(JSON.stringify(meta, null, 2)) });
    $('expTxt').textContent = total + ' PNG frames + animation.json';
    return zipStore(files);
  }

  /* ───────────────────────── 10. storage ───────────────────────── */
  const DB_NAME = 'actionanim', DB_STORE = 'animations';
  function idb() {
    return new Promise((res, rej) => {
      const r = indexedDB.open(DB_NAME, 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore(DB_STORE); } catch (e) {} };
      r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error);
    });
  }
  async function dbPut(key, val) { const db = await idb(); return new Promise((res, rej) => { const t = db.transaction(DB_STORE, 'readwrite'); t.objectStore(DB_STORE).put(val, key); t.oncomplete = res; t.onerror = () => rej(t.error); }); }
  async function dbGet(key) { const db = await idb(); return new Promise((res) => { const q = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).get(key); q.onsuccess = () => res(q.result || null); q.onerror = () => res(null); }); }
  async function dbAll() { const db = await idb(); return new Promise((res) => { const q = db.transaction(DB_STORE, 'readonly').objectStore(DB_STORE).getAll(); q.onsuccess = () => res(q.result || []); q.onerror = () => res([]); }); }

  /* editor ko handoff: hilao-pose/blobs me video blob + hilao.sel */
  function idbEditor(key, blob) {
    return new Promise((res) => {
      const r = indexedDB.open('hilao-pose', 1);
      r.onupgradeneeded = () => { try { r.result.createObjectStore('blobs'); } catch (e) {} };
      r.onsuccess = () => {
        const db = r.result;
        try {
          const t = db.transaction('blobs', 'readwrite');
          t.objectStore('blobs').put(blob, key);
          t.oncomplete = () => res(true); t.onerror = () => res(false);
        } catch (e) { res(false); }
      };
      r.onerror = () => res(false);
    });
  }

  async function saveCurrent() {
    if (!S.rig) return;
    $('saveBtn').disabled = true;
    try {
      setStatus('run', 'Save: video + frames ban rahe hain…', 45);
      const mime = supported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9'
        : supported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : '';
      let blob = null;
      if (mime) blob = await record(mime, 'webm');
      const thumbCv = mkCanvas(120, 160), tctx = thumbCv.getContext('2d');
      drawPose(tctx, groundLock(poseAt(S.action, 0.25)));
      const thumb = thumbCv.toDataURL('image/png');
      const rec = {
        action: S.action, name: actionDef().name, char: S.charName,
        fps: S.fps, dur: actionDef().dur, ts: Date.now(),
        video: blob, thumb, mime, alpha: !!mime && mime.indexOf('vp9') >= 0,
        skel: S.skel, info: S.info
      };
      await dbPut('act:' + S.action, rec);
      if (blob) await idbEditor('act.' + S.action, blob);
      setStatus('ok', 'Saved: ' + actionDef().name, 100);
      toast(actionDef().name + ' save ho gaya');
      await renderSaved();
      markChips();
    } catch (e) {
      setStatus('err', 'Save fail: ' + e.message, null);
      toast('Save fail: ' + e.message, 3000);
    } finally { $('saveBtn').disabled = false; }
  }

  async function renderSaved() {
    const list = $('savedList');
    const all = await dbAll();
    const byAction = new Map(all.map(r => [r.action, r]));
    if (!byAction.size) { list.innerHTML = '<small style="color:rgba(255,255,255,.35);font-size:9.5px">Abhi kuch save nahi hua — puppet upload karke Save dabao</small>'; return; }
    list.innerHTML = '';
    ACTIONS.forEach(a => {
      const r = byAction.get(a.id);
      if (!r) return;
      const el = document.createElement('div');
      el.className = 'sv';
      el.innerHTML = '<div class="thumb" style="background-image:url(' + r.thumb + ')"></div>' +
        '<b>' + r.name + '</b>' +
        '<small>' + (r.video ? (r.video.size / 1024).toFixed(0) + ' KB · ' + (r.alpha ? 'alpha' : 'no-alpha') : 'frames only') + '</small>' +
        '<button data-play="' + r.action + '">Play</button>' +
        '<button data-dl="' + r.action + '">Save</button>';
      list.appendChild(el);
    });
    list.querySelectorAll('[data-play]').forEach(b => b.onclick = async () => {
      const r = await dbGet('act:' + b.dataset.play);
      if (!r || !r.video) return toast('Is action ka video nahi hai');
      const url = URL.createObjectURL(r.video);
      const m = $('modal'); m.hidden = false;
      $('mTitle').textContent = r.name + ' — saved animation';
      $('mBody').innerHTML = '<video src="' + url + '" autoplay loop muted playsinline style="width:100%;border-radius:8px;background:repeating-conic-gradient(#1b1e22 0 25%,#232629 0 50%) 0 0/16px 16px"></video>' +
        '<p style="font-size:10px;color:rgba(255,255,255,.5)">' + (r.mime || 'frames') + ' · ' + r.fps + ' fps · ' + (r.alpha ? 'transparent (VP9 alpha)' : 'no alpha') + '</p>';
    });
    list.querySelectorAll('[data-dl]').forEach(b => b.onclick = async () => {
      const r = await dbGet('act:' + b.dataset.dl);
      if (r && r.video) download(r.video, 'action-' + r.action + '.webm');
    });
  }

  /* ───────────────────────── 11. UI wiring ───────────────────────── */
  function markChips() {
    dbAll().then(all => {
      const have = new Set(all.map(r => r.action));
      document.querySelectorAll('#actionChips .chip').forEach(c => {
        c.classList.toggle('on', c.dataset.a === S.action);
        const dot = c.querySelector('.has');
        if (have.has(c.dataset.a) && !dot) c.insertAdjacentHTML('beforeend', '<span class="has"></span>');
        if (!have.has(c.dataset.a) && dot) dot.remove();
      });
      $('saveBtn').textContent = 'Save "' + actionDef().name + '"';
      $('stageBadge').textContent = actionDef().name.toUpperCase() + ' · LIVE';
    });
  }
  function buildChips() {
    const wrap = $('actionChips');
    wrap.innerHTML = '';
    ACTIONS.forEach(a => {
      const b = document.createElement('button');
      b.className = 'chip'; b.dataset.a = a.id; b.textContent = a.name;
      b.onclick = () => { S.action = a.id; S.t = 0; markChips(); renderNow(); };
      wrap.appendChild(b);
    });
  }

  $('uploadBtn').onclick = () => $('file').click();
  $('file').onchange = (e) => {
    const f = e.target.files && e.target.files[0];
    if (f) processFile(f);
    e.target.value = '';
  };
  $('playBtn').onclick = () => {
    S.playing = !S.playing;
    $('playBtn').classList.toggle('on', S.playing);
    $('playBtn').querySelector('span').textContent = S.playing ? 'Pause' : 'Play';
    if (S.playing) { lastT = 0; if (!raf) raf = requestAnimationFrame(loop); }
  };
  $('skelBtn').onclick = () => {
    S.skelEdit = !S.skelEdit;
    $('skelBtn').classList.toggle('on', S.skelEdit);
    skelCv.classList.toggle('edit', S.skelEdit);
    $('skel').style.opacity = S.skelEdit ? 1 : 1;
    drawSkeleton();
    toast(S.skelEdit ? 'Joint drag karke skeleton theek karo' : 'Skeleton lock');
  };
  $('scrub').oninput = (e) => {
    const d = actionDef().dur;
    S.t = (e.target.value / 1000) * d;
    renderNow();
    $('tLabel').textContent = S.t.toFixed(2) + 's';
  };
  $('speed').oninput = (e) => { S.speed = e.target.value / 100; };
  $('fps').onchange = (e) => { S.fps = +e.target.value; };
  $('ground').oninput = (e) => { S.groundOff = +e.target.value; renderNow(); };

  $('webmBtn').onclick = async () => {
    const mime = supported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : (supported('video/webm;codecs=vp8') ? 'video/webm;codecs=vp8' : '');
    if (!mime) return toast('Is browser me WebM recording nahi hai', 3000);
    $('webmBtn').disabled = true;
    const b = await record(mime, 'webm');
    download(b, 'action-' + S.action + '-alpha.webm');
    $('webmBtn').disabled = false;
    toast('WebM download (alpha ' + (mime.indexOf('vp9') >= 0 ? 'supported' : 'nahi') + ')');
  };
  $('mp4Btn').onclick = async () => {
    const mime = supported('video/mp4;codecs=avc1.42E01E') ? 'video/mp4;codecs=avc1.42E01E'
      : supported('video/mp4') ? 'video/mp4' : '';
    if (!mime) return toast('Is browser me MP4 recording nahi hai — WebM use karo', 3200);
    $('mp4Btn').disabled = true;
    const b = await record(mime, 'mp4');
    download(b, 'action-' + S.action + '.mp4');
    $('mp4Btn').disabled = false;
    toast('MP4 download (transparency MP4 me support nahi)');
  };
  $('framesBtn').onclick = async () => {
    $('framesBtn').disabled = true;
    const zip = await exportFrames();
    download(zip, 'action-' + S.action + '-frames.zip');
    $('framesBtn').disabled = false;
  };
  $('saveBtn').onclick = saveCurrent;

  $('backBtn').onclick = () => history.length > 1 ? history.back() : location.href = 'animations.html';
  $('helpBtn').onclick = () => {
    $('modal').hidden = false;
    $('mTitle').textContent = 'Yeh kaise kaam karta hai';
    $('mBody').innerHTML = `
      <h4>Kya hota hai</h4>
      <ul>
        <li><b>Analyze:</b> alpha silhouette se neck, shoulders, elbows, hands, hips, knees, feet detect hote hain.</li>
        <li><b>Rig:</b> character ke asli pixels se body strips banti hain — face, kapde, rang wahi rehte hain.</li>
        <li><b>Animate:</b> 2-bone limb chains se har frame naya render hota hai (procedural skeletal animation).</li>
        <li><b>Export:</b> WebM (VP9 alpha), MP4 (alpha nahi), PNG frame sequence (zip + animation.json).</li>
      </ul>
      <h4>Honest limits</h4>
      <ul>
        <li>Yeh <b>AI video generation nahi</b> — koi paid API use nahi hota. Motion procedural skeletal hai, isliye har action pe realistic body-physics thodi kam ho sakti hai.</li>
        <li>Best result: <b>T-pose / arms-side transparent PNG</b>. Photo jaisi image par joints galat aa sakte hain — Skeleton button se drag karke theek karo.</li>
        <li>MP4 me transparency technically support nahi (HEVC chahiye) — transparent output ke liye WebM use karo.</li>
      </ul>`;
  };
  $('mClose').onclick = () => { $('modal').hidden = true; };
  $('modal').onclick = (e) => { if (e.target.id === 'modal') $('modal').hidden = true; };

  /* boot */
  buildChips();
  markChips();
  renderSaved();
  raf = requestAnimationFrame(loop);
  setStatus('ok', 'Ready — puppet upload karo', 0);
  $('fmtNote').textContent = (supported('video/webm;codecs=vp9') ? 'webm-alpha' : 'webm') +
    ' · ' + (supported('video/mp4') ? 'mp4' : 'mp4:—');

  /* query params: ?action=walk&name=Kaka&id=kaka */
  const q = new URLSearchParams(location.search);
  if (q.get('action') && ACTIONS.some(a => a.id === q.get('action'))) S.action = q.get('action');
  if (q.get('name')) { S.charName = q.get('name'); $('charName').textContent = q.get('name') + ' · action studio'; }
  markChips();

  /* ---------- R105 · selected putla khud aa jaye ----------
     Animations page (putlo ka page) se aaya hua character localStorage['hilao.charImg']
     me hota hai. Pehle Studio khaali khulta tha aur "Upload puppet" dabana padta tha.
     Ab URL me ?char=auto ho (ya page putla se aaya ho) to wahi character apne aap load
     ho jata hai. Upload button phir bhi kaam karta hai. */
  (function autoPuppet() {
    if (q.get('char') === 'off') return;
    var src = '';
    try { src = localStorage.getItem('hilao.charImg') || ''; } catch (e) { return; }
    if (!src || src.length < 200) return;
    try {
      setStatus('run', 'Putla load ho raha hai…', 4);
      fetch(src).then(function (r) { return r.blob(); }).then(function (blob) {
        var name = (q.get('name') || 'my-character') + '.png';
        try { var f = new File([blob], name, { type: blob.type || 'image/png' }); return processFile(f); }
        catch (e) { blob.name = name; return processFile(blob); }
      }).catch(function () { setStatus('ok', 'Ready — puppet upload karo', 0); });
    } catch (e) {}
  })();

  /* ------------------------------------------------------------------
     R106 · LIVE THUMBNAILS (putlo wale page jaisa)
     ?live=1 par ek chhota grid banta hai: Idle / Walk / Run / Dancing / Waving
     — har tile me WAHI putla chalta hua (5fps par re-render, koi video file nahi).
     Weight: ek hi rig, kai tiles → phone par halka.
     ------------------------------------------------------------------ */
  function startLiveTiles() {
    const ACTS = ['idle', 'walk', 'run', 'dancing', 'waving'];
    if (!S.rig) return;
    let wrap = document.getElementById('liveTiles');
    if (!wrap) {
      wrap = document.createElement('div');
      wrap.id = 'liveTiles';
      wrap.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:8px;padding:10px 12px 4px';
      const stage = document.getElementById('stage');
      if (stage && stage.parentNode) stage.parentNode.insertBefore(wrap, stage);
      else document.body.appendChild(wrap);
    }
    wrap.innerHTML = '';
    const tiles = ACTS.map(function (id) {
      const cv = document.createElement('canvas');
      cv.width = 132; cv.height = 176;
      cv.style.cssText = 'width:100%;height:auto;border-radius:12px;background:#101114;border:1px solid rgba(255,255,255,.08);display:block';
      const box = document.createElement('div');
      box.style.cssText = 'text-align:center;font:800 10px/1.6 -apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,sans-serif;color:#aab2bb;letter-spacing:.5px';
      const nm = (ACTIONS.find(function (a) { return a.id === id; }) || { name: id }).name.toUpperCase();
      box.innerHTML = '<div></div><div>' + nm + '</div>';
      box.firstChild.appendChild(cv);
      wrap.appendChild(box);
      return { id: id, cv: cv, ctx: cv.getContext('2d') };
    });

    /* ek pose ko chhote canvas par draw karo.
       NOTE: koi temp canvas nahi (pehle har frame par 540×720 canvas reallocate hota tha
       → phone par memory churn). Ab seedha scale-transform ke saath drawPose. */
    function drawSmall(tile, tNorm) {
      const ctx = tile.ctx, W = tile.cv.width, H = tile.cv.height;
      const pose = groundLock(poseAt(tile.id, tNorm));
      const sc = Math.min(W / CW, H / CH);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, W, H);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.setTransform(sc, 0, 0, sc, (W - CW * sc) / 2, (H - CH * sc) / 2);
      drawPose(ctx, pose);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }

    let last = 0;
    (function tick(now) {
      if (!startLiveTiles.alive) return;
      if (!document.hidden && now - last > 250) {   /* 4 fps · tab hidden ho to band */
        last = now;
        for (let i = 0; i < tiles.length; i++) {
          const dur = (ACTIONS.find(function (a) { return a.id === tiles[i].id; }) || { dur: 1 }).dur;
          drawSmall(tiles[i], (now / 1000 / dur) % 1);
        }
      }
      requestAnimationFrame(tick);
    })(performance.now());
    startLiveTiles.alive = true;
    window.addEventListener('pagehide', function () { startLiveTiles.alive = false; });
  }

  /* debug hook */
  window.__actionStudio = { S, processFile, poseAt, renderNow, exportFrames, saveCurrent, buildRig, analyze, startLiveTiles };
})();
