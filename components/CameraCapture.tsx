
import React, { useState, useRef, useEffect, useCallback } from 'react';
import CameraIcon from './icons/CameraIcon';

interface CameraCaptureProps {
    onCapture: (data: { photo: string; gps: { lat: number; lng: number; accuracy: number } | null; timestamp: string }) => void;
    district?: string;
    panchayat?: string;
    village?: string;
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, district, panchayat, village }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [gpsError, setGpsError] = useState<string | null>(null);

    const startCamera = useCallback(async () => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
        }
        setError(null);

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const newStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
                setStream(newStream);
                if (videoRef.current) {
                    videoRef.current.srcObject = newStream;
                }
            } catch (err) {
                console.error("Error accessing camera: ", err);
                if (err instanceof DOMException && err.name === "NotAllowedError") {
                    setError("Camera permission was denied. To take a photo, please grant permission in your browser's settings. You may need to look for a camera icon in the address bar.");
                } else {
                    const message = err instanceof Error ? err.message : "An unknown error occurred.";
                    setError(`Could not access camera: ${message}`);
                }
            }
        } else {
            setError("Your browser does not support camera access.");
        }
    }, [stream]);

    useEffect(() => {
        startCamera();
        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Run only on mount

    const handleCapture = async () => {
        setIsCapturing(true);
        setGpsError(null);
        const video = videoRef.current;
        const canvas = canvasRef.current;
        if (!video || !canvas) {
            setIsCapturing(false);
            return;
        }

        const context = canvas.getContext('2d');
        if (!context) {
            setIsCapturing(false);
            return;
        }

        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        const timestamp = new Date();
        
        try {
            const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { 
                    enableHighAccuracy: true, 
                    timeout: 10000, 
                    maximumAge: 0 
                });
            });
            const gpsData = {
                lat: pos.coords.latitude,
                lng: pos.coords.longitude,
                accuracy: pos.coords.accuracy,
            };
            drawOverlay(context, timestamp, gpsData);
            const imageData = canvas.toDataURL('image/jpeg');
            onCapture({ photo: imageData, gps: gpsData, timestamp: timestamp.toISOString() });

        } catch (geoError: any) {
            console.warn("Could not get GPS location: ", geoError.code, geoError.message);
            let message = 'Could not get GPS location. The photo was captured without location data.';
            switch (geoError.code) {
                case 1: // PERMISSION_DENIED
                    message = 'GPS permission denied. Please enable location access for this site in your browser settings. The photo was captured without location data.';
                    break;
                case 2: // POSITION_UNAVAILABLE
                    message = 'Your location is currently unavailable. This might be due to a poor signal. The photo was captured without location data.';
                    break;
                case 3: // TIMEOUT
                    message = 'Getting your location timed out. Try moving to an open area with a clear view of the sky. The photo was captured without location data.';
                    break;
            }
            setGpsError(message);

            drawOverlay(context, timestamp, null);
            const imageData = canvas.toDataURL('image/jpeg');
            onCapture({ photo: imageData, gps: null, timestamp: timestamp.toISOString() });
        } finally {
            setIsCapturing(false);
        }
    };

    const drawOverlay = (
        ctx: CanvasRenderingContext2D,
        timestamp: Date,
        gps: { lat: number, lng: number, accuracy: number } | null
    ) => {
        const { width, height } = ctx.canvas;
        const fontSize = Math.max(14, Math.round(width / 50));
        const padding = fontSize / 2;
        const lineHeight = fontSize * 1.2;
        
        const locationString = [village, panchayat, district].filter(Boolean).join(', ');

        const lines = [];
        if (locationString) {
            lines.push(locationString);
        }
        lines.push(gps ? `Lat: ${gps.lat.toFixed(6)}, Lng: ${gps.lng.toFixed(6)} (Acc: ${gps.accuracy.toFixed(1)}m)` : 'GPS Signal not found');
        lines.push(timestamp.toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'medium' }));

        ctx.font = `bold ${fontSize}px sans-serif`;
        const textWidth = Math.max(...lines.map(line => ctx.measureText(line).width));
        
        const overlayX = width - textWidth - (padding * 3);
        const overlayY = height - (lineHeight * lines.length) - (padding * 3);
        const overlayWidth = textWidth + (padding * 2);
        const overlayHeight = (lineHeight * lines.length) + (padding * 2);

        // Draw semi-transparent background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(overlayX, overlayY, overlayWidth, overlayHeight);

        // Draw text
        ctx.fillStyle = '#FFFFFF';
        lines.forEach((line, index) => {
            ctx.fillText(line, overlayX + padding, overlayY + padding + (lineHeight * (index + 1)) - (lineHeight / 4));
        });
    };

    return (
        <div>
            {error && <p className="text-red-500 bg-red-100 dark:bg-red-900/50 p-3 rounded-md mb-2">{error}</p>}
            
            <div className="relative bg-gray-200 dark:bg-gray-900 rounded-lg flex items-center justify-center min-h-[200px]">
                <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    className="w-full max-w-md mx-auto border-2 border-gray-400 dark:border-gray-600 rounded-lg"
                />
            </div>
            
            <canvas ref={canvasRef} className="hidden"></canvas>
            
            {gpsError && <p className="text-yellow-600 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-900/50 p-3 rounded-md my-2 text-sm">{gpsError}</p>}
            
            <div className="text-center mt-4">
                 <button
                    type="button"
                    onClick={handleCapture}
                    className="px-6 py-3 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 flex items-center gap-2 mx-auto focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-indigo-300"
                    disabled={!!error || !stream || isCapturing}
                >
                    <CameraIcon className="w-5 h-5" />
                    {isCapturing ? 'Processing...' : 'Capture Photo'}
                </button>
            </div>
        </div>
    );
};

export default CameraCapture;
