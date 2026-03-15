import { motion } from 'framer-motion';
import { Package, FileText, BookOpen, Truck, BarChart3, ArrowRight, Wrench, Shield, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const features = [
  { icon: Package, title: 'Inventory Tracking', desc: 'Monitor stock levels, locations, and reorder thresholds in real time.' },
  { icon: FileText, title: 'Request Management', desc: 'Streamline equipment requests with approval workflows.' },
  { icon: BookOpen, title: 'Borrowed Equipment', desc: 'Track who has what, with return dates and overdue alerts.' },
  { icon: Truck, title: 'Supplier Directory', desc: 'Manage supplier contacts, orders, and ratings in one place.' },
  { icon: BarChart3, title: 'Reports & Analytics', desc: 'Visualize usage trends and inventory distribution.' },
  { icon: Shield, title: 'Low-Stock Alerts', desc: 'Get notified before critical items run out.' },
];

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5 } } };

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 lg:px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
              <Wrench className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-lg font-bold tracking-tight">EngInventory</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/login')}>Sign in</Button>
            <Button size="sm" onClick={() => navigate('/signup')} className="gap-1.5">
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pt-20 pb-16 lg:px-6 lg:pt-28 lg:pb-24 text-center">
        <motion.div initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-muted/50 px-4 py-1.5 text-xs font-medium text-muted-foreground mb-6">
            <Zap className="h-3.5 w-3.5 text-primary" />
            Engineering resource management, simplified
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl max-w-3xl mx-auto leading-[1.1]">
            Manage your lab inventory with{' '}
            <span className="text-primary">precision</span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed">
            Track equipment, manage requests, monitor borrowed items, and generate reports — all in one modern platform built for engineering teams.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3">
            <Button size="lg" onClick={() => navigate('/signup')} className="gap-2 px-6">
              Get started free <ArrowRight className="h-4 w-4" />
            </Button>
            <Button size="lg" variant="outline" onClick={() => navigate('/login')}>
              Sign in
            </Button>
          </div>
        </motion.div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 pb-20 lg:px-6">
        <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map(f => (
            <motion.div key={f.title} variants={item}>
              <div className="group rounded-xl border border-border/50 bg-card p-6 hover:shadow-md hover:border-primary/20 transition-all duration-300">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 mb-4">
                  <f.icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="text-sm font-semibold mb-1.5">{f.title}</h3>
                <p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/50 bg-muted/30">
        <div className="mx-auto max-w-6xl px-4 py-8 lg:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Wrench className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium text-muted-foreground">EngInventory</span>
          </div>
          <div className="flex gap-6 text-xs text-muted-foreground">
            <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
            <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
