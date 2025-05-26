import React from 'react';

interface LoaderProps {
  message?: string;
}

export const Loader: React.FC<LoaderProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-zinc-900/80 p-8 rounded-2xl border border-white/10 shadow-2xl flex flex-col items-center gap-4 min-w-[300px]">

        <div className="relative w-12 h-12">

          <div className="absolute inset-0 border-4 border-white/5 rounded-full"></div>

          <div className="absolute inset-0 border-4 border-t-white border-r-white/50 border-b-white/10 border-l-transparent rounded-full animate-spin"></div>

          <div className="absolute inset-2 border-2 border-white/10 rounded-full"></div>

          <div className="absolute inset-[14px] bg-white rounded-full animate-pulse"></div>
        </div>

        {/* Message */}
        {message && (
          <div className="text-center">
            <p className="text-white/80 font-medium">{message}</p>
            <p className="text-xs text-white/40 mt-1">Please wait...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const InlineLoader: React.FC = () => {
  return (
    <div className="flex items-center justify-center p-4">
      <div className="relative w-8 h-8">
        <div className="absolute inset-0 border-3 border-white/5 rounded-full"></div>
        <div className="absolute inset-0 border-3 border-t-white border-r-white/50 border-b-white/10 border-l-transparent rounded-full animate-spin"></div>
        <div className="absolute inset-[6px] bg-white/20 rounded-full animate-pulse"></div>
      </div>
    </div>
  );
}; 