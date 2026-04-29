'use client';
import { motion } from 'framer-motion';
import { Mail } from 'lucide-react';

const team = [
  {
    name: "Antonio García",
    role: "Socio Principal - Experto Legal",
    email: "antonio.garcia@consultoritas.es",
    image: "https://images.unsplash.com/photo-1560250097-0b93528c311a?q=80&w=400&auto=format&fit=crop"
  },
  {
    name: "Carmen Ruiz",
    role: "Socia Principal - Especialista Fiscal",
    email: "carmen.ruiz@consultoritas.es",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?q=80&w=400&auto=format&fit=crop"
  },
  {
    name: "Miguel Fernández",
    role: "Asesor Laboral Senior",
    email: "miguel.fernandez@consultoritas.es",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=400&auto=format&fit=crop"
  },
];

export function TeamSection() {
  return (
    <section id="team" className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-accent tracking-[0.3em] uppercase mb-2">Talento a tu servicio</h2>
          <h3 className="text-4xl font-bold text-slate-900">Nuestro Equipo Profesional</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {team.map((member, i) => (
            <motion.div
              key={member.name}
              whileHover={{ y: -10 }}
              className="group bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm transition-all"
            >
              <div className="h-72 overflow-hidden relative">
                <img src={member.image} alt={member.name} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                   <p className="text-white font-bold text-xl">{member.name}</p>
                   <p className="text-accent text-sm font-medium">{member.role}</p>
                </div>
              </div>
              <div className="p-6">
                <a
                  href={`mailto:${member.email}`}
                  className="w-full py-4 rounded-2xl bg-white border border-slate-200 flex items-center justify-center gap-2 font-bold text-slate-700 hover:bg-primary hover:text-white transition-all shadow-sm"
                >
                  <Mail className="size-4" /> Contactar por Email
                </a>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
