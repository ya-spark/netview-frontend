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
  const { user } = useAuth();

  return (
    <SidebarProvider defaultOpen={true}>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex min-h-screen">
          {showSidebar && user && <Sidebar />}
          <main className="flex-1 w-full">
            <div className="w-full mx-auto px-4 sm:px-6 lg:px-8 lg:max-w-6xl">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
