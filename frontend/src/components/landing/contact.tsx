'use client';
import { motion } from 'framer-motion';
import { MapPin, Mail, MessageCircle, Phone, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function ContactSection() {
  const handleWhatsApp = () => window.open("https://wa.me/34954123456", "_blank");
  const handleEmail = () => window.location.href = "mailto:info@consultoritas.es";

  return (
    <section id="contact" className="py-24 px-4 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-primary tracking-[0.3em] uppercase mb-2">Estamos cerca</h2>
          <h3 className="text-4xl font-bold text-slate-900">Contacto Directo</h3>
        </div>

        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Información y Botones */}
          <div className="space-y-8">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
              <h4 className="text-2xl font-bold text-slate-900 mb-6">¿Hablamos ahora?</h4>
              <div className="grid gap-4">
                <Button onClick={handleWhatsApp} className="h-16 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-white text-lg gap-3 shadow-lg shadow-emerald-100">
                  <MessageCircle className="size-6" /> WhatsApp Directo
                </Button>
                <Button onClick={handleEmail} variant="outline" className="h-16 rounded-2xl border-2 text-lg gap-3 text-slate-700">
                  <Mail className="size-6 text-primary" /> Enviar Email
                </Button>
              </div>

              <div className="mt-10 space-y-6">
                <div className="flex gap-4">
                  <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <MapPin className="text-primary" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Edificio Portasevilla</p>
                    <p className="text-sm text-slate-500">Calle Dr. González Caraballo, 1, 41020 Sevilla</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="size-12 rounded-xl bg-slate-50 flex items-center justify-center shrink-0">
                    <Clock className="text-accent" />
                  </div>
                  <div>
                    <p className="font-bold text-slate-900">Horario de Atención</p>
                    <p className="text-sm text-slate-500">Lunes a Jueves: 09:00 - 18:00 | Viernes: 09:00 - 14:00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mapa Estándar */}
          <div className="h-full min-h-[500px] relative">
            <div className="w-full h-full rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white relative z-10">
              <iframe
                src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3169.8985853!2d-5.9383!3d37.4015!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xd126c1114be7a2b%3A0x5c8e2c7e5a8e3c0!2sEdificio%20Portasevilla!5e0!3m2!1ses!2ses!4v1710000000000"
                width="100%"
                height="100%"
                style={{ border: 0 }}
                allowFullScreen
                loading="lazy"
                title="Google Maps"
              ></iframe>
            </div>
            {/* Decoración detrás del mapa */}
            <div className="absolute -bottom-6 -right-6 size-64 bg-accent/20 rounded-full blur-3xl -z-0" />
          </div>
        </div>
      </div>
    </section>
  );
}
