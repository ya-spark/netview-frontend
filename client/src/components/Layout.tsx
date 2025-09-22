import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function Layout({ children, showSidebar = true }: LayoutProps) {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex min-h-screen">
        {showSidebar && user && <Sidebar />}
        <main className={`flex-1 ${showSidebar && user ? '' : 'container mx-auto'}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
