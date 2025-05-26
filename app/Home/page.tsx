'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaRegHeart, FaHeart, FaRegComment, FaRetweet, FaImage, FaVideo, FaTimes, FaRegBookmark, FaShareAlt,  FaExclamationCircle } from 'react-icons/fa';
import { uploadFile } from '@/lib/uploadFile';
import { useLoading } from '@/lib/contexts/LoadingContext';
import { Loader, InlineLoader } from '@/components/Loader';

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl: string;
  };
}

interface Post {
  id: string;
  content: string;
  createdAt: string;
  mediaUrl?: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  _count: {
    like: number;
    comments: number;
    reposts: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
}

interface ImageModalProps {
  imageUrl: string;
  onClose: () => void;
}

interface ToastProps {
  message: string;
  onClose: () => void;
}

const ImageModal = ({ imageUrl, onClose }: ImageModalProps) => {
  return (
    <div 
      className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl w-full h-[80vh] flex items-center justify-center">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
        >
          <FaTimes className="w-6 h-6" />
        </button>
        <div className="relative w-full h-full" onClick={e => e.stopPropagation()}>
          <Image
            src={imageUrl}
            alt="Enlarged post image"
            fill
            className="object-contain"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 70vw"
            priority
            quality={90}
          />
        </div>
      </div>
    </div>
  );
};

const Toast = ({ message, onClose }: ToastProps) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, 3000);

    return () => clearTimeout(timer);
  }, [onClose]);

  return (
    <div className="fixed top-4 right-4 z-50 bg-black/90 text-white px-6 py-3 rounded-lg shadow-xl flex items-center gap-3 border border-white/10">
      <FaExclamationCircle className="text-amber-500 w-5 h-5" />
      <p>{message}</p>
    </div>
  );
};

