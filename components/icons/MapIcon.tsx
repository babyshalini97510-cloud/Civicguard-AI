import React from 'react';

const MapIcon: React.FC<{ className?: string }> = ({ className = "w-5 h-5" }) => (
    <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13v-6m0-6V4a1 1 0 011.447-.894L15 6m0 12v-6m0 0l5.447 2.724A1 1 0 0121 16.382V5.618a1 1 0 00-1.447-.894L15 2m-6 5l6-3m-6 13l6-3" />
    </svg>
);

export default MapIcon;