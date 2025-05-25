'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaRegHeart, FaHeart, FaRegComment, FaRetweet, FaImage, FaVideo, FaTimes, FaRegBookmark, FaShareAlt } from 'react-icons/fa';
import { uploadFile } from '@/lib/uploadFile';

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
    comment: number;
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

  useEffect(() => {
    const fetchUserInfo = async () => {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError || !session) {
          console.error('No session found');
          setLoading(false);
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
          fetchUserLikedPosts(); // Fetch liked posts after user is set
        } else {
          console.error('Failed to fetch user data');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserInfo();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        fetchUserInfo();
      } else {
        setUser(null);
        setLikedPosts(new Set()); // Clear liked posts when user logs out
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

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
        // Ensure the post has the correct structure
        const newPost = {
          ...post,
          _count: post._count || { like: 0, comment: 0 }
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
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const method = likedPosts.has(postId) ? 'DELETE' : 'POST';
      const response = await fetch('/api/likes', {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userId: user.id,
          postId 
        }),
      });

      if (response.ok) {
        // Optimistically update UI
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (method === 'POST') {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });

        // Update post counts
        setPosts(prevPosts => 
          prevPosts.map(post => {
            if (post.id === postId) {
              return {
                ...post,
                _count: {
                  ...post._count,
                  like: method === 'POST' ? post._count.like + 1 : post._count.like - 1
                }
              };
            }
            return post;
          })
        );
      } else {
        // If the request failed, revert the optimistic update
        const errorData = await response.json();
        console.error('Like error:', errorData.error);
        
        // Revert optimistic updates
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (method === 'POST') {
            newSet.delete(postId);
          } else {
            newSet.add(postId);
          }
          return newSet;
        });
      }
    } catch (error) {
      console.error('Error handling like:', error);
    }
  };

  const handleComment = (postId: string) => {
    // TODO: Implement comment functionality
    console.log('Comment clicked for post:', postId);
  };

  const handleRepost = (postId: string) => {
    // TODO: Implement repost functionality
    console.log('Repost clicked for post:', postId);
  };

  const handleProfileClick = () => {
    router.push('/profile');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-white">Please sign in to continue</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
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
                
                <div className="w-full mt-6 pt-6 border-t border-white/5">
                  <div className="flex justify-between items-center text-sm mb-3 group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                    <span className="text-zinc-400 group-hover:text-white">Profile views</span>
                    <span className="font-semibold text-white">{152}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm group cursor-pointer hover:bg-white/5 p-2 rounded-lg transition-colors">
                    <span className="text-zinc-400 group-hover:text-white">Post impressions</span>
                    <span className="font-semibold text-white">{1284}</span>
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
                        className="flex items-center gap-2 text-zinc-400 hover:text-red-400 transition-all group"
                      >
                        {likedPosts.has(post.id) ? (
                          <FaHeart className="w-5 h-5 text-red-400" />
                        ) : (
                          <FaRegHeart className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        )}
                        <span>{post._count?.like || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleComment(post.id)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-blue-400 transition-all group"
                      >
                        <FaRegComment className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>{post._count?.comment || 0}</span>
                      </button>

                      <button 
                        onClick={() => handleRepost(post.id)}
                        className="flex items-center gap-2 text-zinc-400 hover:text-green-400 transition-all group"
                      >
                        <FaRetweet className="w-5 h-5 group-hover:scale-110 transition-transform" />
                        <span>0</span>
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
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