const MAX_VIDEO_SIZE_MB = 100; // Maximum video size in MB
const SUPPORTED_VIDEO_FORMATS = ['video/mp4', 'video/webm', 'video/quicktime'];
const SUPPORTED_IMAGE_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaToUpload, setMediaToUpload] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openCommentBoxes, setOpenCommentBoxes] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [newComments, setNewComments] = useState<{ [postId: string]: string }>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [commentedPosts, setCommentedPosts] = useState<Set<string>>(new Set());
  const { startLoading, stopLoading } = useLoading();
  const [toast, setToast] = useState<string | null>(null);

  const fetchPosts = async () => {
    try {
      const response = await fetch('/api/posts');
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
      }
    } catch (error) {
      console.error('Error fetching posts:', error);
    }
  };

  const fetchUserLikedPosts = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/users/${user.id}/liked-posts`);
      if (response.ok) {
        const likedPosts = await response.json();
        setLikedPosts(new Set(likedPosts.map((post: Post) => post.id)));
      }
    } catch (error) {
      console.error('Error fetching liked posts:', error);
    }
  };

  const fetchUserRepostedPosts = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/posts/reposts?userId=${user.id}`);
      if (response.ok) {
        const repostedPosts = await response.json();
        setRepostedPosts(new Set(repostedPosts.map((post: any) => post.id)));
      }
    } catch (error) {
      console.error('Error fetching reposted posts:', error);
    }
  };

  const fetchUserCommentedPosts = async () => {
    if (!user) return;
    
    try {
      console.log('Fetching commented posts for user:', user.id);
      const response = await fetch(`/api/comments?userId=${user.id}`);
      if (response.ok) {
        const commentedPosts = await response.json();
        console.log('Received commented posts:', commentedPosts);
        setCommentedPosts(new Set(commentedPosts.map((post: Post) => post.id)));
      } else {
        console.error('Failed to fetch commented posts:', response.status);
      }
    } catch (error) {
      console.error('Error fetching commented posts:', error);
    }
  };

  const fetchUserInfo = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session) {
        console.error('No session found');
        router.push('/');
        return;
      }

      const response = await fetch('/api/current-user', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        fetchPosts();
        fetchUserLikedPosts();
        fetchUserRepostedPosts();
        fetchUserCommentedPosts();
      } else {
        if (response.status === 401) {
          await supabase.auth.signOut();
          router.push('/');
          return;
        }
        console.error('Failed to fetch user data');
      }
    } catch (error) {
      console.error('Error fetching user data:', error);
      router.push('/');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserInfo();
        fetchUserRepostedPosts();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setLikedPosts(new Set());
        setRepostedPosts(new Set());
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadError(null);

    // Validate file type
    if (type === 'image' && !SUPPORTED_IMAGE_FORMATS.includes(file.type)) {
      setUploadError('Please upload a supported image format (JPEG, PNG, GIF, WEBP)');
      return;
    }
    if (type === 'video' && !SUPPORTED_VIDEO_FORMATS.includes(file.type)) {
      setUploadError('Please upload a supported video format (MP4, WebM, QuickTime)');
      return;
    }

    // Validate video file size
    if (type === 'video' && file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setUploadError(`Video size must be less than ${MAX_VIDEO_SIZE_MB}MB`);
      return;
    }

    setMediaToUpload(file);
  };

  const handleCreatePost = async () => {
    if ((!newPost.trim() && !mediaToUpload) || !user) return;
    
    try {
      startLoading('Creating post');
      setUploadingMedia(true);
      let mediaUrl = '';
      
      if (mediaToUpload) {
        mediaUrl = await uploadFile(mediaToUpload);
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newPost,
          authorId: user.id,
          mediaUrl
        }),
      });

      if (response.ok) {
        const post = await response.json();
        const newPost = {
          ...post,
          _count: post._count || { like: 0, comments: 0, reposts: 0 }
        };
        setPosts([newPost, ...posts]);
        setNewPost('');
        setMediaToUpload(null);
      } else {
        console.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    } finally {
      setUploadingMedia(false);
      stopLoading();
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;
    
    if (likedPosts.has(postId)) {
      setToast('You have already liked this post');
      return;
    }

    try {
      startLoading('Updating like');
      const response = await fetch('/api/likes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          postId 
        }),
      });

      if (response.ok) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          newSet.add(postId);
          return newSet;
        });

        setPosts(prevPosts => 
          prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                _count: {
                  ...post._count,
                  like: post._count.like + 1
                }
              };
            }
            return post;
          })
        );
      }
    } catch (error) {
      console.error('Error handling like:', error);
    } finally {
      stopLoading();
    }
  };

  const fetchComments = async (postId: string) => {
    try {
      startLoading('Loading comments');
      setLoadingComments(prev => new Set([...prev, postId]));
      const response = await fetch(`/api/comments?postId=${postId}`);
      if (response.ok) {
        const data = await response.json();
        setComments(prev => ({ ...prev, [postId]: data }));
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(prev => {
        const newSet = new Set(prev);
        newSet.delete(postId);
        return newSet;
      });
      stopLoading();
    }
  };

  const handleComment = async (postId: string) => {
    setOpenCommentBoxes(prev => {
      const newSet = new Set(prev);
      if (newSet.has(postId)) {
        newSet.delete(postId);
      } else {
        newSet.add(postId);
        // Fetch comments when opening the comment box
        if (!comments[postId]) {
          fetchComments(postId);
        }
      }
      return newSet;
    });
  };

  const submitComment = async (postId: string) => {
    if (!user || !newComments[postId]?.trim() || commentedPosts.has(postId)) return;

    try {
      startLoading('Posting comment');
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          postId,
          userId: user.id,
          content: newComments[postId],
        }),
      });

      if (response.ok) {
        const { comment, post } = await response.json();
        
        // Update comments for this post
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), comment],
        }));
        
        // Clear comment input
        setNewComments(prev => ({ ...prev, [postId]: '' }));
        
        // Mark post as commented
        setCommentedPosts(prev => {
          const newSet = new Set(prev);
          newSet.add(postId);
          return newSet;
        });
        
        // Update post with new counts
        setPosts(prev =>
          prev.map(p =>
            p.id === postId ? { ...p, _count: post._count } : p
          )
        );
      }
    } catch (error) {
      console.error('Error submitting comment:', error);
    } finally {
      stopLoading();
    }
  };

  const handleRepost = async (postId: string) => {
    if (!user) return;
    
    if (repostedPosts.has(postId)) {
      setToast('You have already reposted this post');
      return;
    }

    try {
      startLoading('Updating repost');
      const response = await fetch('/api/repost', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          postId 
        }),
      });

      if (response.ok) {
        const { post } = await response.json();
        
        setRepostedPosts(prev => {
          const newSet = new Set(prev);
          newSet.add(postId);
          return newSet;
        });

        setPosts(prevPosts => 
          prevPosts.map(p => 
            p.id === postId ? { ...p, _count: post._count } : p
          )
        );
      }
    } catch (error) {
      console.error('Error handling repost:', error);
    } finally {
      stopLoading();
    }
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };



  if (loading) {
    return <Loader message="Loading your feed" />;
  }

  if (!user) {
    // Instead of showing a message, redirect to login
    router.push('/');
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
      {toast && (
        <Toast 
          message={toast} 
          onClose={() => setToast(null)} 
        />
      )}
      
      {selectedImage && <ImageModal imageUrl={selectedImage} onClose={() => setSelectedImage(null)} />}
      
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="grid grid-cols-12 gap-6">
          {/* Left Sidebar - User Profile */}
          <div className="col-span-3">
            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/5 sticky top-8">
              <div className="flex flex-col items-center">
                <div 
                  onClick={handleProfileClick}
                  className="relative w-24 h-24 rounded-full overflow-hidden mb-4 ring-4 ring-white/10 cursor-pointer transform hover:scale-105 transition-all duration-300 hover:ring-white/20"
                >
                  <Image
                    src={user?.avatarUrl || "/default-avatar.png"}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                </div>
                <h2 
                  onClick={handleProfileClick}
                  className="text-xl font-semibold text-white cursor-pointer hover:text-white/90 transition-colors"
                >
                  {user?.name || 'Anonymous'}
                </h2>
                <p className="text-zinc-400 text-sm mt-1">{user?.email}</p>

                {/* Active Status Indicator */}
                <div className="mt-6 w-full">
                  <div className="bg-zinc-800/50 backdrop-blur-sm rounded-xl p-4 border border-white/5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="relative">
                          <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                          <div className="absolute inset-0 w-3 h-3 bg-emerald-500 rounded-full animate-ping opacity-75"></div>
                        </div>
                        <span className="text-emerald-500 font-medium">Active</span>
                      </div>
                      <div className="bg-zinc-700/50 px-2 py-1 rounded-md">
                        <span className="text-xs text-zinc-400">Now</span>
                      </div>
                    </div>
                    <div className="mt-3 text-xs text-zinc-500">
                      Last active: {new Date().toLocaleString('en-US', { 
                        hour: 'numeric', 
                        minute: 'numeric',
                        hour12: true 
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Post Creation and Feed */}
          <div className="col-span-9 space-y-6">
            {/* Create Post */}
            <div className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/5">
              <textarea
                className="w-full p-4 bg-zinc-800/50 text-white border-none rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-white/20 placeholder-zinc-500 transition-all"
                placeholder="What's on your mind?"
                rows={3}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              
              {mediaToUpload && (
                <div className="mt-3 p-3 bg-zinc-800/50 rounded-xl text-zinc-400 backdrop-blur-sm">
                  <div className="flex items-center justify-between mb-2">
                    <span className="truncate">{mediaToUpload.name}</span>
                    <button 
                      onClick={() => {
                        setMediaToUpload(null);
                        setUploadError(null);
                      }}
                      className="text-red-400 hover:text-red-300 ml-2 transition-colors"
                    >
                      <FaTimes className="w-4 h-4" />
                    </button>
                  </div>
                  {mediaToUpload.type.startsWith('video/') && (
                    <div className="text-sm text-zinc-500">
                      Size: {(mediaToUpload.size / (1024 * 1024)).toFixed(1)}MB
                    </div>
                  )}
                </div>
              )}

              {uploadError && (
                <div className="mt-3 text-red-400 text-sm bg-red-500/10 p-3 rounded-xl">
                  {uploadError}
                </div>
              )}

              <div className="flex items-center justify-between mt-4">
                <div className="flex gap-3">
                  <label 
                    className="cursor-pointer p-3 text-zinc-400 hover:text-white transition-all rounded-xl hover:bg-white/5 relative group"
                    title="Upload image (JPEG, PNG, GIF, WEBP)"
                  >
                    <input
                      type="file"
                      accept={SUPPORTED_IMAGE_FORMATS.join(',')}
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'image')}
                    />
                    <FaImage className="w-5 h-5" />
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-black/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Upload image
                    </span>
                  </label>
                  <label 
                    className="cursor-pointer p-3 text-zinc-400 hover:text-white transition-all rounded-xl hover:bg-white/5 relative group"
                    title={`Upload video (max ${MAX_VIDEO_SIZE_MB}MB)`}
                  >
                    <input
                      type="file"
                      accept={SUPPORTED_VIDEO_FORMATS.join(',')}
                      className="hidden"
                      onChange={(e) => handleFileUpload(e, 'video')}
                    />
                    <FaVideo className="w-5 h-5" />
                    <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 text-xs text-white bg-black/90 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      Upload video (max {MAX_VIDEO_SIZE_MB}MB)
                    </span>
                  </label>
                </div>
                <button
                  className={`px-6 py-2.5 bg-white text-black rounded-xl font-semibold transition-all ${
                    uploadingMedia 
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:bg-zinc-200 hover:shadow-lg transform hover:-translate-y-0.5'
                  }`}
                  onClick={handleCreatePost}
                  disabled={uploadingMedia}
                >
                  {uploadingMedia ? 'Uploading...' : 'Post'}
                </button>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-6">
              {posts.map((post) => (
                <div 
                  key={post.id} 
                  className="bg-zinc-900/50 backdrop-blur-lg rounded-2xl shadow-xl p-6 border border-white/5 transform hover:border-white/10 transition-all duration-300"
                >
                  <div className="flex items-center mb-4">
                    <div className="relative w-12 h-12 rounded-full overflow-hidden mr-4 ring-2 ring-white/10">
                      <Image
                        src={post.author.avatarUrl || "/default-avatar.png"}
                        alt="Profile"
                        width={48}
                        height={48}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white hover:text-white/90 cursor-pointer transition-colors">
                        {post.author.name || 'Anonymous'}
                      </h3>
                      <p className="text-sm text-zinc-400">
                        {new Date(post.createdAt).toLocaleString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>
                  
                  <p className="text-zinc-100 text-lg mb-4 leading-relaxed">{post.content}</p>
                  
                  {post.mediaUrl && (
                    <div className="mb-4 rounded-xl overflow-hidden bg-zinc-950/50 backdrop-blur-sm">
                      {post.mediaUrl.includes('.mp4') || post.mediaUrl.includes('.mov') || post.mediaUrl.includes('.webm') ? (
                        <video 
                          src={post.mediaUrl} 
                          controls 
                          preload="metadata"
                          className="w-full max-h-[512px] object-contain"
                          playsInline
                        />
                      ) : (
                        <div 
                          className="cursor-pointer transition-transform hover:opacity-90"
                          onClick={() => post.mediaUrl && setSelectedImage(post.mediaUrl)}
                        >
                          <Image
                            src={post.mediaUrl}
                            alt="Post media"
                            width={512}
                            height={512}
                            className="w-full max-h-[512px] object-contain"
                          />
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* Post Actions */}
                  <div className="flex items-center justify-between pt-4 border-t border-white/5">
                    <div className="flex items-center gap-6">
                      <button 
                        onClick={() => handleLike(post.id)}
                        disabled={likedPosts.has(post.id)}
                        className={`flex items-center gap-2 transition-all group ${
                          likedPosts.has(post.id) ? 'text-red-400 cursor-not-allowed' : 'text-zinc-400 hover:text-red-400'
                        }`}
                      >
                        {likedPosts.has(post.id) ? (
                          <FaHeart className="w-5 h-5 text-red-400" />
                        ) : (
                          <FaRegHeart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        )}
                        <span className={likedPosts.has(post.id) ? 'text-red-400' : ''}>
                          {post._count?.like || 0}
                        </span>
                      </button>

                      <button 
                        onClick={() => handleComment(post.id)}
                        disabled={commentedPosts.has(post.id)}
                        className={`flex items-center gap-2 transition-all group ${
                          commentedPosts.has(post.id) ? 'text-blue-400 cursor-not-allowed' : 'text-zinc-400 hover:text-blue-400'
                        }`}
                      >
                        <FaRegComment 
                          className={`w-5 h-5 ${
                            commentedPosts.has(post.id) ? 'text-blue-400' : 'group-hover:scale-110 transition-transform'
                          }`} 
                        />
                        <span className={commentedPosts.has(post.id) ? 'text-blue-400' : ''}>
                          {post._count?.comments || 0}
                        </span>
                      </button>

                      <button 
                        onClick={() => handleRepost(post.id)}
                        disabled={repostedPosts.has(post.id)}
                        className={`flex items-center gap-2 transition-all group ${
                          repostedPosts.has(post.id) ? 'text-green-400 cursor-not-allowed' : 'text-zinc-400 hover:text-green-400'
                        }`}
                      >
                        <FaRetweet 
                          className={`w-5 h-5 ${
                            repostedPosts.has(post.id) ? 'text-green-400' : 'group-hover:scale-110 transition-transform'
                          }`}
                        />
                        <span className={repostedPosts.has(post.id) ? 'text-green-400' : ''}>
                          {post._count?.reposts || 0}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center gap-4">
                      <button className="text-zinc-400 hover:text-white transition-colors">
                        <FaRegBookmark className="w-5 h-5" />
                      </button>
                      <button className="text-zinc-400 hover:text-white transition-colors">
                        <FaShareAlt className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Comments Section */}
                  {openCommentBoxes.has(post.id) && (
                    <div className="mt-4 pt-4 border-t border-white/5">
                      {/* Comment Input */}
                      <div className="flex gap-3 mb-4">
                        <div className="relative w-8 h-8 rounded-full overflow-hidden">
                          <Image
                            src={user?.avatarUrl || "/default-avatar.png"}
                            alt="Profile"
                            width={32}
                            height={32}
                            className="object-cover"
                          />
                        </div>
                        <div className="flex-1 flex gap-2">
                          <input
                            type="text"
                            value={newComments[post.id] || ''}
                            onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                            placeholder="Write a comment..."
                            className="flex-1 bg-zinc-800/50 rounded-xl px-4 py-2 text-white placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-white/20"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') {
                                submitComment(post.id);
                              }
                            }}
                          />
                          <button
                            onClick={() => submitComment(post.id)}
                            className="px-4 py-2 bg-white text-black rounded-xl font-medium hover:bg-zinc-200 transition-colors"
                          >
                            Post
                          </button>
                        </div>
                      </div>

                      {/* Comments List */}
                      <div className="space-y-4">
                        {loadingComments.has(post.id) ? (
                          <InlineLoader />
                        ) : comments[post.id]?.length > 0 ? (
                          comments[post.id].map((comment) => (
                            <div key={comment.id} className="flex gap-3">
                              <div className="relative w-8 h-8 rounded-full overflow-hidden">
                                <Image
                                  src={comment.user.avatarUrl || "/default-avatar.png"}
                                  alt="Profile"
                                  width={32}
                                  height={32}
                                  className="object-cover"
                                />
                              </div>
                              <div className="flex-1 bg-zinc-800/30 rounded-xl p-3">
                                <div className="flex items-center gap-2 mb-1">
                                  <span className="font-medium text-white">{comment.user.name}</span>
                                  <span className="text-xs text-zinc-500">
                                    {new Date(comment.createdAt).toLocaleString('en-US', {
                                      month: 'short',
                                      day: 'numeric',
                                      hour: 'numeric',
                                      minute: 'numeric'
                                    })}
                                  </span>
                                </div>
                                <p className="text-zinc-300">{comment.content}</p>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-zinc-500">No comments yet. Be the first to comment!</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}


