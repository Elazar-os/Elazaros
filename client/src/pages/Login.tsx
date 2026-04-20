import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Crown, ChefHat, Monitor } from "lucide-react";

export default function Login() {
  const { isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      setLocation("/admin");
    }
  }, [isAuthenticated, isLoading, setLocation]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="animate-pulse text-[#A09890]">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] flex flex-col">
      <div className="flex-1 flex">
        <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-[#111111]">
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wMyI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAyNHYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
          
          <div className="relative z-10 flex flex-col justify-center p-12">
            <div className="flex items-center gap-3 mb-8">
              <div className="w-12 h-12 rounded-xl bg-[#C8102E] flex items-center justify-center">
                <Crown className="w-7 h-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold tracking-tight text-[#F5F0EB]">King of Delancey</h1>
                <p className="text-[#A09890] text-sm">Restaurant Management</p>
              </div>
            </div>
            
            <h2 className="text-4xl lg:text-5xl font-serif font-light leading-tight mb-6 text-[#F5F0EB]">
              Manage your<br />
              <span className="text-[#C8102E]">digital menu</span><br />
              with ease
            </h2>
            
            <p className="text-[#A09890] text-lg max-w-md mb-8">
              Control all your TV displays, update prices instantly, and keep your menu fresh for customers.
            </p>
            
            <div className="flex gap-6">
              <div className="flex items-center gap-2 text-[#A09890]">
                <Monitor className="w-5 h-5" />
                <span>5 Screens</span>
              </div>
              <div className="flex items-center gap-2 text-[#A09890]">
                <ChefHat className="w-5 h-5" />
                <span>Real-time Updates</span>
              </div>
            </div>
          </div>
        </div>

        <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-[#0A0A0A]">
          <Card className="w-full max-w-md bg-[#181818] border-[#2A2A2A] shadow-2xl">
            <CardContent className="p-8">
              <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
                <div className="w-10 h-10 rounded-xl bg-[#C8102E] flex items-center justify-center">
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <span className="text-xl font-bold text-[#F5F0EB]">King of Delancey</span>
              </div>
              
              <div className="text-center mb-8">
                <h2 className="text-2xl font-semibold text-[#F5F0EB] mb-2">Welcome back</h2>
                <p className="text-[#A09890]">Sign in to access your dashboard</p>
              </div>

              <div className="space-y-4">
                <Button 
                  asChild
                  className="w-full h-12 bg-[#C8102E] hover:bg-[#A00D24] text-white font-medium text-base transition-all duration-200"
                  data-testid="button-login"
                >
                  <a href="/api/login">
                    Sign In
                  </a>
                </Button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-[#2A2A2A]" />
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="bg-[#181818] px-2 text-[#A09890]">Secure login</span>
                  </div>
                </div>
                
                <p className="text-center text-[#A09890] text-sm">
                  Sign in with your email, Google, GitHub, or Apple account
                </p>
              </div>

              <div className="mt-8 pt-6 border-t border-[#2A2A2A]">
                <p className="text-center text-[#A09890]/60 text-xs">
                  Protected by Replit Authentication
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      
      <footer className="p-6 text-center text-[#A09890]/40 text-sm">
        &copy; {new Date().getFullYear()} King of Delancey. All rights reserved.
      </footer>
    </div>
  );
}
