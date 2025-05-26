"use client";

import { useState, useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { FaGoogle } from 'react-icons/fa';
import { useLoading } from '@/lib/contexts/LoadingContext';
import { Loader } from '@/components/Loader';

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function LoginPage() {
  return (
    <Suspense fallback={<Loader message="Loading" />}>
      <LoginContent />
    </Suspense>
  );
}

function LoginContent() {
  const router = useRouter();
  const { startLoading, stopLoading } = useLoading();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        if (session && !error) {
          router.push('/Home');
        }
      } catch (error) {
        console.error('Error checking session:', error);
      } finally {
        setLoading(false);
      }
    };

    checkSession();
  }, [router]);

  const handleGoogleLogin = async () => {
    try {
      startLoading('Signing in with Google');
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`
        }
      });

      if (error) {
        console.error('Error signing in with Google:', error.message);
      }
    } catch (error) {
      console.error('Error during Google sign in:', error);
    } finally {
      stopLoading();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <Loader message="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/5">
        <div className="text-center">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-500 to-purple-500 text-transparent bg-clip-text mb-2">
            Contactify
          </h1>
          <p className="text-zinc-400">Connect with your network</p>
        </div>

        <button
          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-100 transition-colors"
        >
          <FaGoogle className="w-5 h-5" />
          <span>Continue with Google</span>
        </button>

        <p className="text-center text-sm text-zinc-500">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
}
