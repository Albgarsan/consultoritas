'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Fingerprint, Cpu, ShieldCheck, Star } from 'lucide-react';

export function AboutSection() {
  const ref = useRef<HTMLDivElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  /* Fade-in/out de la sección completa */
  const sectionOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.5, 0.88, 1],
    [0, 1, 1, 1, 0],
  );
  const sectionY = useTransform(scrollYProgress, [0, 0.5, 1], [28, 0, -28]);

  /* Parallax de la imagen */
  const yImage = useTransform(scrollYProgress, [0, 1], ['-10%', '10%']);

  /* Marca de agua animada */
  const brandOpacity = useTransform(scrollYProgress, [0, 0.65, 1], [0, 0.9, 1]);
  const brandScale   = useTransform(scrollYProgress, [0, 1],       [0.88, 1.02]);

  const PILLARS = [
    { icon: Fingerprint, title: 'Trato Humano',   desc: 'No eres un CIF. Eres nuestro socio estratégico.' },
    { icon: Cpu,         title: 'Precisión Total', desc: 'La IA audita, pero nuestros expertos firman.'   },
  ] as const;

  return (
    <motion.section
      ref={ref}
      id="about"
      style={{ opacity: sectionOpacity, y: sectionY }}
      className="relative overflow-hidden bg-slate-50 px-4 py-32"
    >
      {/* Glow difuso de fondo */}
      <div
        aria-hidden
        className="pointer-events-none absolute left-1/2 top-1/2 h-[540px] w-[1200px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl"
        style={{
          background:
            'radial-gradient(ellipse, rgba(23,61,119,0.05) 0%, transparent 70%)',
        }}
      />

      {/* Marca de agua gigante */}
      <motion.div
        aria-hidden
        // style={{ opacity: brandOpacity, scale: brandScale }}
        className="pointer-events-none absolute left-1/2 top-1/2 z-0 -translate-x-1/2 -translate-y-1/2 select-none whitespace-nowrap text-[11vw] font-black tracking-tighter text-[#173d77]/[0.05]"
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          // @ts-ignore — framer-motion style merge
          opacity: brandOpacity,
          scale: brandScale,
        }}
      >
        CONSULTORITAS
      </motion.div>

      <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-16 lg:grid-cols-2">

        {/* ── Imagen con parallax ── */}
        <motion.div
          initial={{ opacity: 0, x: -40 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          transition={{ duration: 0.85, ease: 'easeOut' }}
          className="relative"
        >
          <div className="relative aspect-[4/5] overflow-hidden rounded-[2rem] border border-slate-200 shadow-[0_32px_90px_-44px_rgba(23,61,119,0.28)] md:h-[600px]">
            <motion.img
              style={{ y: yImage, scale: 1.12 }}
              src="https://images.unsplash.com/photo-1520607162513-77705c0f0d4a?q=80&w=1400&auto=format&fit=crop"
              alt="Equipo de Consultoritas en Sevilla Este"
              className="h-full w-full object-cover"
            />
            {/* Overlay muy sutil para suavizar bordes de la imagen */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 rounded-[2rem]"
              style={{
                boxShadow: 'inset 0 0 60px 8px rgba(248,250,252,0.12)',
              }}
            />
          </div>

          {/* Badge inferior derecha — legado */}
          <div className="absolute -bottom-8 -right-4 z-20 flex items-center gap-5 rounded-[2rem] border border-white/80 bg-white px-7 py-5 shadow-[0_22px_60px_-28px_rgba(23,61,119,0.22)] md:-right-8">
            <div className="flex size-14 shrink-0 items-center justify-center rounded-full bg-[#173d77]/8">
              <ShieldCheck className="size-7 text-[#173d77]" strokeWidth={1.5} />
            </div>
            <div>
              <p className="text-2xl font-light text-slate-900">
                +30<span className="font-bold text-[#173d77]"> años</span>
              </p>
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-400">
                De legado en Sevilla Este
              </p>
            </div>
          </div>

          {/* Badge superior izquierda — valoración */}
          <div className="absolute -left-4 -top-5 z-20 flex items-center gap-3 rounded-[1.25rem] border border-white/80 bg-white px-5 py-3.5 shadow-[0_16px_44px_-20px_rgba(23,61,119,0.18)] md:-left-8">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-amber-50">
              <Star className="size-5 fill-amber-400 text-amber-400" strokeWidth={1} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-800">5.0 · Google</p>
              <p className="text-[10px] text-slate-400">+120 reseñas verificadas</p>
            </div>
          </div>
        </motion.div>

        {/* ── Texto ── */}
        <div className="mt-12 space-y-10 lg:mt-0 lg:pl-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7 }}
          >
            <h2 className="mb-4 flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.28em] text-[#173d77]">
              <span className="h-px w-6 bg-[#173d77]" />
              Nuestra Esencia
            </h2>
            <h3
              className="text-balance text-4xl font-light leading-tight tracking-tight text-slate-900 md:text-5xl"
              style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
            >
              Legado familiar,{' '}
              <br />
              <span className="font-semibold text-[#173d77]">arquitectura del futuro.</span>
            </h3>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.1 }}
            className="text-lg font-light leading-relaxed text-slate-500"
          >
            Lo que nació como un despacho local en Sevilla Este ha evolucionado hacia un
            centro de alto rendimiento fiscal. Combinamos tres décadas de experiencia
            jurídica con modelos avanzados de Inteligencia Artificial.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="grid gap-8 border-t border-slate-200 pt-8 sm:grid-cols-2"
          >
            {PILLARS.map((item) => (
              <div key={item.title} className="group flex flex-col gap-4">
                <div className="flex size-12 items-center justify-center rounded-xl border border-blue-100/60 bg-blue-50/60 transition-colors duration-300 group-hover:bg-blue-100">
                  <item.icon className="size-5 text-[#173d77]" strokeWidth={1.5} />
                </div>
                <div>
                  <h4 className="mb-1.5 font-semibold text-slate-900">{item.title}</h4>
                  <p className="text-sm leading-relaxed text-slate-500">{item.desc}</p>
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
