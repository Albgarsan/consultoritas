'use client';

import { Menu, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsultoritasLogo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onNavigate: (id: string) => void;
  onAccessClick: () => void;
}

const NAV_ITEMS = [
  { label: 'Quiénes somos', id: 'about' },
  { label: 'Servicios',     id: 'services' },
  { label: 'Equipo',        id: 'team' },
  { label: 'Contacto',      id: 'contact' },
] as const;

export function Header({ onNavigate, onAccessClick }: HeaderProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled]     = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 28);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header className="fixed left-0 right-0 top-4 z-50 px-4">
      <div
        className={`mx-auto max-w-7xl rounded-[1.75rem] border px-6 transition-all duration-500 ${
          scrolled
            ? 'border-slate-200/70 bg-white/88 shadow-[0_12px_44px_-20px_rgba(23,61,119,0.22)] backdrop-blur-2xl'
            : 'border-white/40 bg-white/55 shadow-[0_8px_28px_-16px_rgba(23,61,119,0.12)] backdrop-blur-xl'
        }`}
      >
        <div className="flex h-[72px] items-center justify-between">

          {/* Logo — ligeramente aumentado y clickeable */}
          <button
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            className="origin-left transition-transform duration-300 hover:scale-[1.04] focus:outline-none flex items-center gap-3"
            aria-label="Volver al inicio"
          >
            <ConsultoritasLogo variant="header" />
          </button>

          {/* Navegación desktop */}
          <nav className="hidden items-center gap-9 md:flex">
            {NAV_ITEMS.map((item) => (
              <button
                key={item.id}
                onClick={() => onNavigate(item.id)}
                className="text-[12.5px] font-semibold uppercase tracking-[0.1em] text-slate-400 transition-colors duration-200 hover:text-[#173d77]"
              >
                {item.label}
              </button>
            ))}
          </nav>

          {/* CTA desktop */}
          <div className="hidden md:block">
            <Button
              onClick={onAccessClick}
              className="h-10 rounded-xl bg-[#173d77] px-6 text-sm font-semibold text-white shadow-[0_12px_28px_-14px_rgba(23,61,119,0.38)] transition-all duration-200 hover:bg-[#1a4a92] hover:shadow-[0_14px_32px_-14px_rgba(23,61,119,0.48)]"
            >
              Acceso Portal
            </Button>
          </div>

          {/* Burger mobile */}
          <button
            className="rounded-lg p-2 text-slate-500 transition-colors hover:text-[#173d77] md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileOpen
              ? <X   size={20} strokeWidth={1.5} />
              : <Menu size={20} strokeWidth={1.5} />}
          </button>
        </div>
      </div>

      {/* Menú mobile */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0,  scale: 1    }}
            exit={{ opacity: 0,    y: -8, scale: 0.98 }}
            transition={{ duration: 0.18 }}
            className="absolute left-4 right-4 top-24 rounded-[1.5rem] border border-slate-200 bg-white p-6 shadow-[0_20px_50px_-20px_rgba(23,61,119,0.25)]"
          >
            <div className="flex flex-col gap-5">
              {NAV_ITEMS.map((item) => (
                <button
                  key={item.id}
                  onClick={() => { onNavigate(item.id); setMobileOpen(false); }}
                  className="text-left text-sm font-semibold uppercase tracking-[0.1em] text-slate-500 transition-colors hover:text-[#173d77]"
                >
                  {item.label}
                </button>
              ))}
              <Button
                onClick={() => {
                  onAccessClick();
                  setMobileOpen(false);
                }}
                className="mt-2 w-full rounded-xl bg-[#173d77] text-white hover:bg-[#1a4a92]"
              >
                Acceso Portal
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
