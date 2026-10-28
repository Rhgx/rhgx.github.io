import { useEffect, useRef, useSyncExternalStore } from 'react';
import fragmentSource from './contours.frag.glsl?raw';

const vertexSource = `#version 300 es
in vec2 position;
void main() { gl_Position = vec4(position, 0.0, 1.0); }`;

const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');

// Follows the setting live, so turning it on in the OS stops the animation without a reload.
function subscribeToMotion(onChange: () => void) {
  motionQuery.addEventListener('change', onChange);
  return () => motionQuery.removeEventListener('change', onChange);
}

function compile(gl: WebGL2RenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) throw new Error('Could not create shader');
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? 'Shader failed to compile');
  }
  return shader;
}

/**
 * Animated topographic contour map behind the page. Fixed to the viewport so it
 * only renders one screen of pixels; the terrain follows the scroll position.
 * With reduced motion it draws a single frame that ignores time, scroll and the
 * mouse. Falls back to the plain page background when WebGL2 is unavailable.
 */
export function ShaderBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const still = useSyncExternalStore(subscribeToMotion, () => motionQuery.matches);

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext('webgl2', { antialias: false, alpha: false });
    if (!canvas || !gl) {
      canvas?.setAttribute('hidden', '');
      return;
    }

    let program: WebGLProgram;
    try {
      program = gl.createProgram();
      gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, vertexSource));
      gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, fragmentSource));
      gl.linkProgram(program);
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        throw new Error(gl.getProgramInfoLog(program) ?? 'Shader program failed to link');
      }
    } catch (error) {
      console.error('Background shader disabled:', error);
      canvas.setAttribute('hidden', '');
      return;
    }
    gl.useProgram(program);

    // One triangle that covers the whole viewport.
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const position = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uRes = gl.getUniformLocation(program, 'uRes');
    const uDpr = gl.getUniformLocation(program, 'uDpr');
    const uTime = gl.getUniformLocation(program, 'uTime');
    const uScroll = gl.getUniformLocation(program, 'uScroll');
    const uPointer = gl.getUniformLocation(program, 'uPointer');

    let dpr = 1;
    const resize = () => {
      // 1x on small screens keeps phones cool; the lines stay crisp enough.
      dpr = canvas.clientWidth < 720 ? 1 : Math.min(window.devicePixelRatio || 1, 1.5);
      canvas.width = Math.round(canvas.clientWidth * dpr);
      canvas.height = Math.round(canvas.clientHeight * dpr);
      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uDpr, dpr);
    };
    // Resizing clears the canvas, so a still frame has to be drawn again.
    const resizeObserver = new ResizeObserver(() => {
      resize();
      if (still) redrawStill();
    });
    resizeObserver.observe(canvas);
    resize();

    // The shader gets a smoothed copy of the mouse position (touch is ignored).
    const target = { x: 0, y: 0, on: 0 };
    const smooth = { x: 0, y: 0, on: 0 };
    const onPointerMove = (e: PointerEvent) => {
      if (e.pointerType !== 'mouse') return;
      if (!target.on) {
        smooth.x = e.clientX;
        smooth.y = e.clientY;
      }
      target.x = e.clientX;
      target.y = e.clientY;
      target.on = 1;
    };
    const onPointerLeave = () => {
      target.on = 0;
    };
    window.addEventListener('pointermove', onPointerMove, { passive: true });
    document.documentElement.addEventListener('pointerleave', onPointerLeave);

    let raf = 0;
    let last = 0;
    const draw = (ms: number) => {
      const dt = Math.min((ms - last) / 1000, 0.1);
      last = ms;
      const follow = 1 - Math.exp(-dt * 6);
      smooth.x += (target.x - smooth.x) * follow;
      smooth.y += (target.y - smooth.y) * follow;
      smooth.on += (target.on - smooth.on) * (1 - Math.exp(-dt * 3));

      gl.uniform1f(uTime, still ? 20 : 20 + ms / 1000);
      gl.uniform1f(uScroll, still ? 0 : window.scrollY);
      gl.uniform3f(uPointer, smooth.x * dpr, canvas.height - smooth.y * dpr, still ? 0 : smooth.on);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const loop = (ms: number) => {
      draw(ms);
      raf = requestAnimationFrame(loop);
    };
    // With reduced motion, draw one frame now and again only after a resize.
    const redrawStill = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(draw);
    };

    const start = () => {
      if (still) redrawStill();
      else if (!raf) raf = requestAnimationFrame(loop);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? stop() : start());

    document.addEventListener('visibilitychange', onVisibility);
    start();

    return () => {
      stop();
      resizeObserver.disconnect();
      window.removeEventListener('pointermove', onPointerMove);
      document.documentElement.removeEventListener('pointerleave', onPointerLeave);
      document.removeEventListener('visibilitychange', onVisibility);
      gl.deleteProgram(program);
    };
  }, [still]);

  return <canvas ref={canvasRef} className="bg-canvas" aria-hidden="true" />;
}
