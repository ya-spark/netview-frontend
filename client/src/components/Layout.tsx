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
      <div className="h-screen bg-background flex flex-col w-full overflow-hidden">
        <Header />
        <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 flex flex-1 overflow-hidden pt-20">
          {showSidebar && <Sidebar />}
          <main className="flex-1 w-full min-w-0 overflow-auto h-full">
            <div className="w-full overflow-x-hidden">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
