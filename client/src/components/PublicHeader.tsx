import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";

export function PublicHeader() {
  const [location] = useLocation();

  const publicNavigation = [
    { name: "Features", href: "/features", current: location === "/features" },
    { name: "Pricing", href: "/pricing", current: location === "/pricing" },
    { name: "Docs", href: "/docs", current: location === "/docs" },
  ];

  return (
    <header className="bg-card border-b border-border fixed top-0 left-0 right-0 z-50 shadow-sm w-full">
      <div className="w-full max-w-[1200px] mx-auto px-4 sm:px-6 py-4">
        <div className="flex items-center justify-between">
          {/* Left side - Logo */}
          <div className="flex items-center space-x-4">
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
            {publicNavigation.map((item) => (
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

          {/* Right side - Auth buttons */}
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
        </div>
      </div>
    </header>
  );
}

