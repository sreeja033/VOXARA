let sharedAudioCtx: AudioContext | null = null;

const getAudioCtx = () => {
  if (!sharedAudioCtx) {
    sharedAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  return sharedAudioCtx;
};

export const playPCM = async (base64Audio: string, sampleRate: number = 24000, onEnded?: () => void, volume: number = 1.0) => {
  try {
    const audioCtx = getAudioCtx();
    
    // Ensure context is resumed (browsers often start it in 'suspended' state)
    if (audioCtx.state === 'suspended') {
      await audioCtx.resume();
    }

    const binaryString = atob(base64Audio);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const pcmData = new Int16Array(bytes.buffer);
    const floatData = new Float32Array(pcmData.length);
    for (let i = 0; i < pcmData.length; i++) {
      floatData[i] = pcmData[i] / 0x7FFF;
    }

    const buffer = audioCtx.createBuffer(1, floatData.length, sampleRate);
    buffer.getChannelData(0).set(floatData);
    const source = audioCtx.createBufferSource();
    source.buffer = buffer;
    
    const gainNode = audioCtx.createGain();
    gainNode.gain.value = volume;
    
    source.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    source.start();
    
    source.onended = () => {
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
    return null;
  }
};
