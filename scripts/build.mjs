// Builds the profile SVGs in assets/. No dependencies.
// hero.svg and stack.svg are fixed; signal.svg is redrawn every day (seeded by the date).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'assets');
mkdirSync(OUT, { recursive: true });

// Fonts are embedded so the design looks the same on every machine (Sora + JetBrains Mono, OFL).
const font = (file, family, weight) => {
  const p = join(ROOT, 'scripts', 'fonts', file);
  if (!existsSync(p)) return '';
  const b64 = readFileSync(p).toString('base64');
  return `@font-face{font-family:'${family}';font-weight:${weight};src:url(data:font/woff2;base64,${b64}) format('woff2')}`;
};
const FONTS = [
  font('sora-700.woff2', 'Sora', 700),
  font('sora-400.woff2', 'Sora', 400),
  font('jbmono-400.woff2', 'JBM', 400),
].join('');
const DISPLAY = "'Sora','Segoe UI',system-ui,sans-serif";
const MONO = "'JBM',ui-monospace,Menlo,Consolas,monospace";

const C = {
  bg: '#05060b', ink: '#f4f6fb', mute: '#8b93a7', dim: '#4a5168', line: '#ffffff1f',
  cyan: '#22d3ee', violet: '#8b5cf6', pink: '#f472b6', blue: '#3b82f6', green: '#34d399',
};

function rng(seed) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}
const hash = (str) => [...str].reduce((h, ch) => Math.imul(h ^ ch.charCodeAt(0), 16777619), 2166136261);
const esc = (t) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const f1 = (n) => +n.toFixed(1);

// Every animation starts from the finished picture, so a viewer that blocks motion still sees it all.
const BASE_CSS = `text{font-family:${DISPLAY}}.m{font-family:${MONO}}
@media (prefers-reduced-motion: reduce){*{animation:none!important}}`;

const grain = (id = 'grain') => `
<filter id="${id}" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency=".85" numOctaves="2" stitchTiles="stitch"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .55 0"/></filter>`;

const stars = (r, n, w, h, avoid) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * w, y = r() * h;
    if (avoid && Math.hypot(x - avoid.x, y - avoid.y) < avoid.r) continue;
    const size = r() < 0.12 ? 1.4 : 0.8;
    s += `<circle class="tw" cx="${f1(x)}" cy="${f1(y)}" r="${size}" fill="#fff" style="animation-delay:-${f1(r() * 6)}s;animation-duration:${f1(3 + r() * 5)}s"/>`;
  }
  return s;
};

// A speech-like waveform path centred on (cx, cy).
function wavePath(cx, cy, half, amp, r, n = 64) {
  const ph = [r() * 6.28, r() * 6.28, r() * 6.28];
  const fr = [2 + r() * 2, 5 + r() * 3, 9 + r() * 4];
  let d = '';
  for (let i = 0; i <= n; i++) {
    const u = i / n, x = cx - half + u * 2 * half;
    const env = Math.sin(u * Math.PI) ** 1.6;
    const v = Math.sin(u * fr[0] * 6.28 + ph[0]) * 0.6 + Math.sin(u * fr[1] * 6.28 + ph[1]) * 0.3 + Math.sin(u * fr[2] * 6.28 + ph[2]) * 0.15;
    d += `${i ? 'L' : 'M'}${f1(x)} ${f1(cy + v * env * amp)}`;
  }
  return d;
}

