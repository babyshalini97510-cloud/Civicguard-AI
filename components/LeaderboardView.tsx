import React from 'react';
import { User } from '../types';
import TrophyIcon from './icons/TrophyIcon';

interface LeaderboardViewProps {
  users: User[];
}

const LeaderboardView: React.FC<LeaderboardViewProps> = ({ users }) => {
  const sortedUsers = [...users].filter(u => u.role === 'citizen').sort((a, b) => b.points - a.points);

  const getRankColor = (rank: number) => {
    if (rank === 0) return 'text-amber-400';
    if (rank === 1) return 'text-slate-400';
    if (rank === 2) return 'text-amber-600';
    return 'text-gray-500 dark:text-gray-400';
  };

  const getRankBorder = (rank: number) => {
    if (rank === 0) return 'bg-amber-50 dark:bg-amber-900/20 border-amber-400';
    if (rank === 1) return 'bg-slate-50 dark:bg-slate-900/20 border-slate-400';
    if (rank === 2) return 'bg-yellow-800/10 dark:bg-yellow-900/20 border-yellow-700';
    return 'bg-gray-50 dark:bg-gray-700/50 border-gray-200 dark:border-gray-700';
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <h2 className="text-3xl font-bold text-center mb-6 text-gray-900 dark:text-white">Top Contributors</h2>
      <ul className="space-y-4">
        {sortedUsers.map((user, index) => (
          <li
            key={user.id}
            className={`flex items-center p-4 rounded-lg shadow-sm border animate-slide-in-up ${getRankBorder(index)}`}
            style={{ animationDelay: `${index * 75}ms`, opacity: 0 }}
          >
            <div className={`text-2xl font-bold w-10 ${getRankColor(index)}`}>
              {index + 1}
            </div>
            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full mx-4" />
            <div className="flex-grow">
              <p className="font-semibold text-lg text-gray-800 dark:text-gray-200">{user.name}</p>
              <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                 {user.badges.slice(0, 1).map(badge => <TrophyIcon key={badge.name} className="w-4 h-4 mr-1 text-yellow-500" />)}
                 <span>{user.badges.length} {user.badges.length === 1 ? 'Badge' : 'Badges'}</span>
              </div>
            </div>
            <div className="text-lg font-bold text-indigo-600 dark:text-indigo-400">
              {user.points.toLocaleString()} pts
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default LeaderboardView;