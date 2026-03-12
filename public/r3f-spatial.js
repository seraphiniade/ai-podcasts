import React, { useRef, useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import * as THREE from "three";

function AudioSphere({ url, position }) {
  const mesh = useRef();
  const [analyzer, setAnalyzer] = useState(null);
  const { camera } = useThree();

  useEffect(() => {
    if (!url) return;
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.PositionalAudio(listener);
    sound.setRefDistance(2);
    sound.setDirectionalCone(180, 230, 0.1);
    
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load(url, (buffer) => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.8);
      sound.play();
    });

    const newAnalyzer = new THREE.AudioAnalyser(sound, 32);
    setAnalyzer(newAnalyzer);
    mesh.current.add(sound);

    return () => {
      if (sound.isPlaying) sound.stop();
      camera.remove(listener);
    };
  }, [url, camera]);

  useFrame(() => {
    if (analyzer && mesh.current) {
      const data = analyzer.getAverageFrequency();
      const scale = 1 + data / 100;
      mesh.current.scale.set(scale, scale, scale);
      mesh.current.rotation.y += 0.01;
      mesh.current.rotation.x += 0.01;
    }
  });

  return (
    <mesh ref={mesh} position={position}>
      <sphereGeometry args={[1, 32, 32]} />
      <meshStandardMaterial color={analyzer ? "hotpink" : "orange"} wireframe />
    </mesh>
  );
}

function Scene() {
  const [audioUrl, setAudioUrl] = useState(null);

  useEffect(() => {
    // Intercept clicks on custom play buttons in the UI to get the audio URL
    const playButtons = document.querySelectorAll('button[onclick^="playEpisode"]');
    playButtons.forEach(btn => {
      btn.addEventListener('click', (e) => {
        // Just as an example, trying to find the audio source
        const parent = btn.closest('.episode-card');
        if (parent) {
          const audioEl = parent.querySelector('audio');
          if (audioEl) {
            // we override normal audio for R3F 3D
            audioEl.pause(); 
            setAudioUrl(audioEl.src);
          }
        }
      });
    });
  }, []);

  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} />
      <OrbitControls />
      {audioUrl ? <AudioSphere url={audioUrl} position={[0, 0, 0]} /> : (
        <mesh>
          <boxGeometry args={[1,1,1]} />
          <meshStandardMaterial color="cyan" />
        </mesh>
      )}
    </>
  );
}

// Inject R3F container
const r3fContainer = document.createElement("div");
r3fContainer.id = "r3f-container";
r3fContainer.style.position = "fixed";
r3fContainer.style.bottom = "20px";
r3fContainer.style.right = "20px";
r3fContainer.style.width = "300px";
r3fContainer.style.height = "300px";
r3fContainer.style.borderRadius = "15px";
r3fContainer.style.overflow = "hidden";
r3fContainer.style.boxShadow = "0 4px 15px rgba(0,0,0,0.5)";
r3fContainer.style.zIndex = "9999";
r3fContainer.style.background = "#000";
document.body.appendChild(r3fContainer);

const root = createRoot(r3fContainer);
root.render(
  <Canvas>
    <Scene />
  </Canvas>
);