// ---------------------------------------------------------------- hero
function hero() {
  const W = 1200, H = 600, ox = 880, oy = 290, R = 150;
  const r = rng(42);

  // Orbit of particles riding a tilted ellipse. Drawn twice (back half behind the orb,
  // front half over it) so the ring reads as 3D.
  const tilt = (-14 * Math.PI) / 180;
  const ellipse = (rx, ry) => {
    let d = '';
    for (let i = 0; i <= 96; i++) {
      const t = (i / 96) * Math.PI * 2, x = Math.cos(t) * rx, y = Math.sin(t) * ry;
      d += `${i ? 'L' : 'M'}${f1(ox + x * Math.cos(tilt) - y * Math.sin(tilt))} ${f1(oy + x * Math.sin(tilt) + y * Math.cos(tilt))}`;
    }
    return d + 'Z';
  };
  const tracks = [ellipse(214, 58), ellipse(228, 62), ellipse(242, 66)];
  let orbit = '';
  for (let i = 0; i < 150; i++) {
    const size = r() < 0.12 ? 2.4 : 1 + r() * 0.9;
    const col = [C.cyan, C.violet, '#ffffff', C.pink][Math.floor(r() * 4)];
    const dur = 26;
    orbit += `<circle r="${f1(size)}" fill="${col}" opacity="${f1(0.5 + r() * 0.5)}"><animateMotion dur="${dur}s" begin="-${f1((i / 150) * dur + r() * 0.3)}s" repeatCount="indefinite" path="${tracks[i % 3]}"/></circle>`;
  }
  const orbitGroup = (mask) => `<g mask="url(#${mask})">${orbit}</g>`;

  const blobs = [
    { c: C.violet, dx: -40, dy: -30, r: 120, dur: 9, dir: 1 },
    { c: C.cyan, dx: 50, dy: 30, r: 105, dur: 7, dir: -1 },
    { c: C.pink, dx: 20, dy: -60, r: 80, dur: 11, dir: 1 },
    { c: C.blue, dx: -50, dy: 60, r: 95, dur: 13, dir: -1 },
  ].map((b) => `<g class="orbit" style="animation-duration:${b.dur}s;animation-direction:${b.dir > 0 ? 'normal' : 'reverse'}"><circle cx="${ox + b.dx}" cy="${oy + b.dy}" r="${b.r}" fill="${b.c}"/></g>`).join('');

  const waves = Array.from({ length: 5 }, () => wavePath(ox, oy, 108, 34, r));
  const waveAnim = (extra) => `<animate attributeName="d" dur="2.6s" repeatCount="indefinite" calcMode="spline" keySplines="${Array(5).fill('.45 0 .55 1').join(';')}" values="${[...waves, waves[0]].join(';')}"${extra}/>`;

  const ripples = [0, 1, 2].map((k) => `<circle cx="${ox}" cy="${oy}" r="${R}" fill="none" stroke="url(#rim)" stroke-width="1.2" opacity="0">
<animate attributeName="r" values="${R};${R + 150}" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/>
<animate attributeName="opacity" values=".7;0" dur="4.5s" begin="${k * 1.5}s" repeatCount="indefinite"/></circle>`).join('');

  const transcript = [
    ['heard', '“where’s my order?”', C.ink],
    ['intent', 'track_order · 0.97', C.cyan],
    ['reply', '“Out for delivery, arriving 4:20 pm.”', C.ink],
  ].map(([k, v, col], i) => `<g class="tl" style="animation-delay:${i * 1.1}s"><text class="m" x="64" y="${474 + i * 28}" font-size="14" fill="${C.dim}">›</text><text class="m" x="84" y="${474 + i * 28}" font-size="14" fill="${C.mute}">${k}</text><text class="m" x="168" y="${474 + i * 28}" font-size="14" fill="${col}">${esc(v)}</text></g>`).join('');

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Omar AlShishani — I build machines that listen, understand, and reply.">
<style>${FONTS}${BASE_CSS}
.tw{animation:tw 5s ease-in-out infinite}@keyframes tw{0%,100%{opacity:.15}50%{opacity:.9}}
.orbit{transform-box:view-box;transform-origin:${ox}px ${oy}px;animation:spin 9s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
.breathe{transform-box:view-box;transform-origin:${ox}px ${oy}px;animation:breathe 5s ease-in-out infinite}
@keyframes breathe{0%,100%{transform:scale(1);opacity:.75}50%{transform:scale(1.08);opacity:1}}
.drift{animation:drift 18s ease-in-out infinite alternate}@keyframes drift{to{transform:translate(60px,30px)}}
.up{animation:up 1.1s cubic-bezier(.2,.7,.2,1) backwards}@keyframes up{from{opacity:0;transform:translateY(24px)}}
.tl{animation:tl 9s ease-out infinite backwards}@keyframes tl{0%,4%{opacity:0}9%,88%{opacity:1}100%{opacity:0}}
.dot{animation:dot 1.6s ease-in-out infinite}@keyframes dot{50%{opacity:.25}}
</style>
<defs>${grain()}
<filter id="soft" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="30"/></filter>
<filter id="haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="70"/></filter>
<filter id="glow" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="3" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
<clipPath id="orb"><circle cx="${ox}" cy="${oy}" r="${R}"/></clipPath>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath>
<radialGradient id="halo"><stop offset=".55" stop-color="${C.violet}" stop-opacity=".35"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
<radialGradient id="shade" cx=".5" cy=".5" r=".5"><stop offset=".6" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".55"/></radialGradient>
<radialGradient id="gloss" cx=".35" cy=".22" r=".45"><stop offset="0" stop-color="#fff" stop-opacity=".28"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".8"/><stop offset=".5" stop-color="${C.cyan}" stop-opacity=".25"/><stop offset="1" stop-color="${C.violet}" stop-opacity=".7"/></linearGradient>
<linearGradient id="name" x1="0" x2="600" gradientUnits="userSpaceOnUse" spreadMethod="reflect"><stop offset="0" stop-color="${C.cyan}"/><stop offset=".5" stop-color="${C.violet}"/><stop offset="1" stop-color="${C.pink}"/>
<animateTransform attributeName="gradientTransform" type="translate" values="0 0;600 0;0 0" dur="10s" repeatCount="indefinite"/></linearGradient>
<linearGradient id="backfade" x1="0" y1="0" x2="0" y2="1"><stop offset=".44" stop-color="#fff" stop-opacity=".55"/><stop offset=".52" stop-color="#fff" stop-opacity="0"/></linearGradient>
<linearGradient id="frontfade" x1="0" y1="0" x2="0" y2="1"><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset=".55" stop-color="#fff" stop-opacity="1"/></linearGradient>
<mask id="back"><rect x="${ox - 280}" y="${oy - 140}" width="560" height="280" fill="url(#backfade)"/></mask>
<mask id="front"><rect x="${ox - 280}" y="${oy - 140}" width="560" height="280" fill="url(#frontfade)"/></mask>
<linearGradient id="hr" x1="0" x2="1"><stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset=".5" stop-color="#fff" stop-opacity=".18"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></linearGradient>
</defs>
<g clip-path="url(#frame)">
<rect width="${W}" height="${H}" fill="${C.bg}"/>
<g class="drift" filter="url(#haze)" opacity=".5"><ellipse cx="1000" cy="40" rx="320" ry="140" fill="${C.violet}"/><ellipse cx="120" cy="620" rx="360" ry="140" fill="${C.cyan}" opacity=".55"/></g>
${stars(r, 110, W, H, { x: ox, y: oy, r: 240 })}

<circle class="breathe" cx="${ox}" cy="${oy}" r="${R + 110}" fill="url(#halo)"/>
${ripples}
${orbitGroup('back')}
<g clip-path="url(#orb)">
  <circle cx="${ox}" cy="${oy}" r="${R}" fill="#0a0c24"/>
  <g filter="url(#soft)" style="mix-blend-mode:screen">${blobs}</g>
  <path d="${waves[0]}" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".95" filter="url(#glow)">${waveAnim('')}</path>
  <path d="${waves[2]}" fill="none" stroke="${C.cyan}" stroke-width="1.4" opacity=".7" transform="translate(0 6)">${waveAnim(' begin="-1.3s"')}</path>
  <circle cx="${ox}" cy="${oy}" r="${R}" fill="url(#shade)"/>
  <ellipse cx="${ox - 52}" cy="${oy - 82}" rx="62" ry="30" fill="url(#gloss)" transform="rotate(-24 ${ox - 52} ${oy - 82})"/>
</g>
<circle cx="${ox}" cy="${oy}" r="${R - 0.5}" fill="none" stroke="url(#rim)" stroke-width="1.2"/>
${orbitGroup('front')}

<g class="up" style="animation-delay:.1s">
  <rect x="64" y="72" width="178" height="30" rx="15" fill="#ffffff08" stroke="${C.line}"/>
  <circle class="dot" cx="84" cy="87" r="4" fill="${C.green}"/><circle cx="84" cy="87" r="8" fill="${C.green}" opacity=".18"/>
  <text class="m" x="98" y="91.5" font-size="12" fill="${C.mute}" letter-spacing="1.5">LISTENING NOW</text>
</g>
<g class="up" style="animation-delay:.25s"><text x="58" y="222" font-size="104" font-weight="700" fill="${C.ink}" letter-spacing="-4">Omar</text></g>
<g class="up" style="animation-delay:.4s"><text x="58" y="328" font-size="104" font-weight="700" fill="url(#name)" letter-spacing="-4">AlShishani</text></g>
<g class="up" style="animation-delay:.6s"><text x="64" y="384" font-size="22" fill="${C.mute}">I build machines that <tspan fill="${C.ink}">listen, understand, and reply.</tspan></text></g>
<rect x="64" y="424" width="470" height="1" fill="url(#hr)"/>
${transcript}
<text class="m" x="64" y="568" font-size="12" fill="${C.dim}" letter-spacing="2">VOICE → TEXT → MEANING → ACTION</text>
<text class="m" x="${W - 64}" y="568" font-size="12" fill="${C.dim}" letter-spacing="2" text-anchor="end">CONVERSATIONAL AI ENGINEER</text>
<rect width="${W}" height="${H}" filter="url(#grain)" opacity=".05"/>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="23.5" fill="none" stroke="${C.line}"/>
</svg>`;
}

// ---------------------------------------------------------------- stack
const ICONS = {
  wave: 'M4 12h2M8 8v8M12 5v14M16 9v6M20 11v2',
  spark: 'M12 3l1.8 5.6L19.5 10l-5.7 1.6L12 17l-1.8-5.4L4.5 10l5.7-1.4z M19 16l.7 1.8 1.8.7-1.8.7-.7 1.8-.7-1.8-1.8-.7 1.8-.7z',
  nodes: 'M12 4a2 2 0 1 0 0 .01M5 18a2 2 0 1 0 0 .01M19 18a2 2 0 1 0 0 .01M12 6v5M12 11l-6 5.5M12 11l6 5.5',
  layers: 'M12 3l9 5-9 5-9-5z M3 13l9 5 9-5 M3 17.5l9 5 9-5',
  server: 'M4 4h16v6H4z M4 14h16v6H4z M8 7h.01 M8 17h.01',
};
function stack() {
  const W = 1200, H = 270;
  const tiles = [
    ['wave', 'Conversational AI', 'NLU · intents · dialog', C.cyan],
    ['spark', 'LLM Systems', 'RAG · guardrails · evals', C.violet],
    ['nodes', 'Agent Fleets', 'write · review · test', C.pink],
    ['layers', 'Platform', 'Java · Spring · React', C.blue],
    ['server', 'Infra', 'Docker · CI/CD · GPUs', C.green],
  ];
  const tw = 208, gap = 16, x0 = (W - (tw * 5 + gap * 4)) / 2, y0 = 84, th = 150;
  const body = tiles.map(([ic, t, s, col], i) => {
    const x = x0 + i * (tw + gap);
    return `<g class="up" style="animation-delay:${0.1 + i * 0.12}s">
<rect x="${x}" y="${y0}" width="${tw}" height="${th}" rx="18" fill="url(#tile)" stroke="${C.line}"/>
<rect x="${x + 24}" y="${y0}" width="${tw - 48}" height="1.5" fill="${col}" opacity=".0"><animate attributeName="opacity" values="0;.9;0" dur="5s" begin="${i}s" repeatCount="indefinite"/></rect>
<circle cx="${x + 38}" cy="${y0 + 42}" r="20" fill="${col}" opacity=".12"/>
<g transform="translate(${x + 26} ${y0 + 30})" fill="none" stroke="${col}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="${ICONS[ic]}"/></g>
<text x="${x + 20}" y="${y0 + 102}" font-size="18" font-weight="700" fill="${C.ink}" letter-spacing="-.3">${t}</text>
<text class="m" x="${x + 20}" y="${y0 + 128}" font-size="11" fill="${C.mute}">${esc(s)}</text>
</g>`;
  }).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="What I work on: conversational AI, LLM systems, agent fleets, platform, infra.">
<style>${FONTS}${BASE_CSS}
.up{animation:up 1s cubic-bezier(.2,.7,.2,1) backwards}@keyframes up{from{opacity:0;transform:translateY(16px)}}</style>
<defs><linearGradient id="tile" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#ffffff0d"/><stop offset="1" stop-color="#ffffff03"/></linearGradient>
<filter id="haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="60"/></filter>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs>
<g clip-path="url(#frame)"><rect width="${W}" height="${H}" fill="${C.bg}"/>
<ellipse cx="600" cy="320" rx="420" ry="80" fill="${C.violet}" opacity=".35" filter="url(#haze)"/>
<text class="m" x="${x0}" y="54" font-size="12" fill="${C.dim}" letter-spacing="2">// WHAT I WORK ON</text>
${body}</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="23.5" fill="none" stroke="${C.line}"/>
</svg>`;
}

// ---------------------------------------------------------------- signal of the day
const LINES = [
  'The best interface is a sentence.',
  'Understanding is a feature. Ship it.',
  'Every “I didn’t get that” is a bug report.',
  'Listen first. Then compute.',
  'Small, boring, correct — then clever.',
  'A model is only as good as its worst conversation.',
  'Read the logs before you guess.',
  'People speak in dialects, not datasets.',
  'Latency is part of the answer.',
  'Make it work, make it clear, make it kind.',
  'Silence is also a signal.',
  'Build generic. Configure specific.',
];
function signal(date) {
  const W = 1200, H = 260, cx = 150, cy = 130;
  const iso = date.toISOString().slice(0, 10);
  const r = rng(hash(iso));
  const parts = Array.from({ length: 3 }, () => ({ f: 2 + Math.floor(r() * 7), p: r() * 6.28, a: 0.4 + r() * 0.6 }));
  const n = 96;
  let bars = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const v = Math.abs(parts.reduce((s, q) => s + q.a * Math.sin(a * q.f + q.p), 0)) / 1.8;
    const len = 8 + v * 46 + r() * 6;
    const x1 = cx + Math.cos(a) * 48, y1 = cy + Math.sin(a) * 48;
    const x2 = cx + Math.cos(a) * (48 + len), y2 = cy + Math.sin(a) * (48 + len);
    const col = i / n < 0.33 ? C.cyan : i / n < 0.66 ? C.violet : C.pink;
    bars += `<line x1="${f1(x1)}" y1="${f1(y1)}" x2="${f1(x2)}" y2="${f1(y2)}" stroke="${col}" stroke-width="2.2" stroke-linecap="round" opacity="${f1(0.45 + v * 0.55)}"/>`;
  }
  const line = LINES[Math.floor(r() * LINES.length)];
  const day = new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date).toUpperCase();
  const size = line.length > 40 ? 30 : 36;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}" role="img" aria-label="Signal of the day, ${iso}: ${esc(line)}">
