import { ReactNode } from 'react';
import { PublicHeader } from './PublicHeader';
import { PublicFooter } from './PublicFooter';

interface PublicLayoutProps {
  children: ReactNode;
}

export function PublicLayout({ children }: PublicLayoutProps) {
  return (
    <div className="min-h-screen bg-background flex flex-col w-full">
      <PublicHeader />
      <main className="flex-1 w-full pt-20">
        {children}
      </main>
      <PublicFooter />
    </div>
  );
}

