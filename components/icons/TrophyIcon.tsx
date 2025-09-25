import React from 'react';

const TrophyIcon: React.FC<{ className?: string }> = ({ className = "w-6 h-6" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8V5a3 3 0 00-3-3H9a3 3 0 00-3 3v3h11zM5 10a2 2 0 00-2 2v6a2 2 0 002 2h14a2 2 0 002-2v-6a2 2 0 00-2-2H5zm11 6H8v-2h8v2z" />
  </svg>
);

export default TrophyIcon;