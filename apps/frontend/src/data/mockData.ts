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

const locations = ['Bengaluru Lab - Shelf 1', 'Bengaluru Lab - Shelf 2', 'Chennai Lab - Cabinet 3', 'Chennai Lab - Workbench', 'Storage Room 1', 'Storage Room 2', 'Hyderabad Workshop - Rack A', 'Hyderabad Workshop - Rack B', 'Electronics Lab', 'Testing Bay'];

export const initialInventory: InventoryItem[] = [
  { id: 'INV-001', name: 'Arduino Uno R3', category: 'Electronics', quantity: 24, minThreshold: 10, location: 'Electronics Lab', supplier: 'ElectroMart India', purchaseDate: '2025-08-15', notes: 'Microcontroller development boards', unitPrice: 23.0 },
  { id: 'INV-002', name: 'Raspberry Pi 4 Model B', category: 'Electronics', quantity: 8, minThreshold: 5, location: 'Electronics Lab', supplier: 'ElectroMart India', purchaseDate: '2025-07-20', notes: '4GB RAM variant', unitPrice: 55.0 },
  { id: 'INV-003', name: 'Soldering Iron Kit', category: 'Tools', quantity: 12, minThreshold: 4, location: 'Hyderabad Workshop - Rack A', supplier: 'ToolCraft Supplies', purchaseDate: '2025-06-10', notes: 'Temperature controlled, 60W', unitPrice: 45.0 },
  { id: 'INV-004', name: 'Breadboard 830-Point', category: 'Electronics', quantity: 45, minThreshold: 15, location: 'Bengaluru Lab - Shelf 1', supplier: 'ElectroMart India', purchaseDate: '2025-09-01', notes: 'Standard solderless breadboard', unitPrice: 6.5 },
  { id: 'INV-005', name: 'Digital Multimeter', category: 'Tools', quantity: 3, minThreshold: 5, location: 'Chennai Lab - Cabinet 3', supplier: 'ToolCraft Supplies', purchaseDate: '2025-05-22', notes: 'Fluke 87V Industrial', unitPrice: 380.0 },
  { id: 'INV-006', name: 'Servo Motor SG90', category: 'Mechanical', quantity: 30, minThreshold: 10, location: 'Storage Room 1', supplier: 'MechParts India', purchaseDate: '2025-08-30', notes: 'Micro servo, 180 degree', unitPrice: 3.5 },
  { id: 'INV-007', name: 'Ball Bearing 608ZZ', category: 'Mechanical', quantity: 2, minThreshold: 20, location: 'Storage Room 1', supplier: 'MechParts India', purchaseDate: '2025-04-15', notes: '8x22x7mm, shielded', unitPrice: 1.2 },
  { id: 'INV-008', name: 'Jumper Wires (Pack of 65)', category: 'Electronics', quantity: 50, minThreshold: 10, location: 'Bengaluru Lab - Shelf 2', supplier: 'ElectroMart India', purchaseDate: '2025-09-10', notes: 'Male-to-male, assorted lengths', unitPrice: 4.0 },
  { id: 'INV-009', name: 'Heat Shrink Tubing Kit', category: 'Consumables', quantity: 18, minThreshold: 5, location: 'Hyderabad Workshop - Rack B', supplier: 'Fastener World India', purchaseDate: '2025-07-05', notes: 'Assorted sizes and colors', unitPrice: 12.0 },
  { id: 'INV-010', name: 'Oscilloscope Probe', category: 'Tools', quantity: 6, minThreshold: 3, location: 'Electronics Lab', supplier: 'ToolCraft Supplies', purchaseDate: '2025-06-28', notes: '100MHz, 10X/1X switchable', unitPrice: 28.0 },
  { id: 'INV-011', name: 'Stepper Motor NEMA 17', category: 'Mechanical', quantity: 15, minThreshold: 5, location: 'Storage Room 2', supplier: 'MechParts India', purchaseDate: '2025-08-20', notes: '1.8 degree step angle, bipolar', unitPrice: 14.0 },
  { id: 'INV-012', name: 'Solder Wire (Sn63/Pb37)', category: 'Consumables', quantity: 4, minThreshold: 5, location: 'Hyderabad Workshop - Rack A', supplier: 'Fastener World India', purchaseDate: '2025-05-10', notes: '0.8mm diameter, 100g spool', unitPrice: 8.5 },
  { id: 'INV-013', name: 'ESP32 DevKit V1', category: 'Electronics', quantity: 20, minThreshold: 8, location: 'Electronics Lab', supplier: 'ElectroMart India', purchaseDate: '2025-09-05', notes: 'WiFi + Bluetooth module', unitPrice: 10.0 },
  { id: 'INV-014', name: 'Torque Wrench Set', category: 'Tools', quantity: 4, minThreshold: 2, location: 'Hyderabad Workshop - Rack B', supplier: 'ToolCraft Supplies', purchaseDate: '2025-03-15', notes: '1/4" drive, 5-25 Nm', unitPrice: 65.0 },
  { id: 'INV-015', name: 'Linear Guide Rail', category: 'Mechanical', quantity: 8, minThreshold: 3, location: 'Storage Room 2', supplier: 'MechParts India', purchaseDate: '2025-07-12', notes: 'MGN12H, 300mm length', unitPrice: 22.0 },
  { id: 'INV-016', name: 'Capacitor Assortment Kit', category: 'Electronics', quantity: 10, minThreshold: 3, location: 'Bengaluru Lab - Shelf 1', supplier: 'ElectroMart India', purchaseDate: '2025-08-25', notes: '24 values, ceramic, 10pF to 100uF', unitPrice: 15.0 },
  { id: 'INV-017', name: 'Isopropyl Alcohol 99%', category: 'Consumables', quantity: 7, minThreshold: 3, location: 'Storage Room 1', supplier: 'ChemSupply India', purchaseDate: '2025-09-01', notes: '1L bottle, electronics grade', unitPrice: 9.0 },
  { id: 'INV-018', name: 'Cable Ties (100 pack)', category: 'Consumables', quantity: 25, minThreshold: 5, location: 'Hyderabad Workshop - Rack A', supplier: 'Fastener World India', purchaseDate: '2025-06-15', notes: '200mm, black nylon', unitPrice: 3.5 },
  { id: 'INV-019', name: 'Power Supply 12V 5A', category: 'Electronics', quantity: 10, minThreshold: 4, location: 'Chennai Lab - Workbench', supplier: 'ElectroMart India', purchaseDate: '2025-07-30', notes: 'Switching, regulated', unitPrice: 18.0 },
  { id: 'INV-020', name: 'Timing Belt GT2', category: 'Mechanical', quantity: 12, minThreshold: 4, location: 'Storage Room 2', supplier: 'MechParts India', purchaseDate: '2025-08-10', notes: '6mm width, open end, per meter', unitPrice: 3.0 },
  { id: 'INV-021', name: 'LED Strip (5m Roll)', category: 'Electronics', quantity: 6, minThreshold: 2, location: 'Bengaluru Lab - Shelf 2', supplier: 'ElectroMart India', purchaseDate: '2025-09-12', notes: 'WS2812B, 60 LEDs/m, addressable', unitPrice: 25.0 },
  { id: 'INV-022', name: 'Caliper Digital', category: 'Tools', quantity: 5, minThreshold: 2, location: 'Chennai Lab - Cabinet 3', supplier: 'ToolCraft Supplies', purchaseDate: '2025-04-20', notes: '150mm, 0.01mm resolution', unitPrice: 35.0 },
  { id: 'INV-023', name: 'Thermal Paste', category: 'Consumables', quantity: 15, minThreshold: 5, location: 'Storage Room 1', supplier: 'ChemSupply India', purchaseDate: '2025-08-01', notes: 'Arctic MX-4, 4g tube', unitPrice: 7.0 },
  { id: 'INV-024', name: 'Stepper Driver A4988', category: 'Electronics', quantity: 22, minThreshold: 8, location: 'Electronics Lab', supplier: 'ElectroMart India', purchaseDate: '2025-07-25', notes: 'With heatsink, 2A max', unitPrice: 4.5 },
  { id: 'INV-025', name: 'Aluminum Extrusion 2020', category: 'Mechanical', quantity: 18, minThreshold: 5, location: 'Storage Room 2', supplier: 'MechParts India', purchaseDate: '2025-06-05', notes: '500mm length, T-slot profile', unitPrice: 8.0 },
  { id: 'INV-026', name: 'Wire Stripper', category: 'Tools', quantity: 8, minThreshold: 3, location: 'Hyderabad Workshop - Rack A', supplier: 'ToolCraft Supplies', purchaseDate: '2025-05-18', notes: 'Self-adjusting, AWG 10-24', unitPrice: 22.0 },
  { id: 'INV-027', name: 'Flux Pen', category: 'Consumables', quantity: 1, minThreshold: 5, location: 'Hyderabad Workshop - Rack B', supplier: 'Fastener World India', purchaseDate: '2025-09-08', notes: 'No-clean, rosin-based', unitPrice: 6.0 },
  { id: 'INV-028', name: 'OLED Display 0.96"', category: 'Electronics', quantity: 16, minThreshold: 5, location: 'Bengaluru Lab - Shelf 1', supplier: 'ElectroMart India', purchaseDate: '2025-08-18', notes: 'I2C, 128x64, SSD1306', unitPrice: 5.5 },
  { id: 'INV-029', name: 'Spring Assortment Kit', category: 'Mechanical', quantity: 3, minThreshold: 2, location: 'Storage Room 1', supplier: 'MechParts India', purchaseDate: '2025-07-08', notes: '200 pieces, various sizes', unitPrice: 18.0 },
  { id: 'INV-030', name: 'Hot Glue Gun', category: 'Tools', quantity: 6, minThreshold: 2, location: 'Hyderabad Workshop - Rack A', supplier: 'ToolCraft Supplies', purchaseDate: '2025-06-22', notes: '60W, with 20 glue sticks', unitPrice: 15.0 },
];

