import React from 'react';
import { Outlet } from 'react-router-dom';
import { Navigation } from './Navigation';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const [mobileNavOpen, setMobileNavOpen] = React.useState(false);

  return (
    <div className="min-h-screen bg-grid-soft bg-slate-50">
      <Navigation mobileNavOpen={mobileNavOpen} onCloseMobileNav={() => setMobileNavOpen(false)} />
      <Header mobileNavOpen={mobileNavOpen} onToggleMobileNav={() => setMobileNavOpen((value) => !value)} />
      <main className="mt-16 p-4 sm:p-6 lg:p-8 lg:ml-64">
        {children ?? <Outlet />}
      </main>
    </div>
  );
};
