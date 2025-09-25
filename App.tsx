

import React, { useState } from 'react';
// FIX: The './mockData' module exports 'users', not 'mockUsers'. Aliased to match usage below.
import { mockIssues, users as mockUsers, currentUser as initialUser, mockForumPosts, mockComments } from './mockData';
import { Issue, User, ForumPost, Comment } from './types';

import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import ReportDetailView from './components/ReportDetailView';
import ReportView from './components/ReportView';
import ProfileView from './components/ProfileView';
import VillageIssuesView from './components/VillageIssuesView';
import PanchayatView from './components/PanchayatView';
import CommunityForumView from './components/CommunityForumView';
import PostDetailView from './components/PostDetailView';
import Notification from './components/Notification';
import MapView from './components/MapView';
import LeaderboardView from './components/LeaderboardView';

import ListIcon from './components/icons/ListIcon';
import PlusIcon from './components/icons/PlusIcon';
import UserIcon from './components/icons/UserIcon';
import UsersIcon from './components/icons/UsersIcon';
import BriefcaseIcon from './components/icons/BriefcaseIcon';
import ChatBubbleIcon from './components/icons/ChatBubbleIcon';
import MapIcon from './components/icons/MapIcon';
import CivicGptButton from './components/CivicGptButton';
import CivicGptView from './components/CivicGptView';
import TrophyIcon from './components/icons/TrophyIcon';

