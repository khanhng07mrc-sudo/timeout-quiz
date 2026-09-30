const fs = require('fs');
const path = require('path');

const dir = path.join(process.cwd(), 'public', 'icons', 'powerups');
fs.mkdirSync(dir, { recursive: true });

const svgs = {
  'fifty_fifty.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="ff_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#3b82f6"/>
      <stop offset="100%" stop-color="#1d4ed8"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#ff_grad)"/>
  <path d="M14 48L50 16" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round" stroke-dasharray="3 3"/>
  <text x="18" y="32" fill="#ffffff" font-size="16" font-weight="900" font-family="sans-serif">50</text>
  <text x="32" y="48" fill="#bfdbfe" font-size="16" font-weight="900" font-family="sans-serif">50</text>
  <circle cx="48" cy="18" r="3.5" fill="#60a5fa" stroke="#ffffff" stroke-width="1.5"/>
</svg>`,

  'double.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="db_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#f59e0b"/>
      <stop offset="100%" stop-color="#b45309"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#db_grad)"/>
  <path d="M16 20L28 34M28 20L16 34" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round"/>
  <path d="M34 21C34 18 36.5 16 40.5 16C44.5 16 47 18.5 47 21.5C47 26 40 31.5 34 38H48" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M16 46L24 42L22 50L30 46" stroke="#fef08a" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
</svg>`,

  'score_x2.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sx_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#047857"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#sx_grad)"/>
  <polygon points="32,15 36.5,24.5 47,26 39.5,33.5 41.5,44 32,39 22.5,44 24.5,33.5 17,26 27.5,24.5" fill="#fef08a" stroke="#ffffff" stroke-width="2"/>
  <text x="32" y="53" fill="#ffffff" font-size="11" font-weight="900" font-family="sans-serif" text-anchor="middle">x1.5</text>
</svg>`,

  'shield.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sh_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#06b6d4"/>
      <stop offset="100%" stop-color="#0e7490"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#sh_grad)"/>
  <path d="M32 15C22 18 18 20 18 30C18 42 24 49 32 52C40 49 46 42 46 30C46 20 42 18 32 15Z" fill="#164e63" stroke="#ffffff" stroke-width="3" stroke-linejoin="round"/>
  <path d="M32 21V46M23 32H41" stroke="#a5f3fc" stroke-width="3.5" stroke-linecap="round"/>
  <circle cx="32" cy="32" r="3.5" fill="#ffffff"/>
</svg>`,

  'freeze.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="fz_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#0284c7"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#fz_grad)"/>
  <path d="M32 15V49M15 32H49M20 20L44 44M20 44L44 20" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <path d="M28 18L32 15L36 18M28 46L32 49L36 46M18 28L15 32L18 36M46 28L49 32L46 36" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
  <circle cx="32" cy="32" r="5" fill="#e0f2fe" stroke="#0284c7" stroke-width="2"/>
</svg>`,

  'attack.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="at_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ef4444"/>
      <stop offset="100%" stop-color="#b91c1c"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#at_grad)"/>
  <path d="M16 16L40 40M40 40L48 48M40 40L44 36M40 40L36 44" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M48 16L24 40M24 40L16 48M24 40L20 36M24 40L28 44" stroke="#ffffff" stroke-width="3.5" stroke-linecap="round"/>
  <path d="M15 15L23 18L18 23Z" fill="#fecaca"/>
  <path d="M49 15L41 18L46 23Z" fill="#fecaca"/>
  <circle cx="32" cy="28" r="4" fill="#fbbf24" stroke="#ffffff" stroke-width="1.5"/>
</svg>`,

  'skip.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="sk_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#8b5cf6"/>
      <stop offset="100%" stop-color="#5b21b6"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#sk_grad)"/>
  <path d="M42 22C39.5 19 35.8 17 31.5 17C23.5 17 17 23.5 17 31.5M22 42C24.5 45 28.2 47 32.5 47C40.5 47 47 40.5 47 32.5" stroke="#ffffff" stroke-width="4" stroke-linecap="round"/>
  <polyline points="46,17 43,23 37,20" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
  <polyline points="18,47 21,41 27,44" fill="#ffffff" stroke="#ffffff" stroke-width="2" stroke-linejoin="round"/>
  <text x="32" y="37" fill="#f5d0fe" font-size="15" font-weight="900" font-family="sans-serif" text-anchor="middle">?</text>
</svg>`,

  'time_plus.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="tp_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#ec4899"/>
      <stop offset="100%" stop-color="#9d174d"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#tp_grad)"/>
  <circle cx="32" cy="33" r="16" stroke="#ffffff" stroke-width="3.5"/>
  <path d="M29 13H35M32 13V17" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>
  <path d="M32 25V33L37 36" stroke="#fbcfe8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="M44 19L47 16" stroke="#ffffff" stroke-width="2.5" stroke-linecap="round"/>
  <text x="32" y="53" fill="#fdf2f8" font-size="10" font-weight="900" font-family="sans-serif" text-anchor="middle">+15s</text>
</svg>`,

  'steal.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="st_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#eab308"/>
      <stop offset="100%" stop-color="#854d0e"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#st_grad)"/>
  <circle cx="28" cy="27" r="12" fill="#fef08a" stroke="#ffffff" stroke-width="2.5"/>
  <text x="28" y="33" fill="#854d0e" font-size="15" font-weight="900" font-family="sans-serif" text-anchor="middle">$</text>
  <path d="M44 48C41 43 38 41 33 40C29 39 25 41 23 44L28 47L35 45L40 51L44 48Z" fill="#1f2937" stroke="#ffffff" stroke-width="1.5"/>
  <path d="M34 21L46 17M38 26L48 23M38 33L49 31" stroke="#ffffff" stroke-width="2" stroke-linecap="round"/>
</svg>`,

  'penalty.svg': `<svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="pn_grad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
      <stop offset="0%" stop-color="#dc2626"/>
      <stop offset="100%" stop-color="#7f1d1d"/>
    </linearGradient>
  </defs>
  <rect x="6" y="8" width="52" height="48" rx="12" fill="url(#pn_grad)"/>
  <polygon points="32,15 35,24 44,19 41,28 50,29 42,35 48,42 39,41 38,50 32,43 26,50 25,41 16,42 22,35 14,29 23,28 20,19 29,24" fill="#fef08a" stroke="#ffffff" stroke-width="2"/>
  <path d="M26 29L38 41M38 29L26 41" stroke="#dc2626" stroke-width="3.5" stroke-linecap="round"/>
</svg>`
};

for (const [file, content] of Object.entries(svgs)) {
  fs.writeFileSync(path.join(dir, file), content.trim());
}
console.log('Successfully wrote', Object.keys(svgs).length, 'SVG powerup icons to public/icons/powerups');
