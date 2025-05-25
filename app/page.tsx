"use client";

import { supabase } from "@/lib/supabase";
import { FcGoogle } from "react-icons/fc";
import { useEffect } from "react";

export default function Home() {



  const handleGoogleLogin = async () => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    })

    if (error) {
      console.error('Google login error:', error.message)
    }
  }
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
  
      if (session?.user) {
        await fetch("/api/auth/sync-user", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            authId: session.user.id,
            email: session.user.email,
            name: session.user.user_metadata.name,
            avatarUrl: session.user.user_metadata.avatar_url,
          }),
        })
      }
    }
  
    getUser()
  }, [])


  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <div className="bg-white p-8 rounded-lg shadow-lg w-96">
        <h1 className="text-2xl font-bold text-center mb-6 text-black">Login</h1>

        {/* Email Input */}
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            Email
          </label>
          <input
            type="email"
            id="email"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Enter your email"
          />
        </div>

        {/* Password Input */}
        <div className="mb-6">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            Password
          </label>
          <input
            type="password"
            id="password"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-400"
            placeholder="Create a password"
          />
        </div>

        {/* Sign up Button */}
        <button className="w-full bg-black text-white py-2 rounded-lg hover:bg-gray-800 transition-colors">
          Sign Up
        </button>

        <div className="flex items-center my-4">
          <div className="flex-1 border-t border-gray-300"></div>
          <span className="px-4 text-gray-500 text-sm">or</span>
          <div className="flex-1 border-t border-gray-300"></div>
        </div>

        {/* Google Sign up Button */}
        <button

          onClick={handleGoogleLogin}
          className="w-full flex items-center justify-center py-3 bg-white text-black font-medium rounded-lg hover:bg-neutral-200 transition shadow-md"
        >
          <FcGoogle className="w-5 h-5 mr-2" />
          Login with Google
        </button>

        <p className="mt-4 text-center text-sm text-gray-600">
          Already have an account?{" "}
          <a href="/login" className="text-black hover:underline">
            Log in
          </a>
        </p>
      </div>
    </div>
  );
}