export const initialRequests: ItemRequest[] = [
  { id: 'REQ-001', itemId: 'INV-001', itemName: 'Arduino Uno R3', requestedQty: 5, requestedBy: 'Dr. Priya Sharma', requestDate: '2026-03-08', status: 'Pending', notes: 'For robotics workshop' },
  { id: 'REQ-002', itemId: 'INV-005', itemName: 'Digital Multimeter', requestedQty: 2, requestedBy: 'Prof. Rajesh Kumar', requestDate: '2026-03-07', status: 'Pending', notes: 'Lab session next week' },
  { id: 'REQ-003', itemId: 'INV-013', itemName: 'ESP32 DevKit V1', requestedQty: 8, requestedBy: 'Arjun Mehta', requestDate: '2026-03-06', status: 'Approved', notes: 'IoT course project' },
  { id: 'REQ-004', itemId: 'INV-011', itemName: 'Stepper Motor NEMA 17', requestedQty: 4, requestedBy: 'Ananya Reddy', requestDate: '2026-03-05', status: 'Issued', notes: 'CNC machine build' },
  { id: 'REQ-005', itemId: 'INV-003', itemName: 'Soldering Iron Kit', requestedQty: 3, requestedBy: 'Vikram Singh', requestDate: '2026-03-04', status: 'Rejected', notes: 'All kits currently in use' },
  { id: 'REQ-006', itemId: 'INV-006', itemName: 'Servo Motor SG90', requestedQty: 10, requestedBy: 'Dr. Priya Sharma', requestDate: '2026-03-09', status: 'Pending', notes: 'Robotics competition prep' },
  { id: 'REQ-007', itemId: 'INV-019', itemName: 'Power Supply 12V 5A', requestedQty: 2, requestedBy: 'Rohan Desai', requestDate: '2026-03-10', status: 'Pending', notes: 'Test bench setup' },
  { id: 'REQ-008', itemId: 'INV-021', itemName: 'LED Strip (5m Roll)', requestedQty: 2, requestedBy: 'Kavya Nair', requestDate: '2026-03-03', status: 'Approved', notes: 'Art installation project' },
  { id: 'REQ-009', itemId: 'INV-002', itemName: 'Raspberry Pi 4 Model B', requestedQty: 3, requestedBy: 'Prof. Rajesh Kumar', requestDate: '2026-03-10', status: 'Pending', notes: 'Server cluster demo' },
  { id: 'REQ-010', itemId: 'INV-022', itemName: 'Caliper Digital', requestedQty: 1, requestedBy: 'Ananya Reddy', requestDate: '2026-03-02', status: 'Issued', notes: 'Precision measurements' },
];

