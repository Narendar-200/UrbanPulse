import React from 'react';
import { Navigation } from './Navigation';
import { Header } from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Navigation />
      <Header />
      <main className="ml-64 mt-16 p-8">
        {children}
      </main>
    </div>
  );
};
