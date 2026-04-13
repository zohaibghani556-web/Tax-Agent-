'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log digest only — never log full error objects which may contain PII
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    } else if (error.digest) {
      console.error('App error digest:', error.digest);
    }
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="h-14 w-14 rounded-full flex items-center justify-center mb-4" style={{ background: 'rgba(239,68,68,0.12)' }}>
        <AlertTriangle className="h-7 w-7 text-red-400" />
      </div>
      <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
      <p className="text-sm text-white/50 max-w-sm mb-6">
        An unexpected error occurred. Your data is safe — please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-[#10B981] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[#059669] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
