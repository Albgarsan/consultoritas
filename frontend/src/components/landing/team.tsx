"use client";

import { useEffect, useState } from "react"
import { apiFetch } from "@/lib/api"
import { motion } from "framer-motion";
import { Mail } from "lucide-react";

type TeamMember = {
  id: string
  name: string
  role: string
  email: string
  initials: string
  profile_image?: string
  first_name?: string
}

export function TeamSection() {
  const [team, setTeam] = useState<TeamMember[]>([])

  useEffect(() => {
    apiFetch("/api/users/advisors/")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setTeam(
            data
              .filter((user) => user.role === "Asesor" || user.is_staff)
              .map((user) => ({
                id: String(user.id),
                name: `${user.first_name || "Asesor"} ${user.last_name || ""}`.trim(),
                role: user.role || "Asesor",
                email: user.email,
                initials: (user.first_name || user.email || "A").slice(0, 2).toUpperCase(),
                profile_image: user.profile_image || null,
                first_name: user.first_name,
              }))
          )
        }
      })
      .catch(() => setTeam([]))
  }, [])

  return (
    <section id="team" className="py-24 px-4 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-accent tracking-[0.3em] uppercase mb-2">Talento a tu servicio</h2>
          <h3 className="text-4xl font-bold text-slate-900">Nuestro Equipo Profesional</h3>
        </div>
        <div className="grid md:grid-cols-3 gap-10">
          {team.length > 0 ? team.map((member) => (
            <motion.div
              key={member.id}
              whileHover={{ y: -10 }}
              className="group bg-slate-50 rounded-[2.5rem] overflow-hidden border border-slate-100 shadow-sm transition-all"
            >
              <div className="h-72 overflow-hidden relative bg-slate-100 flex items-center justify-center">
                {member.profile_image ? (
                  <>
                    <img
                      src={member.profile_image}
                      alt={member.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                  </>
                ) : (
                  <>
                    <div className="size-28 rounded-full bg-white shadow-lg flex items-center justify-center text-3xl font-bold text-primary">
                      {member.initials}
                    </div>
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 to-transparent" />
                  </>
                )}
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
          )) : (
            <div className="md:col-span-3 rounded-3xl border border-dashed border-slate-200 p-10 text-center text-slate-500">
              No hay asesores sincronizados todavía.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
