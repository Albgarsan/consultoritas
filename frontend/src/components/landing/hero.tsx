'use client';

/**
 * FUENTE RECOMENDADA — añade esto a tu layout.tsx para máximo impacto:
 *
 * import { Playfair_Display, DM_Sans } from 'next/font/google'
 * const playfair = Playfair_Display({ subsets: ['latin'], variable: '--font-display', display: 'swap' })
 * const dm = DM_Sans({ subsets: ['latin'], variable: '--font-sans', display: 'swap' })
 *
 * En tailwind.config.ts → extend.fontFamily:
 *   display: ['var(--font-display)', 'Georgia', 'serif']
 *   sans:    ['var(--font-sans)', 'system-ui', 'sans-serif']
 *
 * Luego usa className="font-display" en los h1/h2.
 * Mientras tanto, este archivo usa style={{ fontFamily: ... }} como drop-in.
 */

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Calendar, ArrowDownRight, Shield } from 'lucide-react';
import { ConsultoritasLogo } from '@/components/layout/logo';

const STAGGER = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.13, delayChildren: 0.06 },
  },
};

const ITEM = {
  hidden: { opacity: 0, y: 28 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.78, ease: [0.22, 1, 0.36, 1] as const },
  },
};

const METRICS = [
  { v: '+30', l: 'Años de trayectoria' },
  { v: '+500', l: 'Empresas asesoradas' },
  { v: '100%', l: 'Trato personalizado' },
] as const;

