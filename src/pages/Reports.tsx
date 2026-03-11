import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventory } from '@/contexts/InventoryContext';
import { monthlyUsageData, categoryColors } from '@/data/mockData';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

export default function Reports() {
  const { inventory, borrowedItems } = useInventory();

  const categoryData = ['Electronics', 'Mechanical', 'Tools', 'Consumables'].map(cat => ({
    category: cat,
    count: inventory.filter(i => i.category === cat).reduce((s, i) => s + i.quantity, 0),
    items: inventory.filter(i => i.category === cat).length,
  }));

  // Most used: count borrowed occurrences
  const usageCounts: Record<string, number> = {};
  borrowedItems.forEach(b => { usageCounts[b.equipmentName] = (usageCounts[b.equipmentName] || 0) + 1; });
  // Add some synthetic data for richer chart
  inventory.slice(0, 10).forEach(i => {
    if (!usageCounts[i.name]) usageCounts[i.name] = Math.floor(Math.random() * 8) + 1;
  });
  const mostUsed = Object.entries(usageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, count }));

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      {/* Inventory Distribution */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Inventory Distribution by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData} barSize={50}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="category" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="count" name="Total Qty" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                  <Bar dataKey="items" name="Unique Items" radius={[6, 6, 0, 0]} fill="hsl(var(--primary) / 0.4)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Usage Trends */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Usage Trends</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={monthlyUsageData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Line type="monotone" dataKey="electronics" name="Electronics" stroke={categoryColors.Electronics} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="mechanical" name="Mechanical" stroke={categoryColors.Mechanical} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="tools" name="Tools" stroke={categoryColors.Tools} strokeWidth={2} dot={{ r: 3 }} />
                  <Line type="monotone" dataKey="consumables" name="Consumables" stroke={categoryColors.Consumables} strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Most Used Equipment */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Most Used Equipment</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={mostUsed} layout="vertical" barSize={16} margin={{ left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 12 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 11 }} width={140} stroke="hsl(var(--muted-foreground))" />
                  <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 12 }} />
                  <Bar dataKey="count" name="Times Borrowed" radius={[0, 6, 6, 0]} fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
