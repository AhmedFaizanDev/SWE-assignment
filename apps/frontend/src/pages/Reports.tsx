import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useInventory } from '@/contexts/InventoryContext';
import { monthlyUsageData, categoryColors } from '@/data/mockData';
import { Package, BarChart3, Inbox } from 'lucide-react';
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

  // Most used: count only real borrowed occurrences
  const usageCounts: Record<string, number> = {};
  borrowedItems.forEach(b => { usageCounts[b.equipmentName] = (usageCounts[b.equipmentName] || 0) + 1; });
  const mostUsed = Object.entries(usageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name: name.length > 20 ? name.slice(0, 20) + '…' : name, count }));

  const hasInventory = inventory.length > 0;
  const hasBorrows = mostUsed.length > 0;

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <p className="text-sm text-muted-foreground">Analytics and usage insights.</p>

      {/* Inventory Distribution */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Inventory Distribution by Category</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Total quantity and unique items per category</p>
            </div>
            <Button variant="outline" size="sm" className="text-xs" disabled title="Coming soon">Export</Button>
          </CardHeader>
          <CardContent>
            {!hasInventory ? (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Add inventory items to see distribution</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Monthly Usage Trends */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold">Monthly Usage Trends</CardTitle>
            <p className="text-xs text-muted-foreground">Usage by category over the past 12 months · Sample data</p>
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
            <p className="text-xs text-muted-foreground">By borrow count</p>
          </CardHeader>
          <CardContent>
            {!hasBorrows ? (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No borrow data yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Equipment usage will appear here as items are borrowed.</p>
              </div>
            ) : (
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
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
