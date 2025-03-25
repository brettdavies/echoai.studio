import React from 'react';
import { Button } from '../ui/button';

interface ErrorDisplayProps {
  error: string;
  onRetry: () => void;
  className?: string;
}

/**
 * Component to display player errors and provide retry option
 */
const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
  error,
  onRetry,
  className = '',
}) => {
  return (
    <div className={`w-full mx-auto rounded-lg bg-black/40 p-4 shadow-lg ${className}`}>
      <div className="text-center text-red-500 py-4">
        <p>{error}</p>
        <p className="mt-2 text-sm text-white/70">
          The MPD stream couldn't be played. Please try again.
        </p>
        <Button 
          variant="outline" 
          size="sm"
          onClick={onRetry}
          className="mt-4 bg-slate-800 hover:bg-slate-700 text-white border-none"
        >
          Retry Connection
        </Button>
      </div>
    </div>
  );
};

export default ErrorDisplay; 