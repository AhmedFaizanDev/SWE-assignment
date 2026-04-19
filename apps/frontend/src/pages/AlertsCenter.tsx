import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bell, AlertTriangle, ShieldAlert, Package, Truck, CheckCircle, XCircle,
  RefreshCw, Filter, Eye,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { alertsApi, ApiError } from '@/lib/api';
import type { AlertRecord } from '@/data/types';

const DETAIL_LABELS: Record<string, string> = {
  quantity: 'Quantity on hand',
  minThreshold: 'Min threshold',
  stockRatio: 'Stock vs threshold',
  carryingCost: 'Carrying cost signal ($)',
  dailyDemand: 'Daily demand (est.)',
  daysOfStock: 'Days of cover (est.)',
  rating: 'Supplier rating',
  totalOrders: 'Recorded orders',
  itemCount: 'Linked inventory items',
};

function formatDetailValue(key: string, value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'number') {
    if (key === 'stockRatio' || key === 'rating') return Number.isInteger(value) ? String(value) : value.toFixed(1);
    if (key === 'carryingCost' || key === 'dailyDemand') return value.toFixed(2);
    if (key === 'daysOfStock') return value >= 900 ? 'N/A' : String(Math.round(value));
    return String(value);
  }
  return String(value);
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/** Remove legacy tail like `Factors: {'qty': 1}` (Python repr) from stored alert messages. */
function stripLegacyFactorsSuffix(message: string): string {
  const match = message.match(/\bFactors:\s*\{/i);
  if (!match || match.index === undefined) return message.trim();
  const openBrace = message.indexOf('{', match.index);
  if (openBrace < 0) return message.trim();
  let depth = 0;
  for (let i = openBrace; i < message.length; i++) {
    const ch = message[i];
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) {
        return `${message.slice(0, match.index)}${message.slice(i + 1)}`.replace(/\s{2,}/g, ' ').trim();
      }
    }
  }
  return message.trim();
}

/**
 * Human-readable paragraph: never show raw dict text when `details` has structured fields.
 * Drops redundant "Something score: N%." when it only duplicates the risk badge.
 */
function displayableAlertMessage(
  message: string,
  detailObj: Record<string, unknown> | null,
  riskFraction: number | null,
): string | null {
  let t = message.trim();
  if (!t) return null;

  const hasDetails = !!(detailObj && Object.keys(detailObj).length > 0);

  if (hasDetails) {
    t = stripLegacyFactorsSuffix(t);
    if (/^factors:\s*\{/i.test(t)) return null;
    if (t.startsWith('{') && t.includes('minThreshold')) return null;
  }

  if (hasDetails && riskFraction !== null && riskFraction !== undefined) {
    const pct = Math.round(riskFraction * 100);
    const scoreTail = t.match(/^(.+?)\s+score:\s*(\d+)%\.?\s*$/i);
    if (scoreTail && parseInt(scoreTail[2], 10) === pct) return null;
  }

  return t || null;
}

function AlertDetails({ details }: { details: Record<string, unknown> }) {
  const entries = Object.entries(details).filter(([, v]) => v !== null && v !== undefined && v !== '');
  if (entries.length === 0) return null;
  return (
    <dl className="mt-2 grid grid-cols-1 gap-x-4 gap-y-1 sm:grid-cols-2 text-[11px]">
      {entries.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-2 border-b border-border/40 pb-1 last:border-0">
          <dt className="text-muted-foreground shrink-0">{DETAIL_LABELS[k] ?? k.replace(/([A-Z])/g, ' $1').trim()}</dt>
          <dd className="font-medium text-right tabular-nums">{formatDetailValue(k, v)}</dd>
        </div>
      ))}
    </dl>
  );
}

const severityConfig: Record<string, { icon: React.ReactNode; badge: 'destructive' | 'secondary' | 'default' }> = {
  critical: { icon: <AlertTriangle className="h-4 w-4 text-destructive" />, badge: 'destructive' },
  warning: { icon: <ShieldAlert className="h-4 w-4 text-yellow-600" />, badge: 'secondary' },
  info: { icon: <Bell className="h-4 w-4 text-blue-500" />, badge: 'default' },
};

const typeIcons: Record<string, React.ReactNode> = {
  stockout: <Package className="h-3.5 w-3.5" />,
  overstock: <Package className="h-3.5 w-3.5" />,
  supplier_delay: <Truck className="h-3.5 w-3.5" />,
  demand_spike: <AlertTriangle className="h-3.5 w-3.5" />,
};

