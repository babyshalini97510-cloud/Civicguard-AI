import React, { useState, useRef, useEffect, useCallback } from 'react';
import MicIcon from './icons/MicIcon';
import TrashIcon from './icons/TrashIcon';

interface EmotionRecorderProps {
    onRecordComplete: (audioData: { blob: Blob, dataURL: string } | null) => void;
}

const EmotionRecorder: React.FC<EmotionRecorderProps> = ({ onRecordComplete }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [audioURL, setAudioURL] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [duration, setDuration] = useState(0);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<number | null>(null);

    const stopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    const handleStartRecording = useCallback(async () => {
        setError(null);
        setAudioURL(null);
        onRecordComplete(null);
        
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            setError("Audio recording is not supported by your browser.");
            return;
        }

        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            mediaRecorderRef.current = new MediaRecorder(stream);
            chunksRef.current = [];

            mediaRecorderRef.current.ondataavailable = (event) => {
                chunksRef.current.push(event.data);
            };

            mediaRecorderRef.current.onstop = () => {
                const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
                const url = URL.createObjectURL(audioBlob);
                setAudioURL(url);

                const reader = new FileReader();
                reader.readAsDataURL(audioBlob);
                reader.onloadend = () => {
                    const base64data = reader.result as string;
                    onRecordComplete({ blob: audioBlob, dataURL: base64data });
                };
                
                stream.getTracks().forEach(track => track.stop()); // Stop mic access
                setIsRecording(false);
                if (timerRef.current) {
                    clearInterval(timerRef.current);
                    timerRef.current = null;
                }
            };

            mediaRecorderRef.current.start();
            setIsRecording(true);
            setDuration(0);
            timerRef.current = window.setInterval(() => {
                setDuration(prev => prev + 1);
            }, 1000);

        } catch (err) {
            console.error("Error accessing microphone:", err);
            setError("Microphone access was denied. Please enable it in your browser settings.");
        }
    }, [onRecordComplete]);
    
    const handleDeleteRecording = () => {
        setAudioURL(null);
        setDuration(0);
        onRecordComplete(null);
    };

    useEffect(() => {
        if (duration >= 120) {
            stopRecording();
        }
    }, [duration, stopRecording]);

    useEffect(() => {
        // Cleanup on unmount
        return () => {
           stopRecording();
        };
    }, [stopRecording]);
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    }

    return (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Record Your Voice (Optional)</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Record a short audio clip (up to 2 mins) describing the issue. Your tone can help us assess urgency.
            </p>
            {error && <p className="text-red-500 text-sm mb-2">{error}</p>}

            {!isRecording && !audioURL && (
                <button type="button" onClick={handleStartRecording} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700">
                    <MicIcon className="w-5 h-5" />
                    Start Recording
                </button>
            )}

            {isRecording && (
                <div className="flex items-center justify-between p-2 bg-red-100 dark:bg-red-900/50 rounded-lg">
                    <div className="flex items-center gap-2 text-red-600 dark:text-red-300">
                        <span className="relative flex h-3 w-3">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
                        </span>
                        <span>Recording...</span>
                    </div>
                    <span className="font-mono text-red-600 dark:text-red-300">{formatTime(duration)} / 02:00</span>
                    <button type="button" onClick={stopRecording} className="px-4 py-1 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600">
                        Stop
                    </button>
                </div>
            )}

            {audioURL && (
                <div className="flex items-center justify-between gap-2">
                    <audio src={audioURL} controls className="w-full" />
                    <button type="button" onClick={handleDeleteRecording} className="p-2 text-red-500 hover:bg-red-100 dark:hover:bg-red-900/50 rounded-full" aria-label="Delete recording">
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            )}
        </div>
    );
};

export default EmotionRecorder;