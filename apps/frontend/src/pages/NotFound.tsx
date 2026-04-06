import { useLocation, useNavigate } from "react-router-dom";
import { useEffect } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Wrench } from "lucide-react";
import { motion } from "framer-motion";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    if (import.meta.env.DEV) {
      console.warn('404: attempted to access', location.pathname);
    }
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center max-w-md">
        <div className="flex items-center justify-center gap-2 mb-6">
          <Wrench className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold text-muted-foreground">EngInventory</span>
        </div>
        <h1 className="mb-3 text-5xl font-bold">404</h1>
        <p className="mb-2 text-lg font-medium">Page not found</p>
        <p className="mb-6 text-sm text-muted-foreground">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <Button onClick={() => navigate(isAuthenticated ? '/dashboard' : '/')}>
          {isAuthenticated ? 'Back to Dashboard' : 'Return to Home'}
        </Button>
      </motion.div>
    </div>
  );
};

export default NotFound;
