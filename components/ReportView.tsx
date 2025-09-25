import React, { useState } from 'react';
import ReportFormView from './ReportFormView';
import ReporterAgent from './ReporterAgent';
import RobotIcon from './icons/RobotIcon';
import DocumentTextIcon from './icons/DocumentTextIcon';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import { User, Issue } from '../types';

interface ReportViewProps {
    onBack: () => void;
    onAddIssue: (report: any) => void;
    user: User;
    editingIssue?: Issue | null;
}

const ReportView: React.FC<ReportViewProps> = ({ onBack, onAddIssue, user, editingIssue }) => {
    const [mode, setMode] = useState<'choice' | 'ai' | 'manual'>('choice');

    const handleFormSubmit = (formData: any) => {
        // The data from ReportFormView is already structured nicely.
        // We just pass it along to the main handler in App.tsx.
        onAddIssue(formData);
    };

    if (editingIssue) {
        // Editing always uses the manual form.
        return <ReportFormView onBack={onBack} onSubmit={onAddIssue} issueToEdit={editingIssue} />;
    }

    // The ReporterAgent's onBack prop brings the user back to this choice screen (cancelling).
    if (mode === 'ai') {
        return <ReporterAgent onBack={() => setMode('choice')} onSubmit={onAddIssue} user={user} />;
    }

    // The ReportFormView's onBack prop also brings the user back to the choice screen.
    if (mode === 'manual') {
        return <ReportFormView onBack={() => setMode('choice')} onSubmit={handleFormSubmit} />;
    }
    
    // Default view: Choice screen
    return (
        <div className="p-4 space-y-6">
            <div className="flex items-center">
                 <button onClick={onBack} className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 hover:underline mr-4">
                    <ChevronLeftIcon />
                    Back to Feed
                </button>
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Report a New Issue</h2>
            </div>
            <p className="text-center text-lg text-gray-600 dark:text-gray-300">How would you like to report the issue?</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto pt-4">
                {/* AI Assistant Card */}
                <button
                    onClick={() => setMode('ai')}
                    className="group flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-transparent hover:border-indigo-500 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center"
                    aria-label="Report issue using AI Assistant"
                >
                    <div className="flex-grow flex flex-col items-center">
                        <div className="p-4 bg-indigo-100 dark:bg-indigo-900/50 rounded-full text-indigo-600 dark:text-indigo-300 group-hover:scale-110 transition-transform">
                            <RobotIcon className="w-12 h-12" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Use AI Assistant</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex-grow">
                            Let our AI investigator, Arya, guide you through the process with a simple conversation.
                        </p>
                    </div>
                </button>

                {/* Manual Form Card */}
                <button
                    onClick={() => setMode('manual')}
                    className="group flex flex-col items-center p-6 bg-white dark:bg-gray-800 rounded-lg shadow-lg border-2 border-transparent hover:border-gray-400 dark:hover:border-gray-500 hover:shadow-xl transform hover:-translate-y-1 transition-all duration-300 text-center"
                    aria-label="Report issue by filling a manual form"
                >
                    <div className="flex-grow flex flex-col items-center">
                        <div className="p-4 bg-gray-100 dark:bg-gray-700/50 rounded-full text-gray-600 dark:text-gray-300 group-hover:scale-110 transition-transform">
                            <DocumentTextIcon className="w-12 h-12" />
                        </div>
                        <h3 className="mt-4 text-xl font-bold text-gray-900 dark:text-white">Fill Manually</h3>
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 flex-grow">
                            Fill out the details of the issue using a standard web form.
                        </p>
                    </div>
                </button>
            </div>
        </div>
    );
};

export default ReportView;