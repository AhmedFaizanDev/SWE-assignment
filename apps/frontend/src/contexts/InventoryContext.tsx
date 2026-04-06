import React, { createContext, useContext, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  InventoryItem,
  ItemRequest,
  BorrowedItem,
  Supplier,
  ActivityEntry,
} from '@/data/types';
import {
  inventoryApi,
  suppliersApi,
  requestsApi,
  borrowedApi,
  activityApi,
} from '@/lib/api';
import { toast } from 'sonner';

const QUERY_KEYS = {
  inventory: ['inventory'] as const,
  suppliers: ['suppliers'] as const,
  requests: (status?: string) => ['requests', status] as const,
  borrowed: (status?: string) => ['borrowed', status] as const,
  activity: (limit?: number) => ['activity', limit] as const,
};

interface InventoryContextType {
  inventory: InventoryItem[];
  requests: ItemRequest[];
  borrowedItems: BorrowedItem[];
  suppliers: Supplier[];
  activities: ActivityEntry[];
  isLoading: boolean;
  isError: boolean;
  inventoryError: boolean;
  suppliersError: boolean;
  requestsError: boolean;
  borrowedError: boolean;
  activityError: boolean;
  addInventoryItem: (item: Omit<InventoryItem, 'id'>) => void;
  updateInventoryItem: (id: string, item: Partial<InventoryItem>) => void;
  deleteInventoryItem: (id: string) => void;
  addRequest: (req: Omit<ItemRequest, 'id'>) => void;
  updateRequestStatus: (id: string, status: ItemRequest['status']) => void;
  returnBorrowedItem: (id: string) => void;
  extendReturnDate: (id: string, newDate: string) => void;
  addSupplier: (supplier: Omit<Supplier, 'id'>) => void;
  updateSupplier: (id: string, supplier: Partial<Supplier>) => void;
  deleteSupplier: (id: string) => void;
  refetch: () => void;
}

export const InventoryContext = createContext<InventoryContextType | null>(null);

export const useInventory = () => {
  const ctx = useContext(InventoryContext);
  if (!ctx) throw new Error('useInventory must be used within InventoryProvider');
  return ctx;
};

