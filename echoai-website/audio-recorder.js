import { WebSocketServer } from 'ws';
import fs from 'fs';
import path from 'path';
import pkg from 'wavefile';
const { WaveFile } = pkg;
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Parse command line arguments
const args = process.argv.slice(2);
const PORT = parseInt(args[0]) || 8080;
const SAMPLE_RATE = 48000;
const OUTPUT_DIR = path.join(__dirname, '.idea');
const OUTPUT_FILE = path.join(OUTPUT_DIR, `recording_${Date.now()}.wav`);

// Create output directory if it doesn't exist
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  console.log(`Created output directory: ${OUTPUT_DIR}`);
}

// Create a WebSocket server
const wss = new WebSocketServer({ port: PORT });

console.log(`WebSocket server started on ws://localhost:${PORT}`);
console.log(`Audio will be saved to: ${OUTPUT_FILE}`);
console.log('Press Ctrl+C to stop recording and save the file');

// Store the audio data chunks
let audioChunks = [];
let totalSamples = 0;
let recording = false;

// Function to save the audio chunks to a WAV file
const saveAudioToFile = () => {
  if (audioChunks.length === 0) {
    console.log('No audio data to save');
    return;
  }

  try {
    console.log(`Saving ${totalSamples} samples to WAV file...`);
    
    // Combine all audio chunks into one Int16Array
    const combinedBuffer = new Int16Array(totalSamples);
    let offset = 0;
    
    for (const chunk of audioChunks) {
      combinedBuffer.set(chunk, offset);
      offset += chunk.length;
    }
    
    // Create and save the WAV file
    const wav = new WaveFile();
    
    // Use the fromScratch method with the actual samples
    // fromScratch(numChannels, sampleRate, bitDepth, samples)
    wav.fromScratch(1, SAMPLE_RATE, '16', combinedBuffer);
    
    fs.writeFileSync(OUTPUT_FILE, wav.toBuffer());
    console.log(`Audio saved to ${OUTPUT_FILE}`);
    
    // Reset for new recording
    audioChunks = [];
    totalSamples = 0;
  } catch (error) {
    console.error('Error saving audio file:', error);
  }
};

// WebSocket server event handlers
wss.on('connection', (ws) => {
  console.log('Client connected');
  
  // Start a new recording when a client connects
  audioChunks = [];
  totalSamples = 0;
  recording = true;
  
  ws.on('message', (message) => {
    try {
      // Parse the incoming JSON message
      const data = JSON.parse(message);
      
      if (data.type === 'audio' && data.value && data.sample_rate) {
        if (data.sample_rate !== SAMPLE_RATE) {
          console.warn(`Warning: Received sample rate ${data.sample_rate} but expected ${SAMPLE_RATE}`);
        }
        
        // Decode the base64 audio data
        const buffer = Buffer.from(data.value, 'base64');
        
        // Convert the binary data to Int16Array
        // Each Int16 value is 2 bytes
        const int16Data = new Int16Array(buffer.length / 2);
        
        // Copy the data byte by byte with the correct endianness
        for (let i = 0; i < buffer.length; i += 2) {
          // Little-endian conversion (most common for audio)
          int16Data[i/2] = buffer[i] | (buffer[i+1] << 8);
        }
        
        // Store the audio chunk
        audioChunks.push(int16Data);
        totalSamples += int16Data.length;
        
        // Log progress
        if (audioChunks.length % 10 === 0) {
          console.log(`Received ${audioChunks.length} chunks (${totalSamples} samples)`);
        }
      }
    } catch (error) {
      console.error('Error processing message:', error);
    }
  });
  
  ws.on('close', () => {
    console.log('Client disconnected');
    if (recording) {
      recording = false;
      saveAudioToFile();
    }
  });
  
  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
  });
});

// Handle process termination to save the file
process.on('SIGINT', () => {
  console.log('\nClosing server and saving audio...');
  if (recording) {
    recording = false;
    saveAudioToFile();
  }
  
  wss.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

// Save audio every 60 seconds as a backup
const AUTO_SAVE_INTERVAL = 60 * 1000; // 60 seconds
setInterval(() => {
  if (recording && audioChunks.length > 0) {
    console.log('Auto-saving current audio data...');
    const backupFile = path.join(OUTPUT_DIR, `backup_${Date.now()}.wav`);
    
    try {
      // Create a copy of the current audio data
      const combinedBuffer = new Int16Array(totalSamples);
      let offset = 0;
      
      for (const chunk of audioChunks) {
        combinedBuffer.set(chunk, offset);
        offset += chunk.length;
      }
      
      // Create and save the WAV file
      const wav = new WaveFile();
      wav.fromScratch(1, SAMPLE_RATE, '16', combinedBuffer);
      
      fs.writeFileSync(backupFile, wav.toBuffer());
      console.log(`Backup saved to ${backupFile}`);
    } catch (error) {
      console.error('Error creating backup:', error);
    }
  }
}, AUTO_SAVE_INTERVAL); 