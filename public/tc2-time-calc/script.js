/* ==========================================================================
   TC2 Time Calculator - JavaScript
   ========================================================================== */

// --------------------------------------------------------------------------
// Class Data Configuration
// --------------------------------------------------------------------------
const classes = [
    { name: "Flanker", image: "assets/images/flanker.png" },
    { name: "Trooper", image: "assets/images/trooper.png" },
    { name: "Arsonist", image: "assets/images/arsonist.png" },
    { name: "Annihilator", image: "assets/images/annihilator.png" },
    { name: "Brute", image: "assets/images/brute.png" },
    { name: "Mechanic", image: "assets/images/mechanic.png" },
    { name: "Doctor", image: "assets/images/doctor.png" },
    { name: "Marksman", image: "assets/images/marksman.png" },
    { name: "Agent", image: "assets/images/agent.png" }
];

// Chart instance reference
let timeChart = null;

// --------------------------------------------------------------------------
// WebGL Background Shader
// --------------------------------------------------------------------------

/**
 * Initializes WebGL animated stripe background
 */
function initWebGLBackground() {
    const canvas = document.getElementById('bg-canvas');
    const gl = canvas.getContext('webgl');
    
    if (!gl) {
        console.warn('WebGL not supported, falling back to CSS');
        return;
    }

    // Vertex shader
    const vertexShaderSource = `
        attribute vec2 a_position;
        void main() {
            gl_Position = vec4(a_position, 0.0, 1.0);
        }
    `;

    // Fragment shader - animated diagonal stripes
    const fragmentShaderSource = `
        precision mediump float;
        uniform float u_time;
        uniform vec2 u_resolution;
        
        void main() {
            vec2 uv = gl_FragCoord.xy / u_resolution;
            
            // Diagonal stripe pattern
            float stripeWidth = 25.0;
            float diagonal = (uv.x + uv.y) * u_resolution.x / stripeWidth;
            
            // Animate the stripes
            diagonal += u_time * 1.5; // speed
            
            // Create stripe pattern
            float stripe = mod(diagonal, 2.0);
            float pattern = step(1.0, stripe);
            
            // Background color (dark purple)
            vec3 bgColor = vec3(0.239, 0.165, 0.302); // #3d2a4d
            
            // Stripe color (much darker, more visible)
            vec3 stripeColor = vec3(0.0, 0.0, 0.0); // black
            
            // Mix colors
            vec3 color = mix(bgColor, stripeColor, pattern * 0.08);
            
            gl_FragColor = vec4(color, 1.0);
        }
    `;

    // Compile shaders
    function compileShader(source, type) {
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

    const vertexShader = compileShader(vertexShaderSource, gl.VERTEX_SHADER);
    const fragmentShader = compileShader(fragmentShaderSource, gl.FRAGMENT_SHADER);

    if (!vertexShader || !fragmentShader) return;

    // Create program
    const program = gl.createProgram();
    gl.attachShader(program, vertexShader);
    gl.attachShader(program, fragmentShader);
    gl.linkProgram(program);

    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        console.error('Program link error:', gl.getProgramInfoLog(program));
        return;
    }

    gl.useProgram(program);

    // Set up geometry (full-screen quad)
    const positions = new Float32Array([
        -1, -1,
         1, -1,
        -1,  1,
        -1,  1,
         1, -1,
         1,  1
    ]);

    const positionBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);

    const positionLocation = gl.getAttribLocation(program, 'a_position');
    gl.enableVertexAttribArray(positionLocation);
    gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);

    // Get uniform locations
    const timeLocation = gl.getUniformLocation(program, 'u_time');
    const resolutionLocation = gl.getUniformLocation(program, 'u_resolution');

    // Resize handler
    function resize() {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(resolutionLocation, canvas.width, canvas.height);
    }

    window.addEventListener('resize', resize);
    resize();

    // Animation loop
    function render(time) {
        gl.uniform1f(timeLocation, time * 0.001);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(render);
    }

    requestAnimationFrame(render);
}

// --------------------------------------------------------------------------
// DOM Creation Functions
// --------------------------------------------------------------------------

/**
 * Creates a class input section for a given class
 * @param {Object} classInfo - Class data object with name and image
 * @param {string} containerId - ID of the container to append to
 */
function createClassSection(classInfo, containerId) {
    const container = document.getElementById(containerId);
    const classElement = document.createElement("div");
    classElement.className = "class-container";
    classElement.id = `${classInfo.name}-${containerId}`;

    classElement.innerHTML = `
        <img src="${classInfo.image}" class="class-image" alt="${classInfo.name}">
        <h5>${classInfo.name}</h5>
        <div class="input-group mb-3">
            <input type="number" min="0" class="form-control time-input hours" placeholder="Hours">
            <input type="number" min="0" max="59" class="form-control time-input minutes" placeholder="Minutes">
            <input type="number" min="0" max="59" class="form-control time-input seconds" placeholder="Seconds">
        </div>
    `;

    container.appendChild(classElement);
}

