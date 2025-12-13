import { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { useSidebar } from "@/components/ui/sidebar";
import { Bell, Settings, CreditCard, Users, LogOut, Menu, Building2, ChevronDown } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { logger } from "@/lib/logger";
import { NotificationDropdown } from "@/components/NotificationDropdown";
import { useQuery } from "@tanstack/react-query";
import { UserNotificationApiService } from "@/services/notificationApi";
import { getUserTenants } from "@/services/authApi";

export function Header() {
  const [location] = useLocation();
  const { user, firebaseUser, signOut, selectedTenant, setSelectedTenant, syncBackendUser } = useAuth();
  const { toggleSidebar } = useSidebar();

  // Fetch unread notification count
  // Only fetch when user is authenticated AND has a tenant selected (required for API authentication)
  const { data: countData, error: countError } = useQuery({
    queryKey: ['/api/notifications/user/count'],
    queryFn: () => UserNotificationApiService.getUnreadNotificationCount(),
    enabled: !!user?.email && !!selectedTenant?.id,
    refetchInterval: 30000, // Refetch every 30 seconds
    retry: false, // Don't retry on error - just show 0 count
    onError: (error) => {
      // Log error but don't show toast - errors are handled silently in notification component
      const err = error instanceof Error ? error : new Error(String(error));
      logger.debug('Failed to fetch notification count', err, {
        component: 'Header',
        action: 'get_unread_count',
      });
    },
  });

  const notificationCount = countData?.data?.count || 0;

  // User is authenticated if they have Firebase auth (even if backend user doesn't exist yet)
  const isAuthenticated = !!user || !!firebaseUser;

  // Different navigation based on login status
  const loggedInNavigation = [
    {
      name: "Dashboard",
      href: "/dashboard",
      current: location === "/dashboard",
    },
    { name: "Manage", href: "/manage", current: location === "/manage" },
    { name: "Monitor", href: "/monitor", current: location === "/monitor" },
    { name: "Reports", href: "/reports", current: location === "/reports" },
  ];

  const publicNavigation = [
    { name: "Features", href: "/features", current: location === "/features" },
    { name: "Pricing", href: "/pricing", current: location === "/pricing" },
    { name: "Docs", href: "/docs", current: location === "/docs" },
  ];

  const navigation = isAuthenticated ? loggedInNavigation : publicNavigation;

  const getInitials = (firstName?: string | null, lastName?: string | null) => {
    const first = (firstName || '').charAt(0) || 'U';
    const last = (lastName || '').charAt(0) || 'U';
    return `${first}${last}`.toUpperCase();
  };

  useEffect(() => {
    logger.debug('Header component initialized', {
      component: 'Header',
      isAuthenticated,
      location,
      userId: user?.id,
    });
  }, [isAuthenticated, location, user?.id]);

  const handleSignOut = async () => {
    logger.info('User signing out', {
      component: 'Header',
      action: 'sign_out',
      userId: user?.id,
    });
    await signOut();
  };

  return (
    <header className="bg-card border-b border-border fixed top-0 left-0 right-0 z-50 shadow-sm w-full">
      <div className="w-full px-4 sm:px-6 py-4">
          {/* Top Row - Logo, Desktop Navigation, User Menu */}
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile Sidebar Trigger - Always render for logged-in users, control visibility with CSS */}
              {isAuthenticated && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="md:hidden"
                  data-testid="button-mobile-menu"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}

              <Link href="/">
                <div className="flex items-center space-x-2 cursor-pointer">
                  <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                    <span className="text-primary-foreground font-bold text-lg">
                      N
                    </span>
                  </div>
                  <span className="text-xl font-bold text-foreground hidden sm:block">
                    NetView
                  </span>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation */}
            <nav className="hidden md:flex items-center space-x-8">
              {navigation.map((item) => (
                <Link key={item.name} href={item.href}>
                  <span
                    className={`${
                      item.current
                        ? "text-primary font-medium border-b-2 border-primary pb-1"
                        : "text-muted-foreground hover:text-foreground transition-colors"
                    } cursor-pointer`}
                    data-testid={`nav-${item.name.toLowerCase()}`}
                  >
                    {item.name}
                  </span>
                </Link>
              ))}
            </nav>

            {/* Right side - User Menu or Sign up button */}
            {isAuthenticated ? (
              <div className="flex items-center space-x-4">
                {/* Tenant Switcher */}
                {user && (
                  <TenantSwitcher 
                    selectedTenant={selectedTenant}
                    setSelectedTenant={setSelectedTenant}
                    syncBackendUser={syncBackendUser}
                    firebaseUser={firebaseUser}
                  />
                )}

                {/* Notifications */}
                <NotificationDropdown>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="relative"
                    data-testid="button-notifications"
                  >
                    <Bell className="h-5 w-5" />
                    {notificationCount > 0 && (
                      <Badge
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center text-xs p-0"
                      >
                        {notificationCount}
                      </Badge>
                    )}
                  </Button>
                </NotificationDropdown>

                {/* User Profile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="flex items-center space-x-3 cursor-pointer"
                      data-testid="dropdown-user-menu"
                    >
                      <div className="text-right hidden sm:block">
                        {user ? (
                          <>
                            <div
                              className="text-sm font-medium text-foreground"
                              data-testid="text-user-name"
                            >
                              {user.firstName} {user.lastName}
                            </div>
                            <div
                              className="text-xs text-muted-foreground"
                              data-testid="text-user-email"
                            >
                              {user.email}
                            </div>
                            <div
                              className="text-xs text-muted-foreground"
                              data-testid="text-user-role-org"
                            >
                              {user.role && user.tenantName 
                                ? `${user.role} (${user.tenantName})`
                                : 'Setting up...'}
                            </div>
                          </>
                        ) : firebaseUser ? (
                          <>
                            <div
                              className="text-sm font-medium text-foreground"
                              data-testid="text-user-name"
                            >
                              {firebaseUser.displayName || 'User'}
                            </div>
                            <div
                              className="text-xs text-muted-foreground"
                              data-testid="text-user-email"
                            >
                              {firebaseUser.email}
                            </div>
                            <div
                              className="text-xs text-muted-foreground"
                              data-testid="text-user-role-org"
                            >
                              Completing setup...
                            </div>
                          </>
                        ) : null}
                      </div>
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {user && (user.firstName || user.lastName)
                            ? getInitials(user.firstName, user.lastName)
                            : firebaseUser?.displayName
                            ? getInitials(firebaseUser.displayName.split(' ')[0], firebaseUser.displayName.split(' ')[1])
                            : firebaseUser?.email
                            ? firebaseUser.email.charAt(0).toUpperCase()
                            : 'U'}
                        </AvatarFallback>
                      </Avatar>
                    </div>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-56">
                    <DropdownMenuItem asChild>
                      <Link href="/settings" className="flex items-center">
                        <Settings className="mr-2 h-4 w-4" />
                        <span>Settings</span>
                      </Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleSignOut}
                      data-testid="button-sign-out"
                    >
                      <LogOut className="mr-2 h-4 w-4" />
                      <span>Sign Out</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Button asChild variant="ghost" data-testid="button-demo">
                  <Link href="/demo">Demo</Link>
                </Button>
                <Button asChild variant="ghost" data-testid="button-login">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild data-testid="button-sign-up">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
      </div>
    </header>
  );
}

// Tenant Switcher Component
function TenantSwitcher({ 
  selectedTenant, 
  setSelectedTenant, 
  syncBackendUser,
  firebaseUser 
}: { 
  selectedTenant: any; 
  setSelectedTenant: (tenant: any) => void;
  syncBackendUser: (firebaseUser: any) => Promise<void>;
  firebaseUser: any;
}) {
  const userEmail = firebaseUser?.email || '';
  const [switching, setSwitching] = useState(false);

  const { data: tenantsData, isLoading } = useQuery({
    queryKey: ['/api/auth/my-tenants', userEmail],
    queryFn: async () => {
      const tenants = await getUserTenants();
      return tenants;
    },
    enabled: !!userEmail && !!firebaseUser,
    retry: 1,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });

  const tenants = (tenantsData || []) as Array<{ id: string | number; name: string }>;

  const handleSwitchTenant = async (tenant: { id: string | number; name: string }) => {
    if (switching) return;
    
    setSwitching(true);
    try {
      setSelectedTenant({
        id: String(tenant.id),
        name: tenant.name,
        email: userEmail,
        createdAt: new Date().toISOString(),
      });
      
      if (firebaseUser && syncBackendUser) {
        await syncBackendUser(firebaseUser);
      }
      
      // Reload page to refresh data with new tenant context
      window.location.reload();
    } catch (error) {
      logger.error('Failed to switch tenant', error instanceof Error ? error : new Error(String(error)), {
        component: 'TenantSwitcher',
      });
    } finally {
      setSwitching(false);
    }
  };

  if (tenants.length <= 1) {
    return null; // Don't show switcher if user only has one tenant
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm" className="hidden sm:flex items-center space-x-2">
          <Building2 className="h-4 w-4" />
          <span className="max-w-[150px] truncate">{selectedTenant?.name || 'Select Organization'}</span>
          <ChevronDown className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {tenants.map((tenant) => (
          <DropdownMenuItem
            key={tenant.id}
            onClick={() => handleSwitchTenant(tenant)}
            disabled={switching || selectedTenant?.id === String(tenant.id)}
            className="flex items-center justify-between"
          >
            <div className="flex items-center space-x-2">
              <Building2 className="h-4 w-4" />
              <span>{tenant.name}</span>
            </div>
            {selectedTenant?.id === String(tenant.id) && (
              <Check className="h-4 w-4 text-primary" />
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
