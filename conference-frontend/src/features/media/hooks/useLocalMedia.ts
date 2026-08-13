import { useState, useCallback, useRef } from 'react';

export const useLocalMedia = () => {
  const [localStream,  setLocalStream]  = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [error,        setError]        = useState<Error | null>(null);

  const localStreamRef = useRef<MediaStream | null>(null);

  const startLocalMedia = useCallback(async (audio = true, video = true): Promise<MediaStream | null> => {
    // Stop existing stream first
    localStreamRef.current?.getTracks().forEach(t => t.stop());

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio, video });
      localStreamRef.current = stream;
      setLocalStream(stream);
      return stream;
    } catch (err: any) {
      console.warn('Failed to get video+audio, trying audio only...', err);
      if (video) {
        try {
          const audioOnly = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
          localStreamRef.current = audioOnly;
          setLocalStream(audioOnly);
          return audioOnly;
        } catch (fallback: any) {
          setError(fallback);
          return null;
        }
      }
      setError(err);
      return null;
    }
  }, []);

  const stopLocalMedia = useCallback(() => {
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    localStreamRef.current = null;
    setLocalStream(null);
  }, []);

  /**
   * Replace the current video track with a different camera device.
   * Returns the new track so callers can replace their producer track.
   */
  const replaceVideoTrack = useCallback(async (deviceId: string): Promise<MediaStreamTrack | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
      });
      const newTrack = stream.getVideoTracks()[0];

      // Swap into current local stream
      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getVideoTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          localStreamRef.current.removeTrack(oldTrack);
        }
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      return newTrack;
    } catch (err: any) {
      setError(err);
      return null;
    }
  }, []);

  /**
   * Replace the current audio track with a different microphone device.
   */
  const replaceAudioTrack = useCallback(async (deviceId: string): Promise<MediaStreamTrack | null> => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { deviceId: { exact: deviceId } },
      });
      const newTrack = stream.getAudioTracks()[0];

      if (localStreamRef.current) {
        const oldTrack = localStreamRef.current.getAudioTracks()[0];
        if (oldTrack) {
          oldTrack.stop();
          localStreamRef.current.removeTrack(oldTrack);
        }
        localStreamRef.current.addTrack(newTrack);
        setLocalStream(new MediaStream(localStreamRef.current.getTracks()));
      }

      return newTrack;
    } catch (err: any) {
      setError(err);
      return null;
    }
  }, []);

  const startScreenShare = useCallback(async (): Promise<MediaStream | null> => {
    try {
      const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: false });
      setScreenStream(stream);

      stream.getVideoTracks()[0].onended = () => setScreenStream(null);

      return stream;
    } catch (err: any) {
      setError(err);
      return null;
    }
  }, []);

  const stopScreenShare = useCallback(() => {
    screenStream?.getTracks().forEach(t => t.stop());
    setScreenStream(null);
  }, [screenStream]);

  return {
    localStream,
    screenStream,
    startLocalMedia,
    stopLocalMedia,
    startScreenShare,
    stopScreenShare,
    replaceVideoTrack,
    replaceAudioTrack,
    error,
  };
};
