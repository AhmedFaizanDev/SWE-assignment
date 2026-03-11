import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Check, X, ArrowUpRight } from 'lucide-react';
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

export default function Requests() {
  const { requests, inventory, addRequest, updateRequestStatus } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ itemId: '', requestedQty: 1, requestedBy: '', notes: '' });

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
    toast.success('Request submitted');
    setModalOpen(false);
    setForm({ itemId: '', requestedQty: 1, requestedBy: '', notes: '' });
  };

  const handleAction = (id: string, status: 'Approved' | 'Rejected' | 'Issued') => {
    updateRequestStatus(id, status);
    toast.success(`Request ${status.toLowerCase()}`);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{requests.length} total requests</p>
        <Button onClick={() => setModalOpen(true)} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> New Request
        </Button>
      </div>

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
                  {requests.map((req, idx) => (
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

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>New Request</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Item</Label>
              <Select value={form.itemId} onValueChange={v => setForm(f => ({ ...f, itemId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select item" /></SelectTrigger>
                <SelectContent>{inventory.map(i => <SelectItem key={i.id} value={i.id}>{i.name} (Qty: {i.quantity})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input type="number" min={1} value={form.requestedQty} onChange={e => setForm(f => ({ ...f, requestedQty: parseInt(e.target.value) || 1 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Requested By</Label>
                <Input value={form.requestedBy} onChange={e => setForm(f => ({ ...f, requestedBy: e.target.value }))} />
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
