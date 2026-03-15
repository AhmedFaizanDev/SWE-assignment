import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RotateCcw, CalendarPlus, BookOpen, Package } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useInventory } from '@/contexts/InventoryContext';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const statusStyles: Record<string, string> = {
  Active: 'bg-primary/10 text-primary border-primary/20',
  Returned: 'bg-success/10 text-success border-success/20',
  Overdue: 'bg-destructive/10 text-destructive border-destructive/20',
};

export default function BorrowedEquipment() {
  const { borrowedItems, returnBorrowedItem, extendReturnDate } = useInventory();
  const [filter, setFilter] = useState<string>('all');
  const navigate = useNavigate();

  const filtered = filter === 'all' ? borrowedItems : borrowedItems.filter(b => b.status === filter);

  const handleReturn = (id: string) => {
    returnBorrowedItem(id);
    toast.success('Equipment marked as returned');
  };

  const handleExtend = (id: string, date: Date | undefined) => {
    if (date) {
      extendReturnDate(id, date.toISOString().split('T')[0]);
      toast.success('Return date extended');
    }
  };

  // Empty state
  if (borrowedItems.length === 0) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">Track who has borrowed equipment and return dates.</p>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-4">
            <BookOpen className="h-8 w-8 text-muted-foreground/50" />
          </div>
          <h3 className="text-lg font-semibold mb-1">No borrowed equipment</h3>
          <p className="text-sm text-muted-foreground mb-4">All items are in the lab</p>
          <Button variant="outline" onClick={() => navigate('/inventory')} className="gap-1.5">
            <Package className="h-4 w-4" /> View inventory
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">Track who has borrowed equipment and return dates.</p>

      <div className="flex gap-2 flex-wrap">
        {['all', 'Active', 'Overdue', 'Returned'].map(s => (
          <Button key={s} variant={filter === s ? 'default' : 'outline'} size="sm" className="text-xs capitalize"
            onClick={() => setFilter(s)}>{s === 'all' ? 'All' : s}</Button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <BookOpen className="h-8 w-8 text-muted-foreground/40 mb-3" />
          <p className="text-sm text-muted-foreground">No {filter.toLowerCase()} items</p>
        </div>
      ) : (
        <Card className="border-border/50">
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50 bg-muted/30">
                    {['Equipment', 'Borrowed By', 'Borrow Date', 'Return Date', 'Status', 'Actions'].map(h => (
                      <th key={h} className={`py-3 px-4 text-xs font-medium text-muted-foreground ${h === 'Actions' ? 'text-right' : 'text-left'}`}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <AnimatePresence>
                    {filtered.map((item, idx) => (
                      <motion.tr key={item.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: idx * 0.03 }}
                        className={cn(
                          "border-b border-border/30 hover:bg-muted/30 transition-colors group",
                          item.status === 'Overdue' && "border-l-2 border-l-destructive bg-destructive/[0.02]"
                        )}>
                        <td className="py-3 px-4 font-medium">{item.equipmentName}</td>
                        <td className="py-3 px-4">{item.borrowedBy}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">{item.borrowDate}</td>
                        <td className="py-3 px-4 text-muted-foreground text-xs">
                          {item.actualReturnDate || item.expectedReturnDate}
                          {item.actualReturnDate && <span className="text-success ml-1">(returned)</span>}
                        </td>
                        <td className="py-3 px-4">
                          <Badge className={`text-[10px] border ${statusStyles[item.status]}`} variant="outline">{item.status}</Badge>
                        </td>
                        <td className="py-3 px-4 text-right">
                          {item.status !== 'Returned' && (
                            <div className="flex gap-1 justify-end">
                              <Button variant="ghost" size="sm" className="h-7 gap-1 text-success text-xs" onClick={() => handleReturn(item.id)}>
                                <RotateCcw className="h-3 w-3" /> Return
                              </Button>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs">
                                    <CalendarPlus className="h-3 w-3" /> Extend
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="end">
                                  <p className="px-3 pt-3 text-xs font-medium text-muted-foreground">New return date</p>
                                  <Calendar
                                    mode="single"
                                    selected={new Date(item.expectedReturnDate)}
                                    onSelect={(d) => handleExtend(item.id, d)}
                                    disabled={(date) => date < new Date()}
                                    className={cn("p-3 pointer-events-auto")}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
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
    </div>
  );
}
