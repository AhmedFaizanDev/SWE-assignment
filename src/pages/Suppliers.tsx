import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Star, Mail, Phone, MapPin } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { useInventory } from '@/contexts/InventoryContext';
import { Supplier } from '@/data/mockData';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const emptyForm = { name: '', contactPerson: '', email: '', phone: '', address: '', itemsSupplied: [] as string[], lastPurchaseDate: '', totalOrders: 0, rating: 4 };

export default function Suppliers() {
  const { suppliers, addSupplier, updateSupplier, deleteSupplier } = useInventory();
  const [modalOpen, setModalOpen] = useState(false);
  const [editSupplier, setEditSupplier] = useState<Supplier | null>(null);
  const [viewSupplier, setViewSupplier] = useState<Supplier | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [itemsText, setItemsText] = useState('');

  const openAdd = () => { setForm(emptyForm); setItemsText(''); setEditSupplier(null); setModalOpen(true); };
  const openEdit = (s: Supplier) => {
    setEditSupplier(s);
    setForm({ name: s.name, contactPerson: s.contactPerson, email: s.email, phone: s.phone, address: s.address, itemsSupplied: s.itemsSupplied, lastPurchaseDate: s.lastPurchaseDate, totalOrders: s.totalOrders, rating: s.rating });
    setItemsText(s.itemsSupplied.join(', '));
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!form.name || !form.email) { toast.error('Name and email required'); return; }
    const data = { ...form, itemsSupplied: itemsText.split(',').map(s => s.trim()).filter(Boolean) };
    if (editSupplier) {
      updateSupplier(editSupplier.id, data);
      toast.success('Supplier updated');
    } else {
      addSupplier(data);
      toast.success('Supplier added');
    }
    setModalOpen(false);
  };

  const handleDelete = () => {
    if (deleteId) { deleteSupplier(deleteId); toast.success('Supplier deleted'); setDeleteId(null); }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-sm text-muted-foreground">{suppliers.length} suppliers</p>
        <Button onClick={openAdd} size="sm" className="gap-1.5"><Plus className="h-4 w-4" /> Add Supplier</Button>
      </div>

      <motion.div initial="hidden" animate="show" variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
        className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {suppliers.map(s => (
          <motion.div key={s.id} variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}>
            <Card className="border-border/50 hover:shadow-md transition-all duration-300 cursor-pointer group" onClick={() => setViewSupplier(s)}>
              <CardContent className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-sm">{s.name}</h3>
                    <p className="text-xs text-muted-foreground">{s.contactPerson}</p>
                  </div>
                  <div className="flex items-center gap-0.5 text-warning">
                    <Star className="h-3.5 w-3.5 fill-current" />
                    <span className="text-xs font-medium">{s.rating}</span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 mb-3">
                  {s.itemsSupplied.slice(0, 3).map(item => (
                    <Badge key={item} variant="secondary" className="text-[10px]">{item}</Badge>
                  ))}
                  {s.itemsSupplied.length > 3 && <Badge variant="secondary" className="text-[10px]">+{s.itemsSupplied.length - 3}</Badge>}
                </div>
                <div className="flex justify-between items-center text-xs text-muted-foreground">
                  <span>{s.totalOrders} orders</span>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEdit(s)}><Edit2 className="h-3 w-3" /></Button>
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => setDeleteId(s.id)}><Trash2 className="h-3 w-3" /></Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </motion.div>

      {/* Detail Sheet */}
      <Sheet open={!!viewSupplier} onOpenChange={() => setViewSupplier(null)}>
        <SheetContent>
          <SheetHeader><SheetTitle>{viewSupplier?.name}</SheetTitle></SheetHeader>
          {viewSupplier && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center gap-2 text-sm"><Mail className="h-4 w-4 text-muted-foreground" />{viewSupplier.email}</div>
              <div className="flex items-center gap-2 text-sm"><Phone className="h-4 w-4 text-muted-foreground" />{viewSupplier.phone}</div>
              <div className="flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-muted-foreground" />{viewSupplier.address}</div>
              <div>
                <p className="text-xs font-medium text-muted-foreground mb-2">Items Supplied</p>
                <div className="flex flex-wrap gap-1">
                  {viewSupplier.itemsSupplied.map(i => <Badge key={i} variant="secondary" className="text-xs">{i}</Badge>)}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div><p className="text-xs text-muted-foreground">Total Orders</p><p className="font-semibold">{viewSupplier.totalOrders}</p></div>
                <div><p className="text-xs text-muted-foreground">Last Purchase</p><p className="font-semibold">{viewSupplier.lastPurchaseDate}</p></div>
                <div><p className="text-xs text-muted-foreground">Rating</p><div className="flex items-center gap-1"><Star className="h-4 w-4 text-warning fill-current" /><span className="font-semibold">{viewSupplier.rating}/5</span></div></div>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Add/Edit Modal */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>{editSupplier ? 'Edit Supplier' : 'Add Supplier'}</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2"><Label>Company Name</Label><Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label>Contact Person</Label><Input value={form.contactPerson} onChange={e => setForm(f => ({ ...f, contactPerson: e.target.value }))} /></div>
              <div className="grid gap-2"><Label>Phone</Label><Input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            </div>
            <div className="grid gap-2"><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Address</Label><Input value={form.address} onChange={e => setForm(f => ({ ...f, address: e.target.value }))} /></div>
            <div className="grid gap-2"><Label>Items Supplied (comma-separated)</Label><Input value={itemsText} onChange={e => setItemsText(e.target.value)} /></div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModalOpen(false)}>Cancel</Button>
            <Button onClick={handleSave}>{editSupplier ? 'Update' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader><AlertDialogTitle>Delete Supplier</AlertDialogTitle><AlertDialogDescription>This will permanently remove this supplier.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
