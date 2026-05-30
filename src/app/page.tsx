import Link from "next/link";
import { ArrowRight, BrainCircuit, GraduationCap } from "lucide-react";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center p-6 md:p-24 relative overflow-hidden bg-[var(--background)]">
      {/* Background decoration */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
         <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-100 dark:bg-blue-900/20 rounded-full blur-[120px]" />
         <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-emerald-100 dark:bg-emerald-900/20 rounded-full blur-[120px]" />
      </div>

      <div className="z-10 max-w-4xl w-full text-center space-y-12">
        <div className="space-y-6">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-balance text-slate-900 dark:text-white">
            Platform Tutor <span className="text-blue-600 dark:text-blue-400">Persiapantubel</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Pilih jalur pembelajaran Anda. Asisten AI kami siap membantu memecahkan dan memahami setiap soal dengan penjelasan yang komprehensif.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          {/* Card TPA */}
          <Link href="/tpa" className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-blue-500/50 rounded-3xl">
            <div className="relative h-full flex flex-col items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 group-hover:scale-110 transition-transform duration-300">
                <BrainCircuit className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Tanya Jawab TPA</h2>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-6 grow">
                Fokus pada penalaran logis, numerikal, dan verbal. Dapatkan pembahasan langkah demi langkah untuk setiap tipe soal TPA.
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                Mulai Belajar TPA
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </Link>

          {/* Card TBI */}
          <Link href="/tbi" className="group block h-full focus:outline-none focus-visible:ring-4 focus-visible:ring-emerald-500/50 rounded-3xl">
            <div className="relative h-full flex flex-col items-center p-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-300 group-hover:shadow-xl group-hover:-translate-y-1">
              <div className="w-16 h-16 mb-6 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 group-hover:scale-110 transition-transform duration-300">
                <GraduationCap className="w-8 h-8" />
              </div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-3">Tanya Jawab TBI</h2>
              <p className="text-slate-600 dark:text-slate-400 text-center mb-6 grow">
                Tingkatkan kemampuan Bahasa Inggris Anda dengan analisis grammar mendalam dan strategi menjawab soal TBI secara efektif.
              </p>
              <div className="flex items-center text-emerald-600 dark:text-emerald-400 font-medium">
                Mulai Belajar TBI
                <ArrowRight className="ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform duration-300" />
              </div>
            </div>
          </Link>
        </div>
      </div>
    </main>
  );
}
