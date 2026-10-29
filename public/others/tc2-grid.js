// Shared by the TC2 tool pages (Time Calculator, Bingo). Load it before the page script,
// then call startGridBackground(canvas) on a canvas laid over the panel.

// Moving panel grid, the Loadout Generator's shader recolored to the in-game panel
// (#1e1f2c with #2f303c lines, 15px cells). The canvas stays hidden (so the static CSS
// grid shows) until the first frame draws, and again if WebGL is lost.
//
// Everything is in whole device pixels: the cell size, the line width and the scroll
// offset are rounded in JS, and the offset wraps at one cell. Fractional positions made
// lines flicker between one and two pixels wide on high-DPI screens, and large values
// lose precision on GPUs where mediump is 16-bit.
const gridVertexShader = `
  attribute vec2 position;
  void main() {
    gl_Position = vec4(position, 0.0, 1.0);
  }
`;
const gridFragmentShader = `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif
  uniform vec2 offset;
  uniform float cell;
  uniform float line;
  void main() {
    vec2 gridPosition = mod(floor(gl_FragCoord.xy) + offset, cell);
    float grid = max(step(cell - line, gridPosition.x), step(cell - line, gridPosition.y));
    gl_FragColor = vec4(mix(vec3(0.118, 0.122, 0.173), vec3(0.184, 0.188, 0.235), grid), 1.0);
  }
`;
const gridCell = 15;
const gridSpeed = 7.5;

function startGridBackground(canvas) {
  const gl = canvas.getContext('webgl', { alpha: false, antialias: false });
  if (!gl) return;

  const compile = (type, source) => {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      throw new Error(gl.getShaderInfoLog(shader) || 'Shader compilation failed');
    }
    return shader;
  };
  const program = gl.createProgram();
  try {
    gl.attachShader(program, compile(gl.VERTEX_SHADER, gridVertexShader));
    gl.attachShader(program, compile(gl.FRAGMENT_SHADER, gridFragmentShader));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) || 'Shader linking failed');
    }
  } catch (error) {
    console.warn('Using static panel grid:', error);
    return;
  }
  gl.useProgram(program);
  gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]), gl.STATIC_DRAW);
  const position = gl.getAttribLocation(program, 'position');
  gl.enableVertexAttribArray(position);
  gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);
  const offsetUniform = gl.getUniformLocation(program, 'offset');
  const cellUniform = gl.getUniformLocation(program, 'cell');
  const lineUniform = gl.getUniformLocation(program, 'line');

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');
  const start = performance.now();
  let frame = 0;
  let lost = false;
  let scale = 1;
  let cell = gridCell;
  let lastShift = -1;

  // Only redraws when the grid has moved a whole pixel. Reduced motion draws one still frame.
  const draw = (now) => {
    frame = 0;
    if (lost || document.hidden) return;
    const shift = reducedMotion.matches ? 0 : Math.floor(((now - start) / 1000) * gridSpeed * scale) % cell;
    if (shift !== lastShift) {
      lastShift = shift;
      // Drifts left and up like the Loadout Generator; gl_FragCoord.y counts up from the bottom.
      gl.uniform2f(offsetUniform, shift, cell - shift);
      gl.drawArrays(gl.TRIANGLES, 0, 6);
      canvas.style.visibility = 'visible';
    }
    if (!reducedMotion.matches) frame = requestAnimationFrame(draw);
  };
  const redraw = () => {
    cancelAnimationFrame(frame);
    lastShift = -1;
    draw(performance.now());
  };
  // Sizes the canvas to its exact device-pixel box so the browser never rescales it.
  const resize = ([entry]) => {
    if (lost) return;
    const dpr = devicePixelRatio || 1;
    let width = Math.round(entry.contentRect.width * dpr);
    let height = Math.round(entry.contentRect.height * dpr);
    // The exact device-pixel box fixes rounding at fractional zoom. It is only trusted when
    // it agrees with devicePixelRatio, since emulated ratios (DevTools) do not change it.
    const devicePixels = entry.devicePixelContentBoxSize?.[0];
    if (devicePixels && Math.abs(devicePixels.inlineSize - width) <= 1 && Math.abs(devicePixels.blockSize - height) <= 1) {
      width = devicePixels.inlineSize;
      height = devicePixels.blockSize;
    }
    width = Math.max(1, width);
    height = Math.max(1, height);
    if (canvas.width !== width) canvas.width = width;
    if (canvas.height !== height) canvas.height = height;
    gl.viewport(0, 0, width, height);
    scale = entry.contentRect.width > 0 ? width / entry.contentRect.width : dpr;
    cell = Math.max(2, Math.round(gridCell * scale));
    gl.uniform1f(cellUniform, cell);
    gl.uniform1f(lineUniform, Math.max(1, Math.round(scale)));
    redraw();
  };

  const observer = new ResizeObserver(resize);
  try {
    observer.observe(canvas, { box: 'device-pixel-content-box' });
  } catch {
    // Safari has no device-pixel-content-box; contentRect times devicePixelRatio is close enough.
    observer.observe(canvas);
  }
  document.addEventListener('visibilitychange', redraw);
  reducedMotion.addEventListener('change', redraw);
  canvas.addEventListener('webglcontextlost', () => {
    lost = true;
    cancelAnimationFrame(frame);
    canvas.style.visibility = 'hidden';
  });
}
