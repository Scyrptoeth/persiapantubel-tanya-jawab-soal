"use client";

import Link from "next/link";
import { ArrowRight, BrainCircuit, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

export default function Home() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.15,
        delayChildren: 0.2,
      },
    },
  };

  const revealVariants = {
    hidden: { y: "100%" },
    visible: {
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as any,
      },
    },
  };

  const blurFadeVariants = {
    hidden: { opacity: 0, filter: "blur(10px)", y: 10 },
    visible: {
      opacity: 1,
      filter: "blur(0px)",
      y: 0,
      transition: {
        duration: 1.2,
        ease: [0.16, 1, 0.3, 1] as any,
      },
    },
  };

  const cardVariantsLeft = {
    hidden: { opacity: 0, x: -30, y: 20 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as any,
      },
    },
  };

  const cardVariantsRight = {
    hidden: { opacity: 0, x: 30, y: 20 },
    visible: {
      opacity: 1,
      x: 0,
      y: 0,
      transition: {
        duration: 0.8,
        ease: [0.16, 1, 0.3, 1] as any,
      },
    },
  };

  const cardHoverVariants = {
    initial: { y: 0, shadow: "0 1px 2px 0 rgb(0 0 0 / 0.05)" },
    hover: { 
      y: -8, 
      transition: { 
        duration: 0.4, 
        ease: [0.16, 1, 0.3, 1] as any 
      } 
    }
  };

  const iconVariants = {
    initial: { scale: 1, rotate: 0 },
    hover: { 
      scale: 1.15, 
      rotate: 5,
      transition: { 
        duration: 0.3, 
        ease: "easeOut" as any 
      } 
    }
  };

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-[var(--background)]">
      {/* Background decoration with subtle animation */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 0.6, scale: 1 }}
           transition={{ duration: 2, ease: "easeOut" }}
           className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[120px]" 
         />
         <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 0.6, scale: 1 }}
           transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
           className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-[120px]" 
         />
      </div>

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="z-10 max-w-4xl w-full text-center space-y-12"
      >
        <div className="space-y-6">
          <div className="overflow-hidden">
            <motion.h1 
              variants={revealVariants}
              className="text-4xl md:text-6xl font-extrabold tracking-tight text-balance text-slate-900 dark:text-white pb-2"
            >
              Platform Tutor <motion.span 
                initial={{ color: "inherit" }}
                animate={{ color: "var(--blue-600)" }}
                transition={{ delay: 1.5, duration: 1 }}
                className="text-blue-600 dark:text-blue-400"
              >
                Persiapantubel
              </motion.span>
            </motion.h1>
          </div>
          <motion.p 
            variants={blurFadeVariants}
            className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed"
          >
            Pilih jalur pembelajaran Anda. Asisten AI kami siap membantu memecahkan dan memahami setiap soal dengan penjelasan yang komprehensif.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Card TPA */}
          <motion.div variants={cardVariantsLeft}>
            <Link href="/tpa" className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 rounded-3xl">
              <motion.div 
                variants={cardHoverVariants}
                whileHover="hover"
                initial="initial"
                className="relative h-full flex flex-col items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                <motion.div 
                  variants={iconVariants}
                  className="w-16 h-16 mb-6 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400"
                >
                  <BrainCircuit className="w-8 h-8" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Tanya Jawab TPA</h2>
                <p className="text-slate-600 dark:text-slate-400 text-center mb-6 grow">
                  Fokus pada penalaran logis, numerikal, dan verbal. Dapatkan pembahasan langkah demi langkah untuk setiap tipe soal TPA.
                </p>
                <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                  Mulai Belajar TPA
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </motion.div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Card TBI */}
          <motion.div variants={cardVariantsRight}>
            <Link href="/tbi" className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50 rounded-3xl">
              <motion.div 
                variants={cardHoverVariants}
                whileHover="hover"
                initial="initial"
                className="relative h-full flex flex-col items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-shadow duration-300 hover:shadow-xl"
              >
                <motion.div 
                  variants={iconVariants}
                  className="w-16 h-16 mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400"
                >
                  <GraduationCap className="w-8 h-8" />
                </motion.div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Tanya Jawab TBI</h2>
                <p className="text-slate-600 dark:text-slate-400 text-center mb-6 grow">
                  Tingkatkan kemampuan Bahasa Inggris Anda dengan analisis grammar mendalam dan strategi menjawab soal TBI secara efektif.
                </p>
                <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                  Mulai Belajar TBI
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRight className="ml-2 w-5 h-5" />
                  </motion.div>
                </div>
              </motion.div>
            </Link>
          </motion.div>
        </div>
      </motion.div>
    </main>

  );
}
