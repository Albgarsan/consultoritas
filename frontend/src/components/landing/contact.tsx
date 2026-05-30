'use client';

import { useRef } from 'react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { MapPin, Mail, MessageSquare, Clock, ExternalLink } from 'lucide-react';

export function ContactSection() {
  const ref = useRef<HTMLElement>(null);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start'],
  });

  const sectionOpacity = useTransform(
    scrollYProgress,
    [0, 0.12, 0.5, 0.88, 1],
    [0, 1, 1, 1, 0],
  );
  const sectionY = useTransform(scrollYProgress, [0, 0.5, 1], [28, 0, -28]);

  return (
    <motion.section
      ref={ref}
      id="contact"
      style={{ opacity: sectionOpacity, y: sectionY }}
      className="bg-slate-50 px-4 py-32"
    >
      <div className="mx-auto max-w-7xl">

        {/* Cabecera de sección */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          className="mb-20 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-3">
            <span className="h-px w-8 bg-[#173d77]/25" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#173d77]">
              Presencia Física
            </h2>
            <span className="h-px w-8 bg-[#173d77]/25" />
          </div>
          <h3
            className="text-4xl font-light tracking-tight text-slate-900"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Tu despacho en{' '}
            <span className="font-semibold text-[#173d77]">Sevilla Este</span>
          </h3>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-5">

          {/* ── CTA card (fondo azul corporativo) ── */}
          <motion.div
            initial={{ opacity: 0, x: -28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            className="relative flex flex-col justify-between overflow-hidden rounded-[2rem] bg-[#173d77] p-10 text-white shadow-[0_32px_90px_-44px_rgba(23,61,119,0.55)] lg:col-span-2"
          >
            {/* Glow interno */}
            <div
              aria-hidden
              className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-sky-400/15 blur-3xl"
            />
            {/* Segundo glow inferior */}
            <div
              aria-hidden
              className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-[#0a1128]/40 blur-3xl"
            />

            {/* Contenido superior */}
            <div className="relative z-10 space-y-8">
              <div>
                <h4
                  className="text-3xl font-light"
                  style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                >
                  ¿Hablamos?
                </h4>
                <p className="mt-2 text-sm font-light text-slate-300">
                  Respuestas en menos de 24 horas.
                </p>
              </div>

              <div className="space-y-3">
                {/*
                  ✅ BUG FIX: botón WhatsApp ahora usa fondo BLANCO con texto azul
                  (antes era bg-[#173d77] sobre bg-[#173d77] = invisible)
                */}
                <a
                  href="https://wa.me/34954123456"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-[0.85rem] bg-white text-sm font-semibold text-[#173d77] shadow-[0_12px_30px_-18px_rgba(0,0,0,0.35)] transition-all duration-200 hover:bg-slate-50 hover:shadow-[0_14px_34px_-18px_rgba(0,0,0,0.4)]"
                >
                  <MessageSquare className="size-4" strokeWidth={2} />
                  WhatsApp Directo
                </a>

                {/* Botón email: outline sobre fondo azul */}
                <a
                  href="mailto:info@consultoritas.es"
                  className="flex h-14 w-full items-center justify-center gap-3 rounded-[0.85rem] border border-white/22 text-sm text-white transition-colors hover:bg-white/8"
                >
                  <Mail className="size-4" strokeWidth={1.5} />
                  Enviar Documentación
                </a>
              </div>
            </div>

            {/* Datos de contacto inferiores */}
            <div className="relative z-10 mt-12 space-y-4 border-t border-white/12 pt-8 text-sm font-light text-slate-300">
              <div className="flex items-start gap-3">
                <MapPin className="mt-0.5 size-4 shrink-0 text-white/60" strokeWidth={1.5} />
                <p>
                  Calle Dr. González Caraballo, 1<br />
                  Planta 1 – Módulo 19 · 41020 Sevilla
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="size-4 shrink-0 text-white/60" strokeWidth={1.5} />
                <p>L–J: 09:00–18:00 · V: 09:00–14:00</p>
              </div>
            </div>
          </motion.div>

          {/* ── Mapa ── */}
          <motion.div
            initial={{ opacity: 0, x: 28 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: false, amount: 0.25 }}
            transition={{ delay: 0.18 }}
            className="relative min-h-[420px] overflow-hidden rounded-[2rem] border border-slate-200 bg-slate-100 p-2 lg:col-span-3"
          >
            <iframe
              src="https://www.google.com/maps?q=Consultoritas+Asesores+de+Negocio,+Calle+Dr.+Gonz%C3%A1lez+Caraballo,+1,+41020+Sevilla&ll=37.4007484,-5.9245838&z=17&output=embed"
              width="100%"
              height="100%"
              style={{ border: 0, borderRadius: '1.5rem', minHeight: '400px' }}
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              title="Ubicación Consultoritas Sevilla Este"
            />
          </motion.div>
        </div>
      </div>
    </motion.section>
  );
}