export const initialBorrowedItems: BorrowedItem[] = [
  { id: 'BRW-001', itemId: 'INV-005', equipmentName: 'Digital Multimeter', borrowedBy: 'Prof. Rajesh Kumar', borrowDate: '2026-02-20', expectedReturnDate: '2026-03-06', status: 'Overdue' },
  { id: 'BRW-002', itemId: 'INV-003', equipmentName: 'Soldering Iron Kit', borrowedBy: 'Arjun Mehta', borrowDate: '2026-03-01', expectedReturnDate: '2026-03-15', status: 'Active' },
  { id: 'BRW-003', itemId: 'INV-014', equipmentName: 'Torque Wrench Set', borrowedBy: 'Vikram Singh', borrowDate: '2026-02-28', expectedReturnDate: '2026-03-14', status: 'Active' },
  { id: 'BRW-004', itemId: 'INV-010', equipmentName: 'Oscilloscope Probe', borrowedBy: 'Dr. Priya Sharma', borrowDate: '2026-02-15', expectedReturnDate: '2026-03-01', status: 'Overdue' },
  { id: 'BRW-005', itemId: 'INV-022', equipmentName: 'Caliper Digital', borrowedBy: 'Ananya Reddy', borrowDate: '2026-03-02', expectedReturnDate: '2026-03-16', status: 'Active' },
  { id: 'BRW-006', itemId: 'INV-011', equipmentName: 'Stepper Motor NEMA 17', borrowedBy: 'Ananya Reddy', borrowDate: '2026-03-05', expectedReturnDate: '2026-03-19', status: 'Active' },
  { id: 'BRW-007', itemId: 'INV-026', equipmentName: 'Wire Stripper', borrowedBy: 'Rohan Desai', borrowDate: '2026-02-10', expectedReturnDate: '2026-02-24', status: 'Returned', actualReturnDate: '2026-02-23' },
  { id: 'BRW-008', itemId: 'INV-030', equipmentName: 'Hot Glue Gun', borrowedBy: 'Kavya Nair', borrowDate: '2026-03-08', expectedReturnDate: '2026-03-22', status: 'Active' },
];