// --------------------------------------------------------------------------
// Time Calculation Functions
// --------------------------------------------------------------------------

/**
 * Converts hours, minutes, seconds to total seconds
 */
function getTimeInput(hours, minutes, seconds) {
    return hours * 3600 + minutes * 60 + seconds;
}

/**
 * Formats total seconds into days, hours, minutes, seconds
 */
function formatTime(totalSeconds) {
    const days = Math.floor(totalSeconds / 86400);
    totalSeconds %= 86400;
    const hours = Math.floor(totalSeconds / 3600);
    totalSeconds %= 3600;
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return { days, hours, minutes, seconds };
}

/**
 * Calculates total time across all classes and updates the display
 */
function calculateTotalTime() {
    let totalSeconds = 0;
    let classTimes = [];

    classes.forEach(classInfo => {
        const officialContainer = document.getElementById(`${classInfo.name}-official-servers-container`);
        const communityContainer = document.getElementById(`${classInfo.name}-community-servers-container`);

        const officialHours = parseInt(officialContainer.querySelector(".hours").value) || 0;
        const officialMinutes = parseInt(officialContainer.querySelector(".minutes").value) || 0;
        const officialSeconds = parseInt(officialContainer.querySelector(".seconds").value) || 0;

        const communityHours = parseInt(communityContainer.querySelector(".hours").value) || 0;
        const communityMinutes = parseInt(communityContainer.querySelector(".minutes").value) || 0;
        const communitySeconds = parseInt(communityContainer.querySelector(".seconds").value) || 0;

        const totalForClass = getTimeInput(
            officialHours + communityHours,
            officialMinutes + communityMinutes,
            officialSeconds + communitySeconds
        );
        totalSeconds += totalForClass;
        classTimes.push(totalForClass / 3600);
    });

    const { days, hours, minutes, seconds } = formatTime(totalSeconds);
    let output = `<p>Total time: ${days * 24 + hours} hours ${minutes} minutes ${seconds} seconds</p>`;
    if (days > 0) {
        output += `<p>Total time (days): ${days} days ${hours} hours ${minutes} minutes ${seconds} seconds</p>`;
    }
    document.getElementById("output").innerHTML = output;

    // Show containers
    document.getElementById("output-container").classList.add("visible");
    document.querySelector(".chart-container").classList.add("visible");

    updateChart(classTimes);

    // Animate output container
    anime({
        targets: '#output-container',
        scale: [0.95, 1],
        opacity: [0.5, 1],
        duration: 600,
        easing: 'easeOutElastic(1, .5)'
    });

    // Animate chart container
    anime({
        targets: '.chart-container',
        translateY: [20, 0],
        opacity: [0, 1],
        duration: 800,
        easing: 'easeOutExpo'
    });
}

// --------------------------------------------------------------------------
// Chart Functions
// --------------------------------------------------------------------------

/**
 * Updates the bar chart with class time data
 */
function updateChart(data) {
    const ctx = document.getElementById('timeChart').getContext('2d');
    
    if (timeChart) {
        timeChart.destroy();
    }

    timeChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: classes.map(c => c.name),
            datasets: [{
                label: 'Time Spent (Hours)',
                data: data,
                backgroundColor: 'rgba(169, 101, 218, 0.7)',
                borderColor: '#a965da',
                borderWidth: 2,
                borderRadius: 6,
                hoverBackgroundColor: 'rgba(169, 101, 218, 0.9)'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: {
                        color: '#ffffff',
                        font: {
                            family: "'Oswald', sans-serif",
                            size: 14
                        }
                    }
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Hours',
                        color: '#ffffff',
                        font: {
                            family: "'Oswald', sans-serif",
                            size: 14
                        }
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: "'Oswald', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Class',
                        color: '#ffffff',
                        font: {
                            family: "'Oswald', sans-serif",
                            size: 14
                        }
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            family: "'Oswald', sans-serif"
                        }
                    },
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    }
                }
            }
        }
    });
}

// --------------------------------------------------------------------------
// Initialization
// --------------------------------------------------------------------------

/**
 * Initializes the application
 */
function init() {
    // Initialize WebGL background
    initWebGLBackground();
    
    // Create class sections
    classes.forEach(classInfo => {
        createClassSection(classInfo, "official-servers-container");
        createClassSection(classInfo, "community-servers-container");
    });
}

// Run on page load
window.onload = init;
