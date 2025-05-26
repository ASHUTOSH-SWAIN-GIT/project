'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { FaHome } from 'react-icons/fa';

export const viewport = {
  themeColor: '#000000',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function NotFound() {
  return (
    <Suspense>
      <NotFoundContent />
    </Suspense>
  );
}

function NotFoundContent() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-black to-zinc-900 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8 bg-zinc-900/50 backdrop-blur-sm p-8 rounded-2xl shadow-lg border border-white/5 text-center">
        <h1 className="text-6xl font-bold text-white">404</h1>
        <h2 className="text-2xl font-semibold text-zinc-300">Page Not Found</h2>
        <p className="text-zinc-400">The page you&apos;re looking for doesn&apos;t exist or has been moved.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-2 px-6 py-3 bg-white text-black rounded-xl font-medium hover:bg-zinc-100 transition-colors"
        >
          <FaHome className="w-5 h-5" />
          <span>Back to Home</span>
        </Link>
      </div>
    </div>
  );
} 