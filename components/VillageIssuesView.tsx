import React from 'react';
import { Issue, User } from '../types';
import ThumbsUpIcon from './icons/ThumbsUpIcon';

interface VillageIssuesViewProps {
  issues: Issue[];
  user: User;
  onSelectIssue: (issue: Issue) => void;
  onVote: (issueId: number) => void;
  votedIssues: Set<number>;
}

// FIX: Corrected issue status strings ('In Progress') and added all valid statuses ('Resolved', 'Closed') to match the Issue type definition.
const getStatusPill = (status: Issue['status']) => {
  const baseClasses = "px-3 py-1 text-xs font-medium rounded-full";
  switch (status) {
    case 'Pending':
      return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
    case 'Received':
      return `${baseClasses} bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300`;
    case 'In Progress':
      return `${baseClasses} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
    case 'Resolved':
      return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
    case 'Closed':
      return `${baseClasses} bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200`;
  }
};

const VillageIssuesView: React.FC<VillageIssuesViewProps> = ({ issues, user, onSelectIssue, onVote, votedIssues }) => {
  const villageIssues = issues.filter(issue => 
    issue.location.district === user.district &&
    issue.location.panchayat === user.panchayat &&
    issue.location.village === user.village
  ).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Issues in {user.village}</h2>
        <p className="text-gray-600 dark:text-gray-400">Here are the issues reported in your village. You can vote for issues that affect you the most.</p>
      </div>
      
      <div className="space-y-4">
        {villageIssues.length > 0 ? villageIssues.map((issue, index) => {
          const hasVoted = votedIssues.has(issue.id);
          return (
            <div
              key={issue.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-lg hover:-translate-y-1 animate-slide-in-up"
              style={{ animationDelay: `${index * 75}ms`, opacity: 0 }}
            >
              <div onClick={() => onSelectIssue(issue)} className="cursor-pointer">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{issue.title}</h3>
                  <span className={getStatusPill(issue.status)}>{issue.status}</span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                  Reported on: {new Date(issue.createdAt).toLocaleDateString()}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">{issue.description.substring(0, 100)}...</p>
              </div>
              <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300 border-t border-gray-200 dark:border-gray-700 pt-3">
                <div className="flex items-center gap-2">
                  <ThumbsUpIcon />
                  <span>{issue.upvotes} votes</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onVote(issue.id);
                  }}
                  disabled={hasVoted}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    hasVoted
                      ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900'
                  }`}
                >
                  {hasVoted ? 'Voted' : 'Vote'}
                </button>
              </div>
            </div>
          );
        }) : (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-gray-500 dark:text-gray-400">No issues have been reported in your village yet.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default VillageIssuesView;