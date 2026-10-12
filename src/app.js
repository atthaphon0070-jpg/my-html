/* =========================================================================
   TRUSTED CAMPUS — presentation engine
   ========================================================================= */
(() => {
  'use strict';

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const easeOut = (t) => 1 - Math.pow(1 - t, 3);
  const easeIO = (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

  const body = document.body;
  const stage = $('#stage');
  const slides = $$('.slide', stage);
  const N = slides.length;
  const mqReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  let reduced = mqReduce.matches;
  let stageScale = 1;
  let idx = -1;

  /* ---------------------------------------------------------------------
     Stage fit (1920×1080 authored, letterboxed to the viewport)
     --------------------------------------------------------------------- */
  function fit() {
    stageScale = Math.min(window.innerWidth / 1920, window.innerHeight / 1080);
    stage.style.transform = `translate(-50%, -50%) scale(${stageScale})`;
    resizeCanvases();
  }

  /* ---------------------------------------------------------------------
     Photos (assets/photos/photos.js) — real images replace placeholders
     --------------------------------------------------------------------- */
  function loadPhotos() {
    const map = window.TC_PHOTOS || {};
    $$('[data-photo]').forEach((el) => {
      const src = map[el.dataset.photo];
      if (!src) return;
      const img = new Image();
      img.alt = el.dataset.alt || '';
      img.decoding = 'async';
      img.onload = () => el.classList.add('has-img');
      img.onerror = () => img.remove();
      img.src = src;
      el.prepend(img);
    });
    const chatbot = map['line-chatbot'];
    const host = $('[data-photo-host]');
    if (chatbot && host) {
      const img = new Image();
      img.alt = 'ภาพหน้าจอ LINE Chatbot เดิม';
      img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block';
      img.onload = () => { host.innerHTML = ''; host.classList.add('photo-mode'); host.appendChild(img); };
      img.src = chatbot;
    }
    const web = map['webapp'];
    const mini = $('.s3 .browser-mini');
    if (web && mini) {
      const img = new Image();
      img.alt = 'ภาพหน้าจอ Web Application AI LearnMate';
      img.style.cssText = 'position:absolute;left:0;right:0;top:26px;bottom:0;width:100%;height:calc(100% - 26px);object-fit:cover';
      img.onload = () => { $$('.who,.lines', mini).forEach((n) => n.remove()); mini.appendChild(img); };
      img.src = web;
    }
  }

  /* ---------------------------------------------------------------------
     Hero title split into letters
     --------------------------------------------------------------------- */
  $$('[data-split]').forEach((el) => {
    const text = el.textContent;
    el.textContent = '';
    let i = 0;
    for (const ch of text) {
      const s = document.createElement('span');
      s.className = 'ch';
      s.setAttribute('aria-hidden', 'true');
      s.style.setProperty('--i', i++);
      s.textContent = ch === ' ' ? ' ' : ch;
      el.appendChild(s);
    }
  });

  /* ---------------------------------------------------------------------
     Slide 10 chart (built from the exact data)
     --------------------------------------------------------------------- */
  const FIN = [
    { pct: '30%', save: 19200, mid: -1200 },
    { pct: '50%', save: 37000, mid: 3000 },
    { pct: '70%', save: 54800, mid: 7200 },
  ];
  const fmt = (v) => (v < 0 ? '−' : '') + Math.abs(Math.round(v)).toLocaleString('en-US');

  function buildChart() {
    const host = $('#chart10');
    if (!host) return;
    const W = 800, H = 560, L = 96, R = 16, T = 30, B = 70;
    const vMax = 60000, vMin = -8000;
    const y = (v) => T + ((vMax - v) / (vMax - vMin)) * (H - T - B);
    const plotW = W - L - R;
    const gW = plotW / FIN.length;
    const bw = 78, gap = 14;
    let s = `<svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg">`;
    s += '<defs><linearGradient id="bc" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ff4ff"/><stop offset="1" stop-color="#54E5FF" stop-opacity=".55"/></linearGradient>';
    s += '<linearGradient id="bg2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffe2a8"/><stop offset="1" stop-color="#E8BE75" stop-opacity=".6"/></linearGradient>';
    s += '<linearGradient id="bn" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#FF8F66"/><stop offset="1" stop-color="#E2603F"/></linearGradient></defs>';
    [0, 20000, 40000, 60000].forEach((v) => {
      s += `<line class="${v === 0 ? 'zero-l' : 'gridl'}" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/>`;
      s += `<text class="ax" x="${L - 14}" y="${y(v) + 6}" text-anchor="end">${v === 0 ? '0' : fmt(v)}</text>`;
    });
    s += `<text class="ax" x="${L - 14}" y="${T - 14}" text-anchor="end" style="font-family:'IBM Plex Sans Thai';font-size:15px">บาท</text>`;
    FIN.forEach((d, i) => {
      const cx = L + gW * i + gW / 2;
      const bars = [
        { v: d.save, x: cx - bw - gap / 2, fill: 'url(#bc)', k: 'kc' },
        { v: d.mid, x: cx + gap / 2, fill: d.mid < 0 ? 'url(#bn)' : 'url(#bg2)', k: d.mid < 0 ? 'kn' : 'kg' },
      ];
      bars.forEach((b, j) => {
        const y0 = y(0), y1 = y(b.v);
        const top = Math.min(y0, y1), h = Math.max(2, Math.abs(y1 - y0));
        const neg = b.v < 0;
        const delay = (i * 0.25 + j * 0.12).toFixed(2);
        s += `<rect class="bar ${b.k} ${neg ? 'negb' : 'pos'}" style="--d:${delay}s" x="${b.x}" y="${top}" width="${bw}" height="${h}" rx="6" fill="${b.fill}"/>`;
        const ty = neg ? y0 + h + 26 : top - 12;
        s += `<text class="bval${neg ? ' neg' : ''}" style="--d:${delay}s" x="${b.x + bw / 2}" y="${ty}" text-anchor="middle">${fmt(b.v)}</text>`;
      });
      s += `<text class="grp" x="${cx}" y="${H - 24}" text-anchor="middle">${d.pct}</text>`;
    });
    s += `<text class="grp-s" x="${L + plotW / 2}" y="${H}" text-anchor="middle">สัดส่วนผู้ปกครองที่จ่าย</text>`;
    s += '</svg>';
    host.innerHTML = s;
  }

  /* ---------------------------------------------------------------------
     Slide 12 constellation lines
     --------------------------------------------------------------------- */
  function buildNet12() {
    const svg = $('#net12');
    if (!svg) return;
    // orb centres: node top + half of the orb height
    const P = [[360, 370], [900, 320], [1440, 370], [540, 690], [1080, 690], [1620, 690]];
    const E = [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5]];
    let s = '';
    E.forEach(([a, b], i) => {
      const [x1, y1] = P[a], [x2, y2] = P[b];
      const len = Math.hypot(x2 - x1, y2 - y1).toFixed(0);
      const g = a >= 4 || b >= 4;
      s += `<line class="${g ? 'g' : ''}" x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" style="--len:${len};--d:${(i * 0.12).toFixed(2)}s"/>`;
    });
    svg.innerHTML = s;
  }

  /* ---------------------------------------------------------------------
     Canvas: ambient starfield (cheap, paused when tab hidden)
     --------------------------------------------------------------------- */
  const bg = $('#bg');
  const bgx = bg.getContext('2d');
  let stars = [];
  function initStars() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    bg.width = Math.round(window.innerWidth * dpr);
    bg.height = Math.round(window.innerHeight * dpr);
    bgx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const count = Math.round((window.innerWidth * window.innerHeight) / 9000);
    stars = Array.from({ length: count }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.2 + 0.2,
      a: Math.random() * 0.5 + 0.1,
      tw: Math.random() * Math.PI * 2,
      vy: -(Math.random() * 0.06 + 0.01),
      z: Math.random(),
    }));
  }
  let mouseNX = 0, mouseNY = 0;
  function drawStars(t) {
    const w = window.innerWidth, h = window.innerHeight;
    bgx.clearRect(0, 0, w, h);
    for (const s of stars) {
      if (!reduced) { s.y += s.vy; if (s.y < -4) s.y = h + 4; }
      const px = s.x - mouseNX * 14 * s.z, py = s.y - mouseNY * 10 * s.z;
      const a = s.a * (0.65 + 0.35 * Math.sin(t * 0.0012 + s.tw));
      bgx.fillStyle = `rgba(200,225,255,${a.toFixed(3)})`;
      bgx.beginPath();
      bgx.arc(px, py, s.r, 0, 6.283);
      bgx.fill();
    }
  }

  /* ---------------------------------------------------------------------
     Canvas: neural network sphere (hero + finale)
     --------------------------------------------------------------------- */
  function makeNet(canvas, mode) {
    const ctx = canvas.getContext('2d');
    const count = mode === 'hero' ? 200 : 180;
    const cx = 960, cy = mode === 'hero' ? 500 : 340;
    const R = mode === 'hero' ? 330 : 235;
    const nodes = [];
    for (let i = 0; i < count; i++) {
      const yy = 1 - (2 * (i + 0.5)) / count;
      const rr = Math.sqrt(1 - yy * yy);
      const phi = i * 2.399963;
      const shell = Math.random() < 0.82 ? 1 + (Math.random() - 0.5) * 0.06 : 1.25 + Math.random() * 0.5;
      nodes.push({ x: Math.cos(phi) * rr * shell, y: yy * shell, z: Math.sin(phi) * rr * shell, s: Math.random(), shell, delay: Math.random() });
    }
    const pairs = [];
    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const a = nodes[i], b = nodes[j];
        if (a.shell > 1.1 || b.shell > 1.1) continue;
        const d = Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
        if (d < 0.34) pairs.push([i, j, d]);
      }
    }
    // finale: particles start from the six lesson nodes of slide 12
    const SIX = [[360, 370], [900, 320], [1440, 370], [540, 690], [1080, 690], [1620, 690]];
    nodes.forEach((n, i) => {
      const h = SIX[i % 6];
      n.sx = h[0] + (Math.random() - 0.5) * 60;
      n.sy = h[1] + (Math.random() - 0.5) * 60;
    });

    let raf = 0, running = false, t0 = 0;
    const proj = new Array(count);

    function draw(now) {
      const t = reduced ? 99 : (now - t0) / 1000;
      ctx.clearRect(0, 0, 1920, 1080);
      const rot = (reduced ? 0.6 : t * 0.07) + 0.6;
      const tilt = 0.38;
      const cr = Math.cos(rot), sr = Math.sin(rot), ct = Math.cos(tilt), st = Math.sin(tilt);
      let expand, form, sixA;
      if (mode === 'hero') {
        expand = easeOut(clamp((t - 0.55) / 2.4, 0, 1));
        form = 1; sixA = 0;
      } else {
        expand = 1;
        form = clamp((t - 1.3) / 2.2, 0, 1);
        sixA = clamp(t / 0.8, 0, 1) * (1 - clamp((t - 2.2) / 1.2, 0, 1));
      }
      const push = mode === 'hero' ? 1 + (reduced ? 0 : Math.min(t, 30) * 0.002) : 1;

      // seed spark (hero) — a single luminous particle before expansion
      if (mode === 'hero' && t < 3.2) {
        const a = clamp(t / 0.4, 0, 1) * (1 - clamp((t - 1.8) / 1.4, 0, 1));
        const r = 6 + easeOut(clamp(t / 0.9, 0, 1)) * 24;
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, r * 4);
        g.addColorStop(0, `rgba(230,252,255,${a})`);
        g.addColorStop(0.25, `rgba(84,229,255,${a * 0.6})`);
        g.addColorStop(1, 'rgba(84,229,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, r * 4, 0, 6.283); ctx.fill();
      }

      for (let i = 0; i < count; i++) {
        const n = nodes[i];
        let x = n.x * cr - n.z * sr;
        let z = n.x * sr + n.z * cr;
        let y = n.y * ct - z * st;
        z = n.y * st + z * ct;
        const persp = 3.2 / (3.2 + z);
        let px = cx + x * R * expand * persp * push;
        let py = cy + y * R * expand * persp * push;
        if (mode === 'finale') {
          const f = easeIO(clamp((form - n.delay * 0.35) / 0.65, 0, 1));
          px = n.sx + (px - n.sx) * f;
          py = n.sy + (py - n.sy) * f;
          proj[i] = { px, py, z, f };
        } else {
          proj[i] = { px, py, z, f: 1 };
        }
      }

      // links
      if (expand > 0.05) {
        ctx.lineWidth = 1;
        for (const [i, j, d] of pairs) {
          const a = proj[i], b = proj[j];
          const depth = 1 - (a.z + b.z + 2) / 4;
          const alpha = (0.05 + depth * 0.32) * (1 - d / 0.34) * expand * Math.min(a.f, b.f);
          if (alpha < 0.01) continue;
          ctx.strokeStyle = `rgba(84,229,255,${alpha.toFixed(3)})`;
          ctx.beginPath(); ctx.moveTo(a.px, a.py); ctx.lineTo(b.px, b.py); ctx.stroke();
        }
      }
      // nodes
      for (let i = 0; i < count; i++) {
        const p = proj[i], n = nodes[i];
        const depth = 1 - (p.z + 1) / 2;
        const alpha = (n.shell > 1.1 ? 0.35 : 0.3 + depth * 0.7) * (mode === 'hero' ? expand : 0.35 + 0.65 * p.f);
        if (alpha < 0.01) continue;
        const r = (n.shell > 1.1 ? 1.1 : 1.3 + depth * 1.9) * (0.7 + n.s * 0.6);
        const gold = n.s > 0.93;
        ctx.fillStyle = gold ? `rgba(232,190,117,${alpha})` : `rgba(${190 + depth * 50 | 0},245,255,${alpha})`;
        ctx.beginPath(); ctx.arc(p.px, p.py, r, 0, 6.283); ctx.fill();
      }

      // finale: six lesson nodes and their links fade out as the sphere forms
      if (mode === 'finale' && sixA > 0.01) {
        ctx.strokeStyle = `rgba(232,190,117,${0.4 * sixA})`;
        ctx.lineWidth = 1.5;
        [[0, 1], [1, 2], [0, 3], [1, 3], [1, 4], [2, 4], [2, 5], [3, 4], [4, 5]].forEach(([a, b]) => {
          ctx.beginPath(); ctx.moveTo(SIX[a][0], SIX[a][1]); ctx.lineTo(SIX[b][0], SIX[b][1]); ctx.stroke();
        });
        SIX.forEach(([x, y], k) => {
          const g = ctx.createRadialGradient(x, y, 0, x, y, 46);
          const col = k >= 4 ? '232,190,117' : '84,229,255';
          g.addColorStop(0, `rgba(${col},${0.9 * sixA})`);
          g.addColorStop(1, `rgba(${col},0)`);
          ctx.fillStyle = g;
          ctx.beginPath(); ctx.arc(x, y, 46, 0, 6.283); ctx.fill();
        });
      }
      // finale: luminous core glow once formed
      if (mode === 'finale') {
        const a = easeOut(form) * (0.85 + (reduced ? 0 : 0.15 * Math.sin(t * 1.5)));
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 1.25);
        g.addColorStop(0, `rgba(160,235,255,${0.28 * a})`);
        g.addColorStop(0.45, `rgba(71,123,255,${0.12 * a})`);
        g.addColorStop(1, 'rgba(71,123,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.arc(cx, cy, R * 1.25, 0, 6.283); ctx.fill();
      }
      if (running && !reduced) raf = requestAnimationFrame(draw);
    }

    return {
      resize() {
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const k = stageScale * dpr;
        canvas.width = Math.max(2, Math.round(1920 * k));
        canvas.height = Math.max(2, Math.round(1080 * k));
        ctx.setTransform(k, 0, 0, k, 0, 0);
        if (!running || reduced) draw(performance.now());
      },
      start() {
        cancelAnimationFrame(raf);
        running = true;
        t0 = performance.now();
        if (reduced) draw(t0); else raf = requestAnimationFrame(draw);
      },
      stop() { running = false; cancelAnimationFrame(raf); },
      settle() { running = false; cancelAnimationFrame(raf); t0 = performance.now() - 60000; draw(performance.now()); },
    };
  }

  const heroNet = makeNet($('#heroNet'), 'hero');
  const finNet = makeNet($('#finNet'), 'finale');

  /* ---------------------------------------------------------------------
     LUMI mascot
     --------------------------------------------------------------------- */
  const lumiCanvas = $('#lumi');
  let lumi = null;
  try { lumi = window.Lumi ? window.Lumi.create(lumiCanvas, { reducedMotion: reduced }) : null; } catch (e) { lumi = null; }
  if (!lumi) lumiCanvas.classList.add('no-gl');
  const LUMI_POSE = {
    1: { x: 1660, y: 215, s: 0.72, yaw: -0.55, pitch: 0.18, point: 0, holo: 1 },
    4: { x: 1700, y: 330, s: 0.6, yaw: -0.65, pitch: 0.1, point: 1, holo: 0 },
    12: { x: 1790, y: 160, s: 0.44, yaw: -0.4, pitch: 0.22, point: 0, holo: 0 },
    14: { x: 1600, y: 300, s: 0.74, yaw: -0.5, pitch: 0.05, point: 0, holo: 1 },
  };
  function placeLumi(n) {
    if (!lumi) return;
    const p = LUMI_POSE[n];
    if (p) {
      lumiCanvas.style.transform = `translate(${p.x - 280}px, ${p.y - 280}px) scale(${p.s})`;
      lumiCanvas.classList.add('show');
      lumi.setPose({ yaw: p.yaw, pitch: p.pitch, point: p.point, holo: p.holo });
      lumi.start();
      lumi.react();
    } else {
      lumiCanvas.classList.remove('show');
      clearTimeout(placeLumi.t);
      placeLumi.t = setTimeout(() => { if (!LUMI_POSE[idx + 1]) lumi.stop(); }, 900);
    }
  }

  function resizeCanvases() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    heroNet.resize();
    finNet.resize();
    if (lumi) lumi.setSize(560 * stageScale, dpr);
  }

  /* ---------------------------------------------------------------------
     Slide-specific behaviours (enter / leave)
     --------------------------------------------------------------------- */
  const timers = new Set();
  const later = (fn, ms) => { const id = setTimeout(() => { timers.delete(id); fn(); }, ms); timers.add(id); return id; };
  const rafs = new Set();
  function clearSlideTimers() { timers.forEach(clearTimeout); timers.clear(); rafs.forEach(cancelAnimationFrame); rafs.clear(); }

  function countUp(el, delayMs, dur = 1400) {
    const to = parseFloat(el.dataset.count);
    if (reduced) { el.textContent = fmt(to); return; }
    el.textContent = '0';
    later(() => {
      const t0 = performance.now();
      const step = (now) => {
        const k = easeOut(clamp((now - t0) / dur, 0, 1));
        el.textContent = fmt(to * k);
        if (k < 1) { const id = requestAnimationFrame(step); rafs.add(id); }
      };
      const id = requestAnimationFrame(step); rafs.add(id);
    }, delayMs);
  }

  function graphemes(str) {
    if (window.Intl && Intl.Segmenter) return Array.from(new Intl.Segmenter('th', { granularity: 'grapheme' }).segment(str), (s) => s.segment);
    return Array.from(str);
  }

  const HOOKS = {
    1: { enter() { heroNet.start(); }, leave() { heroNet.stop(); } },
    4: {
      enter(s) {
        const el = $('[data-type]', s);
        const think = $('[data-think]', s), ans = $('[data-answer]', s);
        const full = el.dataset.type;
        if (reduced) { el.textContent = full; think.style.display = 'none'; ans.style.opacity = 1; return; }
        el.textContent = '';
        think.style.display = '';
        ans.style.cssText = 'opacity:0;transition:opacity .6s';
        const g = graphemes(full);
        let i = 0;
        const delay = parseFloat(el.dataset.typeDelay || 1) * 1000;
        const tick = () => { el.textContent = g.slice(0, ++i).join(''); if (i < g.length) later(tick, 70 + Math.random() * 60); };
        later(tick, delay);
        later(() => { think.style.display = 'none'; ans.style.opacity = 1; }, 4600);
      },
      leave(s) {
        const el = $('[data-type]', s);
        el.textContent = el.dataset.type;
        $('[data-think]', s).style.display = 'none';
        $('[data-answer]', s).style.cssText = '';
      },
    },
    7: {
      enter(s) {
        const d = $('[data-scramble]', s);
        d.textContent = '0';
        if (reduced) return;
        d.classList.add('scramble');
        later(() => {
          const t0 = performance.now();
          const step = (now) => {
            const k = (now - t0) / 1300;
            if (k >= 1) { d.textContent = '0'; d.classList.remove('scramble'); return; }
            d.textContent = String(Math.floor(Math.random() * 10));
            const id = requestAnimationFrame(() => later(() => step(performance.now()), 40 + k * 90));
            rafs.add(id);
          };
          step(t0);
        }, 950);
      },
      leave(s) { const d = $('[data-scramble]', s); d.textContent = '0'; d.classList.remove('scramble'); },
    },
    10: {
      // counters in table order, staggered per row
      enter(s) { $$('tr.row', s).forEach((tr, r) => $$('[data-count]', tr).forEach((el) => countUp(el, 1150 + r * 200))); },
    },
    14: { enter() { finNet.start(); }, leave() { finNet.stop(); } },
  };

  /* ---------------------------------------------------------------------
     Navigation core
     --------------------------------------------------------------------- */
  const counterEl = $('#counter');
  const curNum = $('#curNum');
  const progress = $('#progress');
  const sweep = $('#sweep');
  const pad = (n) => String(n).padStart(2, '0');

  slides.forEach((s, i) => {
    const b = document.createElement('button');
    b.setAttribute('aria-label', `ไปสไลด์ ${i + 1}: ${s.dataset.title}`);
    b.dataset.nonav = '';
    b.innerHTML = `<span class="tip">${pad(i + 1)} · ${s.dataset.title}</span>`;
    b.addEventListener('click', (e) => { e.stopPropagation(); go(i); });
    progress.appendChild(b);
  });
  const progBtns = $$('button', progress);

  function setCounter(n, back) {
    counterEl.classList.toggle('back', back);
    const old = curNum.querySelector('span:not(.out)');
    $$('.out', curNum).forEach((e) => e.remove());
    if (old) { old.className = 'out'; }
    const s = document.createElement('span');
    s.className = 'in';
    s.textContent = pad(n + 1);
    curNum.appendChild(s);
    setTimeout(() => { if (old) old.remove(); }, 460);
  }

  function enterSlide(s, n) {
    s.classList.remove('is-in');
    void s.offsetWidth; // restart CSS animations
    s.classList.add('is-in');
    (HOOKS[n + 1] && HOOKS[n + 1].enter) && HOOKS[n + 1].enter(s);
  }
  function leaveSlide(s, n) {
    (HOOKS[n + 1] && HOOKS[n + 1].leave) && HOOKS[n + 1].leave(s);
  }

  const leaveTimers = new Map();
  function go(n, opts = {}) {
    n = clamp(n, 0, N - 1);
    if (n === idx) return;
    const prev = idx;
    const back = n < prev;
    idx = n;
    clearSlideTimers();

    // finish any in-flight exits immediately
    slides.forEach((s, i) => {
      if (i !== n && i !== prev) {
        s.classList.remove('is-current', 'is-leaving', 'enter', 'leave', 'back', 'is-in');
      }
    });

    const cur = slides[n];
    if (prev >= 0) {
      const old = slides[prev];
      leaveSlide(old, prev);
      old.classList.remove('is-current', 'enter', 'back');
      void old.offsetWidth;
      old.classList.add('is-leaving', 'leave');
      old.classList.toggle('back', back);
      clearTimeout(leaveTimers.get(old));
      leaveTimers.set(old, setTimeout(() => {
        if (slides.indexOf(old) !== idx) old.classList.remove('is-leaving', 'leave', 'back', 'is-in');
      }, reduced ? 400 : 900));
    }
    clearTimeout(leaveTimers.get(cur));
    cur.classList.remove('is-leaving', 'leave', 'back', 'enter');
    void cur.offsetWidth;
    cur.classList.add('is-current');
    if (prev >= 0 && !opts.instant) cur.classList.add('enter');
    cur.classList.toggle('back', back);
    enterSlide(cur, n);

    if (!reduced && prev >= 0 && (cur.dataset.tr === 'sweep' || cur.dataset.tr === 'zoom')) {
      sweep.classList.remove('run'); void sweep.offsetWidth; sweep.classList.add('run');
    }

    body.dataset.mood = cur.dataset.mood || 'calm';
    body.dataset.slide = n + 1;
    setCounter(n, back);
    progBtns.forEach((b, i) => { b.classList.toggle('on', i === n); b.classList.toggle('done', i < n); });
    $('#prevBtn').disabled = n === 0;
    $('#nextBtn').disabled = n === N - 1;
    placeLumi(n + 1);
    updateNotes();
    updateOverview();
    cur.setAttribute('aria-hidden', 'false');
    slides.forEach((s, i) => { if (i !== n) s.setAttribute('aria-hidden', 'true'); });
    if (!opts.noHash) history.replaceState(null, '', `#${n + 1}`);
  }
  const next = () => go(idx + 1);
  const prevSlide = () => go(idx - 1);

  /* ---------------------------------------------------------------------
     Input: keyboard
     --------------------------------------------------------------------- */
  let lastKey = 0;
  let jumpBuf = '', jumpT = 0;
  function overlayOpen() { return body.classList.contains('ov-open') || body.classList.contains('help-open'); }
  function closeOverlays() { body.classList.remove('ov-open', 'help-open'); }

  document.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    const k = e.key;
    const navKeys = ['ArrowRight', 'ArrowLeft', ' ', 'PageDown', 'PageUp', 'ArrowDown', 'ArrowUp', 'Home', 'End'];
    if (navKeys.includes(k)) {
      e.preventDefault();
      if (overlayOpen()) { if (k !== ' ') closeOverlays(); else return; }
      const now = performance.now();
      if (e.repeat && now - lastKey < 320) return; // held keys step at a controlled pace
      lastKey = now;
      if (k === 'ArrowRight' || k === ' ' || k === 'PageDown' || k === 'ArrowDown') next();
      else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'ArrowUp') prevSlide();
      else if (k === 'Home') go(0);
      else if (k === 'End') go(N - 1);
      return;
    }
    if (/^[0-9]$/.test(k)) {
      jumpBuf = (performance.now() - jumpT < 1500 ? jumpBuf : '') + k;
      jumpT = performance.now();
      return;
    }
    switch (k.toLowerCase()) {
      case 'enter':
        if (jumpBuf && performance.now() - jumpT < 3000) { go(parseInt(jumpBuf, 10) - 1); jumpBuf = ''; e.preventDefault(); }
        break;
      case 'f': toggleFull(); break;
      case 'n': toggleNotes(); break;
      case 'o': case 'g': toggleOverview(); break;
      case 'h': body.classList.toggle('ui-hidden'); break;
      case '?': case '/': body.classList.toggle('help-open'); body.classList.remove('ov-open'); break;
      case 'escape': closeOverlays(); break;
      default: break;
    }
  });

  /* ---------------------------------------------------------------------
     Input: wheel — one slide per intentional gesture (trackpad-safe)
     --------------------------------------------------------------------- */
  let wheelLock = false, wheelAcc = 0, wheelIdle = 0, lastWheelNav = 0;
  window.addEventListener('wheel', (e) => {
    if (e.target.closest && e.target.closest('.np-text, .overview, .help')) return;
    e.preventDefault();
    if (overlayOpen()) return;
    clearTimeout(wheelIdle);
    // the gesture ends after a short silence; momentum keeps it locked
    wheelIdle = setTimeout(() => { wheelLock = false; wheelAcc = 0; }, 220);
    if (wheelLock) return;
    const d = e.deltaMode === 1 ? e.deltaY * 40 : e.deltaMode === 2 ? e.deltaY * 800 : e.deltaY;
    wheelAcc += d;
    if (Math.abs(wheelAcc) >= 30 && performance.now() - lastWheelNav > 450) {
      wheelAcc > 0 ? next() : prevSlide();
      lastWheelNav = performance.now();
      wheelLock = true;
      wheelAcc = 0;
    }
  }, { passive: false });

  /* ---------------------------------------------------------------------
     Input: click on forward area (right side) — never hijacks controls
     --------------------------------------------------------------------- */
  const INTERACTIVE = 'a, button, input, textarea, select, label, [data-nonav], .ui, .notes-panel, .overview, .help';
  const inFwdZone = (x) => x > window.innerWidth * 0.62;
  $('#app').addEventListener('click', (e) => {
    if (e.button !== 0 || overlayOpen()) return;
    if (e.target.closest(INTERACTIVE)) return;
    const sel = window.getSelection && window.getSelection();
    if (sel && String(sel).length > 0) return;
    if (inFwdZone(e.clientX)) next();
  });

  /* ---------------------------------------------------------------------
     Input: touch swipe
     --------------------------------------------------------------------- */
  let tx = 0, ty = 0, tt = 0, touching = false, idleT = 0;
  window.addEventListener('touchstart', (e) => {
    if (e.touches.length !== 1 || e.target.closest('.np-text, .overview, .help')) return;
    body.classList.add('pointer-live');
    clearTimeout(idleT);
    idleT = setTimeout(() => body.classList.remove('pointer-live', 'in-fwd'), 4000);
    touching = true; tx = e.touches[0].clientX; ty = e.touches[0].clientY; tt = performance.now();
  }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (!touching) return;
    touching = false;
    const t = e.changedTouches[0];
    const dx = t.clientX - tx, dy = t.clientY - ty;
    if (performance.now() - tt > 900) return;
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.2) { dx < 0 ? next() : prevSlide(); }
    else if (Math.abs(dy) > 70 && Math.abs(dy) > Math.abs(dx) * 1.2) { dy < 0 ? next() : prevSlide(); }
  }, { passive: true });

  /* ---------------------------------------------------------------------
     Pointer: spotlight, parallax, tilt cards, magnetic buttons, LUMI gaze
     --------------------------------------------------------------------- */
  const spot = $('#spot');
  let pmx = 0, pmy = 0, pRaf = 0;
  window.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch') return;
    pmx = e.clientX; pmy = e.clientY;
    body.classList.add('pointer-live');
    body.classList.toggle('in-fwd', inFwdZone(pmx) && !e.target.closest(INTERACTIVE) && !overlayOpen() && idx < N - 1);
    clearTimeout(idleT);
    idleT = setTimeout(() => body.classList.remove('pointer-live', 'in-fwd'), 2600);
    if (!pRaf) pRaf = requestAnimationFrame(pointerFrame);
  });
  document.addEventListener('pointerleave', () => body.classList.remove('pointer-live', 'in-fwd'));
  function pointerFrame() {
    pRaf = 0;
    spot.style.transform = `translate(${pmx}px, ${pmy}px)`;
    mouseNX = pmx / window.innerWidth - 0.5;
    mouseNY = pmy / window.innerHeight - 0.5;
    if (lumi) lumi.setPointer(mouseNX, mouseNY);
    if (reduced) return;
    const s = slides[idx];
    if (s && s.classList.contains('s2')) {
      $$('[data-tilt]', s).forEach((c) => {
        const r = c.getBoundingClientRect();
        const dx = (pmx - (r.left + r.width / 2)) / window.innerWidth;
        const dy = (pmy - (r.top + r.height / 2)) / window.innerHeight;
        c.style.transform = `rotateY(${(dx * 14).toFixed(2)}deg) rotateX(${(-dy * 10).toFixed(2)}deg) translateZ(0)`;
      });
    }
  }
  $$('.cbtn, .arrow').forEach((b) => {
    b.addEventListener('pointermove', (e) => {
      if (reduced) return;
      const r = b.getBoundingClientRect();
      const x = (e.clientX - r.left - r.width / 2) * 0.25;
      const y = (e.clientY - r.top - r.height / 2) * 0.25;
      b.style.transform = `translate(${x}px, ${y}px)`;
    });
    b.addEventListener('pointerleave', () => { b.style.transform = ''; });
  });

  /* ---------------------------------------------------------------------
     Controls
     --------------------------------------------------------------------- */
  $('#prevBtn').addEventListener('click', (e) => { e.stopPropagation(); prevSlide(); });
  $('#nextBtn').addEventListener('click', (e) => { e.stopPropagation(); next(); });
  $$('.controls .cbtn').forEach((b) => b.addEventListener('click', (e) => {
    e.stopPropagation();
    const a = b.dataset.act;
    if (a === 'prev') prevSlide();
    else if (a === 'next') next();
    else if (a === 'overview') toggleOverview();
    else if (a === 'notes') toggleNotes();
    else if (a === 'hide') body.classList.toggle('ui-hidden');
    else if (a === 'help') body.classList.toggle('help-open');
    else if (a === 'full') toggleFull();
  }));
  $('#help').addEventListener('click', () => body.classList.remove('help-open'));
  $('#overview').addEventListener('click', (e) => { if (e.target.id === 'overview') body.classList.remove('ov-open'); });

  function toggleFull() {
    const d = document;
    try {
      if (!d.fullscreenElement && !d.webkitFullscreenElement) {
        const el = d.documentElement;
        (el.requestFullscreen || el.webkitRequestFullscreen).call(el);
      } else {
        (d.exitFullscreen || d.webkitExitFullscreen).call(d);
      }
    } catch (err) { /* fullscreen not permitted in this context */ }
  }
  document.addEventListener('fullscreenchange', () => {
    $('[data-act="full"]').classList.toggle('on', !!document.fullscreenElement);
  });

  /* notes */
  const npText = $('#npText'), npNum = $('#npNum'), npNext = $('#npNext'), npTimer = $('#npTimer');
  let timerStart = 0, timerId = 0;
  function updateNotes() {
    const s = slides[idx];
    const notes = $('.notes', s);
    npText.innerHTML = notes ? notes.innerHTML : '<p class="muted">—</p>';
    npNum.textContent = pad(idx + 1);
    npNext.textContent = idx < N - 1 ? `ถัดไป → ${pad(idx + 2)} · ${slides[idx + 1].dataset.title}` : 'สไลด์สุดท้าย — เปิดรับคำถามจากคณะกรรมการ';
  }
  function tickTimer() {
    const sec = Math.floor((Date.now() - timerStart) / 1000);
    npTimer.textContent = `${pad(Math.floor(sec / 60))}:${pad(sec % 60)}`;
  }
  function toggleNotes() {
    const open = body.classList.toggle('notes-open');
    $('[data-act="notes"]').classList.toggle('on', open);
    if (open && !timerStart) timerStart = Date.now();
    clearInterval(timerId);
    if (open) { tickTimer(); timerId = setInterval(tickTimer, 1000); }
  }
  $('#npClose').addEventListener('click', toggleNotes);
  $('#npReset').addEventListener('click', () => { timerStart = Date.now(); tickTimer(); });

  /* overview */
  const ovGrid = $('#ovGrid');
  slides.forEach((s, i) => {
    const c = document.createElement('button');
    c.className = 'ov-card';
    c.style.setProperty('--i', i);
    c.innerHTML = `<b>${pad(i + 1)}</b><span>${s.dataset.title}</span><small>${s.dataset.kicker || ''}</small>`;
    c.addEventListener('click', (e) => { e.stopPropagation(); body.classList.remove('ov-open'); go(i); });
    ovGrid.appendChild(c);
  });
  function updateOverview() { $$('.ov-card', ovGrid).forEach((c, i) => c.classList.toggle('on', i === idx)); }
  function toggleOverview() {
    const open = body.classList.toggle('ov-open');
    body.classList.remove('help-open');
    $('#overview').setAttribute('aria-hidden', String(!open));
  }

  /* ---------------------------------------------------------------------
     Loop: ambient background
     --------------------------------------------------------------------- */
  let bgRaf = 0;
  function bgLoop(t) {
    drawStars(t);
    bgRaf = reduced || document.hidden ? 0 : requestAnimationFrame(bgLoop);
  }
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      cancelAnimationFrame(bgRaf); bgRaf = 0;
      if (lumi) lumi.stop();
    } else {
      if (!bgRaf && !reduced) bgRaf = requestAnimationFrame(bgLoop);
      if (lumi && LUMI_POSE[idx + 1]) lumi.start();
    }
  });
  mqReduce.addEventListener && mqReduce.addEventListener('change', (e) => {
    reduced = e.matches;
    body.classList.toggle('reduced', reduced);
    if (!reduced && !bgRaf) bgRaf = requestAnimationFrame(bgLoop);
  });

  /* ---------------------------------------------------------------------
     Print: settle every slide into its final readable state
     --------------------------------------------------------------------- */
  window.addEventListener('beforeprint', () => {
    $$('[data-count]').forEach((el) => { el.textContent = fmt(parseFloat(el.dataset.count)); });
    $$('[data-type]').forEach((el) => { el.textContent = el.dataset.type; });
    $$('[data-think]').forEach((el) => { el.style.display = 'none'; });
    $$('[data-answer]').forEach((el) => { el.style.cssText = ''; });
    [['#heroNet', heroNet], ['#finNet', finNet]].forEach(([sel, net]) => {
      const c = $(sel);
      c.width = 1920; c.height = 1080;
      c.getContext('2d').setTransform(1, 0, 0, 1, 0, 0);
      net.settle();
      // Chrome drops the page background behind a live canvas in PDFs — print a snapshot instead
      const img = new Image();
      img.className = 'print-snap';
      img.alt = '';
      img.src = c.toDataURL('image/png');
      c.after(img);
    });
  });
  window.addEventListener('afterprint', () => { $$('.print-snap').forEach((n) => n.remove()); resizeCanvases(); });

  /* ---------------------------------------------------------------------
     Boot
     --------------------------------------------------------------------- */
  body.classList.toggle('reduced', reduced);
  buildChart();
  buildNet12();
  loadPhotos();
  fit();
  initStars();
  window.addEventListener('resize', () => { fit(); initStars(); if (reduced) drawStars(0); });

  const start = () => {
    const fromHash = parseInt((location.hash || '').slice(1), 10);
    const first = Number.isFinite(fromHash) ? clamp(fromHash - 1, 0, N - 1) : 0;
    $('#loader').classList.add('done');
    go(first, { instant: true, noHash: first === 0 });
    if (!reduced) bgRaf = requestAnimationFrame(bgLoop); else drawStars(0);
    const toast = $('#toast');
    setTimeout(() => toast.classList.add('show'), 1200);
    setTimeout(() => toast.classList.remove('show'), 6500);
  };
  window.addEventListener('hashchange', () => {
    const n = parseInt(location.hash.slice(1), 10);
    if (Number.isFinite(n) && n - 1 !== idx) go(n - 1, { noHash: true });
  });
  const fontsReady = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  Promise.race([fontsReady, new Promise((r) => setTimeout(r, 2500))]).then(() => setTimeout(start, 350));

  // expose a tiny API for automated checks
  window.TC = { go, get index() { return idx; }, get total() { return N; }, FIN };
})();
