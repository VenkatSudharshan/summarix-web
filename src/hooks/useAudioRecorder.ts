import { useState, useRef, useCallback } from 'react';

interface UseAudioRecorderProps {
  onError?: (error: Error) => void;
  onStart?: () => void;
  onStop?: (blob: Blob) => void;
}

interface UseAudioRecorderReturn {
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  isRecording: boolean;
  audioBlob: Blob | null;
  error: string | null;
}

export const useAudioRecorder = ({
  onError,
  onStart,
  onStop,
}: UseAudioRecorderProps = {}): UseAudioRecorderReturn => {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent) || 
                  /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;

  const getSupportedMimeType = () => {
    const types = [
      'audio/mp4',
      'audio/aac',
      'audio/wav',
      'audio/webm;codecs=opus',
      'audio/webm'
    ];

    for (const type of types) {
      if (MediaRecorder.isTypeSupported(type)) {
        return type;
      }
    }
    return 'audio/mp4'; // Default fallback
  };

  const startRecording = useCallback(async () => {
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Media devices not supported');
      }

      // Check if we already have permission
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasAudioPermission = devices.some(device => device.kind === 'audioinput' && device.label);
      
      if (!hasAudioPermission) {
        // Request permission first
        const permissionResult = await navigator.mediaDevices.getUserMedia({ audio: true });
        permissionResult.getTracks().forEach(track => track.stop());
      }

      const constraints = {
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          ...(isSafari ? {
            sampleRate: 44100,
            channelCount: 1,
            sampleSize: 16
          } : {})
        }
      };

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;
      audioChunksRef.current = [];

      const mimeType = getSupportedMimeType();
      
      try {
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType,
          audioBitsPerSecond: 128000
        });

        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(audioChunksRef.current, { type: mimeType });
          setAudioBlob(blob);
          onStop?.(blob);
        };

        mediaRecorderRef.current = mediaRecorder;
        mediaRecorder.start(1000); // Collect data every second
        setIsRecording(true);
        onStart?.();
      } catch (error) {
        // If MediaRecorder fails, try using RecordRTC as fallback
        if (isSafari) {
          try {
            const RecordRTC = (await import('recordrtc')).default;
            const recorder = new RecordRTC(stream, {
              type: 'audio',
              mimeType: 'audio/wav',
              recorderType: RecordRTC.StereoAudioRecorder,
              numberOfAudioChannels: 1,
              desiredSampRate: 44100,
              bufferSize: 4096,
              audioBitsPerSecond: 128000
            });

            recorder.startRecording();
            mediaRecorderRef.current = recorder as unknown as MediaRecorder;
            setIsRecording(true);
            onStart?.();
          } catch (recordRTCError) {
            throw new Error('Failed to initialize audio recording');
          }
        } else {
          throw error;
        }
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start recording';
      setError(errorMessage);
      onError?.(error instanceof Error ? error : new Error(errorMessage));
      streamRef.current?.getTracks().forEach(track => track.stop());
    }
  }, [isSafari, onError, onStart, onStop]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current) {
      if (mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      streamRef.current?.getTracks().forEach(track => track.stop());
      setIsRecording(false);
    }
  }, []);

  return {
    startRecording,
    stopRecording,
    isRecording,
    audioBlob,
    error
  };
}; 