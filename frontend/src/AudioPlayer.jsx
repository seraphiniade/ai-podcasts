import { useEffect, useRef, useState, useMemo } from 'react';
import WaveSurfer from 'wavesurfer.js';
import { Play, Pause, SkipForward, SkipBack, X, Volume2 } from 'lucide-react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Environment, MeshDistortMaterial, Sphere, OrbitControls } from '@react-three/drei';

function AudioVisualizer3D({ isPlaying, analyserRef }) {
  const meshRef = useRef();
  const dataArray = useMemo(() => new Uint8Array(128), []);
  
  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    
    let audioData = 0;
    if (isPlaying && analyserRef.current) {
      analyserRef.current.getByteFrequencyData(dataArray);
      let sum = 0;
      const limit = Math.floor(dataArray.length * 0.5);
      for (let i = 0; i < limit; i++) sum += dataArray[i];
      audioData = sum / limit;
    }
    
    const targetScale = isPlaying && audioData > 0 ? 1 + (audioData / 255) * 0.8 : 1;
    const currentScale = meshRef.current.scale.x;
    const newScale = currentScale + (targetScale - currentScale) * 0.1;
    
    meshRef.current.scale.set(newScale, newScale, newScale);
    meshRef.current.rotation.x = clock.getElapsedTime() * 0.3;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.4;
    
    if (meshRef.current.material) {
      const targetDistort = isPlaying && audioData > 0 ? 0.3 + (audioData / 255) * 0.6 : 0.2;
      meshRef.current.material.distort += (targetDistort - meshRef.current.material.distort) * 0.1;
      
      const targetSpeed = isPlaying && audioData > 0 ? 1 + (audioData / 255) * 3 : 0.5;
      meshRef.current.material.speed += (targetSpeed - meshRef.current.material.speed) * 0.1;
    }
  });

  return (
    <Sphere ref={meshRef} args={[1.2, 64, 64]}>
      <MeshDistortMaterial
        color="#4F46E5"
        envMapIntensity={1}
        clearcoat={1}
        clearcoatRoughness={0}
        metalness={0.8}
        roughness={0.2}
        distort={0.2}
        speed={0.5}
      />
    </Sphere>
  );
}

