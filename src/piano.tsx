import React, { useEffect, useRef, useState, CSSProperties } from 'react';
import * as Tone from 'tone';
import { Midi } from '@tonejs/midi';
import * as THREE from 'three';
import { App, TFile, Notice } from 'obsidian';
interface Note {
  time: number;
  midi: number;
  name: string;
  velocity: number;
  duration: number;
}

interface PianoProps {
  midiFilePath?: string;
  app?: App;
  plugin?: any; // TouchPianoPlugin type
}

const Piano: React.FC<PianoProps> = ({ midiFilePath, app, plugin }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const particlesRef = useRef<THREE.Object3D[]>([]);
  const synth = useRef<Tone.PolySynth | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  // Track pressed keys to implement debounce mechanism
  const pressedKeysRef = useRef<Record<string, boolean>>({});
  
  const [notes, setNotes] = useState<Note[]>([]);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAutoPlay, setIsAutoPlay] = useState(false);
  const [isGuideMode, setIsGuideMode] = useState(false);
  const [currentNoteIndex, setCurrentNoteIndex] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<string>('');
  const [currentMidiFile, setCurrentMidiFile] = useState<string>('');
  
  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;
    
    // Create scene
    const scene = new THREE.Scene();
    sceneRef.current = scene;
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(
      75,
      containerRef.current.clientWidth / containerRef.current.clientHeight,
      0.1,
      1000
    );
    camera.position.z = 5;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ alpha: true });
    renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
    renderer.setClearColor(0x000000, 0); // Transparent background
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(0, 1, 1);
    scene.add(directionalLight);
    
    // Animation loop
    const animate = () => {
      requestAnimationFrame(animate);
      
      // Update particles
      particlesRef.current.forEach((particle: any) => {
        if (particle.userData.active) {
          // Apply custom velocity with random variations
          particle.position.y += particle.userData.velocityY * (1 + Math.random() * 0.2 - 0.1);
          
          // Apply horizontal velocity with wobble effect
          particle.position.x += particle.userData.velocityX;
          
          // Add wobble effect (sinusoidal movement)
          particle.position.x += Math.sin(
            particle.position.y * particle.userData.wobbleSpeed + 
            particle.userData.wobbleOffset
          ) * particle.userData.wobble;
          
          // Gradually reduce opacity
          particle.material.opacity -= 0.004;
          
          // Grow particle size up to max size
          if (particle.scale.x < particle.userData.maxSize) {
            const newSize = particle.scale.x + particle.userData.growFactor;
            particle.scale.set(newSize, newSize, newSize);
          }
          
          // Pulse the emissive intensity for glow effect
          particle.material.emissiveIntensity = 0.5 + Math.sin(Date.now() * 0.005) * 0.3;
          
          // Remove particle when it fades out
          if (particle.material.opacity <= 0) {
            scene.remove(particle);
            particlesRef.current = particlesRef.current.filter(p => p !== particle);
          }
        }
      });
      
      renderer.render(scene, camera);
    };
    
    animate();
    
    // Initialize Tone.js
    synth.current = new Tone.PolySynth(Tone.Synth).toDestination();
    
    // Cleanup
    return () => {
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, []);
  
  // Parse MIDI file
  useEffect(() => {
    if (!midiFilePath) return;
    
    const parseMidiFile = async () => {
      try {
        // Use fetch for default MIDI file or files with URLs
        const response = await fetch(midiFilePath);
        const arrayBuffer = await response.arrayBuffer();
        await parseMidiData(arrayBuffer);
        setCurrentMidiFile('Default MIDI file');
      } catch (error) {
        console.error('Error parsing MIDI file:', error);
        new Notice('Error loading MIDI file');
      }
    };
    
    parseMidiFile();
  }, [midiFilePath]);
  
  // Parse MIDI data from ArrayBuffer
  const parseMidiData = async (arrayBuffer: ArrayBuffer) => {
    try {
      const midi = new Midi(arrayBuffer);
      
      // Extract notes from all tracks
      const extractedNotes: Note[] = [];
      
      midi.tracks.forEach(track => {
        track.notes.forEach(note => {
          extractedNotes.push({
            time: note.time,
            midi: note.midi,
            name: note.name,
            velocity: note.velocity,
            duration: note.duration
          });
        });
      });
      
      // Sort notes by time
      extractedNotes.sort((a, b) => a.time - b.time);
      
      setNotes(extractedNotes);
      setUploadStatus('MIDI file loaded successfully!');
      
      // Save to data.json using Obsidian API
      await saveJsonData(extractedNotes);
      
      return extractedNotes;
    } catch (error) {
      console.error('Error parsing MIDI data:', error);
      setUploadStatus('Error parsing MIDI file');
      new Notice('Error parsing MIDI file');
      throw error;
    }
  };
  
  // Save JSON data using Obsidian API
  const saveJsonData = async (notesData: Note[]) => {
    if (!app) return;
    
    try {
      const jsonData = JSON.stringify({ notes: notesData }, null, 2);
      const fileName = 'piano-notes-data.json';
      
      // Check if file exists
      const fileExists = app.vault.getAbstractFileByPath(fileName) instanceof TFile;
      
      if (fileExists) {
        // Modify existing file
        const file = app.vault.getAbstractFileByPath(fileName) as TFile;
        await app.vault.modify(file, jsonData);
      } else {
        // Create new file
        await app.vault.create(fileName, jsonData);
      }
      
      console.log('MIDI data saved to JSON file');
    } catch (error) {
      console.error('Error saving JSON data:', error);
      new Notice('Error saving MIDI data');
    }
  };
  
  // Save MIDI file info to plugin settings
  const saveMidiFileInfo = async (fileName: string, filePath: string) => {
    if (!plugin) return;
    
    try {
      // Check if file already exists in settings
      const existingIndex = plugin.settings.midiFiles.findIndex(file => file.path === filePath);
      
      if (existingIndex >= 0) {
        // Update existing entry
        plugin.settings.midiFiles[existingIndex].name = fileName;
        plugin.settings.midiFiles[existingIndex].date = Date.now();
      } else {
        // Add new entry
        plugin.settings.midiFiles.push({
          name: fileName,
          path: filePath,
          date: Date.now()
        });
      }
      
      // Save settings
      await plugin.saveSettings();
      console.log('MIDI file info saved to settings');
    } catch (error) {
      console.error('Error saving MIDI file info:', error);
      new Notice('Error saving MIDI file info');
    }
  };
  
  // Create a particle effect
  const createParticle = (note: number) => {
    if (!sceneRef.current) return;
    
    // Map MIDI note to x position (piano keyboard layout)
    const x = (note - 60) * 0.2; // Center around middle C (60)
    
    // Create particle geometry - increased size from 0.1 to 0.25
    const geometry = new THREE.SphereGeometry(0.25, 32, 32);
    
    // Create particle material with enhanced glow effect
    const material = new THREE.MeshPhongMaterial({
      color: getColorForNote(note),
      transparent: true,
      opacity: 0.9,
      emissive: getColorForNote(note),
      emissiveIntensity: 0.8,
      shininess: 100
    });
    
    // Create particle mesh
    const particle = new THREE.Mesh(geometry, material);
    particle.position.set(x, -2, 0); // Start at bottom of screen
    particle.userData = { 
      active: true, 
      initialSize: 0.25,
      growFactor: Math.random() * 0.1 + 0.05, // Random growth factor
      maxSize: Math.random() * 0.2 + 0.4, // Random max size
      // Add random movement parameters
      velocityY: Math.random() * 0.02 + 0.01, // Base upward velocity
      velocityX: (Math.random() - 0.5) * 0.01, // Random horizontal velocity
      wobble: Math.random() * 0.02, // Random wobble factor
      wobbleSpeed: Math.random() * 0.1 + 0.05, // Speed of wobble
      wobbleOffset: Math.random() * Math.PI * 2 // Random starting phase
    };
    
    // Add to scene and tracking array
    sceneRef.current.add(particle);
    particlesRef.current.push(particle);
  };
  
  // Get color based on note value with enhanced vibrance
  const getColorForNote = (note: number): THREE.Color => {
    // Map note to hue (0-1) with octave influencing saturation and lightness
    const hue = (note % 12) / 12;
    const octave = Math.floor(note / 12) - 1; // Standard MIDI octave calculation
    
    // Adjust saturation based on octave (higher octaves more saturated)
    const saturation = Math.min(0.9, 0.7 + (octave * 0.05));
    
    // Adjust lightness based on octave (higher octaves brighter)
    const lightness = Math.min(0.7, 0.4 + (octave * 0.05));
    
    return new THREE.Color().setHSL(hue, saturation, lightness);
  };
  
  // Play a note
  const playNote = (note: number, duration: number = 0.5, isKeyHeld: boolean = false) => {
    if (!synth.current) return;
    
    const noteName = Tone.Frequency(note, 'midi').toNote();
    
    if (isKeyHeld) {
      // For held keys, we don't trigger a new note, just extend the current one
      // This is handled by not doing anything, as the note is already playing
      // We also don't create a new particle for held keys
    } else {
      // For new key presses, trigger the note and create a particle
      synth.current.triggerAttackRelease(noteName, duration);
      createParticle(note);
    }
  };
  
  // Handle keyboard input
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      
      // Prevent repeated triggering if key is already pressed (debounce mechanism)
      if (pressedKeysRef.current[key]) {
        return;
      }
      
      // Mark key as pressed
      pressedKeysRef.current[key] = true;
      
      // In guide mode, any key press plays the next note in sequence
      if (isGuideMode && notes.length > 0) {
        if (currentNoteIndex < notes.length) {
          const note = notes[currentNoteIndex];
          playNote(note.midi, note.duration);
          setCurrentNoteIndex(prevIndex => prevIndex + 1);
        } else {
          // Reset to beginning when we reach the end
          setCurrentNoteIndex(0);
          new Notice('End of song reached. Starting from beginning.');
        }
        return;
      }
      
      // Normal mode - Map keyboard keys to MIDI notes (simple mapping)
      const keyToNote: Record<string, number> = {
        'a': 60, // Middle C
        's': 62, // D
        'd': 64, // E
        'f': 65, // F
        'g': 67, // G
        'h': 69, // A
        'j': 71, // B
        'k': 72, // C
        'l': 74, // D
        ';': 76, // E
        // Add more mappings as needed
      };
      
      const note = keyToNote[key];
      if (note) {
        playNote(note);
      }
    };
    
    const handleKeyUp = (event: KeyboardEvent) => {
      // Mark key as released
      const key = event.key.toLowerCase();
      pressedKeysRef.current[key] = false;
    };
    
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isGuideMode, notes, currentNoteIndex]);
  
  // Effect to handle sustained notes for held keys
  useEffect(() => {
    // Skip if in guide mode or auto-play
    if (isGuideMode || isAutoPlay) return;
    
    const keyToNote: Record<string, number> = {
      'a': 60, // Middle C
      's': 62, // D
      'd': 64, // E
      'f': 65, // F
      'g': 67, // G
      'h': 69, // A
      'j': 71, // B
      'k': 72, // C
      'l': 74, // D
      ';': 76, // E
      // Add more mappings as needed
    };
    
    // Check for held keys every 500ms and extend their notes
    const intervalId = setInterval(() => {
      Object.entries(pressedKeysRef.current).forEach(([key, isPressed]) => {
        if (isPressed) {
          const note = keyToNote[key];
          if (note) {
            // Pass true to indicate this is a held key
            playNote(note, 0.5, true);
          }
        }
      });
    }, 500);
    
    return () => clearInterval(intervalId);
  }, [isGuideMode, isAutoPlay]);
  
  // Auto-play functionality
  useEffect(() => {
    if (!isAutoPlay || notes.length === 0) return;
    
    let currentNoteIndex = 0;
    let lastNoteTime = 0;
    
    const playNextNote = () => {
      if (!isAutoPlay || currentNoteIndex >= notes.length) {
        setIsAutoPlay(false);
        return;
      }
      
      const note = notes[currentNoteIndex];
      playNote(note.midi, note.duration);
      
      // Calculate delay to next note
      const currentTime = note.time;
      const timeToNextNote = currentNoteIndex < notes.length - 1 
        ? notes[currentNoteIndex + 1].time - currentTime 
        : 0;
      
      currentNoteIndex++;
      
      // Schedule next note
      if (currentNoteIndex < notes.length) {
        setTimeout(playNextNote, timeToNextNote * 1000);
      } else {
        setIsAutoPlay(false);
      }
    };
    
    // Start playing
    playNextNote();
    
    return () => {
      setIsAutoPlay(false);
    };
  }, [isAutoPlay, notes]);
  
  // Handle file upload
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    
    const file = files[0];
    setUploadStatus(`Loading MIDI file: ${file.name}...`);
    setCurrentMidiFile(file.name);
    
    try {
      // Read file as ArrayBuffer
      const arrayBuffer = await file.arrayBuffer();
      await parseMidiData(arrayBuffer);
      
      // Save file info to plugin settings
      if (app && plugin) {
        // Create a unique path for the uploaded file
        const filePath = `uploaded-midi-files/${file.name}`;
        
        // Save MIDI file info to plugin settings
        await saveMidiFileInfo(file.name, filePath);
      }
    } catch (error) {
      console.error('Error handling file upload:', error);
      setUploadStatus('Error loading MIDI file');
      new Notice('Error loading MIDI file');
    }
  };
  
  // Open file dialog
  const openFileDialog = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  // Handle MIDI file selection from dropdown
  const handleMidiFileSelection = async (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedPath = event.target.value;
    
    if (!selectedPath || !app || !plugin) return;
    
    try {
      // Find the selected MIDI file info
      const selectedFile = plugin.settings.midiFiles.find(file => file.path === selectedPath);
      
      if (selectedFile) {
        setUploadStatus(`Loading MIDI file: ${selectedFile.name}...`);
        setCurrentMidiFile(selectedFile.name);
        
        // Get the resource path for the MIDI file
        const resourcePath = app.vault.adapter.getResourcePath(selectedFile.path);
        
        // Load and parse the MIDI file
        const response = await fetch(resourcePath);
        const arrayBuffer = await response.arrayBuffer();
        await parseMidiData(arrayBuffer);
      }
    } catch (error) {
      console.error('Error loading selected MIDI file:', error);
      setUploadStatus('Error loading selected MIDI file');
      new Notice('Error loading selected MIDI file');
    }
  };
  
  // Reset current note index when guide mode is toggled off
  useEffect(() => {
    if (!isGuideMode) {
      setCurrentNoteIndex(0);
    }
  }, [isGuideMode]);

  return (
    <div className="piano-container">
      <div 
        ref={containerRef} 
        className="visualization-container"
      ></div>
      
      <div className="controls">
        <div className="button-container">
          <button 
            onClick={() => {
              if (isAutoPlay) setIsAutoPlay(false);
              setIsGuideMode(!isGuideMode);
            }}
            className={`control-button ${isGuideMode ? 'upload-button' : ''}`}
          >
            {isGuideMode ? 'Exit Guide Mode' : 'Enter Guide Mode'}
          </button>
          
          <button 
            onClick={() => {
              if (isGuideMode) setIsGuideMode(false);
              setIsAutoPlay(!isAutoPlay);
            }}
            className="control-button"
          >
            {isAutoPlay ? 'Stop Auto-Play' : 'Start Auto-Play'}
          </button>
          
          <button 
            onClick={openFileDialog}
            className="control-button upload-button"
          >
            Upload MIDI File
          </button>
        </div>
        
        {/* MIDI File Selection Dropdown */}
        {plugin && plugin.settings.midiFiles.length > 0 && (
          <div className="midi-selection">
            <select 
              onChange={handleMidiFileSelection}
              className="midi-dropdown"
              value={plugin.settings.midiFiles.find(file => file.name === currentMidiFile)?.path || ''}
            >
              <option value="" disabled>Select a MIDI file</option>
              {plugin.settings.midiFiles
                .sort((a, b) => b.date - a.date) // Sort by date, newest first
                .map((file, index) => (
                  <option key={index} value={file.path}>
                    {file.name}
                  </option>
                ))}
            </select>
          </div>
        )}
        
        {/* Hidden file input */}
        <input 
          type="file" 
          ref={fileInputRef}
          style={{ display: 'none' }}
          accept=".mid,.midi"
          onChange={handleFileUpload}
        />
        
        {uploadStatus && (
          <div className="status-message">{uploadStatus}</div>
        )}
        
        {currentMidiFile && (
          <div className="current-file">Current file: {currentMidiFile}</div>
        )}
        
        <div className="instructions">
          {isGuideMode ? (
            <>
              <p>Guide Mode: Press <strong>ANY KEY</strong> to play the next note in sequence.</p>
              <p>The notes will follow the loaded MIDI file's melody.</p>
            </>
          ) : (
            <>
              <p>Press any of the keys on your keyboard, in slow rhythm.</p>
              <p>Keys A-L correspond to different notes.</p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Piano;
