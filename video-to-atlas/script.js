/* =========================================
   PART 1: WEBGL FLAT SCANLINE SHADER
   ========================================= */
const glCanvas = document.getElementById("glCanvas");
const gl = glCanvas.getContext("webgl");

function resizeCanvas() {
    glCanvas.width = window.innerWidth;
    glCanvas.height = window.innerHeight;
    gl.viewport(0, 0, glCanvas.width, glCanvas.height);
}
window.addEventListener("resize", resizeCanvas);
resizeCanvas();

const vertShaderSource = `
    attribute vec2 a_position;
    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
    }
`;

const fragShaderSource = `
    precision mediump float;
    uniform float u_time;
    uniform vec2 u_resolution;

    float noise(vec2 p) {
        return fract(sin(dot(p.xy, vec2(12.9898, 78.233))) * 43758.5453);
    }

    float vignette(vec2 uv) {
        uv = (uv - 0.5) * 0.98;
        return clamp(pow(cos(uv.x * 3.1415), 1.2) * pow(cos(uv.y * 3.1415), 1.2) * 50.0, 0.0, 1.0);
    }

    void main() {
        vec2 uv = gl_FragCoord.xy / u_resolution.xy;
        vec3 col = vec3(0.05, 0.07, 0.1); 

        float y = uv.y * 10.0;
        float speed = u_time * 0.5;
        float bar = sin(y + speed);
        col += vec3(0.02, 0.03, 0.04) * smoothstep(0.8, 1.0, bar);

        float scans = clamp(0.35 + 0.35 * sin(3.5 * u_time + uv.y * u_resolution.y * 1.5), 0.0, 1.0);
        float s = pow(scans, 1.7);
        col = col * vec3(0.8 + 0.2 * s); 

        float r = noise(uv * u_time);
        col += vec3(r) * 0.02;

        col *= vignette(uv);
        gl_FragColor = vec4(col, 1.0);
    }
`;

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        gl.deleteShader(shader);
        return null;
    }
    return shader;
}

const vertShader = createShader(gl, gl.VERTEX_SHADER, vertShaderSource);
const fragShader = createShader(gl, gl.FRAGMENT_SHADER, fragShaderSource);
const program = gl.createProgram();
gl.attachShader(program, vertShader);
gl.attachShader(program, fragShader);
gl.linkProgram(program);
gl.useProgram(program);

const positionBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([
    -1, -1,  1, -1, -1,  1,
    -1,  1,  1, -1,  1,  1,
]), gl.STATIC_DRAW);

const positionAttributeLocation = gl.getAttribLocation(program, "a_position");
gl.enableVertexAttribArray(positionAttributeLocation);
gl.vertexAttribPointer(positionAttributeLocation, 2, gl.FLOAT, false, 0, 0);

const timeLocation = gl.getUniformLocation(program, "u_time");
const resolutionLocation = gl.getUniformLocation(program, "u_resolution");

function render(time) {
    time *= 0.001;
    gl.uniform1f(timeLocation, time);
    gl.uniform2f(resolutionLocation, glCanvas.width, glCanvas.height);
    gl.drawArrays(gl.TRIANGLES, 0, 6);
    requestAnimationFrame(render);
}
requestAnimationFrame(render);


/* =========================================
   PART 2: APP LOGIC
   ========================================= */

document.addEventListener("DOMContentLoaded", () => {
    gsap.to(".gsap-header", { duration: 1, opacity: 1, y: 0, ease: "power3.out" });
    gsap.to(".gsap-panel", { duration: 0.8, opacity: 1, stagger: 0.15, delay: 0.2, ease: "power2.out" });
});

const videoInput = document.getElementById('videoInput');
const processBtn = document.getElementById('processBtn');
const canvas = document.getElementById('atlasCanvas');
const ctx = canvas.getContext('2d');
const status = document.getElementById('status');
const copyBtn = document.getElementById('copyBtn');

// Output elements
const outCols = document.getElementById('outCols');
const outRows = document.getElementById('outRows');
const outFrames = document.getElementById('outFrames');
const outX = document.getElementById('outX');
const outY = document.getElementById('outY');
const outFps = document.getElementById('outFps');

let videoFile = null;

