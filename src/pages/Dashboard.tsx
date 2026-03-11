import { motion } from 'framer-motion';
import { Package, AlertTriangle, BookOpen, FileText, ArrowUpRight, ArrowDownRight, RotateCcw, CheckCircle, XCircle, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useInventory } from '@/contexts/InventoryContext';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { categoryColors } from '@/data/mockData';
import { useEffect, useState } from 'react';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.08 } } };
const item = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' as const } } };

function AnimatedCounter({ value, duration = 1200 }: { value: number; duration?: number }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(value / (duration / 16));
    const timer = setInterval(() => {
      start += step;
      if (start >= value) { setCount(value); clearInterval(timer); }
      else setCount(start);
    }, 16);
    return () => clearInterval(timer);
  }, [value, duration]);
  return <span>{count}</span>;
}

const activityIcons: Record<string, React.ReactNode> = {
  issued: <ArrowUpRight className="h-3.5 w-3.5 text-info" />,
  returned: <RotateCcw className="h-3.5 w-3.5 text-success" />,
  restocked: <ArrowDownRight className="h-3.5 w-3.5 text-success" />,
  requested: <Clock className="h-3.5 w-3.5 text-warning" />,
  approved: <CheckCircle className="h-3.5 w-3.5 text-success" />,
  rejected: <XCircle className="h-3.5 w-3.5 text-destructive" />,
};

export default function Dashboard() {
  const { inventory, requests, borrowedItems, activities } = useInventory();

  const totalItems = inventory.reduce((sum, i) => sum + i.quantity, 0);
  const lowStockItems = inventory.filter(i => i.quantity <= i.minThreshold);
  const activeBorrowed = borrowedItems.filter(b => b.status === 'Active' || b.status === 'Overdue');
  const pendingRequests = requests.filter(r => r.status === 'Pending');

  const categoryData = ['Electronics', 'Mechanical', 'Tools', 'Consumables'].map(cat => ({
    category: cat,
    count: inventory.filter(i => i.category === cat).reduce((s, i) => s + i.quantity, 0),
    fill: categoryColors[cat],
  }));

  const summaryCards = [
    { title: 'Total Items', value: totalItems, icon: Package, color: 'text-primary', bg: 'bg-primary/10' },
    { title: 'Low Stock', value: lowStockItems.length, icon: AlertTriangle, color: 'text-warning', bg: 'bg-warning/10' },
    { title: 'Borrowed', value: activeBorrowed.length, icon: BookOpen, color: 'text-info', bg: 'bg-info/10' },
    { title: 'Pending Requests', value: pendingRequests.length, icon: FileText, color: 'text-destructive', bg: 'bg-destructive/10' },
  ];

  return (
    <div className="space-y-6">
      <motion.div variants={container} initial="hidden" animate="show" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <motion.div key={card.title} variants={item}>
            <Card className="hover:shadow-md transition-shadow duration-300 border-border/50">
              <CardContent className="p-5">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{card.title}</p>
                    <p className="text-3xl font-bold mt-1">
                      <AnimatedCounter value={card.value} />
                    </p>
                  </div>
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${card.bg}`}>
                    <card.icon className={`h-5 w-5 ${card.color}`} />
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3, duration: 0.5 }} className="lg:col-span-2">
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Inventory Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={categoryData} barSize={40}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                    <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4, duration: 0.5 }}>
          <Card className="border-border/50 h-full">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold">Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-56 overflow-y-auto pr-1">
                {activities.slice(0, 8).map((a, idx) => (
                  <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 + idx * 0.05 }}
                    className="flex gap-3 items-start">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted">
                      {activityIcons[a.type]}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">{a.description}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{new Date(a.timestamp).toLocaleString()}</p>
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Low Stock Alert */}
      {lowStockItems.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5, duration: 0.5 }}>
          <Card className="border-border/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Low Stock Alerts
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/50">
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Item</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Category</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Qty</th>
                      <th className="text-center py-2 px-3 text-xs font-medium text-muted-foreground">Min</th>
                      <th className="text-left py-2 px-3 text-xs font-medium text-muted-foreground">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lowStockItems.map(i => (
                      <tr key={i.id} className="border-b border-border/30 hover:bg-muted/30 transition-colors">
                        <td className="py-2 px-3 font-medium">{i.name}</td>
                        <td className="py-2 px-3 text-muted-foreground">{i.category}</td>
                        <td className="py-2 px-3 text-center font-mono">{i.quantity}</td>
                        <td className="py-2 px-3 text-center font-mono text-muted-foreground">{i.minThreshold}</td>
                        <td className="py-2 px-3">
                          <Badge variant={i.quantity === 0 ? 'destructive' : 'secondary'} className="text-[10px]">
                            {i.quantity === 0 ? 'Out of Stock' : i.quantity <= i.minThreshold / 2 ? 'Critical' : 'Low Stock'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
}
