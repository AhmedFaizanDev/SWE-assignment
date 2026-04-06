import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, ArrowUpRight, FileText, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { useInventory } from '@/contexts/InventoryContext';
import { toast } from 'sonner';

const statusStyles: Record<string, string> = {
  Pending: 'bg-muted text-muted-foreground',
  Approved: 'bg-success/10 text-success border-success/20',
  Rejected: 'bg-destructive/10 text-destructive border-destructive/20',
  Issued: 'bg-primary/10 text-primary border-primary/20',
};

const statusFilters = ['All', 'Pending', 'Approved', 'Rejected', 'Issued'] as const;

export default function Requests() {
  const { requests, inventory, addRequest, updateRequestStatus, isLoading, requestsError, inventoryError } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ itemId: '', requestedQty: 1, requestedBy: '', notes: '' });
  const [filter, setFilter] = useState<string>('All');

  const selectedItem = inventory.find(i => i.id === form.itemId);
  const qtyWarning = selectedItem && form.requestedQty > selectedItem.quantity;

  const filtered = filter === 'All' ? requests : requests.filter(r => r.status === filter);

  const handleAdd = () => {
    const item = inventory.find(i => i.id === form.itemId);
    if (!item || !form.requestedBy) { toast.error('Please fill all required fields'); return; }
    addRequest({
      itemId: form.itemId,
      itemName: item.name,
      requestedQty: form.requestedQty,
      requestedBy: form.requestedBy,
      requestDate: new Date().toISOString().split('T')[0],
      status: 'Pending',
      notes: form.notes,
    });
    setModalOpen(false);
    setForm({ itemId: '', requestedQty: 1, requestedBy: '', notes: '' });
  };

  const handleAction = (id: string, status: 'Approved' | 'Rejected' | 'Issued') => {
    updateRequestStatus(id, status);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (requestsError || inventoryError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="h-10 w-10 text-destructive mb-3" />
        <p className="text-sm font-medium">Failed to load requests</p>
        <p className="text-xs text-muted-foreground mt-1">Please check that the API server is running and try refreshing.</p>
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Create and manage item requests and approvals.</p>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <FileText className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No requests yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Submit a request to get equipment or consumables</p>
          <Button onClick={() => setModalOpen(true)} className="gap-1.5"><Plus className="h-4 w-4" /> New Request</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Create and manage item requests and approvals.</p>

      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          {statusFilters.map(s => (
            <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" className="text-xs" onClick={() => setFilter(s)}>{s}</Button>
          ))}
        </div>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <FileText className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No {filter.toLowerCase()} requests</p>
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    {['Request ID', 'Item', 'Qty', 'Requested By', 'Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className={`py-3 px-4 text-xs font-medium text-muted-foreground ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((req, idx) => (
                      <motion.tr key={req.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                        className="border-b border-border/30 hover:bg-muted/30 transition-colors group">
                        <td className="py-3 px-4 font-mono text-xs text-muted-foreground">{req.id}</td>
                        <td className="py-3 px-4 font-medium">{req.itemName}</td>
                        <td className="py-3 px-4 font-mono">{req.requestedQty}</td>
                        <td className="py-3 px-4">{req.requestedBy}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{req.requestDate}</td>
                        <td className="py-3 px-4">
                          <Badge className={`text-[10px] border ${statusStyles[req.status]}`} variant="outline">{req.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <div className="flex gap-1 justify-end">
                            {req.status === 'Pending' && (
                              <>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-success" onClick={() => handleAction(req.id, 'Approved')} title="Approve">
                                  <Check className="h-3.5 w-3.5" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => handleAction(req.id, 'Rejected')} title="Reject">
                                  <X className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {req.status === 'Approved' && (
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-primary text-xs" onClick={() => handleAction(req.id, 'Issued')}>
                                <ArrowUpRight className="h-3 w-3" /> Issue
                              </Button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Item <span className="text-destructive">*</span></Label>
              <Select value={form.itemId} onValueChange={v => setForm(f => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (Qty: {i.quantity})</SelectItem>)}</SelectContent>
              </Select>
              {selectedItem && <p className="text-xs text-muted-foreground">Available: {selectedItem.quantity}</p>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity <span className="text-destructive">*</span></Label>
                <Input type="number" min={1} value={form.requestedQty} onChange={e => setForm(f => ({ ...f, requestedQty: parseInt(e.target.value) || 1 }))} />
                {selectedItem && <p className="text-[10px] text-muted-foreground">Max available: {selectedItem.quantity}</p>}
                {qtyWarning && (
                  <p className="text-[10px] text-warning flex items-center gap-1"><AlertTriangle className="h-3 w-3" /> Exceeds available stock</p>
                )}
              </div>
              <div className="grid gap-2">
                <Label>Requested By <span className="text-destructive">*</span></Label>
                <Input value={form.requestedBy} onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))} placeholder="e.g. Dr. Sharma" />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleAdd}>Submit Request</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
