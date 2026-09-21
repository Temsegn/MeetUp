import { useState, useEffect } from 'react';

export const useAudioLevel = (stream: MediaStream | null) => {
  const [isSpeaking, setIsSpeaking] = useState(false);

  useEffect(() => {
    if (!stream || stream.getAudioTracks().length === 0) {
      setIsSpeaking(false);
      return;
    }

    let audioContext: AudioContext;
    let analyser: AnalyserNode;
    let microphone: MediaStreamAudioSourceNode;
    let javascriptNode: ScriptProcessorNode;

    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      analyser = audioContext.createAnalyser();
      microphone = audioContext.createMediaStreamSource(stream);
      javascriptNode = audioContext.createScriptProcessor(2048, 1, 1);

      analyser.smoothingTimeConstant = 0.8;
      analyser.fftSize = 1024;

      microphone.connect(analyser);
      analyser.connect(javascriptNode);
      javascriptNode.connect(audioContext.destination);

      javascriptNode.onaudioprocess = () => {
        const array = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(array);
        let values = 0;
        const length = array.length;
        for (let i = 0; i < length; i++) {
          values += array[i];
        }
        const average = values / length;
        
        // Threshold for speaking
        setIsSpeaking(average > 15);
      };
    } catch (err) {
      console.error('Error in useAudioLevel', err);
    }

    return () => {
      if (javascriptNode) {
        javascriptNode.disconnect();
      }
      if (analyser) {
        analyser.disconnect();
      }
      if (microphone) {
        microphone.disconnect();
      }
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [stream]);

  return isSpeaking;
};
