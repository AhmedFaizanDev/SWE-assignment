import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { User, Palette, Bell } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

type Theme = 'light' | 'dark' | 'system';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [theme, setTheme] = useState<Theme>(() => (localStorage.getItem('enginventory_theme') as Theme) || 'light');
  const [emailNotifs, setEmailNotifs] = useState(() => localStorage.getItem('enginventory_email_notifs') !== 'false');

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'system') {
      const dark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.toggle('dark', dark);
    } else {
      root.classList.toggle('dark', theme === 'dark');
    }
    localStorage.setItem('enginventory_theme', theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem('enginventory_email_notifs', String(emailNotifs));
  }, [emailNotifs]);

  const handleSaveProfile = () => {
    if (!name || !email) { toast.error('Name and email are required'); return; }
    updateProfile({ name, email });
    toast.success('Profile updated');
  };

  return (
    <div className="space-y-6 max-w-2xl">
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <User className="h-4 w-4 text-muted-foreground" /> Profile
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary text-lg font-bold">
                {user?.name?.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() || '?'}
              </div>
              <div className="text-sm text-muted-foreground">Avatar upload coming soon</div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-name">Display name</Label>
              <Input id="settings-name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="settings-email">Email</Label>
              <Input id="settings-email" type="email" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <Button size="sm" className="w-fit" onClick={handleSaveProfile}>Save changes</Button>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Palette className="h-4 w-4 text-muted-foreground" /> Appearance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-2">
              {(['light', 'dark', 'system'] as Theme[]).map(t => (
                <Button key={t} variant={theme === t ? 'default' : 'outline'} size="sm" className="capitalize" onClick={() => setTheme(t)}>
                  {t}
                </Button>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}>
        <Card className="border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Bell className="h-4 w-4 text-muted-foreground" /> Preferences
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">Email notifications</p>
                <p className="text-xs text-muted-foreground">Receive alerts for low stock and overdue items</p>
              </div>
              <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
