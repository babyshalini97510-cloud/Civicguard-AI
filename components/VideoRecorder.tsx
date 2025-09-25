

import React, { useState, useRef, useEffect, useCallback } from 'react';
import RecordIcon from './icons/RecordIcon';
import StopIcon from './icons/StopIcon';
import TrashIcon from './icons/TrashIcon';
import SpinnerIcon from './icons/SpinnerIcon';

interface VideoRecorderProps {
    onVideoChange: (data: { videoURL: string | null; gps: { lat: number; lng: number; accuracy: number } | null }) => void;
    currentVideoUrl?: string | null;
    district?: string;
    panchayat?: string;
    village?: string;
}

const VideoRecorder: React.FC<VideoRecorderProps> = ({ onVideoChange, currentVideoUrl, district, panchayat, village }) => {
    const [isRecording, setIsRecording] = useState(false);
    const [recordedVideoUrl, setRecordedVideoUrl] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [duration, setDuration] = useState(0);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const animationFrameIdRef = useRef<number | null>(null);
    const timerRef = useRef<number | null>(null);
    const chunksRef = useRef<Blob[]>([]);
    const isRecordingRef = useRef(false);

    const [gpsData, setGpsData] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);

    const stopCamera = useCallback(() => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        stopCamera();

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: true });
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    videoRef.current.oncanplay = () => {
                        setIsLoading(false);
                        setError(null);
                    };
                } else {
                    setIsLoading(false);
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                if (err instanceof DOMException && err.name === "NotAllowedError") {
                    setError("Camera and Microphone permissions were denied. To record video, please grant permissions in your browser's settings.");
                } else {
                    const message = err instanceof Error ? err.message : "An unknown error occurred.";
                    setError(`Camera/Mic access denied: ${message}. Please check your browser permissions.`);
                }
            }
        } else {
            setError("Your browser does not support camera access.");
            setIsLoading(false);
        }
    }, [stopCamera]);
    
    useEffect(() => {
        if (currentVideoUrl) {
            setRecordedVideoUrl(currentVideoUrl);
            setIsLoading(false);
        } else {
            startCamera();
        }

        return () => {
            stopCamera();
            if (timerRef.current) clearInterval(timerRef.current);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
        };
    }, [currentVideoUrl, startCamera, stopCamera]);
    
    const drawOverlayLoop = useCallback(() => {
        if (!isRecordingRef.current) {
            return; // Stop the loop
        }
    
        const video = videoRef.current;
        const canvas = canvasRef.current;
        
        if (video && canvas && video.readyState >= 2 && video.videoWidth > 0) {
            const context = canvas.getContext('2d');
            if (context) {
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
                const currentTimestamp = new Date();
                const fontSize = Math.max(14, Math.round(canvas.width / 50));
                const padding = fontSize / 2;
                const lineHeight = fontSize * 1.2;
                
                const locationString = [village, panchayat, district].filter(Boolean).join(', ');
    
                const lines = [];
                if (locationString) lines.push(locationString);
                lines.push(gpsData ? `Lat: ${gpsData.lat.toFixed(6)}, Lng: ${gpsData.lng.toFixed(6)}` : 'GPS Not Available');
                lines.push(currentTimestamp.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }));
    
                context.font = `bold ${fontSize}px sans-serif`;
                const textWidth = Math.max(...lines.map(line => context.measureText(line).width));
                
                const overlayX = canvas.width - textWidth - (padding * 3);
                const overlayY = canvas.height - (lineHeight * lines.length) - (padding * 3);
                const overlayWidth = textWidth + (padding * 2);
                const overlayHeight = (lineHeight * lines.length) + (padding * 2);
    
                context.fillStyle = 'rgba(0, 0, 0, 0.6)';
                context.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);
    
                context.fillStyle = '#FFFFFF';
                lines.forEach((line, index) => {
                    context.fillText(line, overlayX + padding, overlayY + padding + (lineHeight * (index + 1)) - (lineHeight / 4));
                });
            }
        }
        
        animationFrameIdRef.current = requestAnimationFrame(drawOverlayLoop);
    }, [district, panchayat, village, gpsData]);

    const handleStopRecording = useCallback(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
            mediaRecorderRef.current.stop();
        }
        isRecordingRef.current = false;
        if (animationFrameIdRef.current) {
            cancelAnimationFrame(animationFrameIdRef.current);
            animationFrameIdRef.current = null;
        }
    }, []);

    const handleStartRecording = async () => {
        if (!streamRef.current || !canvasRef.current || !videoRef.current) {
            setError("Camera is not ready. Please wait a moment and try again.");
            return;
        }
        
        setGpsError(null);
        let capturedGps: { lat: number; lng: number; accuracy: number } | null = null;
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { 
                    enableHighAccuracy: true, 
                    timeout: 10000, 
                    maximumAge: 0 
                });
            });
            capturedGps = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            };
            setGpsData(capturedGps);
        } catch (geoError: any) {
            console.warn("Could not get GPS location for video: ", geoError.code, geoError.message);
            let message = 'Could not get GPS location. Recording will start without location data.';
            switch (geoError.code) {
                case 1: // PERMISSION_DENIED
                    message = 'GPS permission denied. Please enable location access for this site in your browser settings. Recording will start without location data.';
                    break;
                case 2: // POSITION_UNAVAILABLE
                     message = 'Your location is currently unavailable, possibly due to poor signal. Recording will start without location data.';
                    break;
                case 3: // TIMEOUT
                    message = 'Getting your location timed out. Try moving to an open area. Recording will start without location data.';
                    break;
            }
            setGpsError(message);
            setGpsData(null);
            capturedGps = null;
        }

        isRecordingRef.current = true;
        setIsRecording(true);
        chunksRef.current = [];
        
        const canvasStream = canvasRef.current.captureStream();
        const audioTracks = streamRef.current.getAudioTracks();
        if (audioTracks.length > 0) {
            canvasStream.addTrack(audioTracks[0]);
        }
        
        const MimeTypes = ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm'];
        const supportedMimeType = MimeTypes.find(type => MediaRecorder.isTypeSupported(type));

        if (!supportedMimeType) {
            setError("No supported video format for recording.");
            setIsRecording(false);
            isRecordingRef.current = false;
            return;
        }

        try {
            mediaRecorderRef.current = new MediaRecorder(canvasStream, { mimeType: supportedMimeType });
        } catch (e) {
            console.error("Failed to create MediaRecorder:", e);
            setError("Failed to initialize video recorder.");
            setIsRecording(false);
            isRecordingRef.current = false;
            return;
        }

        mediaRecorderRef.current.ondataavailable = (event) => {
            if (event.data.size > 0) chunksRef.current.push(event.data);
        };

        mediaRecorderRef.current.onstop = () => {
            isRecordingRef.current = false;
            setIsRecording(false);
            if (animationFrameIdRef.current) cancelAnimationFrame(animationFrameIdRef.current);
            if (timerRef.current) clearInterval(timerRef.current);
            animationFrameIdRef.current = null;
            timerRef.current = null;
            
            const videoBlob = new Blob(chunksRef.current, { type: supportedMimeType });
            const url = URL.createObjectURL(videoBlob);
            setRecordedVideoUrl(url);
            onVideoChange({ videoURL: url, gps: capturedGps });
            stopCamera();
        };
        
        animationFrameIdRef.current = requestAnimationFrame(drawOverlayLoop);
        mediaRecorderRef.current.start();
        setDuration(0);
        timerRef.current = window.setInterval(() => {
            setDuration(prev => {
                const newDuration = prev + 1;
                if (newDuration >= 30) {
                    handleStopRecording();
                }
                return newDuration;
            });
        }, 1000);
    };

    const handleRemoveVideo = () => {
        if (recordedVideoUrl) {
            URL.revokeObjectURL(recordedVideoUrl);
        }
        setRecordedVideoUrl(null);
        onVideoChange({ videoURL: null, gps: null });
        startCamera();
    };
    
    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60).toString().padStart(2, '0');
        const secs = (seconds % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    if (recordedVideoUrl) {
        return (
            <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
                <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Preview Your Recording</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Your 30-second video is ready. Press play to review it as many times as you need. Check the video, sound, and the timestamp/GPS overlay before submitting.
                </p>
                <div className="relative group">
                    <video src={recordedVideoUrl} controls className="w-full rounded-lg max-h-64 bg-black"></video>
                    <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center"
                        aria-label="Remove and record new video"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Record a Video</h4>
             <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                The recording will stop automatically after 30 seconds.
            </p>
             {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-2">{error}</p>}
             {gpsError && !isRecording && <p className="text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-md mb-2 text-sm">{gpsError}</p>}
            <div className="relative bg-gray-200 dark:bg-gray-900 rounded-lg flex items-center justify-center min-h-[200px]">
                {isLoading ? <SpinnerIcon /> : (
                  <>
                    <video ref={videoRef} autoPlay muted playsInline className="w-full rounded-lg" />
                    <canvas ref={canvasRef} className="absolute -top-[9999px] -left-[9999px]"></canvas>
                    {isRecording && (
                       <div className="absolute top-2 left-2 flex items-center gap-2 bg-red-600 text-white px-2 py-1 rounded-md text-sm">
                           <div className="w-3 h-3 rounded-full bg-white animate-pulse"></div>
                           <span>REC</span>
                           <span className="font-mono">{formatTime(duration)} / 00:30</span>
                       </div>
                    )}
                  </>
                )}
            </div>
            <div className="text-center mt-4">
                 {isRecording ? (
                     <button type="button" onClick={handleStopRecording} className="px-6 py-3 bg-gray-700 text-white font-bold rounded-lg shadow hover:bg-gray-800 flex items-center gap-2 mx-auto">
                        <StopIcon className="w-5 h-5" />
                        Stop Recording
                    </button>
                 ) : (
                     <button type="button" onClick={handleStartRecording} disabled={isLoading || !!error} className="px-6 py-3 bg-red-600 text-white font-bold rounded-lg shadow hover:bg-red-700 flex items-center gap-2 mx-auto disabled:bg-red-300">
                        <RecordIcon className="w-5 h-5" />
                        Start Recording
                    </button>
                 )}
            </div>
        </div>
    );
};

export default VideoRecorder;
