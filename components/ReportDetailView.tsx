import React from 'react';
import { Issue } from '../types';
import { users } from '../mockData';
import ThumbsUpIcon from './icons/ThumbsUpIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import CheckCircleIcon from './icons/CheckCircleIcon';
import ExclamationTriangleIcon from './icons/ExclamationTriangleIcon';
import RobotIcon from './icons/RobotIcon';

interface ReportDetailViewProps {
  issue: Issue;
  onBack: () => void;
}

type AnalysisStatus = NonNullable<Issue['imageAnalyses']>[0];

const AnalysisBadge: React.FC<{ analysis: AnalysisStatus }> = ({ analysis }) => {
    const wrapperClasses = "absolute bottom-2 right-2 bg-black/60 rounded-full p-1.5 text-white flex items-center justify-center backdrop-blur-sm";
    const { status, confidence, reasoning } = analysis;
    const title = `${status} (Confidence: ${(confidence * 100).toFixed(0)}%) - ${reasoning}`;
    
    switch (status) {
        case 'Authentic':
            return (
                <div className={wrapperClasses} title={title}>
                    <CheckCircleIcon className="w-6 h-6 text-green-400" />
                </div>
            );
        case 'Manipulated':
            return (
                <div className={wrapperClasses} title={title}>
                    <ExclamationTriangleIcon className="w-6 h-6 text-yellow-400" />
                </div>
            );
        case 'AI-Generated':
            return (
                <div className={wrapperClasses} title={title}>
                    <RobotIcon className="w-6 h-6 text-red-400" />
                </div>
            );
        default:
            return null;
    }
};

// FIX: Corrected issue status strings ('In Progress') and added all valid statuses ('Resolved', 'Closed') to match the Issue type definition.
const getStatusPill = (status: Issue['status']) => {
    const baseClasses = "px-3 py-1 text-sm font-medium rounded-full inline-block";
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

const DetailSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <div className="mb-6">
    <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200 border-b-2 border-indigo-200 dark:border-gray-600 pb-2 mb-3">{title}</h3>
    {children}
  </div>
);

const ReportDetailView: React.FC<ReportDetailViewProps> = ({ issue, onBack }) => {
  const reporter = users.find(u => u.id === issue.reporterId);

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <button onClick={onBack} className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 hover:underline">
        <ChevronLeftIcon />
        Back
      </button>
      
      <header className="mb-4">
        <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-2">
            <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{issue.title}</h2>
            <div className={getStatusPill(issue.status)}>{issue.status}</div>
        </div>
        <p className="text-md text-gray-500 dark:text-gray-400">{issue.location.street}, {issue.location.village}</p>
      </header>
      
      <DetailSection title="Description">
        <p className="text-gray-700 dark:text-gray-300">{issue.description}</p>
      </DetailSection>

      <DetailSection title="Evidence">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {issue.images.map((img, index) => {
            const analysis = issue.imageAnalyses?.[index];
            return (
              <div key={index} className="relative">
                <img src={img} alt={`Evidence ${index + 1}`} className="rounded-lg object-cover w-full h-40" />
                {analysis && <AnalysisBadge analysis={analysis} />}
              </div>
            );
          })}
          {issue.video && (
             <video controls className="rounded-lg object-cover w-full h-40">
                <source src={issue.video} type="video/mp4" />
                Your browser does not support the video tag.
            </video>
          )}
        </div>
      </DetailSection>

      {issue.resolutionProof && (
        <DetailSection title="Resolution Proof">
            <div className="p-4 bg-green-50 dark:bg-green-900/50 rounded-lg border border-green-200 dark:border-green-700">
                <div className="flex items-center gap-2 text-green-800 dark:text-green-300 font-bold mb-2">
                    <CheckCircleIcon />
                    <span>Issue Resolved on {new Date(issue.resolutionProof.completedAt).toLocaleDateString()}</span>
                </div>
                <p className="text-gray-700 dark:text-gray-300 mb-4">{issue.resolutionProof.description}</p>
                <img src={issue.resolutionProof.image} alt="Resolution proof" className="rounded-lg object-cover w-full h-auto max-h-60" />
            </div>
        </DetailSection>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <DetailSection title="Details">
            <ul className="space-y-2 text-gray-700 dark:text-gray-300">
                <li><strong>Category:</strong> {issue.category}</li>
                <li><strong>Reported On:</strong> {new Date(issue.createdAt).toLocaleString()}</li>
                <li className="flex items-center gap-2"><strong>Upvotes:</strong> <div className="flex items-center gap-1"><ThumbsUpIcon /> {issue.upvotes}</div></li>
            </ul>
        </DetailSection>
        
        <DetailSection title="Reporter">
            {reporter ? (
                <div className="flex items-center gap-4">
                    <img src={reporter.avatar} alt={reporter.name} className="w-16 h-16 rounded-full" />
                    <div>
                        <p className="font-bold text-lg">{reporter.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{reporter.points} points</p>
                    </div>
                </div>
            ) : <p>Unknown Reporter</p>}
        </DetailSection>
      </div>

    </div>
  );
};

export default ReportDetailView;