import { Link, useLocation } from 'wouter';
import { LayoutDashboard, UtensilsCrossed, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NavMenu() {
  const [location] = useLocation();

  const links = [
    { href: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { href: '/admin/menu', label: 'Menu Editor', icon: UtensilsCrossed },
    { href: '/admin/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-background/80 backdrop-blur-md border-b border-border/50">
      <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/admin/dashboard">
          <span className="font-display text-xl font-bold text-gradient cursor-pointer" data-testid="nav-logo">
            King of Delancey
          </span>
        </Link>
        <div className="flex gap-2">
          {links.map(({ href, label, icon: Icon }) => (
            <Link key={href} href={href}>
              <Button
                variant={location === href ? 'default' : 'ghost'}
                size="sm"
                className="gap-2"
                data-testid={`nav-${label.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden sm:inline">{label}</span>
              </Button>
            </Link>
          ))}
        </div>
      </div>
    </nav>
  );
}
