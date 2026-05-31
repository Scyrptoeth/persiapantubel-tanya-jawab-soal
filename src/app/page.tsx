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
    initial: { scale: 1, rotate: 0, filter: "drop-shadow(0 0 0px rgba(0,0,0,0))" },
    hover: { 
      scale: 1.2, 
      rotate: [0, -10, 10, 0] as any,
      filter: [
        "drop-shadow(0 0 0px rgba(0,0,0,0))",
        "drop-shadow(0 0 8px rgba(59, 130, 246, 0.5))",
        "drop-shadow(0 0 0px rgba(0,0,0,0))"
      ],
      transition: { 
        rotate: {
          duration: 0.5,
          ease: "easeInOut" as any
        },
        scale: {
          type: "spring" as any,
          stiffness: 400,
          damping: 10
        },
        filter: {
          duration: 1,
          repeat: Infinity
        }
      } 
    }
  };

  const iconBgVariants = {
    initial: { scale: 1, opacity: 1 },
    hover: { 
      scale: [1, 1.05, 1],
      opacity: [1, 0.8, 1],
      transition: { 
        duration: 2,
        repeat: Infinity,
        ease: "easeInOut" as any
      } 
    }
  };

  const LogoTPA = () => (
    <div className="relative flex items-center justify-center">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradTPA" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#991b1b" />
            <stop offset="100%" stopColor="#ef4444" />
          </linearGradient>
          <filter id="glowTPA" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <rect x="5" y="5" width="50" height="50" rx="12" fill="url(#gradTPA)" fillOpacity="0.1" stroke="url(#gradTPA)" strokeWidth="2" />
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="central" 
          textAnchor="middle" 
          fill="url(#gradTPA)" 
          fontSize="18" 
          fontWeight="900" 
          fontFamily="sans-serif"
          filter="url(#glowTPA)"
          style={{ letterSpacing: '1px' }}
        >
          TPA
        </text>
      </svg>
    </div>
  );

  const LogoTBI = () => (
    <div className="relative flex items-center justify-center">
      <svg width="60" height="60" viewBox="0 0 60 60" fill="none" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="gradTBI" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#f59e0b" />
          </linearGradient>
          <filter id="glowTBI" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>
        <rect x="5" y="5" width="50" height="50" rx="12" fill="url(#gradTBI)" fillOpacity="0.1" stroke="url(#gradTBI)" strokeWidth="2" />
        <text 
          x="50%" 
          y="50%" 
          dominantBaseline="central" 
          textAnchor="middle" 
          fill="url(#gradTBI)" 
          fontSize="18" 
          fontWeight="900" 
          fontFamily="sans-serif"
          filter="url(#glowTBI)"
          style={{ letterSpacing: '1px' }}
        >
          TBI
        </text>
      </svg>
    </div>
  );

  return (
    <main className="min-h-dvh flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-paper text-forest">
      {/* Background decoration with subtle premium tint */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 0.4, scale: 1 }}
           transition={{ duration: 2, ease: "easeOut" }}
           className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-forest/5 rounded-full blur-[120px]" 
         />
         <motion.div 
           initial={{ opacity: 0, scale: 0.8 }}
           animate={{ opacity: 0.4, scale: 1 }}
           transition={{ duration: 2, delay: 0.5, ease: "easeOut" }}
           className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-gold/10 rounded-full blur-[120px]" 
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
              className="text-4xl md:text-7xl font-black tracking-tight text-balance text-forest pb-2"
            >
              Platform Tutor <motion.span 
                initial={{ color: "inherit" }}
                animate={{ color: "#d4af37" }}
                transition={{ delay: 1.5, duration: 1 }}
                className="text-gold"
              >
                Persiapantubel
              </motion.span>
            </motion.h1>
          </div>
          <motion.p 
            variants={blurFadeVariants}
            className="text-lg md:text-xl text-[#45544e] max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Pilih jalur pembelajaran Anda. Asisten AI kami siap membantu memecahkan dan memahami setiap soal dengan penjelasan yang komprehensif.
          </motion.p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Card TPA */}
          <motion.div variants={cardVariantsLeft}>
            <Link href="/tpa" className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/50 rounded-3xl">
              <motion.div 
                variants={cardHoverVariants}
                whileHover="hover"
                initial="initial"
                className="relative h-full flex flex-col items-center p-10 bg-white rounded-3xl border border-forest/10 shadow-premium transition-all duration-300 hover:shadow-premium-lg hover:border-gold/30"
              >
                <motion.div 
                  variants={iconBgVariants}
                  className="w-20 h-20 mb-8 rounded-2xl bg-forest/5 flex items-center justify-center text-forest shadow-inner"
                >
                  <motion.div variants={iconVariants}>
                    <LogoTPA />
                  </motion.div>
                </motion.div>
                <h2 className="text-2xl font-black text-forest mb-4 uppercase tracking-wide">Tanya Jawab TPA</h2>
                <p className="text-[#45544e] text-center mb-8 grow font-medium leading-relaxed">
                  Fokus pada penalaran logis, numerikal, dan verbal. Dapatkan pembahasan langkah demi langkah untuk setiap tipe soal TPA.
                </p>
                <div className="flex items-center text-forest font-black uppercase text-xs tracking-widest bg-forest/5 px-4 py-2 rounded-full group-hover:bg-gold group-hover:text-black transition-colors">
                  Mulai Belajar TPA
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRight className="ml-2 w-4 h-4" />
                  </motion.div>
                </div>
              </motion.div>
            </Link>
          </motion.div>

          {/* Card TBI */}
          <motion.div variants={cardVariantsRight}>
            <Link href="/tbi" className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-gold/50 rounded-3xl">
              <motion.div 
                variants={cardHoverVariants}
                whileHover="hover"
                initial="initial"
                className="relative h-full flex flex-col items-center p-10 bg-white rounded-3xl border border-forest/10 shadow-premium transition-all duration-300 hover:shadow-premium-lg hover:border-gold/30"
              >
                <motion.div 
                  variants={iconBgVariants}
                  className="w-20 h-20 mb-8 rounded-2xl bg-forest/5 flex items-center justify-center text-forest shadow-inner"
                >
                  <motion.div variants={iconVariants}>
                    <LogoTBI />
                  </motion.div>
                </motion.div>
                <h2 className="text-2xl font-black text-forest mb-4 uppercase tracking-wide">Tanya Jawab TBI</h2>
                <p className="text-[#45544e] text-center mb-8 grow font-medium leading-relaxed">
                  Tingkatkan kemampuan Bahasa Inggris Anda dengan analisis grammar mendalam dan strategi menjawab soal TBI secara efektif.
                </p>
                <div className="flex items-center text-forest font-black uppercase text-xs tracking-widest bg-forest/5 px-4 py-2 rounded-full group-hover:bg-gold group-hover:text-black transition-colors">
                  Mulai Belajar TBI
                  <motion.div
                    animate={{ x: [0, 5, 0] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: "easeInOut" }}
                  >
                    <ArrowRight className="ml-2 w-4 h-4" />
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
