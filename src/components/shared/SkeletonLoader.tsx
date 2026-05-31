"use client";

import { motion } from "framer-motion";

export function SkeletonLoader() {
  const containerVariants = {
    visible: {
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 5 },
    visible: { 
      opacity: [0.3, 0.6, 0.3], 
      y: 0,
      transition: {
        opacity: {
          repeat: Infinity,
          duration: 1.5,
          ease: "easeInOut",
        },
        duration: 0.4,
        ease: [0.16, 1, 0.3, 1] as any,
      }
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-4 w-full"
    >
      <div className="flex flex-col gap-3">
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-3/4" />
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-full" />
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-5/6" />
      </div>
      
      <div className="flex flex-col gap-3 pt-2">
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-full" />
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-2/3" />
      </div>

      <div className="flex flex-col gap-3 pt-2">
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-4/5" />
        <motion.div variants={itemVariants} className="h-4 bg-forest/5 rounded-md w-full" />
      </div>
    </motion.div>
  );
}
