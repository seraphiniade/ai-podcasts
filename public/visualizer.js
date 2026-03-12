import * as THREE from 'https://cdn.jsdelivr.net/npm/three@0.160.0/build/three.module.js';

const container = document.createElement('div');
container.id = 'bg-visualizer';
document.body.prepend(container);

Object.assign(container.style, {
    position: 'fixed',
    top: '0', left: '0',
    width: '100vw', height: '100vh',
    zIndex: '-1',
    pointerEvents: 'none'
});

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x0a0a0a, 0.02);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 40;

const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setClearColor(0x0a0a0a, 1);
container.appendChild(renderer.domElement);

const geometry = new THREE.IcosahedronGeometry(15, 4);
const material = new THREE.MeshBasicMaterial({ 
    color: 0x00ffcc, 
    wireframe: true,
    transparent: true,
    opacity: 0.2
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const positionAttribute = geometry.attributes.position;
const originalPositions = new Float32Array(positionAttribute.count * 3);
for (let i = 0; i < positionAttribute.count * 3; i++) {
    originalPositions[i] = positionAttribute.array[i];
}

window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

let audioCtx;
let analyser;
let dataArray;
let sourceNodes = new WeakMap();

document.addEventListener('play', (e) => {
    if (e.target.tagName === 'AUDIO') {
        if (!audioCtx) {
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            audioCtx = new AudioContext();
            analyser = audioCtx.createAnalyser();
            analyser.fftSize = 256;
            dataArray = new Uint8Array(analyser.frequencyBinCount);
            
            // Connect analyser to destination if needed, but we shouldn't double connect
            // Instead of analyser.connect(destination), we just let the media element play normally?
            // Actually, MediaElementSourceNode interrupts the normal audio flow.
            // If we connect it to the analyser and then analyser to destination, it will play.
        } else if (audioCtx.state === 'suspended') {
            audioCtx.resume();
        }

        if (!sourceNodes.has(e.target)) {
            const source = audioCtx.createMediaElementSource(e.target);
            source.connect(analyser);
            analyser.connect(audioCtx.destination);
            sourceNodes.set(e.target, source);
        }
    }
}, true);

let time = 0;

function animate() {
    requestAnimationFrame(animate);
    time += 0.005;

    mesh.rotation.x = time * 0.5;
    mesh.rotation.y = time;

    if (analyser && dataArray) {
        analyser.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for(let i=0; i<dataArray.length; i++){
            sum += dataArray[i];
        }
        let avg = sum / dataArray.length;
        
        const positions = geometry.attributes.position;
        for (let i = 0; i < positions.count; i++) {
            const index = i % dataArray.length;
            const freqVal = dataArray[index] / 255;
            const noise = Math.sin(i * 0.1 + time * 5) * 0.5;
            const scale = 1 + (freqVal * 0.3) + (avg / 255) * 0.4 + (noise * 0.1);
            
            positions.setXYZ(
                i,
                originalPositions[i * 3] * scale,
                originalPositions[i * 3 + 1] * scale,
                originalPositions[i * 3 + 2] * scale
            );
        }
        positions.needsUpdate = true;
        
        const hue = (avg / 255) + time * 0.1;
        material.color.setHSL(hue % 1, 0.8, 0.6);
        material.opacity = 0.15 + (avg / 255) * 0.5;
    }

    renderer.render(scene, camera);
}

animate();
