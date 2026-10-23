// Nguồn vẽ tranh nền banner mặc định. Banner dùng ẢNH ĐÃ DỰNG SẴN public/banner-art.webp (cuộn mượt hơn, không phải vẽ lại SVG/bộ lọc nhòe mỗi khung hình).
// Sửa tranh: chỉnh file này rồi chạy `npx tsx scripts/gen-banner.tsx` để dựng lại ảnh.
/** Tranh nền banner mặc định: bầu trời chuyển sắc, tia nắng, mây mềm, đồi cỏ, trường học và nhà cao tầng có chiều sâu, cờ tung bay, chim, ngôi sao. */
export function BannerArt() {
  const star = "M12 2l2.9 6.9 7.1.6-5.4 4.7 1.7 7.1L12 17.6 5.7 21.3l1.7-7.1L2 9.5l7.1-.6z";
  const win = (x: number, y: number, w = 11, h = 13) => <rect key={`${x}-${y}`} x={x} y={y} width={w} height={h} rx="1.5" fill="#fff6d6" opacity=".9" />;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" aria-hidden viewBox="0 18 1600 222" preserveAspectRatio="xMidYMax slice" width="1600" height="222">
      <defs>
        <linearGradient id="bn-wall" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#d4e6f7" /><stop offset="1" stopColor="#8fb9e0" /></linearGradient>
        <linearGradient id="bn-wall2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#c2dbf1" /><stop offset="1" stopColor="#7aa7d3" /></linearGradient>
        <linearGradient id="bn-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#7fa9d6" /><stop offset="1" stopColor="#5d8dc2" /></linearGradient>
        <linearGradient id="bn-hill1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9d7bf" /><stop offset="1" stopColor="#7fbf9f" /></linearGradient>
        <linearGradient id="bn-hill2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8ccaa9" /><stop offset="1" stopColor="#5fae8d" /></linearGradient>
        <linearGradient id="bn-flag" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#ee3a40" /><stop offset="1" stopColor="#c81e27" /></linearGradient>
        <radialGradient id="bn-sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stopColor="#fff" stopOpacity=".95" /><stop offset="1" stopColor="#fff" stopOpacity="0" /></radialGradient>
        <filter id="bn-soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="4" /></filter>
      </defs>
      {/* quầng sáng + tia nắng toả từ giữa */}
      <ellipse cx="800" cy="236" rx="560" ry="190" fill="url(#bn-sun)" opacity=".75" />
      <g fill="#fff" opacity=".2">
        {Array.from({ length: 20 }, (_, i) => { const a = (-86 + i * 9) * Math.PI / 180; const w = 0.04; const r = 1000; return <path key={i} d={`M800 250 L ${800 + r * Math.sin(a - w)} ${250 - r * Math.cos(a - w)} L ${800 + r * Math.sin(a + w)} ${250 - r * Math.cos(a + w)} Z`} />; })}
      </g>
      {/* mây mềm */}
      <g fill="#fff" filter="url(#bn-soft)" opacity=".92">
        {[[290, 54], [1290, 44], [790, 24], [610, 70], [1020, 72]].map(([x, y], i) => (
          <g key={i}><ellipse cx={x} cy={y} rx="110" ry="15" /><ellipse cx={x - 50} cy={y - 10} rx="55" ry="17" /><ellipse cx={x + 20} cy={y - 17} rx="48" ry="19" /><ellipse cx={x + 70} cy={y - 6} rx="45" ry="14" /></g>
        ))}
      </g>
      {/* đồi xa */}
      <path d="M0 200 C 160 150 320 170 470 190 C 640 212 760 170 920 176 C 1100 184 1250 150 1420 168 C 1500 176 1560 170 1600 160 V240 H0Z" fill="#c4e0ef" opacity=".85" />
      {/* trường học (trái) */}
      <g>
        <path d="M95 240V138h340v102z" fill="url(#bn-wall)" /><path d="M365 138h70v102h-70z" fill="#000" opacity=".06" />
        <path d="M80 138 L265 78 L450 138z" fill="url(#bn-roof)" /><path d="M265 78 L450 138 L265 138z" fill="#000" opacity=".07" />
        <circle cx="265" cy="112" r="11" fill="#fff6d6" /><circle cx="265" cy="112" r="11" fill="none" stroke="#5d8dc2" strokeWidth="2" />
        <rect x="263" y="30" width="3" height="52" fill="#6f9bc9" />
        <path d="M266 32 C 290 24 306 42 330 34 V62 C 306 70 290 52 266 60Z" fill="url(#bn-flag)" /><path transform="translate(286 38) scale(.55)" d={star} fill="#ffd400" />
        {[0, 1, 2, 3, 4, 5].map((i) => <rect key={i} x={118 + i * 52} y={158} width="15" height="82" fill="#eef6fd" opacity=".85" />)}
        {[0, 1, 2, 3, 4, 5, 6].map((i) => win(104 + i * 46, 146, 12, 8))}
        <rect x="236" y="196" width="60" height="44" rx="3" fill="#6f9bc9" /><path d="M226 240h80v-5H226z" fill="#5d8dc2" />
        <path d="M10 240V182l62-16v74z" fill="url(#bn-wall2)" /><path d="M455 240V176l78 16v48z" fill="url(#bn-wall2)" />
        {[0, 1].map((r) => [0, 1, 2].map((c) => win(22 + c * 16, 192 + r * 22)))}
      </g>
      {/* nhà cao tầng + cờ (phải) */}
      <g>
        <rect x="1110" y="92" width="92" height="148" fill="url(#bn-wall)" /><rect x="1170" y="92" width="32" height="148" fill="#000" opacity=".07" />
        <rect x="1202" y="128" width="124" height="112" fill="url(#bn-wall2)" /><rect x="1326" y="106" width="78" height="134" fill="url(#bn-wall)" /><rect x="1384" y="106" width="20" height="134" fill="#000" opacity=".07" />
        <rect x="1104" y="88" width="104" height="6" fill="#6f9bc9" /><rect x="1320" y="102" width="90" height="6" fill="#6f9bc9" />
        {[0, 1, 2, 3, 4].map((r) => [0, 1, 2].map((c) => win(1122 + c * 26, 104 + r * 26)))}
        {[0, 1, 2, 3].map((r) => [0, 1, 2, 3, 4].map((c) => win(1214 + c * 22, 142 + r * 24, 10, 12)))}
        {[0, 1, 2, 3].map((r) => [0, 1].map((c) => win(1340 + c * 28, 120 + r * 28)))}
        <rect x="1155" y="42" width="3" height="48" fill="#6f9bc9" />
        <path d="M1158 44 C 1182 36 1198 54 1224 46 V72 C 1198 80 1182 62 1158 70Z" fill="url(#bn-flag)" /><path transform="translate(1178 48) scale(.55)" d={star} fill="#ffd400" />
      </g>
      {/* đồi gần + cỏ */}
      <path d="M0 240 V204 C 130 188 280 200 420 208 C 560 216 640 202 780 206 C 940 210 1010 196 1180 204 C 1340 212 1470 196 1600 206 V240Z" fill="url(#bn-hill1)" />
      <path d="M0 240 V222 C 200 212 420 224 640 226 C 900 228 1180 214 1380 222 C 1480 226 1550 222 1600 218 V240Z" fill="url(#bn-hill2)" />
      {/* cây */}
      {[[60, 214, 1], [520, 216, .8], [1060, 212, .9], [1470, 214, 1], [1560, 222, .7]].map(([x, y, k], i) => (
        <g key={i} transform={`translate(${x} ${y}) scale(${k})`}><rect x="-2" y="-8" width="4" height="14" fill="#5b8f78" /><circle cx="0" cy="-20" r="15" fill="#5fae8d" /><circle cx="-11" cy="-12" r="11" fill="#74bf9f" /><circle cx="11" cy="-12" r="11" fill="#74bf9f" /></g>
      ))}
      {/* chim */}
      <g fill="none" stroke="#2f5f95" strokeWidth="2.2" strokeLinecap="round" opacity=".55">
        {[[640, 46, 1], [676, 34, .8], [716, 52, .7], [930, 40, .9], [968, 54, .7]].map(([x, y, k], i) => <path key={i} transform={`translate(${x} ${y}) scale(${k})`} d="M-9 -2 Q-4.5 -7 0 0 Q4.5 -7 9 -2" />)}
      </g>
      {/* ngôi sao / tia sáng lấp lánh */}
      <g fill="#ffd400" opacity=".95">{[[600, 28, .5], [1000, 30, .45], [770, 184, .35], [70, 40, .4], [1560, 120, .4], [450, 70, .3], [1180, 24, .35]].map(([x, y, k], i) => <path key={i} transform={`translate(${x} ${y}) scale(${k})`} d={star} />)}</g>
    </svg>
  );
}

