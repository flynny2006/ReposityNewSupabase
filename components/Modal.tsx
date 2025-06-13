import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children, size = 'md' }) => {
  const [isMounted, setIsMounted] = useState(false);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);
      // Timeout to allow the component to mount with initial (invisible) styles
      // then trigger the transition to visible styles.
      const fadeInTimer = setTimeout(() => {
        setShowContent(true);
      }, 20); // A small delay ensures transition occurs
      return () => clearTimeout(fadeInTimer);
    } else {
      setShowContent(false); // Trigger fade-out animation
      // Timeout to allow fade-out animation to complete before unmounting
      const fadeOutTimer = setTimeout(() => {
        setIsMounted(false);
      }, 300); // This duration should match the transition duration
      return () => clearTimeout(fadeOutTimer);
    }
  }, [isOpen]);

  if (!isMounted) return null;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black transition-opacity duration-300 ease-in-out 
                  ${showContent ? 'bg-opacity-75' : 'bg-opacity-0 pointer-events-none'}`}
      onClick={onClose} // Close modal on backdrop click
    >
      <div 
        className={`bg-gray-800 rounded-lg shadow-xl p-6 m-4 w-full ${sizeClasses[size]} transform transition-all duration-300 ease-out 
                    ${showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-95'}`}
        onClick={(e) => e.stopPropagation()} // Prevent modal close when clicking inside content
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-semibold text-gray-100">{title}</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-200 transition-colors"
            aria-label="Close modal"
          >
            <X size={24} />
          </button>
        </div>
        <div>{children}</div>
      </div>
      {/* The <style jsx global> block and 'animate-modal-pop' class were removed to fix the error and use Tailwind for animations. */}
    </div>
  );
};

export default Modal;