<style>${FONTS}${BASE_CSS}
.rot{transform-box:view-box;transform-origin:${cx}px ${cy}px;animation:rot 60s linear infinite}@keyframes rot{to{transform:rotate(360deg)}}
.pulse{transform-box:view-box;transform-origin:${cx}px ${cy}px;animation:pulse 2.4s ease-in-out infinite}@keyframes pulse{50%{transform:scale(1.06)}}
.up{animation:up 1s cubic-bezier(.2,.7,.2,1) backwards}@keyframes up{from{opacity:0;transform:translateY(14px)}}</style>
<defs><filter id="haze" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="40"/></filter>
<radialGradient id="core"><stop offset="0" stop-color="#fff" stop-opacity=".9"/><stop offset=".35" stop-color="${C.violet}" stop-opacity=".6"/><stop offset="1" stop-color="${C.violet}" stop-opacity="0"/></radialGradient>
<clipPath id="frame"><rect width="${W}" height="${H}" rx="24"/></clipPath></defs>
<g clip-path="url(#frame)"><rect width="${W}" height="${H}" fill="${C.bg}"/>
<circle cx="${cx}" cy="${cy}" r="110" fill="${C.violet}" opacity=".22" filter="url(#haze)"/>
<g class="pulse"><g class="rot">${bars}</g></g>
<circle cx="${cx}" cy="${cy}" r="30" fill="url(#core)"/>
<g class="up"><text class="m" x="300" y="88" font-size="12" fill="${C.dim}" letter-spacing="2">SIGNAL OF THE DAY · ${esc(day)}</text></g>
<g class="up" style="animation-delay:.2s"><text x="298" y="146" font-size="${size}" font-weight="700" fill="${C.ink}" letter-spacing="-1">${esc(line)}</text></g>
<g class="up" style="animation-delay:.4s"><text class="m" x="300" y="190" font-size="12" fill="${C.mute}">redrawn every day · a new waveform, a new line · never the same twice</text></g>
</g>
<rect x=".5" y=".5" width="${W - 1}" height="${H - 1}" rx="23.5" fill="none" stroke="${C.line}"/>
</svg>`;
}

const today = new Date(process.env.PROFILE_DATE || Date.now());
writeFileSync(join(OUT, 'hero.svg'), hero());
writeFileSync(join(OUT, 'stack.svg'), stack());
writeFileSync(join(OUT, 'signal.svg'), signal(today));
console.log('built assets for', today.toISOString().slice(0, 10));
