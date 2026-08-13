import { useState, useEffect } from 'react';

export const useActiveSpeakers = (streams: { id: string; stream: MediaStream | null }[]) => {
  const [activeSpeakers, setActiveSpeakers] = useState<Set<string>>(new Set());

  useEffect(() => {
    let audioContext: AudioContext;
    try {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    } catch (e) {
      return;
    }

    const analyzers = new Map<string, { analyzer: AnalyserNode, source: MediaStreamAudioSourceNode, script: ScriptProcessorNode }>();

    for (const { id, stream } of streams) {
      if (!stream || stream.getAudioTracks().length === 0) continue;

      try {
        const analyzer = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        const script = audioContext.createScriptProcessor(1024, 1, 1);

        analyzer.smoothingTimeConstant = 0.8;
        analyzer.fftSize = 512;

        source.connect(analyzer);
        analyzer.connect(script);
        script.connect(audioContext.destination);

        script.onaudioprocess = () => {
          const array = new Uint8Array(analyzer.frequencyBinCount);
          analyzer.getByteFrequencyData(array);
          let sum = 0;
          for (let i = 0; i < array.length; i++) sum += array[i];
          const average = sum / array.length;

          if (average > 15) {
            setActiveSpeakers(prev => {
              if (prev.has(id)) return prev;
              const next = new Set(prev);
              next.add(id);
              return next;
            });
          } else {
            setActiveSpeakers(prev => {
              if (!prev.has(id)) return prev;
              const next = new Set(prev);
              next.delete(id);
              return next;
            });
          }
        };

        analyzers.set(id, { analyzer, source, script });
      } catch (err) {
        console.warn('Failed to attach analyzer for peer', id, err);
      }
    }

    return () => {
      analyzers.forEach(({ analyzer, source, script }) => {
        script.disconnect();
        analyzer.disconnect();
        source.disconnect();
      });
      if (audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [streams]);

  return activeSpeakers;
};
