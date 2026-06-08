'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/landing/header';
import { HeroSection } from '../components/landing/hero';
import { ConsultoritasLogo } from '@/components/layout/logo';
import { TeamSection } from '@/components/landing/team';
import { ContactSection } from '@/components/landing/contact';
import { AboutSection } from '@/components/landing/about';
import { AppointmentModal } from '@/components/shared/modals/appointment-modal';
import { ServicesModal } from '@/components/shared/modals/services-modal';
import { Calculator, Briefcase, Scale, Gavel, Users, HeartHandshake } from 'lucide-react';
import { motion, useScroll, useTransform } from 'framer-motion';
import { PublicChatWidget } from '@/components/shared/ai-chat';

export default function LandingPage() {
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const [servicesModalOpen, setServicesModalOpen] = useState(false);
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const router = useRouter();
  const servicesRef = useRef<HTMLElement>(null);

  const { scrollYProgress: servicesProgress } = useScroll({
    target: servicesRef,
    offset: ["start end", "end start"],
  });

  const servicesOpacity = useTransform(servicesProgress, [0, 0.15, 0.5, 0.85, 1], [0, 1, 1, 1, 0]);
  const servicesY = useTransform(servicesProgress, [0, 0.5, 1], [24, 0, -24]);

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const bentoItems = [
    { icon: Calculator, title: 'Asesoría Contable', desc: 'Para conocer el estado real de su empresa necesita llevar al día la contabilidad buscando la mejora continua.', colSpan: 'lg:col-span-2' },
    { icon: Scale, title: 'Asesoría Fiscal', desc: 'Asesoramiento fiscal especializado frente a un sistema legislativo sometido a cambios constantes.', colSpan: 'lg:col-span-1' },
    { icon: Gavel, title: 'Asesoría Jurídica', desc: 'Resolución de asuntos de índole jurídica con los mejores profesionales del sector.', colSpan: 'lg:col-span-1' },
    { icon: Briefcase, title: 'Asesoría Laboral', desc: 'Soluciones y obligaciones legales laborales propias de las necesidades de cada negocio.', colSpan: 'lg:col-span-2' },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-slate-50 to-white font-sans text-slate-900 selection:bg-blue-900/20">
      <Header onNavigate={handleNavigate} onAccessClick={() => router.push('/login')} />
      <HeroSection onAppointmentClick={() => setAppointmentModalOpen(true)} />
      <AboutSection />

      {/* Bento Grid Services - Estilo unificado */}
      <motion.section ref={servicesRef} id="services" style={{ opacity: servicesOpacity, y: servicesY }} className="relative overflow-hidden bg-slate-50 px-4 py-32">
        <div className="max-w-7xl mx-auto">

          <motion.div
            initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.3 }}
            transition={{ duration: 0.7, ease: "easeOut" }} className="text-center mb-20"
          >
            <div className="mb-4 inline-flex items-center gap-3">
              <span className="h-px w-8 bg-blue-900/30"></span>
              <h2 className="text-[10px] font-bold uppercase tracking-[0.25em] text-[#173d77]">Equipo y servicio</h2>
              <span className="h-px w-8 bg-blue-900/30"></span>
            </div>
            <h3 className="text-balance text-4xl font-light tracking-tight text-slate-900 md:text-5xl">
              Plataforma <span className="font-semibold text-[#173d77]">humana</span>
            </h3>
          </motion.div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {bentoItems.map((s, i) => (
              <motion.div
                key={s.title}
                onClick={() => {
                  setSelectedService(s.title);
                  setServicesModalOpen(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSelectedService(s.title);
                    setServicesModalOpen(true);
                  }
                }}
                role="button"
                tabIndex={0}
                initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: false, amount: 0.25 }}
                transition={{ duration: 0.5, delay: i * 0.1 }}
                className={`group relative overflow-hidden rounded-[2rem] border border-slate-200/70 bg-white p-10 transition-all duration-500 cursor-pointer hover:shadow-lg hover:-translate-y-1 ${s.colSpan}`}
              >

                <div className="mb-6 flex size-12 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 text-[#173d77] transition-colors duration-300 group-hover:bg-blue-50">
                  <s.icon className="size-5" strokeWidth={1.5} />
                </div>
                <h4 className="mb-3 text-2xl font-medium tracking-tight text-slate-900">{s.title}</h4>
                <p className="text-sm font-light leading-relaxed text-slate-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </motion.section>

      <TeamSection />
      <ContactSection />

      {/* Footer Premium y Corporativo */}
      <footer className="relative overflow-hidden bg-[#173d77] px-4 pt-24 pb-12 text-white">
        {/* Marca de agua elegante */}
        <div className="pointer-events-none absolute -bottom-24 -right-12 select-none text-[200px] leading-none font-black tracking-tighter text-white/[0.03] md:text-[280px]">
            CONSULTORITAS
        </div>

        <div className="relative z-10 mx-auto grid max-w-7xl gap-12 border-b border-white/10 pb-16 md:grid-cols-12">
          <div className="md:col-span-5 pr-8">
            <div className="mb-6 w-max">
              <ConsultoritasLogo variant="full" lightText={true} />
            </div>
            <p className="text-slate-400 text-sm leading-relaxed max-w-sm mb-8 font-light">
              Tradición en Sevilla Este, tecnología de vanguardia. Protegemos el presente de tu empresa e impulsamos su futuro financiero.
            </p>
          </div>

          <div className="md:col-span-2 md:col-start-8">
            <h6 className="font-semibold uppercase text-[10px] tracking-[0.2em] text-sky-200 mb-6">Servicios</h6>
            <ul className="space-y-4 text-sm text-slate-300 font-light">
              <li className="hover:text-white cursor-pointer transition-colors">Equipo de asesores</li>
              <li className="hover:text-white cursor-pointer transition-colors">Atención personalizada</li>
              <li className="hover:text-white cursor-pointer transition-colors">Seguimiento continuo</li>
            </ul>
          </div>

          <div className="md:col-span-3">
            <h6 className="font-semibold uppercase text-[10px] tracking-[0.25em] text-sky-200 mb-6">Sede Central</h6>
            <p className="text-sm text-slate-300 leading-relaxed mb-4 font-light">
              Calle Dr. González Caraballo, 1, planta 1 - modulo 19<br/>
              41020 Sevilla
            </p>
            <a href="mailto:consultoritas.app@gmail.com" className="text-sm text-white font-medium hover:text-blue-300 transition-colors">consultoritas.app@gmail.com</a>
          </div>
        </div>

        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between pt-8 text-xs font-light text-slate-500 md:flex-row">
          <p>© {new Date().getFullYear()} Consultoritas S.L. — Todos los derechos reservados.</p>
          <div className="flex gap-6 mt-4 md:mt-0">
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Aviso Legal</span>
              <span className="hover:text-slate-300 cursor-pointer transition-colors">Privacidad</span>
          </div>
        </div>
      </footer>

      <AppointmentModal open={appointmentModalOpen} onOpenChange={setAppointmentModalOpen} />
      <ServicesModal open={servicesModalOpen} onOpenChange={setServicesModalOpen} serviceTitle={selectedService} />
      <PublicChatWidget />
    </div>
  );
}
