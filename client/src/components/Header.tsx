import { useState } from "react";
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
import { Bell, Settings, CreditCard, Users, LogOut, Menu } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export function Header() {
  const [location] = useLocation();
  const { user, signOut } = useAuth();
  const [notificationCount] = useState(3);
  const { toggleSidebar } = useSidebar();

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

  const navigation = user ? loggedInNavigation : publicNavigation;

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header className="bg-card border-b border-border sticky top-0 z-50 shadow-sm">
      <div className="w-full">
        <div className="px-6 py-4 w-full">
          {/* Top Row - Logo, Desktop Navigation, User Menu */}
          <div className="flex items-center justify-between">
            {/* Left side - Logo and Mobile Menu */}
            <div className="flex items-center space-x-4">
              {/* Mobile Sidebar Trigger - Always render for logged-in users, control visibility with CSS */}
              {user && (
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

              <Link href={user ? "/dashboard" : "/"}>
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
            {user ? (
              <div className="flex items-center space-x-4">
                {/* Notifications */}
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

                {/* User Profile */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <div
                      className="flex items-center space-x-3 cursor-pointer"
                      data-testid="dropdown-user-menu"
                    >
                      <div className="text-right hidden sm:block">
                        <div
                          className="text-sm font-medium text-foreground"
                          data-testid="text-user-name"
                        >
                          {user.firstName} {user.lastName}
                        </div>
                        <div
                          className="text-xs text-muted-foreground"
                          data-testid="text-user-role"
                        >
                          {user.role}
                        </div>
                      </div>
                      <Avatar>
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {getInitials(user.firstName, user.lastName)}
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
                <Button asChild variant="outline" data-testid="button-login">
                  <Link href="/login">Login</Link>
                </Button>
                <Button asChild data-testid="button-sign-up">
                  <Link href="/signup">Sign Up</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
