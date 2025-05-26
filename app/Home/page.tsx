'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaRegComment, FaRetweet, FaImage, FaVideo, FaTimes, FaRegBookmark, FaShareAlt, FaExclamationCircle } from 'react-icons/fa';
import { uploadFile } from '@/lib/uploadFile';
import { useLoading } from '@/lib/contexts/LoadingContext';
import { Loader, InlineLoader } from '@/components/Loader';

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  _count?: {
    comments: number;
    reposts: number;
  };
}

interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl: string;
  bio?: string;
  createdAt: string;
}

interface Comment {
  id: string;
  content: string;
  createdAt: string;
  user: {
    name: string;
    avatarUrl: string;
  };
}

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function HomePage() {
  return (
    <Suspense fallback={<Loader message="Loading your feed" />}>
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [mediaToUpload, setMediaToUpload] = useState<File | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [openCommentBoxes, setOpenCommentBoxes] = useState<Set<string>>(new Set());
  const [comments, setComments] = useState<{ [postId: string]: Comment[] }>({});
  const [newComments, setNewComments] = useState<{ [postId: string]: string }>({});
  const [loadingComments, setLoadingComments] = useState<Set<string>>(new Set());
  const { startLoading, stopLoading } = useLoading();
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
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

    const fetchUserRepostedPosts = async (userId: string) => {
      try {
        const response = await fetch(`/api/posts/reposts?userId=${userId}`);
        if (response.ok) {
          const repostedPosts = await response.json();
          setRepostedPosts(new Set(repostedPosts.map((post: Post) => post.id)));
        }
      } catch (error) {
        console.error('Error fetching reposted posts:', error);
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
          await Promise.all([
            fetchPosts(),
            fetchUserRepostedPosts(userData.id)
          ]);
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

    fetchUserInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session) {
        fetchUserInfo();
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setRepostedPosts(new Set());
        router.push('/');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router, startLoading, stopLoading, user]);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>, type: 'image' | 'video') => {
    const file = event.target.files?.[0];
    if (!file) return;

    setMediaToUpload(file);
    setUploadError(null);

    if (type === 'image') {
      const reader = new FileReader();
      reader.onload = (e) => {
        setSelectedImage(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || (!newPost.trim() && !mediaToUpload)) return;

    try {
      startLoading('Creating post...');
      setUploadingMedia(true);

      let mediaUrl = null;
      if (mediaToUpload) {
        try {
          mediaUrl = await uploadFile(mediaToUpload);
        } catch (error) {
          console.error('Error uploading media:', error);
          setUploadError('Failed to upload media');
          return;
        }
      }

      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newPost.trim(),
          userId: user.id,
          mediaUrl
        }),
      });

      if (response.ok) {
        const newPostData = await response.json();
        setPosts(prev => [newPostData, ...prev]);
        setNewPost('');
        setMediaToUpload(null);
        setSelectedImage(null);
        setUploadError(null);
        setToast('Post created successfully!');
      } else {
        const data = await response.json();
        setToast(data.error || 'Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
      setToast('Failed to create post');
    } finally {
      setUploadingMedia(false);
      stopLoading();
    }
  };

  const handleRepost = async (postId: string) => {
    if (!user) return;

    try {
      startLoading('Reposting...');
      const response = await fetch('/api/repost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.id, postId }),
      });

      if (response.ok) {
        const { post } = await response.json();
        setPosts(prevPosts => prevPosts.map(p => p.id === post.id ? post : p));
        setRepostedPosts(prev => new Set([...prev, postId]));
        setToast('Post reposted successfully!');
      } else {
        const data = await response.json();
        setToast(data.error || 'Failed to repost');
      }
    } catch (error) {
      console.error('Error reposting:', error);
      setToast('Failed to repost');
    } finally {
      stopLoading();
    }
  };

  const handleComment = async (postId: string) => {
    if (!user || !newComments[postId]?.trim()) return;

    try {
      startLoading('Adding comment...');
      const response = await fetch('/api/comments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: newComments[postId].trim(),
          userId: user.id,
          postId
        }),
      });

      if (response.ok) {
        const { comment, post } = await response.json();
        setComments(prev => ({
          ...prev,
          [postId]: [...(prev[postId] || []), comment]
        }));
        setPosts(prevPosts => prevPosts.map(p => p.id === post.id ? post : p));
        setNewComments(prev => ({ ...prev, [postId]: '' }));
        setToast('Comment added successfully!');
      } else {
        const data = await response.json();
        setToast(data.error || 'Failed to add comment');
      }
    } catch (error) {
      console.error('Error adding comment:', error);
      setToast('Failed to add comment');
    } finally {
      stopLoading();
    }
  };

  const toggleCommentBox = async (postId: string) => {
    const newOpenCommentBoxes = new Set(openCommentBoxes);
    if (openCommentBoxes.has(postId)) {
      newOpenCommentBoxes.delete(postId);
    } else {
      newOpenCommentBoxes.add(postId);
      if (!comments[postId]) {
        try {
          setLoadingComments(prev => new Set([...prev, postId]));
          const response = await fetch(`/api/comments?postId=${postId}`);
          if (response.ok) {
            const fetchedComments = await response.json();
            setComments(prev => ({ ...prev, [postId]: fetchedComments }));
          }
        } catch (error) {
          console.error('Error fetching comments:', error);
        } finally {
          setLoadingComments(prev => {
            const newSet = new Set(prev);
            newSet.delete(postId);
            return newSet;
          });
        }
      }
    }
    setOpenCommentBoxes(newOpenCommentBoxes);
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader message="Loading your feed" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Please sign in to view feed</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-lg bg-black/50 border-b border-white/10">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text">
            Contactify
          </h1>
          <button
            onClick={handleProfileClick}
            className="flex items-center gap-3 px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors"
          >
            <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/10">
              <Image
                src={user?.avatarUrl || "/default-avatar.png"}
                alt="Profile"
                width={32}
                height={32}
                className="object-cover"
              />
            </div>
            <span className="text-white font-medium">{user?.name}</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Create Post */}
        <div className="bg-zinc-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 mb-8 border border-white/5">
          <form onSubmit={handleCreatePost} className="space-y-4">
            <div className="flex gap-4">
              <div className="relative w-12 h-12 rounded-full overflow-hidden ring-2 ring-white/10">
                <Image
                  src={user?.avatarUrl || "/default-avatar.png"}
                  alt="Profile"
                  width={48}
                  height={48}
                  className="object-cover"
                />
              </div>
              <textarea
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
                placeholder="What's on your mind?"
                className="flex-1 bg-transparent text-white placeholder-zinc-400 resize-none focus:outline-none text-lg"
                rows={2}
              />
            </div>

            {selectedImage && (
              <div className="relative">
                <Image
                  src={selectedImage}
                  alt="Selected"
                  width={800}
                  height={600}
                  className="w-full h-64 object-cover rounded-lg"
                />
                <button
                  type="button"
                  onClick={() => {
                    setSelectedImage(null);
                    setMediaToUpload(null);
                  }}
                  className="absolute top-2 right-2 p-2 bg-black/50 hover:bg-black/70 rounded-full text-white transition-colors"
                >
                  <FaTimes className="w-4 h-4" />
                </button>
              </div>
            )}

            {uploadError && (
              <div className="flex items-center gap-2 text-red-500">
                <FaExclamationCircle className="w-4 h-4" />
                <span>{uploadError}</span>
              </div>
            )}

            <div className="flex items-center justify-between pt-4 border-t border-white/5">
              <div className="flex gap-4">
                <label className="cursor-pointer text-zinc-400 hover:text-white transition-colors">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleFileUpload(e, 'image')}
                    className="hidden"
                  />
                  <FaImage className="w-5 h-5" />
                </label>
                <label className="cursor-pointer text-zinc-400 hover:text-white transition-colors">
                  <input
                    type="file"
                    accept="video/*"
                    onChange={(e) => handleFileUpload(e, 'video')}
                    className="hidden"
                  />
                  <FaVideo className="w-5 h-5" />
                </label>
              </div>
              <button
                type="submit"
                disabled={(!newPost.trim() && !mediaToUpload) || uploadingMedia}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-full font-medium transition-colors"
              >
                {uploadingMedia ? <InlineLoader /> : 'Post'}
              </button>
            </div>
          </form>
        </div>

        {/* Posts */}
        <div className="space-y-6">
          {posts.map((post) => (
            <div key={post.id} className="bg-zinc-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/5">
              {/* Post Header */}
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
                  <h3 className="font-semibold text-white hover:underline cursor-pointer">
                    {post.author.name}
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

              {/* Post Content */}
              <p className="text-white text-lg mb-4 whitespace-pre-wrap">{post.content}</p>

              {/* Post Actions */}
              <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                <div className="flex items-center gap-6">
                  {/* Comment button */}
                  <button
                    onClick={() => toggleCommentBox(post.id)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <FaRegComment className="w-5 h-5" />
                    <span>{post._count?.comments || 0}</span>
                  </button>

                  {/* Repost button */}
                  <button
                    onClick={() => handleRepost(post.id)}
                    className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors"
                  >
                    <FaRetweet className={`w-5 h-5 ${
                      repostedPosts.has(post.id) ? 'text-green-500' : ''
                    }`} />
                    <span className={repostedPosts.has(post.id) ? 'text-green-500' : ''}>
                      {post._count?.reposts || 0}
                    </span>
                  </button>

                  {/* Share button */}
                  <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <FaShareAlt className="w-5 h-5" />
                  </button>

                  {/* Bookmark button */}
                  <button className="flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
                    <FaRegBookmark className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Comments Section */}
              {openCommentBoxes.has(post.id) && (
                <div className="mt-4 space-y-4">
                  <div className="flex gap-4">
                    <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/10">
                      <Image
                        src={user?.avatarUrl || "/default-avatar.png"}
                        alt="Profile"
                        width={32}
                        height={32}
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={newComments[post.id] || ''}
                        onChange={(e) => setNewComments(prev => ({ ...prev, [post.id]: e.target.value }))}
                        placeholder="Write a comment..."
                        className="w-full bg-transparent text-white placeholder-zinc-400 resize-none focus:outline-none"
                        rows={1}
                      />
                      <div className="flex justify-end mt-2">
                        <button
                          onClick={() => handleComment(post.id)}
                          disabled={!newComments[post.id]?.trim()}
                          className="px-4 py-1 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-500/50 disabled:cursor-not-allowed text-white rounded-full text-sm font-medium transition-colors"
                        >
                          Comment
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Comments List */}
                  <div className="space-y-4 pl-12">
                    {loadingComments.has(post.id) ? (
                      <div className="flex justify-center">
                        <InlineLoader />
                      </div>
                    ) : comments[post.id]?.length > 0 ? (
                      comments[post.id].map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <div className="relative w-8 h-8 rounded-full overflow-hidden ring-2 ring-white/10">
                            <Image
                              src={comment.user.avatarUrl || "/default-avatar.png"}
                              alt="Profile"
                              width={32}
                              height={32}
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <div className="bg-white/5 rounded-lg p-3">
                              <div className="font-medium text-white">
                                {comment.user.name}
                              </div>
                              <p className="text-zinc-300">{comment.content}</p>
                            </div>
                            <p className="text-xs text-zinc-500 mt-1">
                              {new Date(comment.createdAt).toLocaleString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: 'numeric'
                              })}
                            </p>
                          </div>
                        </div>
                      ))
                    ) : (
                      <p className="text-center text-zinc-500">No comments yet</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </main>

      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 bg-zinc-800 text-white px-6 py-3 rounded-lg shadow-lg">
          {toast}
        </div>
      )}
    </div>
  );
}