export const InventoryProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = useQueryClient();

  const { data: inventory = [], isLoading: invLoading, isError: invError } = useQuery({
    queryKey: QUERY_KEYS.inventory,
    queryFn: () => inventoryApi.list(),
  });

  const { data: suppliers = [], isLoading: supLoading, isError: supError } = useQuery({
    queryKey: QUERY_KEYS.suppliers,
    queryFn: () => suppliersApi.list(),
  });

  const { data: requests = [], isLoading: reqLoading, isError: reqError } = useQuery({
    queryKey: QUERY_KEYS.requests(),
    queryFn: () => requestsApi.list(),
  });

  const { data: borrowedItems = [], isLoading: borLoading, isError: borError } = useQuery({
    queryKey: QUERY_KEYS.borrowed(),
    queryFn: () => borrowedApi.list(),
  });

  const { data: activities = [], isLoading: actLoading, isError: actError } = useQuery({
    queryKey: QUERY_KEYS.activity(),
    queryFn: () => activityApi.list(),
  });

  const isLoading = invLoading || supLoading || reqLoading || borLoading || actLoading;
  const inventoryError = !!invError;
  const suppliersError = !!supError;
  const requestsError = !!reqError;
  const borrowedError = !!borError;
  const activityError = !!actError;
  const isError = inventoryError || suppliersError || requestsError || borrowedError || activityError;

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.borrowed() });
    queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activity() });
  }, [queryClient]);

  const addInventoryMutation = useMutation({
    mutationFn: inventoryApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activity() });
      toast.success('Item added');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to add item'),
  });

  const updateInventoryMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<InventoryItem> }) =>
      inventoryApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      toast.success('Item updated');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to update item'),
  });

  const deleteInventoryMutation = useMutation({
    mutationFn: inventoryApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.borrowed() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activity() });
      toast.success('Item deleted');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete item'),
  });

  const addRequestMutation = useMutation({
    mutationFn: requestsApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.requests() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activity() });
      toast.success('Request submitted');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to submit request'),
  });

  const updateRequestStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ItemRequest['status'] }) =>
      requestsApi.updateStatus(id, status),
    onSuccess: () => {
      invalidateAll();
      toast.success('Request updated');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to update request'),
  });

  const returnBorrowedMutation = useMutation({
    mutationFn: borrowedApi.return,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.borrowed() });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.activity() });
      toast.success('Equipment marked as returned');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to return item'),
  });

  const extendReturnDateMutation = useMutation({
    mutationFn: ({ id, expectedReturnDate }: { id: string; expectedReturnDate: string }) =>
      borrowedApi.extendDate(id, expectedReturnDate),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.borrowed() });
      toast.success('Return date extended');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to extend date'),
  });

  const addSupplierMutation = useMutation({
    mutationFn: suppliersApi.create,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
      toast.success('Supplier added');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to add supplier'),
  });

  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Partial<Supplier> }) =>
      suppliersApi.update(id, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      toast.success('Supplier updated');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to update supplier'),
  });

  const deleteSupplierMutation = useMutation({
    mutationFn: suppliersApi.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.suppliers });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.inventory });
      toast.success('Supplier deleted');
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : 'Failed to delete supplier'),
  });

  const addInventoryItem = useCallback(
    (item: Omit<InventoryItem, 'id'>) => addInventoryMutation.mutate(item),
    [addInventoryMutation]
  );

  const updateInventoryItem = useCallback(
    (id: string, item: Partial<InventoryItem>) =>
      updateInventoryMutation.mutate({ id, body: item }),
    [updateInventoryMutation]
  );

  const deleteInventoryItem = useCallback(
    (id: string) => deleteInventoryMutation.mutate(id),
    [deleteInventoryMutation]
  );

  const addRequest = useCallback(
    (req: Omit<ItemRequest, 'id'>) => addRequestMutation.mutate(req),
    [addRequestMutation]
  );

  const updateRequestStatus = useCallback(
    (id: string, status: ItemRequest['status']) =>
      updateRequestStatusMutation.mutate({ id, status }),
    [updateRequestStatusMutation]
  );

  const returnBorrowedItem = useCallback(
    (id: string) => returnBorrowedMutation.mutate(id),
    [returnBorrowedMutation]
  );

  const extendReturnDate = useCallback(
    (id: string, newDate: string) =>
      extendReturnDateMutation.mutate({ id, expectedReturnDate: newDate }),
    [extendReturnDateMutation]
  );

  const addSupplier = useCallback(
    (supplier: Omit<Supplier, 'id'>) => addSupplierMutation.mutate(supplier),
    [addSupplierMutation]
  );

  const updateSupplier = useCallback(
    (id: string, supplier: Partial<Supplier>) =>
      updateSupplierMutation.mutate({ id, body: supplier }),
    [updateSupplierMutation]
  );

  const deleteSupplier = useCallback(
    (id: string) => deleteSupplierMutation.mutate(id),
    [deleteSupplierMutation]
  );

  const refetch = useCallback(() => {
    invalidateAll();
  }, [invalidateAll]);

  return (
    <InventoryContext.Provider
      value={{
        inventory,
        requests,
        borrowedItems,
        suppliers,
        activities,
        isLoading,
        isError,
        inventoryError,
        suppliersError,
        requestsError,
        borrowedError,
        activityError,
        addInventoryItem,
        updateInventoryItem,
        deleteInventoryItem,
        addRequest,
        updateRequestStatus,
        returnBorrowedItem,
        extendReturnDate,
        addSupplier,
        updateSupplier,
        deleteSupplier,
        refetch,
      }}
    >
      {children}
    </InventoryContext.Provider>
  );
};
