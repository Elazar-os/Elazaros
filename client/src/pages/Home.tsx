import { useLocation } from 'wouter';
import { motion } from 'framer-motion';
import { LayoutDashboard, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function Home() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background noise flex items-center justify-center p-6">
      <div className="text-center max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <h1 className="font-display text-5xl md:text-6xl lg:text-7xl font-bold tracking-wide mb-4">
            <span className="text-gradient">King of Delancey</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mb-10">
            Digital Menu Display System
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3, duration: 0.4 }}
          className="flex flex-col sm:flex-row gap-4 justify-center"
        >
          <Button 
            size="lg" 
            className="gap-3 text-lg px-8 py-6" 
            data-testid="btn-menu-control-center"
            onClick={() => navigate('/dashboard')}
          >
            <LayoutDashboard className="w-6 h-6" />
            Menu Control Center
          </Button>
          <Button 
            size="lg" 
            variant="outline" 
            className="gap-3 text-lg px-8 py-6" 
            data-testid="btn-admin"
            onClick={() => navigate('/admin')}
          >
            <Settings className="w-6 h-6" />
            Backend
          </Button>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-sm text-muted-foreground/50"
        >
          (973) 471-5635 • kingofdelancey.com
        </motion.p>
      </div>
    </div>
  );
}