export const initialSuppliers: Supplier[] = [
  { id: 'SUP-001', name: 'ElectroMart India', contactPerson: 'Ramesh Iyer', email: 'sales@electromart.co.in', phone: '+91 98765 43210', address: '123, MG Road, Bengaluru, Karnataka 560001', itemsSupplied: ['Arduino Uno R3', 'Raspberry Pi 4', 'ESP32', 'Breadboards', 'Jumper Wires', 'Capacitors', 'OLED Displays', 'LED Strips', 'Power Supplies', 'Stepper Drivers'], lastPurchaseDate: '2026-03-05', totalOrders: 47, rating: 4.8 },
  { id: 'SUP-002', name: 'ToolCraft Supplies', contactPerson: 'Sneha Menon', email: 'orders@toolcraft.co.in', phone: '+91 98765 43211', address: '45, Anna Salai, Chennai, Tamil Nadu 600002', itemsSupplied: ['Soldering Iron Kit', 'Digital Multimeter', 'Oscilloscope Probe', 'Torque Wrench Set', 'Caliper Digital', 'Wire Stripper', 'Hot Glue Gun'], lastPurchaseDate: '2026-02-18', totalOrders: 23, rating: 4.5 },
  { id: 'SUP-003', name: 'MechParts India', contactPerson: 'Amit Verma', email: 'support@mechparts.co.in', phone: '+91 98765 43212', address: '78, Industrial Area, Pune, Maharashtra 411014', itemsSupplied: ['Servo Motor SG90', 'Ball Bearing 608ZZ', 'Stepper Motor NEMA 17', 'Linear Guide Rail', 'Timing Belt GT2', 'Aluminum Extrusion', 'Spring Kit'], lastPurchaseDate: '2026-02-28', totalOrders: 31, rating: 4.6 },
  { id: 'SUP-004', name: 'Fastener World India', contactPerson: 'Pooja Gupta', email: 'bulk@fastenerworld.co.in', phone: '+91 98765 43213', address: '12, Nehru Place, New Delhi, Delhi 110019', itemsSupplied: ['Heat Shrink Tubing', 'Cable Ties', 'Flux Pen'], lastPurchaseDate: '2026-01-20', totalOrders: 15, rating: 4.2 },
  { id: 'SUP-005', name: 'ChemSupply India', contactPerson: 'Karan Patel', email: 'info@chemsupply.co.in', phone: '+91 98765 43214', address: '56, Science City Road, Ahmedabad, Gujarat 380060', itemsSupplied: ['Isopropyl Alcohol', 'Thermal Paste'], lastPurchaseDate: '2026-02-05', totalOrders: 9, rating: 4.3 },
  { id: 'SUP-006', name: 'ProBoard India', contactPerson: 'Divya Krishnan', email: 'pcb@proboard.co.in', phone: '+91 98765 43215', address: '34, Electronics City, Bengaluru, Karnataka 560100', itemsSupplied: ['Custom PCBs', 'PCB Prototypes'], lastPurchaseDate: '2025-12-10', totalOrders: 6, rating: 4.7 },
];

