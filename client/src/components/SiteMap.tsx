import { Link } from 'wouter';
import { LayoutDashboard, Settings, Tv } from 'lucide-react';

export default function SiteMap() {
  return (
    <footer className="bg-background/50 border-t border-border/50 mt-auto py-8">
      <div className="max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="font-display text-lg font-semibold text-gradient mb-4">King of Delancey</h3>
            <p className="text-muted-foreground text-sm">
              Digital Menu Display System for managing restaurant TV screens.
            </p>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-3">Navigation</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Menu Editor
                </Link>
              </li>
              <li>
                <Link href="/dashboard" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <LayoutDashboard className="w-4 h-4" />
                  Dashboard
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-semibold text-foreground mb-3">Display Screens</h4>
            <ul className="space-y-2">
              <li>
                <Link href="/display/sushi-1" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Sushi Screen 1
                </Link>
              </li>
              <li>
                <Link href="/display/sushi-2" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Sushi Screen 2
                </Link>
              </li>
              <li>
                <Link href="/display/main-1" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Main Menu 1
                </Link>
              </li>
              <li>
                <Link href="/display/main-2" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Main Menu 2
                </Link>
              </li>
              <li>
                <Link href="/display/main-3" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                  <Tv className="w-4 h-4" />
                  Main Menu 3
                </Link>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/50 mt-8 pt-4 text-center text-muted-foreground text-sm">
          King of Delancey Menu System
        </div>
      </div>
    </footer>
  );
}
