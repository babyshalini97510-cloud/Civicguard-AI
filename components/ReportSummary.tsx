import React from 'react';

// The AI will return an object with this structure
interface FinalReport {
  reporterDetails?: string;
  issueDescription: string;
  district: string;
  panchayat: string;
  village: string;
  street: string;
  locationDetails?: string;
  dateTime: string;
  affectedPeopleCommunity: string;
  urgencyLevel: 'Low' | 'Medium' | 'High';
  finalSummaryRecommendation: string;
  emotionAnalysis?: {
    sentiment: string;
    urgencyScore: number;
  };
  imageAnalyses?: {
    status: 'Authentic' | 'Manipulated' | 'AI-Generated';
    confidence: number;
    reasoning: string;
  }[];
}

interface ReportSummaryProps {
  issue: FinalReport;
  onConfirm: () => void;
  onEdit: () => void;
}

const SummaryItem: React.FC<{ label: string; value?: string | null; children?: React.ReactNode }> = ({ label, value, children }) => (
  <div>
    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{label}</p>
    {value && <p className="text-md text-gray-800 dark:text-gray-200">{value}</p>}
    {children && <div className="text-md text-gray-800 dark:text-gray-200">{children}</div>}
  </div>
);

const getUrgencyPill = (urgency?: FinalReport['urgencyLevel']) => {
    if (!urgency) return null;
    const baseClasses = "px-3 py-1 text-xs font-medium rounded-full inline-block";
    switch (urgency) {
      case 'Low':
        return `${baseClasses} bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300`;
      case 'Medium':
        return `${baseClasses} bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300`;
      case 'High':
        return `${baseClasses} bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300`;
    }
};

const ReportSummary: React.FC<ReportSummaryProps> = ({ issue, onConfirm, onEdit }) => {
  const { 
    issueDescription, 
    district, 
    panchayat, 
    village, 
    street, 
    locationDetails, 
    dateTime, 
    affectedPeopleCommunity, 
    urgencyLevel, 
    reporterDetails, 
    finalSummaryRecommendation,
    emotionAnalysis,
    imageAnalyses,
  } = issue;
  
  const locationString = [street, village, panchayat, district]
        .filter(Boolean)
        .join(', ');
  
  const flaggedImagesCount = imageAnalyses?.filter(a => a.status !== 'Authentic').length ?? 0;
  
  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg animate-fade-in">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Official Issue Report Summary</h2>
      <p className="text-gray-600 dark:text-gray-300 mb-6">Please review the generated report. Does this accurately capture the issue?</p>
      
      <div className="space-y-4 border-t border-b border-gray-200 dark:border-gray-700 py-4">
        <SummaryItem label="Issue Description" value={issueDescription} />
        <SummaryItem 
          label="Location" 
          value={locationString} 
        />
        {locationDetails && locationDetails !== 'None' && <SummaryItem label="Additional Location Details" value={locationDetails} />}
        <SummaryItem label="Date/Time of Incident" value={dateTime} />
        <SummaryItem label="Affected People/Community" value={affectedPeopleCommunity} />
        {reporterDetails && reporterDetails !== 'Not provided' && <SummaryItem label="Reporter Details" value={reporterDetails} />}
        <SummaryItem label="Predicted Urgency">
            {urgencyLevel ? <span className={getUrgencyPill(urgencyLevel)}>{urgencyLevel}</span> : 'Not determined'}
        </SummaryItem>
        {emotionAnalysis && (
            <SummaryItem label="AI Emotion Analysis">
                <p className="text-md text-gray-800 dark:text-gray-200">
                    Sentiment: <span className="font-semibold capitalize">{emotionAnalysis.sentiment}</span> | Urgency Score: <span className="font-semibold">{emotionAnalysis.urgencyScore}/10</span>
                </p>
            </SummaryItem>
        )}
        {imageAnalyses && imageAnalyses.length > 0 && (
           <SummaryItem label="AI Truth Detector Analysis">
                {flaggedImagesCount > 0 ? (
                    <p className="font-semibold text-yellow-600 dark:text-yellow-400">
                       {flaggedImagesCount} image(s) flagged as potentially altered or AI-generated.
                    </p>
                ) : (
                    <p className="font-semibold text-green-600 dark:text-green-400">
                        All images verified as authentic.
                    </p>
                )}
            </SummaryItem>
        )}
        <SummaryItem label="Summary & Recommendation" value={finalSummaryRecommendation} />
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-4 justify-end">
        <button 
          onClick={onEdit}
          className="px-6 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg shadow hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
        >
          Make Changes
        </button>
        <button 
          onClick={onConfirm}
          className="px-6 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Confirm & Submit
        </button>
      </div>
    </div>
  );
};

export default ReportSummary;