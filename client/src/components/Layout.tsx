import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SidebarProvider } from '@/components/ui/sidebar';
import { useAuth } from '@/contexts/AuthContext';

interface LayoutProps {
  children: ReactNode;
  showSidebar?: boolean;
}

export function Layout({ children, showSidebar = true }: LayoutProps) {

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex">
          {showSidebar && <Sidebar />}
          <main className="flex-1 w-full min-w-0">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
