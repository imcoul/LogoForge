import React from 'react';
import { motion } from 'motion/react';

interface LoadingSkeletonProps {
  className?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({ className = "h-4 w-full" }) => {
  return (
    <motion.div
      initial={{ opacity: 0.5 }}
      animate={{ opacity: 1 }}
      transition={{ repeat: Infinity, duration: 1, repeatType: "reverse", ease: "easeInOut" }}
      className={`bg-neutral-200 dark:bg-zinc-800 rounded-md ${className}`}
    />
  );
};
