const canvas = document.createElement('canvas');
canvas.id = 'bg-visualizer';
document.body.prepend(canvas);

Object.assign(canvas.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    zIndex: '-1',
    pointerEvents: 'none',
    opacity: '0.6'
});

const ctx = canvas.getContext('2d');
let audioCtx;
let analyser;
let dataArray;

function resize() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

// Attach to any audio playing
document.addEventListener('play', (e) => {
    if (e.target.tagName === 'AUDIO') {
        if (!audioCtx) {
            audioCtx = new (window.AudioContext || window.webkitAudioContext)();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // Note: MediaElementAudioSourceNode can only be created once per audio element.
            if (!e.target._hasSource) {
                const source = audioCtx.createMediaElementSource(e.target);
                source.connect(analyser);
                analyser.connect(audioCtx.destination);
                e.target._hasSource = true;
            }
            draw();
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }
    }
}, true);

function draw() {
    requestAnimationFrame(draw);
    if (!analyser) return;

    analyser.getByteFrequencyData(dataArray);
    
    // Clear with a fade effect
    ctx.fillStyle = 'rgba(10, 10, 10, 0.2)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.5;

    ctx.lineWidth = 3;

    for (let i = 0; i < dataArray.length; i++) {
        const value = dataArray[i];
        const percent = value / 255;
        const height = canvas.height * percent * 0.5;
        const offset = canvas.height - height - 1;
        const barWidth = canvas.width / dataArray.length;
        
        const hue = i / dataArray.length * 360 + performance.now() * 0.05;
        ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
        ctx.fillRect(i * barWidth, offset, barWidth - 1, height);
        
        // Circular visualization
        const angle = (i / dataArray.length) * Math.PI * 2;
        const x1 = centerX + Math.cos(angle) * radius;
        const y1 = centerY + Math.sin(angle) * radius;
        const x2 = centerX + Math.cos(angle) * (radius + value);
        const y2 = centerY + Math.sin(angle) * (radius + value);
        
        ctx.strokeStyle = `hsla(${hue}, 100%, 60%, 0.8)`;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
    }
}
