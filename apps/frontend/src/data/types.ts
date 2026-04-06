/**
 * Shared TypeScript types and presentation constants for EngInventory.
 * All data is loaded from the Django REST API (see InventoryContext / lib/api.ts).
 */

export interface InventoryItem {
  id: string;
  name: string;
  category: 'Electronics' | 'Mechanical' | 'Tools' | 'Consumables';
  quantity: number;
  minThreshold: number;
  location: string;
  supplier: string;
  purchaseDate: string;
  notes: string;
  unitPrice: number;
}

export interface ItemRequest {
  id: string;
  itemId: string;
  itemName: string;
  requestedQty: number;
  requestedBy: string;
  requestDate: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Issued';
  notes: string;
}

export interface BorrowedItem {
  id: string;
  itemId: string;
  equipmentName: string;
  borrowedBy: string;
  borrowDate: string;
  expectedReturnDate: string;
  actualReturnDate?: string;
  status: 'Active' | 'Returned' | 'Overdue';
  quantity?: number;
}

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  itemsSupplied: string[];
  lastPurchaseDate: string;
  totalOrders: number;
  rating: number;
}

export interface ActivityEntry {
  id: string;
  type: 'issued' | 'returned' | 'restocked' | 'requested' | 'approved' | 'rejected';
  description: string;
  timestamp: string;
  user: string;
}

export interface MonthlyUsageRow {
  month: string;
  electronics: number;
  mechanical: number;
  tools: number;
  consumables: number;
}

// --- AI Insights types ---

export interface AIQueryResponse {
  answer: string;
  confidence: number;
  citations?: string[];
  suggestedActions: string[];
  relatedItems: string[];
  meta: AIMeta;
}

export interface AIMeta {
  requestId: string;
  model?: string;
  tokens?: number;
  costUsd?: number;
  latencyMs?: number;
  retrieval?: Array<{ chunkId: string; source: string; title: string; score: number }>;
  fallback?: boolean;
  error?: string;
}

export interface InsightRecord {
  id: string;
  title: string;
  description: string;
  category: 'stockout_risk' | 'overstock' | 'demand_trend' | 'supplier_risk' | 'cost_optimization' | 'operational';
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  confidence: number;
  impactEstimate: string;
  recommendedAction: string;
  evidence: Record<string, unknown>;
  relatedItemIds: string[];
  relatedSupplierIds: string[];
  feedback: string;
  feedbackComment: string;
  createdAt: string;
  updatedAt: string;
}

export interface AISuggestion {
  id: string;
  suggestionType: 'reorder' | 'rebalance' | 'decommission';
  title: string;
  description: string;
  details: Record<string, unknown>;
  approvalStatus: 'pending' | 'approved' | 'rejected' | 'executed';
  approvedBy: string;
  approvedAt: string | null;
  rejectionReason: string;
  createdAt: string;
  updatedAt: string;
}

export interface AlertRecord {
  id: string;
  title: string;
  message: string;
  severity: 'info' | 'warning' | 'critical';
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  alertType: string;
  itemId: string | null;
  itemName: string | null;
  supplierId: string | null;
  supplierName: string | null;
  riskScore: number | null;
  details?: Record<string, unknown> | null;
  createdAt: string;
  resolvedAt: string | null;
}

export interface BorrowLeaderboardRow {
  itemId: string;
  name: string;
  category: string;
  borrowEvents: number;
  unitsLent: number;
}

export interface KPISnapshot {
  id?: string;
  computedAt?: string;
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  lowStockCount: number;
  outOfStockCount: number;
  overdueBorrows: number;
  pendingRequests: number;
  avgSupplierRating: number;
  inventoryTurnoverRate: number;
  fillRate: number;
  healthScore: number;
  categoryBreakdown: Record<string, { count: number; quantity: number; value: number }>;
}

export interface StockHealth {
  totalItems: number;
  totalQuantity: number;
  totalValue: number;
  outOfStock: StockHealthItem[];
  critical: StockHealthItem[];
  lowStock: StockHealthItem[];
  healthy: StockHealthItem[];
  overStocked: StockHealthItem[];
}

export interface StockHealthItem {
  id: string;
  name: string;
  category: string;
  quantity: number;
  minThreshold: number;
  unitPrice: number;
  supplier: string;
}

export interface ReorderSimulation {
  recommendedOrderQty: number;
  estimatedCost: number;
  reasoning: string;
  daysUntilStockout: number | null;
  optimalReorderPoint: number;
  safetyStock: number;
  confidence: number;
}

export interface AIUsageStats {
  period_days: number;
  totalCalls: number;
  totalTokens: number;
  totalCostUsd: number;
  avgLatencyMs: number;
  errorCount: number;
}

/** Chart colors by category (Dashboard + Reports). */
export const categoryColors: Record<string, string> = {
  Electronics: 'hsl(217, 91%, 60%)',
  Mechanical: 'hsl(142, 71%, 45%)',
  Tools: 'hsl(38, 92%, 50%)',
  Consumables: 'hsl(280, 65%, 60%)',
};
