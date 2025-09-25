import React from 'react';

const StopIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <rect width="14" height="14" x="5" y="5" rx="2" />
    </svg>
);

export default StopIcon;