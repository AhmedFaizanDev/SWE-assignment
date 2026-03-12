import { Bell, Search, User } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useInventory } from '@/contexts/InventoryContext';
import { Badge } from '@/components/ui/badge';
import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/': 'Dashboard',
  '/inventory': 'Inventory Management',
  '/requests': 'Item Requests',
  '/borrowed': 'Borrowed Equipment',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports & Analytics',
};

export function TopBar() {
  const { activities } = useInventory();
  const location = useLocation();
  const title = pageTitles[location.pathname] || 'Dashboard';
  const recentNotifs = activities.slice(0, 5);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-border/50 bg-card/80 backdrop-blur-xl px-4 lg:px-6">
      <SidebarTrigger className="shrink-0" />
      <h1 className="text-lg font-semibold tracking-tight hidden sm:block">{title}</h1>

      <div className="flex-1 flex justify-center max-w-md mx-auto">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search inventory..." className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative">
              <Bell className="h-[18px] w-[18px]" />
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                {recentNotifs.length}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80 p-0">
            <div className="p-3 border-b border-border">
              <h3 className="font-semibold text-sm">Notifications</h3>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {recentNotifs.map(n => (
                <div key={n.id} className="px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                  <p className="text-xs text-foreground">{n.description}</p>
                  <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </PopoverContent>
        </Popover>

        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
          <User className="h-4 w-4 text-primary" />
        </div>
      </div>
    </header>
  );
}
