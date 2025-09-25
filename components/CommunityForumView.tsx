import React, { useState, useMemo } from 'react';
import { ForumPost, Comment, User } from '../types';
import PlusIcon from './icons/PlusIcon';
import ChatBubbleIcon from './icons/ChatBubbleIcon';
import XIcon from './icons/XIcon';

interface CommunityForumViewProps {
  posts: ForumPost[];
  comments: Comment[];
  users: User[];
  currentUser: User;
  onSelectPost: (post: ForumPost) => void;
  onCreatePost: (postData: { title: string; content: string }) => void;
}

const CommunityForumView: React.FC<CommunityForumViewProps> = ({ posts, comments, users, currentUser, onSelectPost, onCreatePost }) => {
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newPostTitle, setNewPostTitle] = useState('');
  const [newPostContent, setNewPostContent] = useState('');

  const postsWithDetails = useMemo(() => {
    return posts.map(post => {
      const author = users.find(u => u.id === post.authorId);
      const commentCount = comments.filter(c => c.postId === post.id).length;
      return { ...post, author, commentCount };
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [posts, comments, users]);

  const handleCreatePostSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newPostTitle.trim() && newPostContent.trim()) {
      onCreatePost({ title: newPostTitle, content: newPostContent });
      setNewPostTitle('');
      setNewPostContent('');
      setIsCreateModalOpen(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-md flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Community Forum</h2>
          <p className="text-gray-600 dark:text-gray-400">Discuss topics and ideas with your neighbors.</p>
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg shadow hover:bg-indigo-700"
        >
          <PlusIcon className="w-5 h-5" />
          <span>New Post</span>
        </button>
      </div>
      
      <div className="space-y-4">
        {postsWithDetails.map((post, index) => (
          <div
            key={post.id}
            onClick={() => onSelectPost(post)}
            className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1 border border-gray-200 dark:border-gray-700 animate-slide-in-up"
            style={{ animationDelay: `${index * 75}ms`, opacity: 0 }}
          >
            <div className="flex items-center mb-3">
              <img src={post.author?.avatar} alt={post.author?.name} className="w-10 h-10 rounded-full mr-3" />
              <div>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{post.author?.name || 'Unknown User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
              </div>
            </div>
            <h3 className="text-lg font-bold mb-2 text-gray-900 dark:text-white">{post.title}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-3 truncate">
              {post.content}
            </p>
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <ChatBubbleIcon className="w-4 h-4 mr-1.5" />
              <span>{post.commentCount} {post.commentCount === 1 ? 'comment' : 'comments'}</span>
            </div>
          </div>
        ))}
         {postsWithDetails.length === 0 && (
            <div className="text-center py-10 bg-white dark:bg-gray-800 rounded-lg shadow-md">
                <p className="text-gray-500 dark:text-gray-400">No posts in the forum yet. Be the first to start a conversation!</p>
            </div>
        )}
      </div>

      {/* Create Post Modal */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-lg p-6 animate-fade-in-down">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Create a New Post</h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">
                <XIcon />
              </button>
            </div>
            <form onSubmit={handleCreatePostSubmit} className="space-y-4">
              <div>
                <label htmlFor="post-title" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Title</label>
                <input
                  id="post-title"
                  type="text"
                  value={newPostTitle}
                  onChange={(e) => setNewPostTitle(e.target.value)}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700"
                  placeholder="What is your post about?"
                  required
                />
              </div>
              <div>
                <label htmlFor="post-content" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Content</label>
                <textarea
                  id="post-content"
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  rows={6}
                  className="mt-1 block w-full p-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:ring-indigo-500 focus:border-indigo-500 bg-gray-50 dark:bg-gray-700"
                  placeholder="Share your thoughts..."
                  required
                ></textarea>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="px-4 py-2 bg-gray-200 text-gray-800 font-bold rounded-lg hover:bg-gray-300">
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 bg-indigo-600 text-white font-bold rounded-lg shadow hover:bg-indigo-700">
                  Submit Post
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CommunityForumView;