export default function AlertsCenter() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState('active');
  const [severityFilter, setSeverityFilter] = useState<string>('all');

  const { data: alerts = [], isLoading, isError, refetch } = useQuery({
    queryKey: ['alerts', statusFilter],
    queryFn: () => alertsApi.list({ status: statusFilter }),
  });

  const computeMutation = useMutation({
    mutationFn: () => alertsApi.computeRisks(),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success(`Computed ${res.riskScores} risk scores, generated ${res.alertsGenerated} alerts`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Failed to compute risks';
      toast.error(msg);
    },
  });

  const actionMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => alertsApi.action(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['alerts'] });
      toast.success('Alert updated');
    },
    onError: (err: unknown) => {
      const msg = err instanceof ApiError ? err.message : err instanceof Error ? err.message : 'Could not update alert';
      toast.error(msg);
    },
  });

  const filtered = severityFilter === 'all'
    ? alerts
    : alerts.filter((a: AlertRecord) => a.severity === severityFilter);

  const criticalCount = alerts.filter((a: AlertRecord) => a.severity === 'critical').length;
  const warningCount = alerts.filter((a: AlertRecord) => a.severity === 'warning').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="h-6 w-6 text-primary" /> Alerts Center
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Risk-based alerts for stockout, overstock, and supplier issues
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isError && (
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry alerts
            </Button>
          )}
          <Button onClick={() => computeMutation.mutate()} disabled={computeMutation.isPending} className="gap-2">
            {computeMutation.isPending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
            Scan Risks
          </Button>
        </div>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          Could not load alerts. Check the API at{' '}
          <code className="text-xs">{import.meta.env.VITE_API_URL ?? 'http://localhost:8000'}</code>.
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-destructive/20 bg-destructive/5">
          <CardContent className="p-4 flex items-center gap-3">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <div>
              <p className="text-2xl font-bold">{criticalCount}</p>
              <p className="text-xs text-muted-foreground">Critical alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/20 bg-yellow-500/5">
          <CardContent className="p-4 flex items-center gap-3">
            <ShieldAlert className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-2xl font-bold">{warningCount}</p>
              <p className="text-xs text-muted-foreground">Warning alerts</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-border/50">
          <CardContent className="p-4 flex items-center gap-3">
            <Bell className="h-8 w-8 text-blue-500" />
            <div>
              <p className="text-2xl font-bold">{alerts.length}</p>
              <p className="text-xs text-muted-foreground">Total {statusFilter} alerts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-32 h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="acknowledged">Acknowledged</SelectItem>
              <SelectItem value="resolved">Resolved</SelectItem>
              <SelectItem value="dismissed">Dismissed</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-28 h-8 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="critical">Critical</SelectItem>
            <SelectItem value="warning">Warning</SelectItem>
            <SelectItem value="info">Info</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Alerts List */}
      {isLoading ? (
        <div className="text-center py-12 text-muted-foreground">Loading alerts...</div>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <CheckCircle className="h-10 w-10 mx-auto text-emerald-500/40 mb-3" />
            <p className="text-sm text-muted-foreground">No {statusFilter} alerts{severityFilter !== 'all' ? ` with ${severityFilter} severity` : ''}.</p>
            <p className="text-xs text-muted-foreground mt-1">Click "Scan Risks" to analyze your inventory for potential issues.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((alert: AlertRecord) => {
              const cfg = severityConfig[alert.severity] || severityConfig.info;
              const detailObj = isPlainObject(alert.details) ? alert.details : null;
              const showDetails = detailObj && Object.keys(detailObj).length > 0;
              const bodyText = displayableAlertMessage(
                alert.message,
                detailObj,
                alert.riskScore,
              );
              return (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}>
                  <Card>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <div className="mt-0.5">{cfg.icon}</div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="text-sm font-semibold">{alert.title}</h4>
                              <Badge variant={cfg.badge} className="text-[10px]">{alert.severity}</Badge>
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                {typeIcons[alert.alertType] ?? <Package className="h-3.5 w-3.5" />}{' '}
                                {alert.alertType.replace(/_/g, ' ')}
                              </div>
                              {alert.riskScore !== null && (
                                <Badge variant="outline" className="text-[10px]">{Math.round(alert.riskScore * 100)}% risk</Badge>
                              )}
                            </div>
                            {bodyText && (
                              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">{bodyText}</p>
                            )}
                            {showDetails && <AlertDetails details={detailObj} />}
                            <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 mt-1.5 text-[10px] text-muted-foreground">
                              {alert.status !== 'active' && (
                                <Badge variant="outline" className="text-[9px] font-normal capitalize">
                                  {alert.status}
                                </Badge>
                              )}
                              {alert.itemName && <span>Item: {alert.itemName}</span>}
                              {alert.supplierName && <span>Supplier: {alert.supplierName}</span>}
                              <span>{new Date(alert.createdAt).toLocaleString()}</span>
                              {alert.resolvedAt && (
                                <span>Resolved: {new Date(alert.resolvedAt).toLocaleString()}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        {(alert.status === 'active' || alert.status === 'acknowledged') && (
                          <div className="flex gap-1 shrink-0">
                            {alert.status === 'active' && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 text-xs gap-1"
                                disabled={actionMutation.isPending}
                                onClick={() => actionMutation.mutate({ id: alert.id, status: 'acknowledged' })}
                              >
                                <Eye className="h-3 w-3" /> Ack
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1"
                              disabled={actionMutation.isPending}
                              onClick={() => actionMutation.mutate({ id: alert.id, status: 'resolved' })}
                            >
                              <CheckCircle className="h-3 w-3" /> Resolve
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs gap-1 text-muted-foreground"
                              disabled={actionMutation.isPending}
                              onClick={() => actionMutation.mutate({ id: alert.id, status: 'dismissed' })}
                            >
                              <XCircle className="h-3 w-3" /> Dismiss
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}
