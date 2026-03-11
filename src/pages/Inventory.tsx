import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Search, Edit2, Trash2, Eye, ChevronUp, ChevronDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useInventory } from '@/contexts/InventoryContext';
import { InventoryItem } from '@/data/mockData';
import { toast } from 'sonner';

const categories = ['Electronics', 'Mechanical', 'Tools', 'Consumables'] as const;

function getStatus(item: InventoryItem) {
  if (item.quantity === 0) return 'Out of Stock';
  if (item.quantity <= item.minThreshold / 2) return 'Critical';
  if (item.quantity <= item.minThreshold) return 'Low Stock';
  return 'Available';
}

function StatusBadge({ item }: { item: InventoryItem }) {
  const status = getStatus(item);
  const variant = status === 'Available' ? 'default' : status === 'Low Stock' ? 'secondary' : 'destructive';
  return <Badge variant={variant} className="text-[10px]">{status}</Badge>;
}

const emptyForm = { name: '', category: 'Electronics' as InventoryItem['category'], quantity: 0, minThreshold: 5, location: '', supplier: '', purchaseDate: '', notes: '', unitPrice: 0 };

export default function Inventory() {
  const { inventory, suppliers, addInventoryItem, updateInventoryItem, deleteInventoryItem } = useInventory();
  const [search, setSearch] = useState('');
  const [sortKey, setSortKey] = useState<keyof InventoryItem>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(0);
  const [modalOpen, setModalOpen] = useState(false);
  const [viewItem, setViewItem] = useState<InventoryItem | null>(null);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const perPage = 10;

  const filtered = inventory
    .filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || i.category.toLowerCase().includes(search.toLowerCase()) || i.location.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      const aVal = a[sortKey], bVal = b[sortKey];
      if (typeof aVal === 'number' && typeof bVal === 'number') return sortDir === 'asc' ? aVal - bVal : bVal - aVal;
      return sortDir === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });

  const totalPages = Math.ceil(filtered.length / perPage);
  const paged = filtered.slice(page * perPage, (page + 1) * perPage);

  const handleSort = (key: keyof InventoryItem) => {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('asc'); }
  };

  const openAdd = () => { setForm(emptyForm); setEditItem(null); setModalOpen(true); };
  const openEdit = (item: InventoryItem) => {
    setEditItem(item);
    setForm({ name: item.name, category: item.category, quantity: item.quantity, minThreshold: item.minThreshold, location: item.location, supplier: item.supplier, purchaseDate: item.purchaseDate, notes: item.notes, unitPrice: item.unitPrice });
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.location) { toast.error('Name and location are required'); return; }
    if (editItem) {
      updateInventoryItem(editItem.id, form);
      toast.success('Item updated');
    } else {
      addInventoryItem(form);
      toast.success('Item added');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deleteInventoryItem(deleteId); toast.success('Item deleted'); setDeleteId(null); }
  };

  const SortIcon = ({ col }: { col: keyof InventoryItem }) => sortKey === col ? (sortDir === 'asc' ? <ChevronUp className="h-3 w-3 inline ml-0.5" /> : <ChevronDown className="h-3 w-3 inline ml-0.5" />) : null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search items..." value={search} onChange={e => { setSearch(e.target.value); setPage(0); }} className="pl-9 h-9 bg-muted/50 border-0" />
        </div>
        <Button onClick={openAdd} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" /> Add Item
        </Button>
      </div>

      <Card className="border-border/50">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50 bg-muted/30">
                  {[
                    { key: 'name' as const, label: 'Item Name' },
                    { key: 'category' as const, label: 'Category' },
                    { key: 'quantity' as const, label: 'Qty' },
                    { key: 'location' as const, label: 'Location' },
                  ].map(col => (
                    <th key={col.key} className="text-left py-3 px-4 text-xs font-medium text-muted-foreground cursor-pointer hover:text-foreground transition-colors" onClick={() => handleSort(col.key)}>
                      {col.label}<SortIcon col={col.key} />
                    </th>
                  ))}
                  <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground">Status</th>
                  <th className="text-right py-3 px-4 text-xs font-medium text-muted-foreground">Actions</th>
                </tr>
              </thead>
              <tbody>
                <AnimatePresence>
                  {paged.map((item, idx) => (
                    <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                      className="border-b border-border/30 hover:bg-muted/30 transition-colors group">
                      <td className="py-3 px-4 font-medium">{item.name}</td>
                      <td className="py-3 px-4 text-muted-foreground">{item.category}</td>
                      <td className="py-3 px-4 font-mono">{item.quantity}</td>
                      <td className="py-3 px-4 text-muted-foreground text-xs">{item.location}</td>
                      <td className="py-3 px-4"><StatusBadge item={item} /></td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setViewItem(item)}><Eye className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(item)}><Edit2 className="h-3.5 w-3.5" /></Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => setDeleteId(item.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border/50">
              <p className="text-xs text-muted-foreground">Showing {page * perPage + 1}–{Math.min((page + 1) * perPage, filtered.length)} of {filtered.length}</p>
              <div className="flex gap-1">
                <Button variant="outline" size="sm" disabled={page === 0} onClick={() => setPage(p => p - 1)}>Prev</Button>
                <Button variant="outline" size="sm" disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}>Next</Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editItem ? 'Edit Item' : 'Add New Item'}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Item Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Category</Label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Quantity</Label>
                <Input type="number" value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Min Threshold</Label>
                <Input type="number" value={form.minThreshold} onChange={e => setForm(f => ({ ...f, minThreshold: parseInt(e.target.value) || 0 }))} />
              </div>
              <div className="grid gap-2">
                <Label>Unit Price ($)</Label>
                <Input type="number" step="0.01" value={form.unitPrice} onChange={e => setForm(f => ({ ...f, unitPrice: parseFloat(e.target.value) || 0 }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Location</Label>
              <Input value={form.location} onChange={e => setForm(f => ({ ...f, location: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Supplier</Label>
                <Select value={form.supplier} onValueChange={v => setForm(f => ({ ...f, supplier: v }))}>
                  <SelectTrigger><SelectValue placeholder="Select supplier" /></SelectTrigger>
                  <SelectContent>{suppliers.map(s => <SelectItem key={s.id} value={s.name}>{s.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Purchase Date</Label>
                <Input type="date" value={form.purchaseDate} onChange={e => setForm(f => ({ ...f, purchaseDate: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Notes</Label>
              <Textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editItem ? 'Update' : 'Add Item'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Modal */}
      <Dialog open={!!viewItem} onOpenChange={() => setViewItem(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{viewItem?.name}</DialogTitle></DialogHeader>
          {viewItem && (
            <div className="grid gap-3 text-sm py-2">
              {[
                ['ID', viewItem.id], ['Category', viewItem.category], ['Quantity', viewItem.quantity],
                ['Min Threshold', viewItem.minThreshold], ['Location', viewItem.location],
                ['Supplier', viewItem.supplier], ['Purchase Date', viewItem.purchaseDate],
                ['Unit Price', `$${viewItem.unitPrice.toFixed(2)}`], ['Notes', viewItem.notes],
              ].map(([label, val]) => (
                <div key={String(label)} className="flex justify-between">
                  <span className="text-muted-foreground">{label}</span>
                  <span className="font-medium text-right max-w-[60%]">{String(val)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Status</span>
                <StatusBadge item={viewItem} />
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Item</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone. The item will be permanently removed.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
