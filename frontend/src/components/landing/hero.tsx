'use client';
import { motion } from 'framer-motion';
import { Calendar, Sparkles, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function HeroSection({ onAppointmentClick }: { onAppointmentClick: () => void }) {
  return (
    <section id="hero" className="relative pt-32 pb-20 px-4 bg-gradient-to-br from-slate-50 via-white to-primary/5">
      <div className="max-w-7xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
        <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.8 }}>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-accent/10 text-accent text-xs font-bold uppercase tracking-widest mb-6">
            <Sparkles className="size-3" /> Inteligencia Artificial aplicada
          </div>
          <h1 className="text-5xl lg:text-7xl font-extrabold text-slate-900 leading-[1.1] mb-6 text-balance">
            La asesoría de <span className="text-primary">siempre</span>, ahora <span className="text-accent">inteligente.</span>
          </h1>
          <p className="text-lg text-slate-500 mb-10 max-w-lg leading-relaxed">
            Centraliza tu contabilidad, sube facturas y resuelve dudas 24/7 con nuestro consultor IA.
          </p>
          <div className="flex flex-wrap gap-4">
            <Button size="lg" onClick={onAppointmentClick} className="rounded-xl h-14 px-8 text-md gap-2 shadow-xl shadow-primary/20">
              <Calendar className="size-5" /> Agendar Cita
            </Button>
            <Button
              size="lg"
              variant="outline"
              className="rounded-xl h-14 px-8 border-2"
              onClick={() => document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' })}
            >
              Ver Servicios
            </Button>
          </div>
        </motion.div>
        {/* Imagen Hero */}
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 1 }} className="relative hidden lg:block">
          <img src="https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1000&auto=format&fit=crop" className="rounded-[3rem] shadow-2xl border-8 border-white object-cover h-[550px] w-full" alt="Team" />
        </motion.div>
      </div>
    </section>
  );
}
