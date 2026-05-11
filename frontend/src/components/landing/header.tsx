'use client';

import { Menu, X, User } from 'lucide-react';
import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ConsultoritasLogo } from '@/components/layout/logo';
import { Button } from '@/components/ui/button';

interface HeaderProps {
  onNavigate: (id: string) => void;
  onAccessClick: () => void;
}

export function Header({ onNavigate, onAccessClick }: HeaderProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const menuItems = [
    { label: 'Conócenos', id: 'about' },
    { label: 'Servicios', id: 'services' },
    { label: 'Equipo', id: 'team' },
    { label: 'Contacto', id: 'contact' },
  ];

  const handleNavClick = (id: string) => {
    onNavigate(id);
    setMobileMenuOpen(false);
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-slate-100">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          <ConsultoritasLogo variant="header" />

          {/* Desktop Menu */}
          <nav className="hidden md:flex items-center gap-8">
            {menuItems.map((item) => (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className="text-sm font-semibold text-slate-600 hover:text-accent transition-colors"
              >
                {item.label}
              </button>
            ))}
          </nav>

          <div className="hidden md:block">
            <Button onClick={onAccessClick} className="bg-accent hover:bg-accent/90 text-accent-foreground rounded-xl px-6">
              Acceso Clientes
            </Button>
          </div>

          <button className="md:hidden p-2 text-slate-600" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
            {mobileMenuOpen ? <X /> : <Menu />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-white border-t"
          >
            <div className="px-4 py-6 space-y-4">
              {menuItems.map((item) => (
                <button key={item.id} onClick={() => handleNavClick(item.id)} className="block w-full text-left text-lg font-medium text-slate-600">
                  {item.label}
                </button>
              ))}
              <Button onClick={onAccessClick} className="w-full bg-accent">Área Privada</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
