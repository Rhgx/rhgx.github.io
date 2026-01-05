/**
 * WebGL Shader - Animated Square Grid Pattern Background
 * Creates a square grid pattern that moves diagonally toward top-right
 */

class GridShader {
    constructor(canvas) {
        this.canvas = canvas;
        this.gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        
        if (!this.gl) {
            console.warn('WebGL not supported, falling back to CSS background');
            this.fallbackToCSS();
            return;
        }
        
        this.startTime = Date.now();
        this.init();
    }
    
    fallbackToCSS() {
        this.canvas.style.display = 'none';
        document.body.style.background = '#414254';
    }
    
    init() {
        const gl = this.gl;
        
        // Vertex shader - simple fullscreen quad
        const vertexShaderSource = `
            attribute vec2 a_position;
            void main() {
                gl_Position = vec4(a_position, 0.0, 1.0);
            }
        `;
        
        // Fragment shader - animated square grid pattern
        const fragmentShaderSource = `
            precision mediump float;
            
            uniform vec2 u_resolution;
            uniform float u_time;
            
            // Colors from TC2 UI
            const vec3 gridBack = vec3(0.255, 0.259, 0.329);  // #414254
            const vec3 gridLines = vec3(0.341, 0.341, 0.404); // #575767
            
            void main() {
                vec2 uv = gl_FragCoord.xy;
                
                // Animation speed - moving toward top-right
                // Positive x = right, negative y = up in screen coords
                float speed = 15.0;
                vec2 offset = vec2(u_time * speed, -u_time * speed);
                
                // Grid cell size (larger squares)
                float cellSize = 40.0;
                
                // Line thickness
                float lineWidth = 1.0;
                
                // Calculate grid position with offset
                vec2 gridPos = mod(uv + offset, cellSize);
                
                // Create grid lines (horizontal and vertical)
                float lineX = step(cellSize - lineWidth, gridPos.x);
                float lineY = step(cellSize - lineWidth, gridPos.y);
                
                // Combine lines
                float grid = max(lineX, lineY);
                
                // Mix colors
                vec3 color = mix(gridBack, gridLines, grid);
                
                gl_FragColor = vec4(color, 1.0);
            }
        `;
        
        // Compile shaders
        const vertexShader = this.compileShader(gl.VERTEX_SHADER, vertexShaderSource);
        const fragmentShader = this.compileShader(gl.FRAGMENT_SHADER, fragmentShaderSource);
        
        if (!vertexShader || !fragmentShader) {
            this.fallbackToCSS();
            return;
        }
        
        // Create program
        this.program = gl.createProgram();
        gl.attachShader(this.program, vertexShader);
        gl.attachShader(this.program, fragmentShader);
        gl.linkProgram(this.program);
        
        if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
            console.error('Program link error:', gl.getProgramInfoLog(this.program));
            this.fallbackToCSS();
            return;
        }
        
        // Get locations
        this.positionLocation = gl.getAttribLocation(this.program, 'a_position');
        this.resolutionLocation = gl.getUniformLocation(this.program, 'u_resolution');
        this.timeLocation = gl.getUniformLocation(this.program, 'u_time');
        
        // Create fullscreen quad
        const positionBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
            -1, -1,
             1, -1,
            -1,  1,
            -1,  1,
             1, -1,
             1,  1
        ]), gl.STATIC_DRAW);
        
        // Setup
        gl.enableVertexAttribArray(this.positionLocation);
        gl.vertexAttribPointer(this.positionLocation, 2, gl.FLOAT, false, 0, 0);
        
        // Handle resize
        this.resize();
        window.addEventListener('resize', () => this.resize());
        
        // Start animation
        this.animate();
    }
    
    compileShader(type, source) {
        const gl = this.gl;
        const shader = gl.createShader(type);
        gl.shaderSource(shader, source);
        gl.compileShader(shader);
        
        if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
            console.error('Shader compile error:', gl.getShaderInfoLog(shader));
            gl.deleteShader(shader);
            return null;
        }
        
        return shader;
    }
    
    resize() {
        const dpr = window.devicePixelRatio || 1;
        this.canvas.width = window.innerWidth * dpr;
        this.canvas.height = window.innerHeight * dpr;
        this.canvas.style.width = window.innerWidth + 'px';
        this.canvas.style.height = window.innerHeight + 'px';
        this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    }
    
    animate() {
        const gl = this.gl;
        const time = (Date.now() - this.startTime) / 1000;
        
        gl.useProgram(this.program);
        gl.uniform2f(this.resolutionLocation, this.canvas.width, this.canvas.height);
        gl.uniform1f(this.timeLocation, time);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        
        requestAnimationFrame(() => this.animate());
    }
}

export { GridShader };
