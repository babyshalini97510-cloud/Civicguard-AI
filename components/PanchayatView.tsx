

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Issue, User } from '../types';
import { getDistrictData } from '../data/locationService';
import { villageBoundaries } from '../data/villageBoundaries';
import ListIcon from './icons/ListIcon';
import MapIcon from './icons/MapIcon';
import ChartBarIcon from './icons/ChartBarIcon';
import RobotIcon from './icons/RobotIcon';
import CameraIcon from './icons/CameraIcon';

// Let TypeScript know that Leaflet 'L' is available globally
declare var L: any;

type PanchayatViewTab = 'dashboard' | 'map' | 'analytics';
type SortBy = 'newest' | 'oldest' | 'upvotes' | 'priority';

interface PanchayatViewProps {
  issues: Issue[];
  user: User;
  onUpdateStatus: (
    issueId: number,
    status: Issue['status'],
    resolutionProof?: { description: string; image: string }
  ) => void;
  onUpdateIssueDetails: (
    issueId: number,
    details: Partial<Pick<Issue, 'priority' | 'assignedTo'>>
  ) => void;
  onSelectIssue: (issue: Issue) => void;
}

const statusOptions: Issue['status'][] = ['Pending', 'Received', 'In Progress', 'Resolved', 'Closed'];
const categoryOptions: Issue['category'][] = ['Roads', 'Waste', 'Water', 'Electricity', 'Public Infrastructure', 'Other'];
const priorityOptions: NonNullable<Issue['priority']>[] = ['Low', 'Medium', 'High', 'Critical'];

const getStatusPillClass = (status: Issue['status']) => {
  const base = "px-2 py-1 text-xs font-semibold rounded-full";
  switch (status) {
    case 'Pending': return `${base} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
    case 'Received': return `${base} bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300`;
    case 'In Progress': return `${base} bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300`;
    case 'Resolved': return `${base} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
    case 'Closed': return `${base} bg-gray-200 text-gray-700 dark:bg-gray-600 dark:text-gray-200`;
    default: return base;
  }
};

const getPriorityPillClass = (priority?: Issue['priority']) => {
    const base = "px-2 py-1 text-xs font-bold rounded-full";
    switch (priority) {
        case 'Critical': return `${base} bg-red-200 text-red-900 dark:bg-red-900 dark:text-red-200`;
        case 'High': return `${base} bg-orange-200 text-orange-900 dark:bg-orange-900 dark:text-orange-200`;
        case 'Medium': return `${base} bg-amber-200 text-amber-900 dark:bg-amber-900 dark:text-amber-200`;
        case 'Low': return `${base} bg-gray-200 text-gray-800 dark:bg-gray-600 dark:text-gray-200`;
        default: return `${base} bg-gray-100 text-gray-600`;
    }
}