export const initialActivities: ActivityEntry[] = [
  { id: 'ACT-001', type: 'issued', description: 'Stepper Motor NEMA 17 (x4) issued to Ananya Reddy', timestamp: '2026-03-10T14:30:00', user: 'Admin' },
  { id: 'ACT-002', type: 'requested', description: 'Power Supply 12V 5A (x2) requested by Rohan Desai', timestamp: '2026-03-10T11:15:00', user: 'Rohan Desai' },
  { id: 'ACT-003', type: 'approved', description: 'LED Strip request approved for Kavya Nair', timestamp: '2026-03-09T16:45:00', user: 'Admin' },
  { id: 'ACT-004', type: 'restocked', description: 'Breadboard 830-Point restocked (+20 units)', timestamp: '2026-03-09T10:00:00', user: 'Admin' },
  { id: 'ACT-005', type: 'returned', description: 'Wire Stripper returned by Rohan Desai', timestamp: '2026-02-23T09:30:00', user: 'Rohan Desai' },
  { id: 'ACT-006', type: 'rejected', description: 'Soldering Iron Kit request rejected for Vikram Singh', timestamp: '2026-03-04T13:20:00', user: 'Admin' },
  { id: 'ACT-007', type: 'requested', description: 'Raspberry Pi 4 (x3) requested by Prof. Rajesh Kumar', timestamp: '2026-03-10T09:00:00', user: 'Prof. Rajesh Kumar' },
  { id: 'ACT-008', type: 'issued', description: 'Caliper Digital (x1) issued to Ananya Reddy', timestamp: '2026-03-02T15:00:00', user: 'Admin' },
  { id: 'ACT-009', type: 'restocked', description: 'Solder Wire restocked (+10 units)', timestamp: '2026-03-01T11:30:00', user: 'Admin' },
  { id: 'ACT-010', type: 'requested', description: 'Servo Motor SG90 (x10) requested by Dr. Priya Sharma', timestamp: '2026-03-09T08:45:00', user: 'Dr. Priya Sharma' },
];

export const monthlyUsageData = [
  { month: 'Apr', electronics: 42, mechanical: 18, tools: 12, consumables: 25 },
  { month: 'May', electronics: 55, mechanical: 22, tools: 15, consumables: 30 },
  { month: 'Jun', electronics: 38, mechanical: 28, tools: 10, consumables: 20 },
  { month: 'Jul', electronics: 60, mechanical: 15, tools: 18, consumables: 35 },
  { month: 'Aug', electronics: 48, mechanical: 32, tools: 20, consumables: 28 },
  { month: 'Sep', electronics: 70, mechanical: 25, tools: 14, consumables: 22 },
  { month: 'Oct', electronics: 52, mechanical: 30, tools: 16, consumables: 32 },
  { month: 'Nov', electronics: 45, mechanical: 20, tools: 22, consumables: 18 },
  { month: 'Dec', electronics: 30, mechanical: 12, tools: 8, consumables: 15 },
  { month: 'Jan', electronics: 58, mechanical: 26, tools: 19, consumables: 27 },
  { month: 'Feb', electronics: 65, mechanical: 35, tools: 24, consumables: 33 },
  { month: 'Mar', electronics: 72, mechanical: 28, tools: 17, consumables: 29 },
];

export const categoryColors: Record<string, string> = {
  Electronics: 'hsl(217, 91%, 60%)',
  Mechanical: 'hsl(142, 71%, 45%)',
  Tools: 'hsl(38, 92%, 50%)',
  Consumables: 'hsl(280, 65%, 60%)',
};
