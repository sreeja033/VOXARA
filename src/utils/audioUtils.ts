export const playPCM = async (base64Audio: string, sampleRate: number = 24000, onEnded?: () => void) => {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
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
    source.connect(audioCtx.destination);
    source.start();
    
    source.onended = () => {
      if (onEnded) onEnded();
      setTimeout(() => audioCtx.close(), 1000);
    };
    
    return {
      stop: () => {
        source.stop();
        audioCtx.close();
      }
    };
  } catch (err) {
    console.error("PCM Playback error:", err);
    return null;
  }
};
