
import React from 'react';

interface LoadingSpinnerProps {
  size?: number; // Tailwind size unit e.g. 4 for h-4 w-4
  color?: string; // Tailwind color class e.g. text-blue-500
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ size = 8, color = 'text-primary-400' }) => {
  return (
    <div className={`animate-spin rounded-full h-${size} w-${size} border-t-2 border-b-2 ${color} border-opacity-50`}></div>
  );
};

export default LoadingSpinner;
