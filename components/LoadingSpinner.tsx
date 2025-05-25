"use client"

import { useLoading } from '@/lib/contexts/LoadingContext';

export function LoadingSpinner() {
  const { loadingState } = useLoading();
  
  if (!loadingState.isLoading) return null;

  return (
    <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-50">
      <div className="relative bg-zinc-900/50 rounded-2xl p-8 shadow-2xl border border-white/10 backdrop-blur-xl flex flex-col items-center space-y-6 min-w-[200px]">
        {/* Spinner */}
        <div className="relative">
          {/* Outer ring */}
          <div className="w-16 h-16 border-4 border-blue-500/20 rounded-full"></div>
          {/* Spinning inner ring */}
          <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          {/* Pulsing center dot */}
          <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
        </div>
        
        {/* Loading text with shimmer effect */}
        <div className="relative overflow-hidden rounded-lg">
          <div className="text-white/80 font-medium text-sm tracking-wide uppercase relative z-10">
            {loadingState.operation}...
          </div>
          {/* Shimmer effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent animate-shimmer"></div>
        </div>
      </div>
    </div>
  );
} 