const PanchayatView: React.FC<PanchayatViewProps> = ({ issues, user, onUpdateStatus, onUpdateIssueDetails, onSelectIssue }) => {
  const [activeTab, setActiveTab] = useState<PanchayatViewTab>('dashboard');
  const [filters, setFilters] = useState({
    status: 'All',
    category: 'All',
    priority: 'All',
    village: 'All',
    search: '',
  });
  const [sortBy, setSortBy] = useState<SortBy>('newest');
  
  const [villageOptions, setVillageOptions] = useState<string[]>(['All']);

  // State for resolution modal
  const [resolvingIssueId, setResolvingIssueId] = useState<number | null>(null);
  const [proofDescription, setProofDescription] = useState('');
  const [proofImage, setProofImage] = useState<File | null>(null);

  const panchayatIssues = useMemo(() => {
    return issues.filter(issue => issue.location.panchayat === user.panchayat);
  }, [issues, user.panchayat]);

  useEffect(() => {
    if (user.district && user.panchayat) {
      getDistrictData(user.district).then(data => {
        const panchayatData = data?.panchayats?.find(p => p.name === user.panchayat);
        setVillageOptions(['All', ...(panchayatData?.villages || [])]);
      });
    }
  }, [user.district, user.panchayat]);

  const getSeverityScore = (issue: Issue) => {
    let score = 0;
    score += issue.upvotes * 0.2;
    if (issue.priority === 'Critical') score += 100;
    else if (issue.priority === 'High') score += 75;
    else if (issue.priority === 'Medium') score += 50;
    else if (issue.priority === 'Low') score += 25;
    if (issue.urgency === 'High') score += 20;
    if (issue.urgency === 'Medium') score += 10;
    return score;
  };

  const filteredAndSortedIssues = useMemo(() => {
    let filtered = panchayatIssues.filter(issue => {
      const searchLower = filters.search.toLowerCase();
      return (
        (filters.status === 'All' || issue.status === filters.status) &&
        (filters.category === 'All' || issue.category === filters.category) &&
        (filters.priority === 'All' || issue.priority === filters.priority) &&
        (filters.village === 'All' || issue.location.village === filters.village) &&
        (issue.title.toLowerCase().includes(searchLower) || issue.description.toLowerCase().includes(searchLower))
      );
    });

    return filtered.sort((a, b) => {
        switch (sortBy) {
            case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
            case 'upvotes': return b.upvotes - a.upvotes;
            case 'priority': return getSeverityScore(b) - getSeverityScore(a);
            case 'newest':
            default:
                return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        }
    });
  }, [panchayatIssues, filters, sortBy]);

  const handleFilterChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFilters(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleStatusChange = (issueId: number, newStatus: Issue['status']) => {
    if (newStatus === 'Resolved') {
      setResolvingIssueId(issueId);
    } else {
      onUpdateStatus(issueId, newStatus);
    }
  };

  const handleProofSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!resolvingIssueId || !proofDescription || !proofImage) {
      alert("Please provide a description and an image for the resolution proof.");
      return;
    }
    const mockImageUrl = `https://via.placeholder.com/400x300.png/a0e5a0/000000?text=Resolution+Proof`;
    onUpdateStatus(resolvingIssueId, 'Resolved', {
      description: proofDescription,
      image: mockImageUrl
    });
    setResolvingIssueId(null);
    setProofDescription('');
    setProofImage(null);
  };
  
  const getAiTeamRecommendation = (category: Issue['category']) => {
      switch(category) {
          case 'Roads': return "Road Works Dept.";
          case 'Waste': return "Sanitation Team B";
          case 'Water': return "Water & Sewage Board";
          case 'Electricity': return "Electrical Dept.";
          case 'Public Infrastructure': return "General Maintenance";
          default: return "Review Committee";
      }
  };


  const renderDashboard = () => (
    <div className="space-y-4">
        {/* Filters */}
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-4">
            <input
                type="text"
                name="search"
                placeholder="Search by title or description..."
                value={filters.search}
                onChange={handleFilterChange}
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700"
            />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <select name="status" value={filters.status} onChange={handleFilterChange} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    <option value="All">All Statuses</option>
                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <select name="category" value={filters.category} onChange={handleFilterChange} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    <option value="All">All Categories</option>
                    {categoryOptions.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <select name="priority" value={filters.priority} onChange={handleFilterChange} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    <option value="All">All Priorities</option>
                    {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                 <select name="village" value={filters.village} onChange={handleFilterChange} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                    {villageOptions.map(v => <option key={v} value={v}>{v}</option>)}
                </select>
            </div>
            <div className="flex justify-between items-center">
                <div>
                    <label htmlFor="sortBy" className="text-sm font-medium mr-2">Sort by:</label>
                    <select id="sortBy" name="sortBy" value={sortBy} onChange={e => setSortBy(e.target.value as SortBy)} className="p-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700">
                        <option value="newest">Newest First</option>
                        <option value="oldest">Oldest First</option>
                        <option value="upvotes">Most Upvoted</option>
                        <option value="priority">Highest Priority</option>
                    </select>
                </div>
                <div className="flex items-center gap-2">
                    <RobotIcon className="w-6 h-6 text-cyan-500" />
                    <span className="text-sm font-semibold">AI Assistance:</span>
                     <button onClick={() => setSortBy('priority')} className="px-3 py-1.5 text-sm bg-cyan-100 text-cyan-800 rounded-md hover:bg-cyan-200">Auto-Prioritize</button>
                     <button className="px-3 py-1.5 text-sm bg-cyan-100 text-cyan-800 rounded-md hover:bg-cyan-200">Find Duplicates</button>
                </div>
            </div>
        </div>

        {/* Issue List */}
        <div className="space-y-4">
            {filteredAndSortedIssues.map(issue => (
                <div key={issue.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 border border-gray-200 dark:border-gray-700">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                       {/* Left Column: Details */}
                        <div className="md:col-span-2">
                            <div className="flex justify-between items-start">
                                <h3 className="text-lg font-bold mb-1 text-gray-900 dark:text-white">{issue.title}</h3>
                                <div className={getStatusPillClass(issue.status)}>{issue.status}</div>
                            </div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">{issue.location.village}, {issue.location.street}</p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 mb-2">{issue.description.substring(0,120)}...</p>
                            <div className="flex items-center gap-4 text-sm">
                                <span className={getPriorityPillClass(issue.priority)}>{issue.priority || 'N/A'}</span>
                                <span>Upvotes: {issue.upvotes}</span>
                                <span>Category: {issue.category}</span>
                            </div>
                        </div>

                        {/* Right Column: Actions */}
                        <div className="space-y-3">
                            <div>
                                <label className="text-xs font-medium">Status</label>
                                <select value={issue.status} onChange={e => handleStatusChange(issue.id, e.target.value as Issue['status'])} className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm">
                                    {statusOptions.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="text-xs font-medium">Priority</label>
                                <select value={issue.priority} onChange={e => onUpdateIssueDetails(issue.id, { priority: e.target.value as Issue['priority'] })} className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm">
                                    {priorityOptions.map(p => <option key={p} value={p}>{p}</option>)}
                                </select>
                            </div>
                             <div>
                                <label className="text-xs font-medium">Assigned To</label>
                                <input type="text" defaultValue={issue.assignedTo} onBlur={e => onUpdateIssueDetails(issue.id, { assignedTo: e.target.value })} placeholder="Unassigned" className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-md text-sm" />
                                <p className="text-xs text-cyan-600 mt-1">AI Suggestion: <span className="font-semibold">{getAiTeamRecommendation(issue.category)}</span></p>
                            </div>
                        </div>
                    </div>
                    <button onClick={() => onSelectIssue(issue)} className="text-sm text-indigo-600 hover:underline mt-2">View Full Report</button>
                </div>
            ))}
             {filteredAndSortedIssues.length === 0 && <p className="text-center p-8">No issues match the current filters.</p>}
        </div>
    </div>
  );

  const renderMap = () => <MapViewComponent issues={panchayatIssues} onSelectIssue={onSelectIssue} />;
  
  const renderAnalytics = () => <AnalyticsComponent issues={panchayatIssues} />;


  return (
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Panchayat Dashboard: {user.panchayat}</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage all civic issues reported within your jurisdiction.</p>
        <div className="border-b border-gray-200 dark:border-gray-700 mt-4">
            <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                <TabButton name="Dashboard" icon={<ListIcon />} activeTab={activeTab} tabId="dashboard" setActiveTab={setActiveTab} />
                <TabButton name="Map View" icon={<MapIcon />} activeTab={activeTab} tabId="map" setActiveTab={setActiveTab} />
                <TabButton name="Analytics" icon={<ChartBarIcon />} activeTab={activeTab} tabId="analytics" setActiveTab={setActiveTab} />
            </nav>
        </div>
      </div>
      
      <div className="animate-fade-in">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'map' && renderMap()}
        {activeTab === 'analytics' && renderAnalytics()}
      </div>

      {/* Resolution Proof Modal */}
      {resolvingIssueId !== null && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md p-6">
                  <h3 className="text-lg font-bold mb-4">Submit Resolution Proof</h3>
                   <form onSubmit={handleProofSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium">Description</label>
                            <textarea value={proofDescription} onChange={e => setProofDescription(e.target.value)} rows={3} required className="mt-1 w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md"/>
                        </div>
                        <div>
                            <label className="block text-sm font-medium">Image</label>
                             <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 dark:border-gray-600 border-dashed rounded-md">
                                <div className="space-y-1 text-center">
                                    <CameraIcon className="mx-auto h-12 w-12 text-gray-400" />
                                    <div className="flex text-sm">
                                        <label htmlFor="file-upload" className="relative cursor-pointer rounded-md font-medium text-indigo-600 hover:text-indigo-500">
                                            <span>{proofImage ? proofImage.name : 'Upload a file'}</span>
                                            <input id="file-upload" type="file" className="sr-only" onChange={e => e.target.files && setProofImage(e.target.files[0])} accept="image/*" required />
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="flex justify-end gap-2">
                             <button type="button" onClick={() => setResolvingIssueId(null)} className="px-4 py-2 bg-gray-200 rounded-md">Cancel</button>
                             <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded-md">Submit</button>
                        </div>
                   </form>
              </div>
          </div>
      )}
    </div>
  );
};

const TabButton: React.FC<{name: string, icon: React.ReactNode, activeTab: string, tabId: PanchayatViewTab, setActiveTab: (tab: PanchayatViewTab) => void}> = ({ name, icon, activeTab, tabId, setActiveTab }) => {
    const isActive = activeTab === tabId;
    return (
        <button
            onClick={() => setActiveTab(tabId)}
            className={`${
                isActive
                ? 'border-indigo-500 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            } flex items-center gap-2 whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
        >
            {icon}
            {name}
        </button>
    );
};


const MapViewComponent: React.FC<{issues: Issue[], onSelectIssue: (issue: Issue) => void}> = ({ issues, onSelectIssue }) => {
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);

    const issueCounts = useMemo(() => {
        const counts = new Map<string, number>();
        issues.forEach(issue => {
            if (issue.status !== 'Resolved' && issue.status !== 'Closed') {
                const villageName = issue.location.village;
                counts.set(villageName, (counts.get(villageName) || 0) + 1);
            }
        });
        return counts;
    }, [issues]);

    const getColor = (count: number | undefined) => {
        if (count === undefined) return '#CCCCCC';
        if (count >= 3) return '#d73027';
        if (count === 2) return '#fdae61';
        if (count === 1) return '#fee08b';
        return '#abdda4';
    };

    useEffect(() => {
        if (!mapContainerRef.current || mapRef.current) return;
        
        const map = L.map(mapContainerRef.current).setView([10.69, 77.01], 11); // Centered on Pollachi
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        const style = (feature: any) => ({
            fillColor: getColor(issueCounts.get(feature.properties.name)),
            weight: 1, opacity: 1, color: 'white', fillOpacity: 0.7
        });

        L.geoJSON(villageBoundaries, { style }).addTo(map);

        issues.forEach(issue => {
            if (issue.location.lat && issue.location.lng) {
                const color = issue.status === 'Resolved' || issue.status === 'Closed' ? 'green' : 'red';
                 const marker = L.marker([issue.location.lat, issue.location.lng], {
                    icon: L.divIcon({
                        className: `custom-div-icon bg-${color}-500`,
                        html: `<div class="marker-pin border-${color}-500"></div><i class="material-icons">place</i>`,
                        iconSize: [30, 42],
                        iconAnchor: [15, 42]
                    })
                }).addTo(map);
                marker.bindPopup(`<b>${issue.title}</b><br>${issue.status}`).on('click', () => onSelectIssue(issue));
            }
        });

        return () => { map.remove(); mapRef.current = null; };
    }, [issues, issueCounts, onSelectIssue]);

    return <div ref={mapContainerRef} className="h-[60vh] w-full rounded-lg" />;
};


const AnalyticsComponent: React.FC<{issues: Issue[]}> = ({ issues }) => {
    const stats = useMemo(() => {
        const total = issues.length;
        const resolved = issues.filter(i => i.status === 'Resolved' || i.status === 'Closed').length;
        const pending = total - resolved;
        const byCategory = categoryOptions.map(cat => ({
            name: cat,
            count: issues.filter(i => i.category === cat).length
        }));
        const resolutionTimes = issues
            .filter(i => i.resolutionProof?.completedAt)
            .map(i => new Date(i.resolutionProof!.completedAt).getTime() - new Date(i.createdAt).getTime());
        const avgTime = resolutionTimes.length > 0
            ? (resolutionTimes.reduce((a, b) => a + b, 0) / resolutionTimes.length) / (1000 * 60 * 60 * 24)
            : 0;

        return { total, resolved, pending, byCategory, avgTime: avgTime.toFixed(1) };
    }, [issues]);

    return (
        <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md space-y-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                <StatCard label="Total Issues" value={stats.total} />
                <StatCard label="Resolved" value={stats.resolved} color="text-green-500" />
                <StatCard label="Pending/In Progress" value={stats.pending} color="text-yellow-500" />
                <StatCard label="Avg. Resolution (Days)" value={stats.avgTime} />
            </div>
             <div className="p-4 border dark:border-gray-700 rounded-lg">
                <h4 className="font-bold mb-4">Issues by Category</h4>
                <div className="space-y-2">
                    {stats.byCategory.map(cat => (
                        <div key={cat.name}>
                            <div className="flex justify-between mb-1 text-sm">
                                <span>{cat.name}</span>
                                <span>{cat.count}</span>
                            </div>
                            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5">
                                <div className="bg-indigo-600 h-2.5 rounded-full" style={{ width: `${(cat.count / stats.total) * 100}%` }}></div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{label:string, value: number|string, color?: string}> = ({ label, value, color = "text-indigo-500"}) => (
    <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
        <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
        <p className={`text-3xl font-bold ${color}`}>{value}</p>
    </div>
);


export default PanchayatView;