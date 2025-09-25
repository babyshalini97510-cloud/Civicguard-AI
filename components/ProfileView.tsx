import React, { useMemo, useState, useEffect } from 'react';
import { User, Issue } from '../types';
import LogoutIcon from './icons/LogoutIcon';
import EditIcon from './icons/EditIcon';
import TrashIcon from './icons/TrashIcon';
import { getDistrictNames, getDistrictData, District } from '../data/locationService';

interface ProfileViewProps {
  user: User;
  issues: Issue[];
  onSelectIssue: (issue: Issue) => void;
  onEditIssue: (issue: Issue) => void;
  onDeleteIssue: (issueId: number) => void;
  onUpdateUser: (updatedUser: User) => void;
}

// FIX: Corrected issue status strings ('In Progress') and added all valid statuses ('Resolved', 'Closed') to match the Issue type definition.
const getStatusPill = (status: Issue['status']) => {
  const baseClasses = "px-2 py-1 text-xs font-medium rounded-full whitespace-nowrap";
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

const ProfileDetailItem: React.FC<{ label: string; value?: string; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div className="py-2 sm:grid sm:grid-cols-3 sm:gap-4 sm:py-3">
    <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</dt>
    <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:col-span-2 sm:mt-0">{children ? children : (value || 'Not provided')}</dd>
  </div>
);

const ProfileView: React.FC<ProfileViewProps> = ({ user, issues, onSelectIssue, onEditIssue, onDeleteIssue, onUpdateUser }) => {
  const userIssues = useMemo(() => {
    return issues
      .filter(issue => issue.reporterId === user.id)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [issues, user.id]);
  
  const [isEditing, setIsEditing] = useState(false);
  const [editedUser, setEditedUser] = useState<User>(user);

  // Location state for dropdowns
  const [districts, setDistricts] = useState<string[]>([]);
  const [panchayats, setPanchayats] = useState<string[]>([]);
  const [villages, setVillages] = useState<string[]>([]);
  const [selectedDistrictData, setSelectedDistrictData] = useState<District | null>(null);

  useEffect(() => {
    // When switching to edit mode, sync the editedUser state with the latest user prop
    if (isEditing) {
      setEditedUser(user);
    }
  }, [isEditing, user]);
  
  useEffect(() => {
    if(isEditing) {
        getDistrictNames().then(setDistricts);
    }
  }, [isEditing]);
  
  useEffect(() => {
    if (isEditing && editedUser.district) {
        getDistrictData(editedUser.district).then(setSelectedDistrictData);
    }
  }, [isEditing, editedUser.district]);
  
  useEffect(() => {
    if (isEditing) {
        const panchayatNames = selectedDistrictData?.panchayats?.map(p => p.name) || [];
        setPanchayats(panchayatNames);
    }
  }, [isEditing, selectedDistrictData]);
  
  useEffect(() => {
    if (isEditing && editedUser.panchayat) {
        const selectedPanchayat = selectedDistrictData?.panchayats?.find(p => p.name === editedUser.panchayat);
        const villageNames = selectedPanchayat?.villages || [];
        setVillages(villageNames);
    } else if (isEditing) {
        setVillages([]);
    }
  }, [isEditing, editedUser.panchayat, selectedDistrictData]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'district') {
        setEditedUser(prev => ({ ...prev, district: value, panchayat: '', village: '' }));
    } else if (name === 'panchayat') {
        setEditedUser(prev => ({ ...prev, panchayat: value, village: '' }));
    } else {
        setEditedUser(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = () => {
    onUpdateUser(editedUser);
    setIsEditing(false);
  };
  
  const handleCancel = () => {
    setIsEditing(false);
  };

  return (
    <div className="p-4 sm:p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <div className="flex flex-col items-center text-center pb-6 border-b border-gray-200 dark:border-gray-700">
        <img src={user.avatar} alt={user.name} className="w-24 h-24 rounded-full border-4 border-indigo-500 shadow-md" />
        <h2 className="text-2xl font-bold mt-4 text-gray-900 dark:text-white">{user.name}</h2>
      </div>

      <div className="mt-6">
        <div className="flex justify-between items-center mb-2">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">Contact & Location Information</h3>
            {!isEditing && (
            <button onClick={() => setIsEditing(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500">
                <EditIcon className="w-4 h-4" />
                Edit Profile
            </button>
            )}
        </div>
        {isEditing ? (
            <form onSubmit={(e) => { e.preventDefault(); handleSave(); }}>
                <dl className="divide-y divide-gray-200 dark:divide-gray-700">
                    <ProfileDetailItem label="Full Name">
                        <input name="name" value={editedUser.name} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" required />
                    </ProfileDetailItem>
                    <ProfileDetailItem label="Email / Phone">
                        <input name="email" value={editedUser.email || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" required />
                    </ProfileDetailItem>
                    <ProfileDetailItem label="District">
                        <select name="district" value={editedUser.district} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700">
                        {districts.map(d => <option key={d} value={d}>{d}</option>)}
                        </select>
                    </ProfileDetailItem>
                    <ProfileDetailItem label="Panchayat">
                        <select name="panchayat" value={editedUser.panchayat || ''} onChange={handleInputChange} disabled={!panchayats.length} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700">
                        <option value="" disabled>Select Panchayat</option>
                        {panchayats.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </ProfileDetailItem>
                    <ProfileDetailItem label="Village">
                        <select name="village" value={editedUser.village || ''} onChange={handleInputChange} disabled={!villages.length} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700">
                        <option value="" disabled>Select Village</option>
                        {villages.map(v => <option key={v} value={v}>{v}</option>)}
                        </select>
                    </ProfileDetailItem>
                    <ProfileDetailItem label="Street / Area">
                        <input name="street" value={editedUser.street || ''} onChange={handleInputChange} className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700" required />
                    </ProfileDetailItem>
                </dl>
                <div className="flex justify-end gap-4 mt-4">
                    <button type="button" onClick={handleCancel} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500">
                    Cancel
                    </button>
                    <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">
                    Save Changes
                    </button>
                </div>
            </form>
        ) : (
            <dl className="divide-y divide-gray-200 dark:divide-gray-700">
            <ProfileDetailItem label="Full Name" value={user.name} />
            <ProfileDetailItem label="Email / Phone" value={user.email} />
            <ProfileDetailItem label="District" value={user.district} />
            <ProfileDetailItem label="Panchayat" value={user.panchayat} />
            <ProfileDetailItem label="Village" value={user.village} />
            <ProfileDetailItem label="Street / Area" value={user.street} />
            </dl>
        )}
      </div>

      <div className="mt-8">
        <h3 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200">My Report History</h3>
        <div className="space-y-3 max-h-80 overflow-y-auto pr-2 rounded-lg border border-gray-200 dark:border-gray-700 p-2 bg-gray-50 dark:bg-gray-900/50">
          {userIssues.length > 0 ? (
            userIssues.map(issue => (
              <div
                key={issue.id}
                className="w-full text-left p-3 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 transition-all duration-300 hover:shadow-md hover:border-indigo-300 dark:hover:border-indigo-600"
              >
                <div
                  onClick={() => onSelectIssue(issue)}
                  className="cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500 rounded-md -m-1 p-1"
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onSelectIssue(issue)}
                >
                  <div className="flex justify-between items-start gap-2">
                    <h4 className="font-semibold text-md text-gray-800 dark:text-gray-200 flex-1">{issue.title}</h4>
                    <span className={getStatusPill(issue.status)}>{issue.status}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Reported on: {new Date(issue.createdAt).toLocaleDateString()}
                  </p>
                </div>
                 {issue.status !== 'Resolved' && issue.status !== 'Closed' && (
                  <div className="flex justify-end gap-2 mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                      <button 
                          onClick={() => onEditIssue(issue)}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-blue-600 bg-blue-100 rounded-md hover:bg-blue-200 dark:bg-blue-900/50 dark:text-blue-300 dark:hover:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          aria-label={`Edit report: ${issue.title}`}
                      >
                          <EditIcon className="w-4 h-4" />
                          Edit
                      </button>
                      <button 
                          onClick={() => onDeleteIssue(issue.id)}
                          className="flex items-center gap-1 px-3 py-1 text-sm font-medium text-red-600 bg-red-100 rounded-md hover:bg-red-200 dark:bg-red-900/50 dark:text-red-300 dark:hover:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500"
                          aria-label={`Delete report: ${issue.title}`}
                      >
                          <TrashIcon className="w-4 h-4" />
                          Delete
                      </button>
                  </div>
                )}
              </div>
            ))
          ) : (
            <div className="text-center text-gray-500 dark:text-gray-400 py-10">
              <p>You have not reported any issues yet.</p>
            </div>
          )}
        </div>
      </div>

      <div className="mt-8 flex justify-center">
          <button className="flex items-center gap-2 px-6 py-3 bg-red-500 text-white font-semibold rounded-lg shadow hover:bg-red-600 focus:outline-none focus:ring-2 focus:ring-red-500">
            <LogoutIcon />
            <span>Logout</span>
        </button>
      </div>
    </div>
  );
};

export default ProfileView;