export function HeroSection({ onAppointmentClick }: { onAppointmentClick: () => void }) {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start start', 'end start'],
  });

  const opacity = useTransform(scrollYProgress, [0, 0.72], [1, 0]);
  const y = useTransform(scrollYProgress, [0, 1], [0, -44]);

  return (
    <motion.section
      ref={ref}
      id="hero"
      style={{ opacity, y }}
      className="relative min-h-screen overflow-hidden bg-white px-4 pb-24 pt-36"
    >
      {/* ── Fondo: rejilla sutil de marca ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-0"
        style={{
          backgroundImage: `
            linear-gradient(rgba(23,61,119,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(23,61,119,0.03) 1px, transparent 1px)
          `,
          backgroundSize: '64px 64px',
        }}
      />

      {/* ── Halo de luz centrado ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-0 z-0 h-[580px] w-[1100px] -translate-x-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse, rgba(23,61,119,0.07) 0%, rgba(14,165,233,0.04) 42%, transparent 70%)',
        }}
      />

      {/* ── C monograma decorativo de marca ── */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-20 top-1/2 z-0 -translate-y-1/2 select-none text-[460px] font-black leading-none text-[#173d77]/[0.033]"
        style={{ fontFamily: "'Playfair Display', Georgia, serif", lineHeight: 1 }}
      >
        C
      </div>

      {/* ── Contenido principal ── */}
      <motion.div
        variants={STAGGER}
        initial="hidden"
        animate="show"
        className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-[1.08fr_0.92fr]"
      >
        {/* Columna texto */}
        <div>
          {/* Titular serif */}
          <motion.h1
            variants={ITEM}
            className="text-balance text-[3.1rem] font-light leading-[1.07] tracking-tight text-slate-900 md:text-[4rem] lg:text-[3.3rem] xl:text-[4rem]"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            La asesoría experta que se{' '}
            <em className="relative font-bold not-italic text-[#173d77]">
              adapta
              <span className="absolute -bottom-1 left-0 h-[2px] w-full rounded-full bg-gradient-to-r from-[#173d77]/80 to-sky-400/60" />
            </em>
            {' '}a tu negocio.
          </motion.h1>

          <motion.p
            variants={ITEM}
            className="mt-7 max-w-[30rem] text-pretty text-[1.05rem] font-light leading-[1.78] text-slate-500"
          >
            Nuestra experiencia nos permite dar un servicio profesional y personalizado. Buscamos el desarrollo de nuestros clientes partiendo de una asistencia de negocio eficiente y un trato cercano.
          </motion.p>

          {/* CTAs */}
          <motion.div
            variants={ITEM}
            className="mt-10 flex flex-col gap-4 sm:flex-row sm:items-center"
          >
            {/* CTA principal con shimmer */}
            <button
              onClick={onAppointmentClick}
              className="group relative inline-flex h-14 items-center justify-center gap-2.5 overflow-hidden rounded-[0.9rem] bg-[#173d77] px-8 text-sm font-semibold text-white shadow-[0_18px_44px_-18px_rgba(23,61,119,0.48)] transition-all duration-300 hover:bg-[#1a4a92] hover:shadow-[0_22px_52px_-18px_rgba(23,61,119,0.58)]"
            >
              <span
                aria-hidden
                className="absolute inset-0 -skew-x-12 translate-x-[-130%] bg-gradient-to-r from-transparent via-white/12 to-transparent transition-transform duration-700 group-hover:translate-x-[130%]"
              />
              <Calendar className="size-4 shrink-0" strokeWidth={1.5} />
              Agendar Cita
            </button>

            <button
              onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })}
              className="inline-flex h-14 items-center gap-2 text-sm font-medium text-slate-400 transition-colors hover:text-[#173d77]"
            >
              Conocer el despacho
              <ArrowDownRight className="size-3.5" strokeWidth={1.5} />
            </button>
          </motion.div>

          {/* Métricas de credibilidad */}
          <motion.div
            variants={ITEM}
            className="mt-12 flex flex-wrap gap-x-10 gap-y-6 border-t border-slate-100 pt-10"
          >
            {METRICS.map((m) => (
              <div key={m.l}>
                <p
                  className="text-[1.8rem] font-bold text-[#173d77]"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  {m.v}
                </p>
                <p className="mt-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">
                  {m.l}
                </p>
              </div>
            ))}
          </motion.div>
        </div>

        {/* Columna imagen — card de marca */}
        <motion.div variants={ITEM} className="relative mx-auto w-full max-w-[520px] lg:ml-auto">
          {/* Glow de fondo */}
          <div
            aria-hidden
            className="absolute inset-8 -z-10 rounded-[3rem] blur-3xl"
            style={{
              background:
                'linear-gradient(135deg, rgba(23,61,119,0.18), rgba(14,165,233,0.09), transparent)',
            }}
          />

          {/* Card principal */}
          <div className="relative overflow-visible rounded-[2.25rem] border border-slate-200/80 bg-white shadow-[0_42px_128px_-52px_rgba(23,61,119,0.38)]">
            {/* Toolbar de la tarjeta */}
            <div className="flex items-center justify-between border-b border-slate-100 px-7 py-5">
              <div className="flex items-center gap-1.5">
                {(['bg-rose-300', 'bg-amber-300', 'bg-emerald-400'] as const).map((c, i) => (
                  <span key={i} className={`size-2.5 rounded-full ${c} opacity-75`} />
                ))}
              </div>
            </div>

            {/* Imagen */}
            <div className="overflow-hidden">
              <motion.img
                src="https://images.unsplash.com/photo-1521737604893-d14cc237f11d?q=80&w=1600&auto=format&fit=crop"
                alt="Equipo profesional Consultoritas"
                className="h-[380px] w-full object-cover"
                whileHover={{ scale: 1.025 }}
                transition={{ duration: 1.1, ease: 'easeOut' }}
              />
            </div>

            {/* Status bar */}
            <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/60 px-7 py-4">
            </div>
          </div>

        </motion.div>
      </motion.div>

      {/* Scroll indicator */}
      <div className="absolute bottom-10 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
        <div className="h-12 w-px rounded-full bg-gradient-to-b from-slate-200 to-transparent" />
        <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-slate-300">Scroll</span>
      </div>
    </motion.section>
  );
}
