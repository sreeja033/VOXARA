let sharedAudioCtx: AudioContext | null = null;

export const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    // Also attach to window for global access if needed
    (window as any)._voxAudioContext = sharedAudioCtx;
  }
  return sharedAudioCtx;
};

export const globalResumeAudioContext = async () => {
  const ctx = getAudioCtx();
  if (ctx.state === 'suspended') {
    console.log("Global: Resuming AudioContext on user gesture");
    try {
      await ctx.resume();
    } catch (e) {
      console.error("Global: Failed to resume AudioContext:", e);
    }
  }
};

export const playPCM = async (base64Audio: string, sampleRate: number = 24000, onEnded?: () => void, volume: number = 1.0) => {
  console.log("playPCM: Starting playback, base64 length:", base64Audio?.length);
  try {
    const audioCtx = getAudioCtx();
    
    // Ensure context is resumed (browsers often start it in 'suspended' state)
    if (audioCtx.state === 'suspended') {
      console.log("playPCM: Resuming suspended AudioContext");
      await audioCtx.resume();
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    
    // Ensure even number of bytes for Int16Array
    const alignedLength = Math.floor(bytes.byteLength / 2) * 2;
    const pcmData = new Int16Array(bytes.buffer, bytes.byteOffset, alignedLength / 2);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 32768.0;
    }

    const buffer = audioCtx.createBuffer(1, floatData.length, sampleRate);
    buffer.getChannelData(0).set(floatData);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    console.log("playPCM: Starting source");
    source.start();
    
    source.onended = () => {
      console.log("playPCM: Playback ended");
      if (onEnded) onEnded();
    };
    
    return {
      stop: () => {
        try {
          source.stop();
        } catch (e) {
          // Ignore if already stopped
        }
      }
    };
  } catch (err) {
    console.error("PCM Playback error:", err);
    if (onEnded) onEnded();
    return null;
  }
};
