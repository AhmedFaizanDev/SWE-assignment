import { SidebarProvider } from '@/components/ui/sidebar';
import { AppSidebar } from './AppSidebar';
import { TopBar } from './TopBar';
import { Outlet, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { InventoryProvider } from '@/contexts/InventoryContext';
import { AIChatSessionProvider } from '@/contexts/AIChatSessionContext';

/** Shell for all authenticated routes: inventory context wraps sidebar, top bar, and pages together. */
export function AppLayout() {
  const location = useLocation();

  return (
    <AIChatSessionProvider>
      <InventoryProvider>
        <SidebarProvider>
          <div className="min-h-screen flex w-full">
            <AppSidebar />
            <div className="flex-1 flex flex-col min-w-0">
              <TopBar />
              <main className="flex-1 overflow-auto">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={location.pathname}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.2, ease: 'easeOut' }}
                    className="p-4 lg:p-6"
                  >
                    <Outlet />
                  </motion.div>
                </AnimatePresence>
              </main>
            </div>
          </div>
        </SidebarProvider>
      </InventoryProvider>
    </AIChatSessionProvider>
  );
}
