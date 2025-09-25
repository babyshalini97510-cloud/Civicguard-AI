import React, { useState, useMemo } from 'react';
import { ForumPost, Comment, User } from '../types';
import ChevronLeftIcon from './icons/ChevronLeftIcon';
import SendIcon from './icons/SendIcon';
import ThumbsUpIcon from './icons/ThumbsUpIcon';

interface PostDetailViewProps {
  post: ForumPost;
  comments: Comment[];
  users: User[];
  currentUser: User;
  onBack: () => void;
  onAddComment: (postId: number, content: string) => void;
  votedComments: Set<number>;
  onAddCommentVote: (commentId: number) => void;
}

const PostDetailView: React.FC<PostDetailViewProps> = ({ post, comments, users, currentUser, onBack, onAddComment, votedComments, onAddCommentVote }) => {
  const [newComment, setNewComment] = useState('');

  const author = useMemo(() => users.find(u => u.id === post.authorId), [users, post.authorId]);

  const commentsWithAuthors = useMemo(() => {
    return comments
      .map(comment => ({
        ...comment,
        author: users.find(u => u.id === comment.authorId),
      }))
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [comments, users]);

  const handleCommentSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim()) {
      onAddComment(post.id, newComment.trim());
      setNewComment('');
    }
  };

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-lg shadow-lg">
      <button onClick={onBack} className="flex items-center gap-2 mb-4 text-indigo-600 dark:text-indigo-400 hover:underline">
        <ChevronLeftIcon />
        Back to Forum
      </button>

      {/* Post Content */}
      <div className="border-b border-gray-200 dark:border-gray-700 pb-6 mb-6">
        <header className="mb-4">
          <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white">{post.title}</h2>
        </header>
        <div className="flex items-center mb-4">
          <img src={author?.avatar} alt={author?.name} className="w-12 h-12 rounded-full mr-4" />
          <div>
            <p className="font-bold text-lg text-gray-800 dark:text-gray-200">{author?.name || 'Unknown User'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400">{new Date(post.createdAt).toLocaleString()}</p>
          </div>
        </div>
        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{post.content}</p>
      </div>

      {/* Comments Section */}
      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-200">{commentsWithAuthors.length} Comments</h3>
        {commentsWithAuthors.map(comment => (
          <div key={comment.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
            <img src={comment.author?.avatar} alt={comment.author?.name} className="w-10 h-10 rounded-full mt-1" />
            <div className="flex-1">
              <div className="flex items-baseline gap-2">
                <p className="font-semibold text-gray-800 dark:text-gray-200">{comment.author?.name || 'Unknown User'}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(comment.createdAt).toLocaleString()}</p>
              </div>
              <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">{comment.content}</p>
              <div className="flex items-center gap-4 mt-2">
                  <button
                      onClick={() => onAddCommentVote(comment.id)}
                      disabled={votedComments.has(comment.id)}
                      className={`flex items-center gap-1.5 text-xs transition-colors ${
                          votedComments.has(comment.id)
                          ? 'text-indigo-600 dark:text-indigo-400 font-semibold cursor-default'
                          : 'text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400'
                      }`}
                      aria-label="Upvote comment"
                  >
                      <ThumbsUpIcon className="w-4 h-4" />
                      <span>{comment.upvotes}</span>
                  </button>
              </div>
            </div>
          </div>
        ))}
         {commentsWithAuthors.length === 0 && (
            <p className="text-center text-gray-500 dark:text-gray-400 py-4">Be the first to comment.</p>
        )}
      </div>

      {/* Add Comment Form */}
      <form onSubmit={handleCommentSubmit} className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700 flex items-start gap-3">
        <img src={currentUser.avatar} alt={currentUser.name} className="w-10 h-10 rounded-full" />
        <div className="flex-1 flex items-center gap-2 border border-gray-300 dark:border-gray-600 rounded-lg p-1 focus-within:ring-2 focus-within:ring-indigo-500 bg-white dark:bg-gray-700">
            <input
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full p-2 border-none focus:ring-0 bg-transparent"
              aria-label="Add a comment"
            />
            <button type="submit" className="p-2 bg-indigo-600 text-white rounded-md shadow hover:bg-indigo-700 disabled:bg-indigo-400" disabled={!newComment.trim()}>
              <SendIcon className="w-5 h-5" />
            </button>
        </div>
      </form>
    </div>
  );
};

export default PostDetailView;
