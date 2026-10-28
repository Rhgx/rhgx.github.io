#version 300 es
precision highp float;

uniform vec2 uRes;      // canvas size in device pixels
uniform float uDpr;     // device pixels per CSS pixel
uniform float uTime;    // seconds
uniform float uScroll;  // page scroll in CSS pixels
uniform vec3 uPointer;  // xy: smoothed pointer in device pixels (GL origin), z: 0..1 presence

out vec4 outColor;

// 3D simplex noise by Ashima Arts and Stefan Gustavson (MIT).
// Using 3D lets the terrain evolve in place over time instead of sliding.
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 10.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);
  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;
  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;
  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
  vec4 m = max(0.5 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 105.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

const float SCALE = 560.0;     // CSS pixels per terrain unit
const float PARALLAX = 0.5;    // how far the terrain follows the page when scrolling

float terrain(vec2 p, float t) {
  // A gentle domain warp so ridges fold into each other instead of looking like blobs.
  vec2 w = vec2(snoise(vec3(p * 0.7, t * 0.6)), snoise(vec3(p * 0.7 + 7.3, t * 0.6)));
  p += w * 0.32;
  float h = 0.0, a = 0.6, f = 1.0;
  for (int i = 0; i < 3; i++) {
    h += a * snoise(vec3(p * f, t + float(i) * 3.1));
    f *= 2.07;
    a *= 0.36;
  }
  return h;
}

float hash12(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

void main() {
  vec2 px = gl_FragCoord.xy;
  float t = uTime * 0.035;

  // Terrain coordinates follow the page partway, so the map drifts up as you scroll.
  vec2 world = vec2(px.x, px.y - uScroll * PARALLAX * uDpr) / (SCALE * uDpr);
  float h = terrain(world + vec2(t * 0.25, 0.0), t);

  // The pointer raises a soft hill, so nearby contours bend and tighten around it.
  vec2 dp = (px - uPointer.xy) / uDpr;
  float near = exp(-dot(dp, dp) / (2.0 * 150.0 * 150.0)) * uPointer.z;
  h += near * 0.55;

  // Contour lines with a constant on-screen width, however steep the terrain is.
  float v = h * 6.0;
  float fw = max(fwidth(v), 1e-4);
  float dist = abs(fract(v + 0.5) - 0.5) / fw;
  bool index = mod(floor(v + 0.5), 5.0) == 0.0;
  float halfW = (index ? 0.75 : 0.45) * uDpr;
  float line = 1.0 - smoothstep(halfW - 0.5, halfW + 0.75, dist);

  // Faint hillshade from a light at the top left gives the map some relief.
  vec2 grad = vec2(dFdx(h), dFdy(h)) * SCALE * uDpr;
  float shade = clamp(dot(grad, normalize(vec2(1.0, -1.0))) * 0.006, -0.018, 0.018);

  // Strongest near the top of the page, calmer behind the lower sections.
  float pageY = uScroll + (uRes.y - px.y) / uDpr;
  float fade = mix(1.0, 0.4, smoothstep(0.0, 1100.0, pageY));

  // Kept darker and fainter than the cards so they stand out from the map.
  vec3 bg = vec3(0.051, 0.059, 0.067);
  vec3 ink = vec3(0.15, 0.163, 0.18);
  vec3 amber = vec3(0.96, 0.62, 0.04);

  vec3 col = bg + shade + smoothstep(-0.7, 0.9, h) * 0.012;
  float lineAlpha = line * fade * (index ? 0.26 : 0.5) * (1.0 + near * 1.1);
  col = mix(col, index ? amber : ink, clamp(lineAlpha, 0.0, 1.0));

  // Dither to hide banding in the dark gradients.
  col += (hash12(px) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}
