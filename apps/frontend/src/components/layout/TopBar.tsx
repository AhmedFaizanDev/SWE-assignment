import { Bell, Search, LogOut, Settings, ChevronRight, Home } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useContext, useState, type FormEvent } from 'react';
import { InventoryContext } from '@/contexts/InventoryContext';
import { useAuth } from '@/contexts/AuthContext';
import { Badge } from '@/components/ui/badge';
import { useLocation, useNavigate } from 'react-router-dom';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/inventory': 'Inventory Management',
  '/requests': 'Item Requests',
  '/borrowed': 'Borrowed Equipment',
  '/suppliers': 'Suppliers',
  '/reports': 'Reports & Analytics',
  '/settings': 'Settings',
  '/activity': 'Activity Feed',
  '/ai-insights': 'AI Insights',
  '/analytics': 'Analytics Dashboard',
  '/alerts': 'Alerts Center',
};

export function TopBar() {
  const inventoryCtx = useContext(InventoryContext);
  const activities = inventoryCtx?.activities ?? [];
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const title = pageTitles[location.pathname] || 'Dashboard';
  const recentNotifs = activities.slice(0, 5);
  const [searchVal, setSearchVal] = useState('');

  const initials = user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?';

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    if (searchVal.trim()) {
      navigate(`/inventory?q=${encodeURIComponent(searchVal.trim())}`);
      setSearchVal('');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const showBreadcrumb = location.pathname !== '/dashboard';
  const breadcrumbLabel = pageTitles[location.pathname] || '';

  return (
    <header className="sticky top-0 z-30 flex flex-col border-b border-border/50 bg-card/80 backdrop-blur-xl">
      <div className="flex h-16 items-center gap-4 px-4 lg:px-6">
        <SidebarTrigger className="shrink-0" />
        <h1 className="text-lg font-semibold tracking-tight hidden sm:block">{title}</h1>

        <form onSubmit={handleSearch} className="flex-1 flex justify-center max-w-md mx-auto">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search inventory..."
              value={searchVal}
              onChange={e => setSearchVal(e.target.value)}
              className="pl-9 h-9 bg-muted/50 border-0 focus-visible:ring-1"
            />
          </div>
        </form>

        <div className="flex items-center gap-2">
          <Popover>
            <PopoverTrigger asChild>
              <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
                <Bell className="h-[18px] w-[18px]" />
                {recentNotifs.length > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-destructive-foreground">
                    {recentNotifs.length}
                  </span>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-80 p-0">
              <div className="p-3 border-b border-border">
                <h3 className="font-semibold text-sm">Recent Activity</h3>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {recentNotifs.length === 0 ? (
                  <p className="p-4 text-sm text-muted-foreground text-center">No recent activity</p>
                ) : (
                  recentNotifs.map(n => (
                    <div key={n.id} className="px-3 py-2.5 border-b border-border/50 last:border-0 hover:bg-muted/50 transition-colors">
                      <p className="text-xs text-foreground">{n.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                    </div>
                  ))
                )}
              </div>
              <div className="border-t border-border p-2">
                <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => navigate('/activity')}>
                  View all activity
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary text-xs font-bold hover:bg-primary/20 transition-colors">
                {initials}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <div className="px-3 py-2">
                <p className="text-sm font-medium">{user?.name}</p>
                <p className="text-xs text-muted-foreground">{user?.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" /> Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Breadcrumb */}
      {showBreadcrumb && breadcrumbLabel && (
        <div className="flex items-center gap-1.5 px-4 lg:px-6 pb-2 text-xs text-muted-foreground">
          <button onClick={() => navigate('/dashboard')} className="hover:text-foreground transition-colors flex items-center gap-1">
            <Home className="h-3 w-3" /> Home
          </button>
          <ChevronRight className="h-3 w-3" />
          <span className="text-foreground font-medium">{breadcrumbLabel}</span>
        </div>
      )}
    </header>
  );
}
