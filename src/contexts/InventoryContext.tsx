import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  InventoryItem, ItemRequest, BorrowedItem, Supplier, ActivityEntry,
  initialInventory, initialRequests, initialBorrowedItems, initialSuppliers, initialActivities,
} from '@/data/mockData';

interface InventoryContextType {
  inventory: InventoryItem[];
  requests: ItemRequest[];
  borrowedItems: BorrowedItem[];
  suppliers: Supplier[];
  activities: ActivityEntry[];
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  addRequest: (req: Omit<ItemRequest, 'id'>) => void;
  updateRequestStatus: (id: string, status: ItemRequest['status']) => void;
  addBorrowedItem: (item: Omit<BorrowedItem, 'id'>) => void;
  returnBorrowedItem: (id: string) => void;
  extendReturnDate: (id: string, newDate: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  addActivity: (entry: Omit<ActivityEntry, 'id'>) => void;
}

const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
};

let nextId = 100;
const genId = (prefix: string) => `${prefix}-${String(++nextId).padStart(3, '0')}`;

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [inventory, setInventory] = useState<InventoryItem[]>(initialInventory);
  const [requests, setRequests] = useState<ItemRequest[]>(initialRequests);
  const [borrowedItems, setBorrowedItems] = useState<BorrowedItem[]>(initialBorrowedItems);
  const [suppliers, setSuppliers] = useState<Supplier[]>(initialSuppliers);
  const [activities, setActivities] = useState<ActivityEntry[]>(initialActivities);

  const addActivity = useCallback((entry: Omit<ActivityEntry, 'id'>) => {
    setActivities(prev => [{ ...entry, id: genId('ACT') }, ...prev]);
  }, []);

  const addInventoryItem = useCallback((item: Omit<InventoryItem, 'id'>) => {
    const newItem = { ...item, id: genId('INV') };
    setInventory(prev => [...prev, newItem]);
    addActivity({ type: 'restocked', description: `${item.name} added to inventory (${item.quantity} units)`, timestamp: new Date().toISOString(), user: 'Admin' });
  }, [addActivity]);

  const updateInventoryItem = useCallback((id: string, updates: Partial<InventoryItem>) => {
    setInventory(prev => prev.map(i => i.id === id ? { ...i, ...updates } : i));
  }, []);

  const deleteInventoryItem = useCallback((id: string) => {
    setInventory(prev => prev.filter(i => i.id !== id));
  }, []);

  const addRequest = useCallback((req: Omit<ItemRequest, 'id'>) => {
    const newReq = { ...req, id: genId('REQ') };
    setRequests(prev => [...prev, newReq]);
    addActivity({ type: 'requested', description: `${req.itemName} (x${req.requestedQty}) requested by ${req.requestedBy}`, timestamp: new Date().toISOString(), user: req.requestedBy });
  }, [addActivity]);

  const updateRequestStatus = useCallback((id: string, status: ItemRequest['status']) => {
    setRequests(prev => {
      const req = prev.find(r => r.id === id);
      if (!req) return prev;

      if (status === 'Issued') {
        // Deduct from inventory
        setInventory(inv => inv.map(i => i.id === req.itemId ? { ...i, quantity: Math.max(0, i.quantity - req.requestedQty) } : i));
        // Add to borrowed
        const borrowed: BorrowedItem = {
          id: genId('BRW'),
          itemId: req.itemId,
          equipmentName: req.itemName,
          borrowedBy: req.requestedBy,
          borrowDate: new Date().toISOString().split('T')[0],
          expectedReturnDate: new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0],
          status: 'Active',
        };
        setBorrowedItems(b => [...b, borrowed]);
        addActivity({ type: 'issued', description: `${req.itemName} (x${req.requestedQty}) issued to ${req.requestedBy}`, timestamp: new Date().toISOString(), user: 'Admin' });
      } else if (status === 'Approved') {
        addActivity({ type: 'approved', description: `${req.itemName} request approved for ${req.requestedBy}`, timestamp: new Date().toISOString(), user: 'Admin' });
      } else if (status === 'Rejected') {
        addActivity({ type: 'rejected', description: `${req.itemName} request rejected for ${req.requestedBy}`, timestamp: new Date().toISOString(), user: 'Admin' });
      }

      return prev.map(r => r.id === id ? { ...r, status } : r);
    });
  }, [addActivity]);

  const addBorrowedItem = useCallback((item: Omit<BorrowedItem, 'id'>) => {
    setBorrowedItems(prev => [...prev, { ...item, id: genId('BRW') }]);
  }, []);

  const returnBorrowedItem = useCallback((id: string) => {
    setBorrowedItems(prev => {
      const item = prev.find(b => b.id === id);
      if (item) {
        setInventory(inv => inv.map(i => i.id === item.itemId ? { ...i, quantity: i.quantity + 1 } : i));
        addActivity({ type: 'returned', description: `${item.equipmentName} returned by ${item.borrowedBy}`, timestamp: new Date().toISOString(), user: item.borrowedBy });
      }
      return prev.map(b => b.id === id ? { ...b, status: 'Returned' as const, actualReturnDate: new Date().toISOString().split('T')[0] } : b);
    });
  }, [addActivity]);

  const extendReturnDate = useCallback((id: string, newDate: string) => {
    setBorrowedItems(prev => prev.map(b => b.id === id ? { ...b, expectedReturnDate: newDate } : b));
  }, []);

  const addSupplier = useCallback((supplier: Omit<Supplier, 'id'>) => {
    setSuppliers(prev => [...prev, { ...supplier, id: genId('SUP') }]);
  }, []);

  const updateSupplier = useCallback((id: string, updates: Partial<Supplier>) => {
    setSuppliers(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
  }, []);

  const deleteSupplier = useCallback((id: string) => {
    setSuppliers(prev => prev.filter(s => s.id !== id));
  }, []);

  return (
    <InventoryContext.Provider value={{
      inventory, requests, borrowedItems, suppliers, activities,
      addInventoryItem, updateInventoryItem, deleteInventoryItem,
      addRequest, updateRequestStatus,
      addBorrowedItem, returnBorrowedItem, extendReturnDate,
      addSupplier, updateSupplier, deleteSupplier, addActivity,
    }}>
      {children}
    </InventoryContext.Provider>
  );
};
