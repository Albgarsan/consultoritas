"use client";

import { useEffect, useState } from 'react'
import { apiFetch } from '@/lib/api'
import { motion } from 'framer-motion';
import { Heart, Cpu } from 'lucide-react';

export function AboutSection() {
  const [stats, setStats] = useState<Array<{ label: string; value: string }>>([])

  useEffect(() => {
    apiFetch('/api/users/stats/')
      .then((res) => {
        if (!res.ok) throw new Error(`Stats fetch failed: ${res.status}`)
        return res.json()
      })
      .then((data) => {
        setStats([
          { label: 'Asesores registrados', value: String(data.advisors_count || 0) },
          { label: 'Clientes registrados', value: String(data.clients_count || 0) },
          { label: 'Empresas activas', value: String(data.businesses_count || 0) },
        ])
      })
      .catch(() => {
        // Mantener los valores por defecto del estado inicial, no hacer nada
      })
  }, [])

  return (
    <section id="about" className="py-24 px-4 overflow-hidden">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Columna Izquierda: Imagen y Stats */}
          <motion.div
            initial={{ opacity: 0, x: -40 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            className="relative"
          >
            <div className="relative z-10 rounded-[3rem] overflow-hidden shadow-2xl border-8 border-white">
              <img
                src="https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=1000&auto=format&fit=crop"
                alt="Oficinas Consultoritas"
                className="w-full h-[500px] object-cover"
              />
            </div>
            {/* Floating Stats Card */}
            <div className="absolute -bottom-10 -right-6 z-20 bg-white p-8 rounded-[2rem] shadow-2xl border border-slate-50 hidden md:block">
              <div className="grid grid-cols-1 gap-6">
                {stats.length > 0 ? stats.map((s) => (
                  <div key={s.label} className="text-center border-b border-slate-100 last:border-0 pb-4 last:pb-0">
                    <p className="text-3xl font-extrabold text-primary">{s.value}</p>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-400">{s.label}</p>
                  </div>
                )) : (
                  <div className="text-center text-slate-400 text-sm">
                    Sin métricas sincronizadas.
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Columna Derecha: Texto */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="space-y-8"
          >
            <div>
              <h2 className="text-sm font-bold text-accent tracking-[0.3em] uppercase mb-3">Nuestra Esencia</h2>
              <h3 className="text-4xl font-bold text-slate-900 leading-tight">
                Asesoría familiar, <br />
                <span className="text-primary italic">tecnología del futuro.</span>
              </h3>
            </div>

            <p className="text-slate-500 leading-relaxed text-lg">
              Desde hace tres décadas, Consultoritas ha sido el pilar de confianza para las empresas de Sevilla Este. Lo que nació como un despacho local, ha evolucionado hacia un centro de alto rendimiento fiscal impulsado por Inteligencia Artificial.
            </p>

            <div className="grid sm:grid-cols-2 gap-6">
              {[
                { icon: Heart, title: "Trato Humano", desc: "No eres un número de CIF, eres nuestro vecino." },
                { icon: Cpu, title: "IA Avanzada", desc: "Procesamos tus datos en segundos, no en días." }
              ].map((item) => (
                <div key={item.title} className="flex gap-4">
                  <div className="size-10 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                    <item.icon className="size-5 text-primary" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900">{item.title}</h4>
                    <p className="text-sm text-slate-500">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