type View = 'login' | 'dashboard' | 'reportDetail' | 'report' | 'profile' | 'villageIssues' | 'panchayat' | 'forum' | 'postDetail' | 'map' | 'leaderboard';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [currentView, setCurrentView] = useState<View>('dashboard');
  const [issues, setIssues] = useState<Issue[]>(mockIssues);
  const [users] = useState<User[]>(mockUsers);
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);
  const [editingIssue, setEditingIssue] = useState<Issue | null>(null);
  const [user, setUser] = useState<User>(initialUser);
  const [votedIssues, setVotedIssues] = useState(new Set<number>());
  const [isGptChatOpen, setIsGptChatOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [animationKey, setAnimationKey] = useState(0);

  // New state for Forum
  const [forumPosts, setForumPosts] = useState<ForumPost[]>(mockForumPosts);
  const [comments, setComments] = useState<Comment[]>(mockComments);
  const [selectedForumPost, setSelectedForumPost] = useState<ForumPost | null>(null);
  const [votedComments, setVotedComments] = useState(new Set<number>());

  const handleLogin = (details: { name: string; email: string; district: string; panchayat: string; village: string; street: string; }) => {
    const leaderUser = mockUsers.find(u => u.role === 'leader');
    // Demo logic: if email is a specific one, log in as leader.
    if (details.email.toLowerCase() === 'leader@civic.com' && leaderUser) {
        setUser(leaderUser);
    } else {
        setUser(prevUser => ({
          ...prevUser, // This is the default citizen user
          ...details,
          role: 'citizen' // Ensure role is set
        }));
    }
    setIsLoggedIn(true);
    setCurrentView('dashboard');
  };

  const handleSelectIssue = (issue: Issue) => {
    setSelectedIssue(issue);
    setCurrentView('reportDetail');
  };

  const handleNavigate = (view: View) => {
    setCurrentView(view);
    setAnimationKey(prev => prev + 1);
  };
  
  const handleBack = () => {
    if (currentView === 'postDetail') {
      setCurrentView('forum');
      setSelectedForumPost(null);
    } else {
      setCurrentView(user.role === 'leader' ? 'panchayat' : 'dashboard');
      setSelectedIssue(null);
    }
  }

  const handleVote = (issueId: number) => {
    if (votedIssues.has(issueId)) return; // Prevent double voting

    // Update issue upvotes
    setIssues(prevIssues => 
      prevIssues.map(issue => 
        issue.id === issueId ? { ...issue, upvotes: issue.upvotes + 1 } : issue
      )
    );

    // Record the vote
    setVotedIssues(prevVoted => new Set(prevVoted).add(issueId));
  };

  const handleAddIssue = (report: any) => {
    let issueUrgency = report.urgencyLevel;
    // Escalate urgency based on emotion AI
    if (report.emotionAnalysis && report.emotionAnalysis.urgencyScore >= 8) {
        issueUrgency = 'High';
    } else if (report.emotionAnalysis && report.emotionAnalysis.urgencyScore >= 5 && issueUrgency !== 'High') {
        issueUrgency = 'Medium';
    }

    const newIssue: Issue = {
      id: Date.now(),
      title: report.title || report.finalSummaryRecommendation || "Manual Report",
      description: report.issueDescription,
      // Use the category from the manual form, or default for AI.
      category: report.category || 'Roads',
      status: 'Pending',
      upvotes: 0,
      reporterId: user.id,
      location: {
        district: report.district,
        panchayat: report.panchayat,
        village: report.village,
        street: report.street,
        // Add optional lat/lng from the manual form's custom field
        lat: report._gps?.lat,
        lng: report._gps?.lng,
      },
      // Use the photos from the manual form, or a single photo for AI.
      images: report._photos && report._photos.length > 0
        ? report._photos
        : ['https://via.placeholder.com/400x300.png/dddddd/000000?text=AI+Report'],
      createdAt: new Date().toISOString(),
      incidentTime: report.dateTime,
      affectedPeople: report.affectedPeopleCommunity,
      urgency: issueUrgency,
      priority: 'Medium', // Default priority for new issues
      audio: report._audioURL,
      video: report._videoURL,
      emotionAnalysis: report.emotionAnalysis,
      imageAnalyses: report.imageAnalyses,
    };

    setIssues(prevIssues => [newIssue, ...prevIssues]);
    setNotification('Success! Your report is now visible on both the feed and the map.');
    // After adding, navigate back to the appropriate dashboard.
    handleBack(); 
  };
  
  const handleUpdateIssue = (report: any) => {
    if (!editingIssue) return;

    const updatedIssue: Issue = {
      ...editingIssue,
      title: report.title || report.finalSummaryRecommendation || editingIssue.title,
      description: report.issueDescription,
      category: report.category,
      urgency: report.urgencyLevel,
      location: {
        ...editingIssue.location,
        district: report.district,
        panchayat: report.panchayat,
        village: report.village,
        street: report.street,
      },
      images: report._photos && report._photos.length > 0 ? report._photos : editingIssue.images,
      video: '_videoURL' in report ? report._videoURL : editingIssue.video,
      imageAnalyses: report.imageAnalyses && report.imageAnalyses.length > 0 ? report.imageAnalyses : editingIssue.imageAnalyses,
    };

    setIssues(prevIssues =>
      prevIssues.map(issue =>
        issue.id === editingIssue.id ? updatedIssue : issue
      )
    );

    setNotification('Report updated successfully!');
    setEditingIssue(null);
    setCurrentView('profile');
  };

  const handleDeleteIssue = (issueId: number) => {
    const issueToDelete = issues.find(issue => issue.id === issueId);

    // Ensure the issue exists and the current user is the reporter.
    if (issueToDelete && issueToDelete.reporterId === user.id) {
        if (window.confirm('Are you sure you want to delete this report? This action cannot be undone.')) {
            setIssues(prevIssues => prevIssues.filter(issue => issue.id !== issueId));
            setNotification('Report deleted successfully!');
        }
    } else {
        // This case should not be reachable with the current UI, but it's a good safeguard.
        setNotification('Error: You can only delete your own reports.');
        console.error('Security check failed: Attempted to delete an issue not owned by the user.');
    }
  };

  const handleStartEditIssue = (issue: Issue) => {
    setEditingIssue(issue);
    setCurrentView('report');
  };

  const handleUpdateIssueStatus = (
    issueId: number,
    status: Issue['status'],
    resolutionProof?: { description: string; image: string }
  ) => {
    setIssues(prevIssues =>
      prevIssues.map(issue => {
        if (issue.id === issueId) {
          const updatedIssue: Issue = { ...issue, status };
          if (status === 'Resolved' && resolutionProof) {
            updatedIssue.resolutionProof = {
              ...resolutionProof,
              completedAt: new Date().toISOString(),
            };
          }
          if (status === 'Closed') {
              updatedIssue.closedAt = new Date().toISOString();
          }
          return updatedIssue;
        }
        return issue;
      })
    );
     setNotification(`Issue #${issueId} status updated to ${status}.`);
  };

  const handleUpdateIssueDetails = (issueId: number, details: Partial<Pick<Issue, 'priority' | 'assignedTo'>>) => {
      setIssues(prevIssues =>
          prevIssues.map(issue =>
              issue.id === issueId ? { ...issue, ...details } : issue
          )
      );
      setNotification(`Details for issue #${issueId} have been updated.`);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
    setNotification('Your profile has been updated successfully!');
  };

  // Forum Handlers
  const handleSelectForumPost = (post: ForumPost) => {
    setSelectedForumPost(post);
    setCurrentView('postDetail');
  };

  const handleCreatePost = (postData: { title: string; content: string }) => {
    const newPost: ForumPost = {
      id: Date.now(),
      authorId: user.id,
      ...postData,
      createdAt: new Date().toISOString(),
    };
    setForumPosts(prevPosts => [newPost, ...prevPosts]);
    setNotification('Post created successfully!');
  };

  const handleAddComment = (postId: number, content: string) => {
    const newComment: Comment = {
      id: Date.now(),
      postId,
      authorId: user.id,
      content,
      createdAt: new Date().toISOString(),
      upvotes: 0,
    };
    setComments(prevComments => [...prevComments, newComment]);
  };

  const handleAddCommentVote = (commentId: number) => {
    if (votedComments.has(commentId)) return; // Prevent double voting

    setComments(prevComments =>
        prevComments.map(comment =>
            comment.id === commentId ? { ...comment, upvotes: comment.upvotes + 1 } : comment
        )
    );

    setVotedComments(prevVoted => new Set(prevVoted).add(commentId));
  };


  const renderView = () => {
    if (!isLoggedIn) {
      return <LoginView onLogin={handleLogin} />;
    }

    switch (currentView) {
      case 'dashboard':
        return <DashboardView issues={issues} onSelectIssue={handleSelectIssue} user={user} onVote={handleVote} votedIssues={votedIssues} />;
      case 'reportDetail':
        return selectedIssue ? <ReportDetailView issue={selectedIssue} onBack={handleBack} /> : <DashboardView issues={issues} onSelectIssue={handleSelectIssue} user={user} onVote={handleVote} votedIssues={votedIssues}/>;
      case 'report':
        return <ReportView
            onBack={() => {
                setEditingIssue(null);
                handleBack();
            }}
            onAddIssue={editingIssue ? handleUpdateIssue : handleAddIssue}
            user={user}
            editingIssue={editingIssue}
        />;
      case 'profile':
        return <ProfileView 
            user={user} 
            issues={issues} 
            onSelectIssue={handleSelectIssue}
            onEditIssue={handleStartEditIssue}
            onDeleteIssue={handleDeleteIssue}
            onUpdateUser={handleUpdateUser}
        />;
      case 'villageIssues':
        return <VillageIssuesView issues={issues} user={user} onSelectIssue={handleSelectIssue} onVote={handleVote} votedIssues={votedIssues} />;
      case 'panchayat':
        return <PanchayatView 
            issues={issues} 
            user={user} 
            onUpdateStatus={handleUpdateIssueStatus} 
            onUpdateIssueDetails={handleUpdateIssueDetails}
            onSelectIssue={handleSelectIssue} />;
      case 'map':
        return <MapView issues={issues} onSelectIssue={handleSelectIssue} />;
      case 'leaderboard':
        return <LeaderboardView users={users} />;
      case 'forum':
        return <CommunityForumView
          posts={forumPosts}
          comments={comments}
          users={users}
          currentUser={user}
          onSelectPost={handleSelectForumPost}
          onCreatePost={handleCreatePost}
        />;
      case 'postDetail':
        return selectedForumPost ? (
          <PostDetailView
            post={selectedForumPost}
            comments={comments.filter(c => c.postId === selectedForumPost.id)}
            users={users}
            currentUser={user}
            onBack={handleBack}
            onAddComment={handleAddComment}
            votedComments={votedComments}
            onAddCommentVote={handleAddCommentVote}
          />
        ) : (
          // Fallback to forum view if no post is selected
          <CommunityForumView
            posts={forumPosts}
            comments={comments}
            users={users}
            currentUser={user}
            onSelectPost={handleSelectForumPost}
            onCreatePost={handleCreatePost}
          />
        );
      default:
        return <DashboardView issues={issues} onSelectIssue={handleSelectIssue} user={user} onVote={handleVote} votedIssues={votedIssues} />;
    }
  };

  const NavItem: React.FC<{ view: View; label: string; icon: React.ReactNode }> = ({ view, label, icon }) => {
    const isActive = currentView === view;
    return (
      <button
        onClick={() => handleNavigate(view)}
        className={`flex flex-col items-center justify-center w-full pt-2 pb-1 text-xs sm:text-sm focus:outline-none transition-all duration-300 ${
          isActive ? 'text-indigo-500' : 'text-gray-500 hover:text-indigo-500'
        }`}
      >
        <div className={`transition-transform duration-300 ${isActive ? 'scale-110' : ''}`}>
            {icon}
        </div>
        <span>{label}</span>
      </button>
    );
  };


  return (
    <div className="h-screen w-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 flex flex-col font-sans">
       {notification && <Notification message={notification} onClose={() => setNotification(null)} />}
       {isLoggedIn && (
         <header className="bg-gradient-to-r from-indigo-600 to-indigo-700 dark:from-indigo-700 dark:to-indigo-800 shadow-md w-full z-10">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <h1 className="text-2xl font-bold text-white">CivicGuard AI</h1>
            </div>
          </div>
        </header>
       )}
      <main className="flex-1 overflow-y-auto pb-20 no-scrollbar">
        <div className="max-w-4xl mx-auto p-4">
           <div key={animationKey} className="animate-fade-in">
            {renderView()}
          </div>
        </div>
      </main>
      {isLoggedIn && (
        <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-lg flex justify-around items-center z-10">
          {user.role === 'citizen' && <NavItem view="dashboard" label="Feed" icon={<ListIcon />} />}
          {user.role === 'citizen' && <NavItem view="map" label="Map" icon={<MapIcon />} />}
          {user.role === 'leader' && <NavItem view="panchayat" label="Panchayat" icon={<BriefcaseIcon />} />}
          <NavItem view="report" label="Report" icon={<PlusIcon />} />
          {user.role === 'citizen' && <NavItem view="villageIssues" label="Issues" icon={<UsersIcon />} />}
          {user.role === 'citizen' && <NavItem view="forum" label="Forum" icon={<ChatBubbleIcon />} />}
          {user.role === 'citizen' && <NavItem view="leaderboard" label="Leaders" icon={<TrophyIcon className="w-6 h-6"/>} />}
          <NavItem view="profile" label="Profile" icon={<UserIcon />} />
        </nav>
      )}
       {isLoggedIn && (
        <>
            <CivicGptButton onClick={() => setIsGptChatOpen(true)} />
            {isGptChatOpen && <CivicGptView onClose={() => setIsGptChatOpen(false)} />}
        </>
      )}
    </div>
  );
};

export default App;