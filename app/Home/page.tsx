'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaRegHeart, FaHeart, FaRegComment, FaRetweet } from 'react-icons/fa';

interface Post {
  id: string;
  content: string;
  createdAt: string;
  author: {
    name: string;
    avatarUrl: string;
  };
  _count?: {
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

export default function HomePage() {
  const router = useRouter();
  const [posts, setPosts] = useState<Post[]>([]);
  const [newPost, setNewPost] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());

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
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleCreatePost = async () => {
    if (!newPost.trim() || !user) return;
    
    try {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: newPost,
          authorId: user.id
        }),
      });

      if (response.ok) {
        const post = await response.json();
        setPosts([post, ...posts]);
        setNewPost('');
      } else {
        console.error('Failed to create post');
      }
    } catch (error) {
      console.error('Error creating post:', error);
    }
  };

  const handleLike = async (postId: string) => {
    if (!user) return;

    try {
      const method = likedPosts.has(postId) ? 'DELETE' : 'POST';
      const response = await fetch(`/api/posts/${postId}/like`, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: user.id }),
      });

      if (response.ok) {
        setLikedPosts(prev => {
          const newSet = new Set(prev);
          if (method === 'POST') {
            newSet.add(postId);
          } else {
            newSet.delete(postId);
          }
          return newSet;
        });
        // Refresh posts to update counts
        fetchPosts();
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
    <div className="min-h-screen bg-black">
      <div className="max-w-6xl mx-auto py-8 px-4">
        <div className="grid grid-cols-12 gap-4">
          {/* Left Sidebar - User Profile */}
          <div className="col-span-3">
            <div className="bg-zinc-900 rounded-lg shadow p-4 border border-zinc-800">
              <div className="flex flex-col items-center">
                <div 
                  onClick={handleProfileClick}
                  className="relative w-24 h-24 rounded-full overflow-hidden mb-4 border-2 border-white cursor-pointer hover:opacity-80 transition-opacity"
                >
                  <Image
                    src={user.avatarUrl || "/default-avatar.png"}
                    alt="Profile"
                    width={96}
                    height={96}
                    className="object-cover"
                  />
                </div>
                <h2 
                  onClick={handleProfileClick}
                  className="text-xl font-semibold text-white cursor-pointer hover:underline"
                >
                  {user.name || 'Anonymous'}
                </h2>
                <p className="text-zinc-400 text-sm">{user.email}</p>
                <div className="w-full mt-4 pt-4 border-t border-zinc-800">
                  <div className="flex justify-between text-sm text-zinc-400">
                    <span>Profile views</span>
                    <span className="font-semibold text-white">152</span>
                  </div>
                  <div className="flex justify-between text-sm text-zinc-400 mt-2">
                    <span>Post impressions</span>
                    <span className="font-semibold text-white">1,284</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Main Content - Post Creation and Feed */}
          <div className="col-span-9">
            {/* Create Post */}
            <div className="bg-zinc-900 rounded-lg shadow p-4 mb-4 border border-zinc-800">
              <textarea
                className="w-full p-4 bg-zinc-800 text-white border-none rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-white placeholder-zinc-500"
                placeholder="What's on your mind?"
                rows={3}
                value={newPost}
                onChange={(e) => setNewPost(e.target.value)}
              />
              <div className="flex justify-end mt-2">
                <button
                  className="px-4 py-2 bg-white text-black rounded-lg hover:bg-zinc-200 transition-colors font-semibold"
                  onClick={handleCreatePost}
                >
                  Post
                </button>
              </div>
            </div>

            {/* Posts Feed */}
            <div className="space-y-4">
              {posts.map((post) => (
                <div key={post.id} className="bg-zinc-900 rounded-lg shadow p-4 border border-zinc-800">
                  <div className="flex items-center mb-4">
                    <div className="relative w-10 h-10 rounded-full overflow-hidden mr-3 border border-white">
                      <Image
                        src={post.author.avatarUrl || "/default-avatar.png"}
                        alt="Profile"
                        width={40}
                        height={40}
                        className="object-cover"
                      />
                    </div>
                    <div>
                      <h3 className="font-semibold text-white">{post.author.name || 'Anonymous'}</h3>
                      <p className="text-sm text-zinc-400">
                        {new Date(post.createdAt).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <p className="text-zinc-100 mb-4">{post.content}</p>
                  
                  {/* Post Actions */}
                  <div className="flex items-center space-x-8 pt-2 border-t border-zinc-800">
                    <button 
                      onClick={() => handleLike(post.id)}
                      className="flex items-center space-x-2 text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      {likedPosts.has(post.id) ? (
                        <FaHeart className="w-5 h-5 text-red-500" />
                      ) : (
                        <FaRegHeart className="w-5 h-5" />
                      )}
                      <span>{post._count?.like || 0}</span>
                    </button>

                    <button 
                      onClick={() => handleComment(post.id)}
                      className="flex items-center space-x-2 text-zinc-400 hover:text-blue-500 transition-colors"
                    >
                      <FaRegComment className="w-5 h-5" />
                      <span>{post._count?.comment || 0}</span>
                    </button>

                    <button 
                      onClick={() => handleRepost(post.id)}
                      className="flex items-center space-x-2 text-zinc-400 hover:text-green-500 transition-colors"
                    >
                      <FaRetweet className="w-5 h-5" />
                      <span>0</span>
                    </button>
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