videoInput.addEventListener('change', (e) => {
    if(e.target.files[0]) {
        videoFile = e.target.files[0];
        status.innerText = "Video file selected.";
        status.className = "text-xs font-mono h-4 text-sky-400";
    }
});

processBtn.addEventListener('click', async () => {
    if(!videoFile) {
        status.innerText = "Error: Please select a video file.";
        status.className = "text-xs font-mono h-4 text-red-400";
        return;
    }

    status.innerText = "Processing...";
    status.className = "text-xs font-mono h-4 text-yellow-400";

    const gridSize = parseInt(document.getElementById('gridSize').value);
    const fpsVal = parseInt(document.getElementById('fpsInput').value) || 24;
    const framesToCapture = gridSize * gridSize;
    
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoFile);
    video.muted = true;
    
    await video.play().then(() => video.pause());
    await new Promise(r => setTimeout(r, 200));
    
    const duration = video.duration;
    if (!isFinite(duration) || duration === 0) {
        status.innerText = "Error: Cannot read video duration.";
        return;
    }

    const captureInterval = duration / framesToCapture;
    const MAX_ATLAS_SIZE = 1024;
    const frameSize = Math.floor(MAX_ATLAS_SIZE / gridSize);

    canvas.width = frameSize * gridSize;
    canvas.height = frameSize * gridSize;
    ctx.clearRect(0,0, canvas.width, canvas.height);

    for(let i = 0; i < framesToCapture; i++) {
        const time = i * captureInterval;
        video.currentTime = time;
        
        await new Promise(resolve => {
            const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                resolve();
            };
            video.addEventListener('seeked', onSeek);
        });

        const col = i % gridSize;
        const row = Math.floor(i / gridSize);
        const x = col * frameSize;
        const y = row * frameSize;

        ctx.drawImage(video, 0, 0, video.videoWidth, video.videoHeight, x, y, frameSize, frameSize);
        status.innerText = `Rendering frame ${i+1} / ${framesToCapture}...`;
    }

    status.innerText = "Atlas generation complete.";
    status.className = "text-xs font-mono h-4 text-green-400";

    // Update Data
    outCols.innerText = gridSize;
    outRows.innerText = gridSize;
    outFrames.innerText = framesToCapture;
    outX.innerText = frameSize;
    outY.innerText = frameSize;
    outFps.innerText = fpsVal;

    // Show download
    const dataUrl = canvas.toDataURL('image/png');
    const downloadSection = document.getElementById('downloadSection');
    const downloadLink = document.getElementById('downloadLink');
    
    downloadSection.classList.remove('hidden');
    gsap.to(downloadSection, {opacity: 1, duration: 0.5});
    
    downloadLink.href = dataUrl;
    downloadLink.download = `atlas_${gridSize}x${gridSize}.png`;

    URL.revokeObjectURL(video.src);
});

// --- Copy Functionality (Full Script) ---
copyBtn.addEventListener('click', () => {
    const cols = outCols.innerText;
    const rows = outRows.innerText;
    const frames = outFrames.innerText;
    const x = outX.innerText;
    const y = outY.innerText;
    const fps = outFps.innerText;

    const codeText = `local ReplicatedStorage = game:GetService("ReplicatedStorage")
local GifPlayer = require(ReplicatedStorage:WaitForChild("GifPlayer"))

-- Setup: Place this script inside an ImageLabel
local imageLabel = script.Parent
local textureId = "rbxassetid://YOUR_ID_HERE"

-- Generated Config
imageLabel.ImageRectSize = Vector2.new(${x}, ${y})

local gif = GifPlayer.new(imageLabel, textureId, {
    Columns = ${cols},
    Rows = ${rows},
    TotalFrames = ${frames},
    FPS = ${fps}
})

gif:Play()`;

    navigator.clipboard.writeText(codeText).then(() => {
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> <span>Copied</span>`;
        copyBtn.classList.remove("bg-slate-800", "border-slate-600");
        copyBtn.classList.add("bg-green-600", "border-green-500");

        setTimeout(() => {
            copyBtn.innerHTML = originalText;
            copyBtn.classList.add("bg-slate-800", "border-slate-600");
            copyBtn.classList.remove("bg-green-600", "border-green-500");
        }, 2000);
    }).catch(err => {
        console.error('Failed to copy text: ', err);
    });
});