'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/landing/header';
import { HeroSection } from '@/components/landing/hero';
import { TeamSection } from '@/components/landing/team';
import { ContactSection } from '@/components/landing/contact';
import { AboutSection } from '@/components/landing/about';
import { AppointmentModal } from '@/components/shared/modals/appointment-modal';
import { Calculator, Briefcase, Scale, Gavel } from 'lucide-react';
import { motion } from 'framer-motion';
import { ChatWidget } from '@/components/shared/chat-widget';

export default function LandingPage() {
  const [appointmentModalOpen, setAppointmentModalOpen] = useState(false);
  const router = useRouter();

  const handleNavigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' });
  };

  const services = [
    { icon: Calculator, title: 'Asesoría Fiscal', desc: 'Impuestos, IVA y planificación trimestral.' },
    { icon: Briefcase, title: 'Asesoría Laboral', desc: 'Nóminas, contratos y seguridad social.' },
    { icon: Scale, title: 'Asesoría Contable', desc: 'Balances, cuentas anuales y libros oficiales.' },
    { icon: Gavel, title: 'Asesoría Judicial', desc: 'Defensa legal y representación en tribunales.' },
  ];

  return (
    <div className="min-h-screen bg-white font-sans selection:bg-accent/30">
      <Header onNavigate={handleNavigate} onAccessClick={() => router.push('/login')} />

      <HeroSection onAppointmentClick={() => setAppointmentModalOpen(true)} />

      <AboutSection />

      {/* Services con Estética Card Premium */}
      <section id="services" className="py-24 px-4 bg-gradient-to-b from-white to-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-sm font-bold text-primary tracking-[0.3em] uppercase mb-2">Servicios 360º</h2>
            <h3 className="text-4xl font-bold text-slate-900">Soluciones para tu empresa</h3>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {services.map((s, i) => (
              <motion.div
                key={s.title}
                whileHover={{ y: -10 }}
                className="bg-white p-8 rounded-[2rem] border border-slate-100 shadow-sm hover:shadow-2xl transition-all"
              >
                <div className="size-14 bg-accent/10 text-accent rounded-2xl flex items-center justify-center mb-6">
                  <s.icon className="size-7" />
                </div>
                <h4 className="text-xl font-bold mb-3 text-slate-900">{s.title}</h4>
                <p className="text-sm text-slate-500 leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <TeamSection />

      <ContactSection />

      {/* Footer corporativo elegante */}
      <footer className="bg-slate-950 text-white py-20 px-4">
        <div className="max-w-7xl mx-auto grid md:grid-cols-4 gap-12 border-b border-white/5 pb-16">
          <div className="col-span-2">
            <h5 className="text-2xl font-bold mb-6">Consultoritas</h5>
            <p className="text-slate-400 max-w-sm">
              Llevamos más de 30 años ofreciendo soluciones legales y fiscales de alta fidelidad en el corazón de Sevilla Este.
            </p>
          </div>
          <div>
            <h6 className="font-bold uppercase text-xs tracking-widest text-accent mb-6">Legal</h6>
            <ul className="space-y-4 text-sm text-slate-400">
              <li>Aviso Legal</li>
              <li>Privacidad</li>
              <li>Cookies</li>
            </ul>
          </div>
          <div>
            <h6 className="font-bold uppercase text-xs tracking-widest text-accent mb-6">Contacto</h6>
            <p className="text-sm text-slate-400">info@consultoritas.es</p>
            <p className="text-sm text-slate-400 mt-2">+34 954 123 456</p>
          </div>
        </div>
        <div className="text-center pt-10 text-xs text-slate-600 uppercase tracking-widest">
          © 2026 Consultoritas S.L. — Todos los derechos reservados.
        </div>
      </footer>

      <AppointmentModal open={appointmentModalOpen} onOpenChange={setAppointmentModalOpen} />

      <ChatWidget />

    </div>
  );
}
