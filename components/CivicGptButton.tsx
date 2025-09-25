import React from 'react';
import CivicGptIcon from './icons/CivicGptIcon';

interface CivicGptButtonProps {
    onClick: () => void;
}

const CivicGptButton: React.FC<CivicGptButtonProps> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="fixed bottom-24 right-6 z-50 flex items-center justify-center w-16 h-16 bg-cyan-500 rounded-full shadow-lg hover:bg-cyan-600 transition-colors focus:outline-none group"
            aria-label="Open CivicGPT Assistant"
            style={{
              boxShadow: '0 0 20px 7px rgba(34, 211, 238, 0.5)',
            }}
        >
            <CivicGptIcon className="w-9 h-9 transition-transform group-hover:scale-110" />
        </button>
    );
};

export default CivicGptButton;
