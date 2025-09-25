

import React, { useState, useMemo, useEffect } from 'react';
import { Issue, User } from '../types';
import ThumbsUpIcon from './icons/ThumbsUpIcon';
import { getAllLocationData, District } from '../data/locationService';

interface DashboardViewProps {
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  user: User;
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

const DashboardView: React.FC<DashboardViewProps> = ({ issues, onSelectIssue, user, onVote, votedIssues }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'newest' | 'mostVoted'>('newest');
  
  const [allLocationData, setAllLocationData] = useState<District[]>([]);
  const [districtFilter, setDistrictFilter] = useState(user.district || '');
  const [panchayatFilter, setPanchayatFilter] = useState('All Panchayats');
  const [villageFilter, setVillageFilter] = useState('All Villages');
  const [streetFilter, setStreetFilter] = useState('');

  const [votedAnimation, setVotedAnimation] = useState<Set<number>>(new Set());

  useEffect(() => {
    getAllLocationData().then(data => {
        setAllLocationData(data);
        if (!user.district && data.length > 0 && data[0].panchayats) {
            setDistrictFilter(data[0].name);
        }
    });
  }, [user.district]);

  const handleVoteClick = (e: React.MouseEvent, issueId: number) => {
    e.stopPropagation();
    if (!votedIssues.has(issueId)) {
        onVote(issueId);
        setVotedAnimation(prev => new Set(prev).add(issueId));
        setTimeout(() => {
            setVotedAnimation(prev => {
                const next = new Set(prev);
                next.delete(issueId);
                return next;
            });
        }, 600); // Animation duration
    }
  };
  
  const { districts, panchayats, villages } = useMemo(() => {
    const allDistricts = allLocationData.map(d => d.name);

    const selectedDistrictData = allLocationData.find(d => d.name === districtFilter);
    const panchayatOptions = selectedDistrictData?.panchayats?.map(p => p.name) ?? [];

    let villageOptions: string[] = [];
    if (selectedDistrictData?.panchayats) {
        if (panchayatFilter !== 'All Panchayats') {
            const selectedPanchayatData = selectedDistrictData.panchayats.find(p => p.name === panchayatFilter);
            villageOptions = selectedPanchayatData?.villages ?? [];
        } else {
            // When 'All Panchayats' is selected, get all unique villages from the district
            const allVillagesInDistrict = selectedDistrictData.panchayats.flatMap(p => p.villages);
            // FIX: Replaced array spread from a Set with Array.from() to resolve a TypeScript type inference issue where it was incorrectly inferring 'unknown[]' instead of 'string[]'.
            villageOptions = Array.from(new Set(allVillagesInDistrict));
        }
    }
    
    return { 
        districts: allDistricts, 
        panchayats: ['All Panchayats', ...panchayatOptions], 
        villages: ['All Villages', ...villageOptions], 
    };
  }, [allLocationData, districtFilter, panchayatFilter]);

  useEffect(() => {
    // When district changes, reset panchayat.
    setPanchayatFilter('All Panchayats');
  }, [districtFilter]);

  useEffect(() => {
    // When panchayat changes, reset village.
    setVillageFilter('All Villages');
  }, [panchayatFilter]);

  const filteredAndSortedIssues = useMemo(() => {
    const lowercasedStreetFilter = streetFilter.toLowerCase();
    return issues
      .filter(issue => issue.location.district === districtFilter)
      .filter(issue => 
        issue.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.description.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .filter(issue => panchayatFilter === 'All Panchayats' || issue.location.panchayat === panchayatFilter)
      .filter(issue => villageFilter === 'All Villages' || issue.location.village === villageFilter)
      .filter(issue => !lowercasedStreetFilter || issue.location.street.toLowerCase().includes(lowercasedStreetFilter))
      .sort((a, b) => {
        if (sortBy === 'mostVoted') {
          return b.upvotes - a.upvotes;
        }
        // newest
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      });
  }, [issues, searchTerm, sortBy, districtFilter, panchayatFilter, villageFilter, streetFilter]);

  const FilterSelect: React.FC<{label: string, value: string, onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void, options: string[]}> = ({label, value, onChange, options}) => (
      <div className="flex-1 min-w-[120px]">
        <label htmlFor={label} className="sr-only">{label}</label>
        <select
            id={label}
            value={value}
            onChange={onChange}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
      </div>
  );

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md sticky top-0 z-5">
        <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <input
                type="text"
                placeholder="Search by title or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="flex-grow p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as 'newest' | 'mostVoted')}
                  className="p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="newest">Newest First</option>
                  <option value="mostVoted">Most Voted</option>
                </select>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <FilterSelect label="District" value={districtFilter} onChange={e => setDistrictFilter(e.target.value)} options={districts} />
                <FilterSelect label="Panchayat" value={panchayatFilter} onChange={e => setPanchayatFilter(e.target.value)} options={panchayats} />
                <FilterSelect label="Village" value={villageFilter} onChange={e => setVillageFilter(e.target.value)} options={villages} />
                <div className="flex-1 min-w-[120px]">
                    <label htmlFor="street-filter" className="sr-only">Street</label>
                    <input
                        id="street-filter"
                        type="text"
                        placeholder="Filter by Street..."
                        value={streetFilter}
                        onChange={(e) => setStreetFilter(e.target.value)}
                        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                    />
                </div>
            </div>
        </div>
      </div>
      
      <div className="space-y-4">
        {filteredAndSortedIssues.map((issue, index) => {
          const hasVoted = votedIssues.has(issue.id);
          const isAnimating = votedAnimation.has(issue.id);
          return (
          <div
            key={issue.id}
            onClick={() => onSelectIssue(issue)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-200 dark:border-gray-700 animate-slide-in-up"
            style={{ animationDelay: `${index * 75}ms`, opacity: 0 }}
          >
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{issue.title}</h3>
              <span className={getStatusPill(issue.status)}>{issue.status}</span>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
              {issue.location.street}, {issue.location.village}, {issue.location.panchayat}
            </p>
            <div className="flex justify-between items-center text-sm text-gray-600 dark:text-gray-300">
              <span>{new Date(issue.createdAt).toLocaleDateString()}</span>
               <div className="flex items-center gap-4">
                <div className={`flex items-center gap-1 transition-all duration-300 ${isAnimating ? 'scale-125 text-indigo-500 dark:text-indigo-400' : ''}`}>
                  <ThumbsUpIcon />
                  <span>{issue.upvotes}</span>
                </div>
                <button
                  onClick={(e) => handleVoteClick(e, issue.id)}
                  disabled={hasVoted}
                  className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${
                    hasVoted
                      ? 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400 cursor-not-allowed'
                      : 'bg-indigo-100 text-indigo-700 hover:bg-indigo-200 dark:bg-indigo-900/50 dark:text-indigo-300 dark:hover:bg-indigo-900'
                  }`}
                  aria-label={`Upvote for ${issue.title}`}
                >
                  {hasVoted ? 'Voted' : 'Vote'}
                </button>
              </div>
            </div>
          </div>
        )})}
         {filteredAndSortedIssues.length === 0 && (
            <div className="text-center py-10">
                <p className="text-gray-500 dark:text-gray-400">No issues found for the selected filters.</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default DashboardView;