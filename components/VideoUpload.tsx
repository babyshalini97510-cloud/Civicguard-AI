import React, { useState, useRef, useEffect } from 'react';
import VideoCameraIcon from './icons/VideoCameraIcon';
import TrashIcon from './icons/TrashIcon';

interface VideoUploadProps {
    onVideoChange: (videoURL: string | null) => void;
    currentVideoUrl?: string | null; // For editing
}

const VideoUpload: React.FC<VideoUploadProps> = ({ onVideoChange, currentVideoUrl }) => {
    const [videoUrl, setVideoUrl] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        setVideoUrl(currentVideoUrl || null);
    }, [currentVideoUrl]);

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            // Revoke old object URL to prevent memory leaks
            if (videoUrl) {
                URL.revokeObjectURL(videoUrl);
            }
            const url = URL.createObjectURL(file);
            setVideoUrl(url);
            onVideoChange(url);
        }
    };

    const handleTriggerUpload = () => {
        fileInputRef.current?.click();
    };

    const handleRemoveVideo = () => {
        if (videoUrl) {
            URL.revokeObjectURL(videoUrl);
        }
        setVideoUrl(null);
        onVideoChange(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = ""; // Reset file input
        }
    };

    return (
        <div className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900/50">
            <h4 className="text-md font-semibold text-gray-800 dark:text-gray-200 mb-2">Upload a Video (Optional)</h4>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                You can upload one video to provide more context.
            </p>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="video/*"
                className="hidden"
            />

            {videoUrl ? (
                <div className="relative group">
                    <video src={videoUrl} controls className="w-full rounded-lg h-48 object-cover"></video>
                    <button
                        type="button"
                        onClick={handleRemoveVideo}
                        className="absolute top-2 right-2 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        aria-label="Remove video"
                    >
                        <TrashIcon className="w-5 h-5" />
                    </button>
                </div>
            ) : (
                <button
                    type="button"
                    onClick={handleTriggerUpload}
                    className="w-full flex flex-col items-center justify-center gap-2 px-4 py-6 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700/50"
                >
                    <VideoCameraIcon className="w-10 h-10 text-gray-400" />
                    <span className="text-indigo-600 font-semibold">Click to upload video</span>
                </button>
            )}
        </div>
    );
};

export default VideoUpload;
