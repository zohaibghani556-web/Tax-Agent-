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
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] px-4 text-center">
      <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
        <AlertTriangle className="h-7 w-7 text-red-500" />
      </div>
      <h2 className="text-xl font-bold text-[var(--text-primary)] mb-2">Something went wrong</h2>
      <p className="text-sm text-[var(--text-secondary)] max-w-sm mb-6">
        An unexpected error occurred. Your data is safe — please try again.
      </p>
      <button
        onClick={reset}
        className="rounded-full bg-[var(--emerald)] px-6 py-2.5 text-sm font-semibold text-white hover:bg-[var(--emerald-dark)] transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
