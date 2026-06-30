"use client";

import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Caught by Error Boundary:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-red-50 p-4">
      <div className="w-full max-w-2xl rounded-2xl bg-white p-8 shadow-2xl border-2 border-red-500">
        <h2 className="mb-4 text-2xl font-black text-red-600">🚨 Application Crashed!</h2>
        <p className="mb-4 font-bold text-slate-700">Please take a screenshot of this box and send it to the developer:</p>
        
        <div className="mb-6 rounded-xl bg-slate-900 p-4 font-mono text-sm text-red-400 overflow-x-auto whitespace-pre-wrap break-words">
          <strong>Error Message:</strong><br/>
          {error.message || "Unknown error"}
          
          <br/><br/><strong>Stack Trace:</strong><br/>
          {error.stack || "No stack trace available"}
        </div>

        <button
          onClick={() => window.location.href = "/"}
          className="rounded-xl bg-red-600 px-6 py-3 font-bold text-white shadow-lg shadow-red-200 hover:bg-red-700 active:scale-95 transition"
        >
          Go Back Home
        </button>
      </div>
    </div>
  );
}
