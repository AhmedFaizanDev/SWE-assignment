import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  BarChart3, Package, TrendingDown, TrendingUp, AlertTriangle,
  ShieldCheck, DollarSign, Activity, Boxes,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { analyticsApi } from '@/lib/api';
import type { KPISnapshot, StockHealth } from '@/data/types';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function KPICard({ label, value, subtitle, icon: Icon, color }: {
  label: string; value: string | number; subtitle?: string; icon: React.ElementType; color: string;
}) {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
          {subtitle && <p className="text-[10px] text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
        <div className={`flex h-11 w-11 items-center justify-center rounded-xl bg-opacity-10 ${color}`}>
          <Icon className="h-5 w-5" />
        </div>
      </CardContent>
    </Card>
  );
}

export default function Analytics() {
  const { data: kpi, isLoading: kpiLoading, isError: kpiError, refetch: refetchKpi } = useQuery({
    queryKey: ['kpi-latest'],
    queryFn: () => analyticsApi.kpiLatest(),
  });

  const { data: health, isLoading: healthLoading, isError: healthError, refetch: refetchHealth } = useQuery({
    queryKey: ['stock-health'],
    queryFn: () => analyticsApi.stockHealth(),
  });

  const categoryData = kpi?.categoryBreakdown
    ? Object.entries(kpi.categoryBreakdown).map(([cat, d]) => ({
        category: cat,
        items: d.count,
        quantity: d.quantity,
        value: Math.round(d.value),
      }))
    : [];

  const healthPieData = health
    ? [
        { name: 'Healthy', value: health.healthy.length, color: 'hsl(142,71%,45%)' },
        { name: 'Low Stock', value: health.lowStock.length, color: 'hsl(38,92%,50%)' },
        { name: 'Critical', value: health.critical.length, color: 'hsl(0,84%,60%)' },
        { name: 'Out of Stock', value: health.outOfStock.length, color: 'hsl(0,0%,50%)' },
        { name: 'Overstocked', value: health.overStocked.length, color: 'hsl(217,91%,60%)' },
      ].filter(d => d.value > 0)
    : [];

  const isLoading = kpiLoading || healthLoading;
  const hasError = kpiError || healthError;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" /> Analytics Dashboard
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Live KPIs and stock health from <code className="text-xs">/api/analytics/</code>
          </p>
        </div>
        {hasError && (
          <Button variant="outline" size="sm" onClick={() => { void refetchKpi(); void refetchHealth(); }}>
            Retry
          </Button>
        )}
      </div>

      {hasError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load analytics. Confirm the API is running at{' '}
          <code className="text-xs">{import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}</code>.
        </div>
      )}

      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading analytics...</div>
      ) : (
        <>
          {/* KPI Cards */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}>
              <KPICard label="Inventory Health" value={`${kpi?.healthScore ?? 0}%`} subtitle="Composite score" icon={ShieldCheck} color="text-emerald-500" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.08 }}>
              <KPICard label="Total Value" value={`$${(kpi?.totalValue ?? 0).toLocaleString()}`} subtitle={`${kpi?.totalQuantity ?? 0} total units`} icon={DollarSign} color="text-blue-500" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }}>
              <KPICard label="Fill Rate" value={`${((kpi?.fillRate ?? 0) * 100).toFixed(1)}%`} subtitle="30-day request fulfillment" icon={TrendingUp} color="text-primary" />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.24 }}>
              <KPICard label="Turnover Rate" value={`${((kpi?.inventoryTurnoverRate ?? 0) * 100).toFixed(1)}%`} subtitle="30-day inventory turnover" icon={Activity} color="text-violet-500" />
            </motion.div>
          </div>

          {/* Risk summary */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-semibold">Stock Risks</span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span>Out of Stock</span>
                    <Badge variant="destructive" className="text-[10px]">{health?.outOfStock.length ?? 0}</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Critical</span>
                    <Badge variant="destructive" className="text-[10px]">{health?.critical.length ?? 0}</Badge>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span>Low Stock</span>
                    <Badge variant="secondary" className="text-[10px]">{health?.lowStock.length ?? 0}</Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Boxes className="h-4 w-4 text-blue-500" />
                  <span className="text-sm font-semibold">Overstock</span>
                </div>
                <p className="text-2xl font-bold">{health?.overStocked.length ?? 0}</p>
                <p className="text-[10px] text-muted-foreground">items above 3x threshold</p>
              </CardContent>
            </Card>
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingDown className="h-4 w-4 text-warning" />
                  <span className="text-sm font-semibold">Pending / Overdue</span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span>Pending requests</span><span className="font-semibold">{kpi?.pendingRequests ?? 0}</span></div>
                  <div className="flex justify-between"><span>Overdue borrows</span><span className="font-semibold text-destructive">{kpi?.overdueBorrows ?? 0}</span></div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                {categoryData.length > 0 ? (
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={categoryData} barSize={40}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis dataKey="category" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                        <Bar dataKey="quantity" name="Units" radius={[6, 6, 0, 0]} fill="hsl(var(--primary))" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>

            <Card className="border-border/50">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold">Stock Health Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                {healthPieData.length > 0 ? (
                  <div className="h-64 flex items-center justify-center">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={healthPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} dataKey="value" label={({ name, value }) => `${name}: ${value}`}>
                          {healthPieData.map((entry, i) => (
                            <Cell key={i} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px', fontSize: 11 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No data</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Health Score Progress */}
          {kpi && (
            <Card className="border-border/50">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-semibold">Overall Inventory Health</span>
                  <span className="text-sm font-bold">{kpi.healthScore}%</span>
                </div>
                <Progress value={kpi.healthScore} className="h-2" />
                <p className="text-[10px] text-muted-foreground mt-2">
                  {kpi.totalItems} items tracked | Avg supplier rating: {kpi.avgSupplierRating}/5
                </p>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
