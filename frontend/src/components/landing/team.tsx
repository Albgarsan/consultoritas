'use client';

import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '@/lib/api';
import { motion, useScroll, useTransform } from 'framer-motion';
import { Mail } from 'lucide-react';

type TeamMember = {
  id: string;
  name: string;
  role: string;
  email: string;
  initials: string;
  profile_image?: string;
  is_principal: boolean;
  specialties: string[];
};

/** Skeleton placeholder mientras cargan los datos */
function MemberSkeleton() {
  return (
    <div className="rounded-[2rem] border border-slate-100 bg-white p-4">
      <div className="h-80 animate-pulse rounded-[1.5rem] bg-slate-100" />
      <div className="mt-4 space-y-2 px-2 pb-2">
        <div className="h-3.5 w-2/3 animate-pulse rounded-full bg-slate-100" />
        <div className="h-3 w-1/3 animate-pulse rounded-full bg-slate-100" />
      </div>
    </div>
  );
}

export function TeamSection() {
  const ref = useRef<HTMLElement>(null);
  const [team, setTeam]       = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);

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

  const SPECIALTY_MAP: Record<string, string> = {
    contable: "Contable",
    laboral: "Laboral",
    judicial: "Jurídica",
    fiscal: "Fiscal",
  };

  useEffect(() => {
    async function loadTeam() {
      try {
        const res = await apiFetch("/api/users/advisors/");
        if (res.ok) {
          const data = await res.json();
          setTeam(data.map((u: any) => {
            const rawSpecs = Array.isArray(u.specialties) ? u.specialties : [];
            const uniqueSpecs = Array.from(new Set(rawSpecs.map((s: string) => s.toLowerCase())));
            const mappedSpecs = uniqueSpecs.map(s => SPECIALTY_MAP[s] || s);

            return {
              id: u.id,
              name: u.first_name ? `${u.first_name} ${u.last_name || ''}`.trim() : u.email.split('@')[0],
              role: u.role || 'Asesor',
              email: u.email,
              initials: u.first_name ? u.first_name.substring(0, 2).toUpperCase() : u.email.substring(0, 2).toUpperCase(),
              profile_image: u.profile_image,
              is_principal: u.is_principal || false,
              specialties: mappedSpecs
            };
          }));
        }
      } catch (err) {
        console.error("Error loading team", err);
      } finally {
        setLoading(false);
      }
    }
    loadTeam();
  }, []);

  return (
    <motion.section
      ref={ref}
      id="team"
      style={{ opacity: sectionOpacity, y: sectionY }}
      className="bg-white px-4 py-32"
    >
      <div className="mx-auto max-w-7xl">

        {/* Cabecera de sección — patrón unificado */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: false, amount: 0.3 }}
          className="mb-20 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-3">
            <span className="h-px w-8 bg-[#173d77]/25" />
            <h2 className="text-[10px] font-bold uppercase tracking-[0.28em] text-[#173d77]">
              Capital Humano
            </h2>
            <span className="h-px w-8 bg-[#173d77]/25" />
          </div>
          <h3
            className="text-4xl font-light tracking-tight text-slate-900"
            style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
          >
            Las personas{' '}
            <span className="font-semibold text-[#173d77]">detrás del despacho</span>
          </h3>
        </motion.div>

        {/* Grid de miembros */}
        <div className="grid gap-8 md:grid-cols-3">

          {/* Estado de carga: skeletons */}
          {loading &&
            [0, 1, 2].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
              >
                <MemberSkeleton />
              </motion.div>
            ))}

          {/* Tarjetas de miembros reales */}
          {!loading && team.length > 0 &&
            team.map((member, i) => (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: false, amount: 0.25 }}
                transition={{ delay: i * 0.1, duration: 0.6, ease: 'easeOut' }}
                className="group rounded-[2rem] border border-slate-100 bg-white p-4 transition-all duration-500"
              >
                {/* Foto */}
                <div className="relative h-80 overflow-hidden rounded-[1.5rem] bg-slate-100">
                  {member.profile_image ? (
                    <img
                      src={member.profile_image}
                      alt={member.name}
                      /* ✅ Sin grayscale — foto natural a color */
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                    />
                  ) : (
                    /* Placeholder con iniciales y fondo de marca */
                    <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-[#173d77]/8 to-slate-100">
                      <span
                        className="text-5xl font-light text-[#173d77]/40 transition-colors duration-500 group-hover:text-[#173d77]/60"
                        style={{ fontFamily: "'Playfair Display', Georgia, serif" }}
                      >
                        {member.initials}
                      </span>
                    </div>
                  )}

                  {/* Gradiente inferior para legibilidad del nombre */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#173d77]/80 via-[#173d77]/10 to-transparent opacity-75 transition-opacity duration-500 group-hover:opacity-85" />

                  {/* Nombre + rol sobre la imagen */}
                  <div className="absolute bottom-5 left-5 right-5 flex items-end justify-between">
                    <div className="flex flex-col gap-1.5">
                      <p className="text-base font-medium leading-tight tracking-tight text-white">
                        {member.name}
                      </p>

                      <div className="flex flex-col gap-1.5 mt-0.5">
                        {member.is_principal && (
                          <span className="w-fit rounded bg-[#173d77]/80 px-2 py-0.5 text-[9px] font-bold uppercase tracking-widest text-sky-200 backdrop-blur-sm border border-sky-400/30">
                            Socio
                          </span>
                        )}

                        {member.specialties && member.specialties.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {member.specialties.map(spec => (
                              <span key={spec} className="rounded bg-white/20 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-white backdrop-blur-sm">
                                {spec}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="w-fit rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-slate-300 backdrop-blur-sm">
                            Asesor
                          </span>
                        )}
                      </div>
                    </div>
                    <a
                      href={`mailto:${member.email}`}
                      aria-label={`Contactar con ${member.name}`}
                      className="flex size-10 items-center justify-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-md transition-all duration-300 hover:bg-white hover:text-[#173d77]"
                    >
                      <Mail className="size-4" strokeWidth={1.5} />
                    </a>
                  </div>
                </div>
              </motion.div>
            ))}

          {/* Estado vacío real (sin loading y sin datos) */}
          {!loading && team.length === 0 && (
            <div className="col-span-3 py-16 text-center">
              <p className="text-sm font-light text-slate-400">
                Sincronizando perfiles profesionales…
              </p>
            </div>
          )}
        </div>
      </div>
    </motion.section>
  );
}
