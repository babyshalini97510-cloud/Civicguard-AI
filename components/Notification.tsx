import React, { useEffect } from 'react';
import CheckCircleIcon from './icons/CheckCircleIcon';

interface NotificationProps {
  message: string;
  onClose: () => void;
}

const Notification: React.FC<NotificationProps> = ({ message, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 4000); // Auto-close after 4 seconds

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div 
      className="fixed top-5 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md p-4 animate-slide-in-down-bounce"
      role="alert"
    >
      <div className="bg-green-500 text-white font-bold rounded-lg shadow-lg p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <CheckCircleIcon className="w-6 h-6" />
          <span>{message}</span>
        </div>
        <button onClick={onClose} className="text-white opacity-80 hover:opacity-100" aria-label="Close notification">
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
    </div>
  );
};

export default Notification;