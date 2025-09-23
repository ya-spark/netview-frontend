import { ReactNode } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { SidebarProvider, SidebarInset } from '@/components/ui/sidebar';
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
        {showSidebar && user && <Sidebar />}
        <SidebarInset>
          <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 pt-20">
            <Header />
          </div>
          <main className="flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
}
