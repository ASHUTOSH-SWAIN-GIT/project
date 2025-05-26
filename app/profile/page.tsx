'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { FaRegHeart, FaHeart, FaRegComment, FaRetweet, FaCalendarAlt, FaEnvelope, FaSignOutAlt, FaArrowLeft } from 'react-icons/fa';
import { useLoading } from '@/lib/contexts/LoadingContext';

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

type TabType = 'posts' | 'reposts' | 'likes';

export default function ProfilePage() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('posts');
  const [likedPosts, setLikedPosts] = useState<Set<string>>(new Set());
  const [commentedPosts, setCommentedPosts] = useState<Set<string>>(new Set());
  const [repostedPosts, setRepostedPosts] = useState<Set<string>>(new Set());

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
          fetchUserContent(activeTab);
          fetchUserCommentedPosts();
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
  }, [activeTab]);

  const fetchUserContent = async (tab: TabType) => {
    if (!user) return;

    try {
      startLoading(`Loading ${tab}`);
      let endpoint = '/api/posts';
      
      switch (tab) {
        case 'posts':
          endpoint = `/api/posts?userId=${user.id}`;
          break;
        case 'likes':
          endpoint = `/api/posts/likes?userId=${user.id}`;
          break;
        case 'reposts':
          endpoint = `/api/posts/reposts?userId=${user.id}`;
          break;
      }

      const response = await fetch(endpoint);
      if (response.ok) {
        const data = await response.json();
        setPosts(data);
        
        // Update liked posts state if we're on the likes tab
        if (tab === 'likes') {
          setLikedPosts(new Set(data.map((post: Post) => post.id)));
        }
      }
    } catch (error) {
      console.error(`Error fetching ${tab}:`, error);
    } finally {
      stopLoading();
    }
  };

  const fetchUserCommentedPosts = async () => {
    if (!user) return;
    
    try {
      const response = await fetch(`/api/posts/comments?userId=${user.id}`);
      if (response.ok) {
        const commentedPosts = await response.json();
        setCommentedPosts(new Set(commentedPosts.map((post: Post) => post.id)));
      }
    } catch (error) {
      console.error('Error fetching commented posts:', error);
    }
  };

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    fetchUserContent(tab);
  };


  const handleLogout = async () => {
    try {
      startLoading('Signing out');
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Error signing out:', error.message);
        return;
      }
      router.push('/');
    } catch (error) {
      console.error('Error during logout:', error);
    } finally {
      stopLoading();
    }
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
        <div className="text-white">Please sign in to view profile</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900">
      {/* Cover Photo */}
      <div className="h-48 bg-gradient-to-r from-blue-600 to-purple-600 relative">
        <div className="absolute inset-0 bg-black/20"></div>
        {/* Back Button */}
        <button 
          onClick={() => router.push('/Home')}
          className="absolute top-4 left-4 md:left-8 flex items-center gap-2 px-4 py-2 bg-black/30 hover:bg-black/40 text-white rounded-full backdrop-blur-sm transition-all group"
        >
          <FaArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Home</span>
        </button>
      </div>

      {/* Profile Header */}
      <div className="relative max-w-4xl mx-auto px-4">
        {/* Profile Picture */}
        <div className="absolute -top-16 left-4 md:left-8">
          <div className="relative w-32 h-32 rounded-full overflow-hidden border-4 border-black ring-4 ring-white/10">
            <Image
              src={user?.avatarUrl || "/default-avatar.png"}
              alt="Profile"
              width={128}
              height={128}
              className="object-cover"
            />
          </div>
        </div>

        {/* Profile Actions */}
        <div className="flex justify-end py-4">
          <button 
            onClick={handleLogout}
            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-full transition-colors flex items-center gap-2"
          >
            <FaSignOutAlt className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>

        {/* Profile Info */}
        <div className="mt-8 space-y-4">
          <div>
            <h1 className="text-3xl font-bold text-white">{user?.name}</h1>
            <p className="text-zinc-400">@{user?.name?.toLowerCase().replace(/\s+/g, '')}</p>
          </div>

          <div className="flex flex-wrap gap-4 text-zinc-400">
            <div className="flex items-center gap-2">
              <FaEnvelope className="w-4 h-4" />
              <span>{user?.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <FaCalendarAlt className="w-4 h-4" />
              <span>Joined {new Date(user?.createdAt || '').toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex mt-8 border-b border-zinc-800">
          <button
            className={`px-8 py-4 text-sm font-medium relative ${
              activeTab === 'posts'
                ? 'text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => handleTabChange('posts')}
          >
            Posts
            {activeTab === 'posts' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
            )}
          </button>
          <button
            className={`px-8 py-4 text-sm font-medium relative ${
              activeTab === 'reposts'
                ? 'text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => handleTabChange('reposts')}
          >
            Reposts
            {activeTab === 'reposts' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
            )}
          </button>
          <button
            className={`px-8 py-4 text-sm font-medium relative ${
              activeTab === 'likes'
                ? 'text-white'
                : 'text-zinc-400 hover:text-white hover:bg-white/5'
            }`}
            onClick={() => handleTabChange('likes')}
          >
            Likes
            {activeTab === 'likes' && (
              <div className="absolute bottom-0 left-0 right-0 h-1 bg-blue-500"></div>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="space-y-4">
          {posts.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-4 text-zinc-600">
                {activeTab === 'posts' && <FaRegComment className="w-full h-full" />}
                {activeTab === 'likes' && <FaRegHeart className="w-full h-full" />}
                {activeTab === 'reposts' && <FaRetweet className="w-full h-full" />}
              </div>
              <h3 className="text-xl font-semibold text-white mb-2">No {activeTab} yet</h3>
              <p className="text-zinc-400">When you {activeTab === 'posts' ? 'post something' : activeTab === 'likes' ? 'like a post' : 'repost something'}, it will show up here.</p>
            </div>
          ) : (
            posts.map((post) => (
              <div key={post.id} className="bg-zinc-900/50 backdrop-blur-sm rounded-xl shadow-lg p-6 border border-white/5 hover:border-white/10 transition-colors">
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
                
                {/* Post Actions */}
                <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
                  <div className="flex items-center gap-6">
                    {/* Like indicator */}
                    <div className="flex items-center gap-2 text-zinc-400">
                      {likedPosts.has(post.id) ? (
                        <FaHeart className="w-5 h-5 text-red-500" />
                      ) : (
                        <FaRegHeart className="w-5 h-5" />
                      )}
                      <span className={likedPosts.has(post.id) ? 'text-red-500' : ''}>
                        {post._count?.like || 0}
                      </span>
                    </div>

                    {/* Comment indicator */}
                    <div className="flex items-center gap-2 text-zinc-400">
                      <FaRegComment className={`w-5 h-5 ${
                        commentedPosts.has(post.id) ? 'text-blue-500' : ''
                      }`} />
                      <span className={commentedPosts.has(post.id) ? 'text-blue-500' : ''}>
                        {post._count?.comments || 0}
                      </span>
                    </div>

                    {/* Repost indicator */}
                    <div className="flex items-center gap-2 text-zinc-400">
                      <FaRetweet className={`w-5 h-5 ${
                        repostedPosts.has(post.id) ? 'text-green-500' : ''
                      }`} />
                      <span className={repostedPosts.has(post.id) ? 'text-green-500' : ''}>
                        {post._count?.reposts || 0}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
} 