import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { categoryColors, MonthlyUsageRow, BorrowLeaderboardRow, KPISnapshot } from '@/data/types';
import { reportsApi, analyticsApi } from '@/lib/api';
import { Package, Inbox, AlertTriangle, Trophy, CircleDot, Download } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

const container = { hidden: {}, show: { transition: { staggerChildren: 0.15 } } };
const item = { hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: 'easeOut' as const } } };

const CATEGORY_ORDER = ['Electronics', 'Mechanical', 'Tools', 'Consumables'] as const;

function escapeCsvField(field: string): string {
  if (field.includes(',') || field.includes('"') || field.includes('\n')) {
    return `"${field.replace(/"/g, '""')}"`;
  }
  return field;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const csv = [headers.map(escapeCsvField).join(','), ...rows.map(r => r.map(escapeCsvField).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function kpiToCategoryChartData(kpi: KPISnapshot | undefined) {
  if (!kpi?.categoryBreakdown) return [];
  const breakdown = kpi.categoryBreakdown;
  return CATEGORY_ORDER.filter(cat => breakdown[cat]).map(cat => {
    const d = breakdown[cat];
    return {
      category: cat,
      count: d.quantity,
      items: d.count,
    };
  });
}

export default function Reports() {
  const { data: monthlyUsage = [], isLoading: monthlyLoading, isError: monthlyError } = useQuery<MonthlyUsageRow[]>({
    queryKey: ['reports', 'monthly-usage'],
    queryFn: () => reportsApi.monthlyUsage(),
  });

  const { data: kpi, isLoading: kpiLoading, isError: kpiError } = useQuery({
    queryKey: ['reports', 'kpi'],
    queryFn: () => analyticsApi.kpiLatest(),
  });

  const { data: usageLeaderboard = [], isLoading: lbLoading, isError: lbError } = useQuery<BorrowLeaderboardRow[]>({
    queryKey: ['reports', 'borrow-leaderboard'],
    queryFn: () => reportsApi.borrowLeaderboard(10),
  });

  const categoryData = kpiToCategoryChartData(kpi);
  const hasInventory = categoryData.length > 0;
  const hasBorrows = usageLeaderboard.length > 0;
  const maxUnits = Math.max(1, ...usageLeaderboard.map(r => r.unitsLent));
  const maxEvents = Math.max(1, ...usageLeaderboard.map(r => r.borrowEvents));
  const uniform =
    usageLeaderboard.length > 1 &&
    usageLeaderboard.every(
      r => r.unitsLent === usageLeaderboard[0].unitsLent && r.borrowEvents === usageLeaderboard[0].borrowEvents,
    );

  const pageLoading = monthlyLoading && kpiLoading && lbLoading;
  const anyError = monthlyError || kpiError || lbError;

  if (pageLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show" className="space-y-6">
      <p className="text-sm text-muted-foreground">Analytics and usage insights from the live API.</p>

      {anyError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Some report sections failed to load. Ensure the API is running at{' '}
          <code className="text-xs">{import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}</code> and refresh.
        </div>
      )}

      {/* Inventory Distribution — same KPI source as Analytics */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Inventory Distribution by Category</CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">Total quantity and unique items per category (from analytics KPI)</p>
            </div>
            <Button
              variant="outline" size="sm" className="text-xs gap-1.5"
              disabled={!hasInventory || kpiError}
              onClick={() => {
                downloadCsv(
                  'inventory-distribution.csv',
                  ['Category', 'Total Qty', 'Unique Items'],
                  categoryData.map(r => [r.category, String(r.count), String(r.items)]),
                );
              }}
            >
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {kpiError ? (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground">Could not load category distribution</p>
              </div>
            ) : !hasInventory ? (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <Package className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No inventory categories in the database yet</p>
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
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Monthly Borrow Trends</CardTitle>
              <p className="text-xs text-muted-foreground">Units borrowed per category over the past 12 months</p>
            </div>
            <Button
              variant="outline" size="sm" className="text-xs gap-1.5"
              disabled={monthlyUsage.length === 0 || monthlyError}
              onClick={() => {
                downloadCsv(
                  'monthly-borrow-trends.csv',
                  ['Month', 'Electronics', 'Mechanical', 'Tools', 'Consumables'],
                  monthlyUsage.map(r => [r.month, String(r.electronics), String(r.mechanical), String(r.tools), String(r.consumables)]),
                );
              }}
            >
              <Download className="h-3 w-3" /> Export CSV
            </Button>
          </CardHeader>
          <CardContent>
            {monthlyLoading ? (
              <div className="flex items-center justify-center h-72">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
              </div>
            ) : monthlyError ? (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load monthly trends</p>
              </div>
            ) : monthlyUsage.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-72 text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No borrow history yet</p>
              </div>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyUsage}>
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
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Borrow demand leaderboard — aggregated on server */}
      <motion.div variants={item}>
        <Card className="border-border/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CircleDot className="h-4 w-4 text-primary" />
              Borrow demand leaderboard
            </CardTitle>
            <p className="text-xs text-muted-foreground">
              Ranked by total units lent across all borrow records, then event count. Data from{' '}
              <code className="text-[10px]">GET /api/reports/borrow-leaderboard/</code>.
            </p>
          </CardHeader>
          <CardContent>
            {lbError ? (
              <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
                <AlertTriangle className="h-8 w-8 text-destructive mb-2" />
                <p className="text-sm text-muted-foreground">Failed to load leaderboard</p>
              </div>
            ) : !hasBorrows ? (
              <div className="flex flex-col items-center justify-center min-h-[220px] text-center">
                <Inbox className="h-8 w-8 text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">No borrow data yet</p>
                <p className="text-xs text-muted-foreground/70 mt-1">Issued requests create rows here.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {uniform && (
                  <p className="text-xs text-muted-foreground rounded-lg border border-border/60 bg-muted/30 px-3 py-2">
                    Several items share the same usage totals in the current dataset—bars are normalized within this list only.
                  </p>
                )}
                <ul className="space-y-2.5">
                  {usageLeaderboard.map((row, idx) => {
                    const rank = idx + 1;
                    const unitMeter = (row.unitsLent / maxUnits) * 100;
                    const eventMeter = (row.borrowEvents / maxEvents) * 100;
                    const topClass =
                      rank === 1
                        ? 'border-amber-500/25 bg-gradient-to-r from-amber-500/8 to-transparent'
                        : rank === 2
                          ? 'border-border/80 bg-muted/20'
                          : rank === 3
                            ? 'border-orange-700/20 bg-orange-950/5'
                            : 'border-border/50 bg-card';

                    return (
                      <motion.li
                        key={row.itemId}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: idx * 0.04 }}
                        className={`rounded-xl border px-3 py-2.5 ${topClass}`}
                      >
                        <div className="flex items-start gap-3">
                          <div
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold tabular-nums ${
                              rank === 1
                                ? 'bg-amber-500/15 text-amber-700 dark:text-amber-400'
                                : rank === 2
                                  ? 'bg-muted text-muted-foreground'
                                  : rank === 3
                                    ? 'bg-orange-500/10 text-orange-800 dark:text-orange-300'
                                    : 'bg-muted/60 text-muted-foreground'
                            }`}
                            title={`Rank ${rank}`}
                          >
                            {rank === 1 ? <Trophy className="h-4 w-4" /> : rank}
                          </div>
                          <div className="min-w-0 flex-1 space-y-2">
                            <div className="flex flex-wrap items-center gap-2 gap-y-1">
                              <span className="text-sm font-medium leading-snug">{row.name}</span>
                              {row.category && (
                                <Badge variant="secondary" className="text-[10px] font-normal">
                                  {row.category}
                                </Badge>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-3 text-[11px] text-muted-foreground tabular-nums">
                              <span>
                                <span className="text-foreground font-medium">{row.borrowEvents}</span> borrow
                                {row.borrowEvents !== 1 ? 's' : ''}
                              </span>
                              <span>
                                <span className="text-foreground font-medium">{row.unitsLent}</span> unit
                                {row.unitsLent !== 1 ? 's' : ''} lent
                              </span>
                            </div>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">Units</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary transition-all duration-500"
                                    style={{ width: `${unitMeter}%` }}
                                  />
                                </div>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="w-14 shrink-0 text-[10px] uppercase tracking-wide text-muted-foreground">Events</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div
                                    className="h-full rounded-full bg-primary/50 transition-all duration-500"
                                    style={{ width: `${eventMeter}%` }}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.li>
                    );
                  })}
                </ul>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
