import React from 'react';

const CivicGptIcon: React.FC<{ className?: string }> = ({ className = "w-9 h-9" }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M21.99 4c0-1.1-.89-2-1.99-2H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h14l4 4-.01-18z" fill="white"/>
        <circle cx="14.5" cy="9.5" r="1.5" fill="#0891B2"/>
        <circle cx="9.5" cy="9.5" r="1.5" fill="#0891B2"/>
        <path d="M15.5 14.5C15.5 14.5 14.7 16 12 16C9.3 16 8.5 14.5 8.5 14.5" stroke="#0891B2" strokeWidth="1.5" strokeLinecap="round"/>
        <path d="M12.5 14.5L14 13" stroke="#0891B2" strokeWidth="1.5" strokeLinecap="round"/>
    </svg>
);

export default CivicGptIcon;