export default function AudioPlayer({ audioUrl, onClose }) {
  const containerRef = useRef(null);
  const wavesurferRef = useRef(null);
  const audioElRef = useRef(null);
  const analyserRef = useRef(null);
  const audioCtxRef = useRef(null);
  
  const [isPlaying, setIsPlaying] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Create a standalone audio element
    const audio = new Audio();
    audio.crossOrigin = 'anonymous';
    audio.src = audioUrl;
    audioElRef.current = audio;

    // Setup Web Audio API
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    const ctx = new AudioContext();
    audioCtxRef.current = ctx;
    
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 128;
    analyser.smoothingTimeConstant = 0.8;
    analyserRef.current = analyser;

    const source = ctx.createMediaElementSource(audio);
    source.connect(analyser);
    analyser.connect(ctx.destination);

    // Setup Wavesurfer
    const wavesurfer = WaveSurfer.create({
      container: containerRef.current,
      media: audio,
      waveColor: 'rgba(79, 70, 229, 0.4)',
      progressColor: '#818CF8',
      cursorColor: '#C7D2FE',
      barWidth: 3,
      barGap: 2,
      barRadius: 3,
      height: 40,
      normalize: true,
    });

    wavesurferRef.current = wavesurfer;

    wavesurfer.on('play', () => {
      setIsPlaying(true);
      if (ctx.state === 'suspended') ctx.resume();
    });
    
    wavesurfer.on('pause', () => setIsPlaying(false));
    wavesurfer.on('finish', () => setIsPlaying(false));

    return () => {
      wavesurfer.destroy();
      if (ctx.state !== 'closed') {
        ctx.close().catch(console.error);
      }
    };
  }, [audioUrl]);

  const togglePlay = () => wavesurferRef.current?.playPause();
  
  const skip = (seconds) => {
    if (!wavesurferRef.current) return;
    const duration = wavesurferRef.current.getDuration();
    if (!duration) return;
    const currentTime = wavesurferRef.current.getCurrentTime();
    wavesurferRef.current.seekTo(Math.max(0, Math.min(1, (currentTime + seconds) / duration)));
  };

  return (
    <div className="bg-slate-900/95 backdrop-blur-lg p-5 rounded-2xl shadow-2xl border border-indigo-500/30 w-full flex flex-col gap-4 max-w-2xl mx-auto ring-1 ring-white/10 relative overflow-hidden animate-fade-in-up">
      
      {/* 3D Visualizer Canvas */}
      <div className="h-48 w-full rounded-xl overflow-hidden bg-slate-950 relative border border-slate-800/50 group">
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent z-10 pointer-events-none opacity-60"></div>
        <Canvas camera={{ position: [0, 0, 4], fov: 45 }} className="w-full h-full">
          <ambientLight intensity={0.5} />
          <directionalLight position={[5, 5, 5]} intensity={1.5} color="#818CF8" />
          <directionalLight position={[-5, -5, -5]} intensity={0.5} color="#C084FC" />
          <Environment preset="city" />
          <AudioVisualizer3D isPlaying={isPlaying} analyserRef={analyserRef} />
          <OrbitControls enableZoom={false} enablePan={false} autoRotate={isPlaying} autoRotateSpeed={2} />
        </Canvas>
        
        {/* Header Overlay */}
        <div className="absolute top-3 left-3 right-3 z-20 flex items-center justify-between">
          <div className="bg-slate-900/60 backdrop-blur-md px-3 py-1.5 rounded-full flex items-center gap-2 border border-slate-700/50 shadow-sm">
            <span className="relative flex h-3 w-3">
              {isPlaying && <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-75"></span>}
              <span className={`relative inline-flex rounded-full h-3 w-3 ${isPlaying ? 'bg-indigo-500' : 'bg-slate-500'}`}></span>
            </span>
            <span className="text-white font-medium text-xs tracking-wide uppercase">
              {isPlaying ? 'Live Audio' : 'Paused'}
            </span>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              className="bg-slate-900/60 backdrop-blur-md p-1.5 rounded-full text-slate-300 hover:text-white hover:bg-red-500/20 hover:border-red-500/30 transition-all border border-slate-700/50"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>
      
      {/* Waveform Container */}
      <div className="px-2 w-full mt-2">
        <div ref={containerRef} className="w-full"></div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between mt-2 px-4">
        <Volume2 className="text-slate-500 hover:text-indigo-400 cursor-pointer transition-colors" size={20} />
        
        <div className="flex items-center gap-6">
          <button 
            onClick={() => skip(-10)} 
            className="text-slate-400 hover:text-indigo-300 transition-colors p-2 hover:bg-indigo-500/10 rounded-full"
            title="-10s"
          >
            <SkipBack size={20} />
          </button>
          
          <button
            onClick={togglePlay}
            className={`flex items-center justify-center h-14 w-14 rounded-full transition-all transform active:scale-95 shadow-lg ${
              isPlaying 
                ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-500/30' 
                : 'bg-white hover:bg-slate-100 text-indigo-900'
            }`}
          >
            {isPlaying ? <Pause size={24} className="fill-current" /> : <Play size={24} className="fill-current ml-1" />}
          </button>
          
          <button 
            onClick={() => skip(10)} 
            className="text-slate-400 hover:text-indigo-300 transition-colors p-2 hover:bg-indigo-500/10 rounded-full"
            title="+10s"
          >
            <SkipForward size={20} />
          </button>
        </div>
        
        <div className="text-xs font-mono text-slate-500 bg-slate-800 px-2 py-1 rounded">3D</div>
      </div>
    </div>
  );
}
