import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight, RotateCcw, CheckCircle, XCircle, Clock, Inbox, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useInventory } from '@/contexts/InventoryContext';

const activityIcons: Record<string, React.ReactNode> = {
  issued: <ArrowUpRight className="h-4 w-4 text-info" />,
  returned: <RotateCcw className="h-4 w-4 text-success" />,
  restocked: <ArrowDownRight className="h-4 w-4 text-success" />,
  requested: <Clock className="h-4 w-4 text-warning" />,
  approved: <CheckCircle className="h-4 w-4 text-success" />,
  rejected: <XCircle className="h-4 w-4 text-destructive" />,
};

export default function Activity() {
  const { activities, isLoading, activityError } = useInventory();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (activityError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium">Failed to load activity data</p>
        <p className="text-xs text-muted-foreground mt-1">Please check that the API server is running and try refreshing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Full history of all system events</p>

      <Card className="border-border/50">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">All Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {activities.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-10 w-10 text-muted-foreground/40 mb-3" />
              <p className="text-sm font-medium text-muted-foreground">No recent activity</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Actions like issuing, returning, and restocking will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {activities.map((a, idx) => (
                <motion.div key={a.id} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
                  className="flex gap-3 items-start py-2 border-b border-border/30 last:border-0">
                  <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
                    {activityIcons[a.type] ?? <Clock className="h-4 w-4 text-muted-foreground" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{a.description}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">by {a.user} · {a.timestamp ? new Date(a.timestamp).toLocaleString() : ''}</p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
