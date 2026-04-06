"""
Seed database with the canonical demo dataset for EngInventory.
Run: python manage.py seed
Skips all seeding if any Supplier rows already exist (idempotent when empty).
"""
from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone

from activity.models import ActivityEntry
from borrowed.models import BorrowedItem
from inventory.models import InventoryItem
from item_requests.models import ItemRequest
from suppliers.models import Supplier


# Canonical demo data — this is the single source of truth for seeding.
SUPPLIERS = [
    {'name': 'ElectroMart India', 'contact_person': 'Ramesh Iyer', 'email': 'sales@electromart.co.in', 'phone': '+91 98765 43210', 'address': '123, MG Road, Bengaluru, Karnataka 560001', 'items_supplied': ['Arduino Uno R3', 'Raspberry Pi 4', 'ESP32', 'Breadboards', 'Jumper Wires', 'Capacitors', 'OLED Displays', 'LED Strips', 'Power Supplies', 'Stepper Drivers'], 'last_purchase_date': '2026-03-05', 'total_orders': 47, 'rating': 4.8},
    {'name': 'ToolCraft Supplies', 'contact_person': 'Sneha Menon', 'email': 'orders@toolcraft.co.in', 'phone': '+91 98765 43211', 'address': '45, Anna Salai, Chennai, Tamil Nadu 600002', 'items_supplied': ['Soldering Iron Kit', 'Digital Multimeter', 'Oscilloscope Probe', 'Torque Wrench Set', 'Caliper Digital', 'Wire Stripper', 'Hot Glue Gun'], 'last_purchase_date': '2026-02-18', 'total_orders': 23, 'rating': 4.5},
    {'name': 'MechParts India', 'contact_person': 'Amit Verma', 'email': 'support@mechparts.co.in', 'phone': '+91 98765 43212', 'address': '78, Industrial Area, Pune, Maharashtra 411014', 'items_supplied': ['Servo Motor SG90', 'Ball Bearing 608ZZ', 'Stepper Motor NEMA 17', 'Linear Guide Rail', 'Timing Belt GT2', 'Aluminum Extrusion', 'Spring Kit'], 'last_purchase_date': '2026-02-28', 'total_orders': 31, 'rating': 4.6},
    {'name': 'Fastener World India', 'contact_person': 'Pooja Gupta', 'email': 'bulk@fastenerworld.co.in', 'phone': '+91 98765 43213', 'address': '12, Nehru Place, New Delhi, Delhi 110019', 'items_supplied': ['Heat Shrink Tubing', 'Cable Ties', 'Flux Pen'], 'last_purchase_date': '2026-01-20', 'total_orders': 15, 'rating': 4.2},
    {'name': 'ChemSupply India', 'contact_person': 'Karan Patel', 'email': 'info@chemsupply.co.in', 'phone': '+91 98765 43214', 'address': '56, Science City Road, Ahmedabad, Gujarat 380060', 'items_supplied': ['Isopropyl Alcohol', 'Thermal Paste'], 'last_purchase_date': '2026-02-05', 'total_orders': 9, 'rating': 4.3},
    {'name': 'ProBoard India', 'contact_person': 'Divya Krishnan', 'email': 'pcb@proboard.co.in', 'phone': '+91 98765 43215', 'address': '34, Electronics City, Bengaluru, Karnataka 560100', 'items_supplied': ['Custom PCBs', 'PCB Prototypes'], 'last_purchase_date': '2025-12-10', 'total_orders': 6, 'rating': 4.7},
]

INVENTORY = [
    {'name': 'Arduino Uno R3', 'category': 'Electronics', 'quantity': 24, 'min_threshold': 10, 'location': 'Electronics Lab', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-08-15', 'notes': 'Microcontroller development boards', 'unit_price': 23.0},
    {'name': 'Raspberry Pi 4 Model B', 'category': 'Electronics', 'quantity': 8, 'min_threshold': 5, 'location': 'Electronics Lab', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-07-20', 'notes': '4GB RAM variant', 'unit_price': 55.0},
    {'name': 'Soldering Iron Kit', 'category': 'Tools', 'quantity': 12, 'min_threshold': 4, 'location': 'Hyderabad Workshop - Rack A', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-06-10', 'notes': 'Temperature controlled, 60W', 'unit_price': 45.0},
    {'name': 'Breadboard 830-Point', 'category': 'Electronics', 'quantity': 45, 'min_threshold': 15, 'location': 'Bengaluru Lab - Shelf 1', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-09-01', 'notes': 'Standard solderless breadboard', 'unit_price': 6.5},
    {'name': 'Digital Multimeter', 'category': 'Tools', 'quantity': 3, 'min_threshold': 5, 'location': 'Chennai Lab - Cabinet 3', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-05-22', 'notes': 'Fluke 87V Industrial', 'unit_price': 380.0},
    {'name': 'Servo Motor SG90', 'category': 'Mechanical', 'quantity': 30, 'min_threshold': 10, 'location': 'Storage Room 1', 'supplier_name': 'MechParts India', 'purchase_date': '2025-08-30', 'notes': 'Micro servo, 180 degree', 'unit_price': 3.5},
    {'name': 'Ball Bearing 608ZZ', 'category': 'Mechanical', 'quantity': 2, 'min_threshold': 20, 'location': 'Storage Room 1', 'supplier_name': 'MechParts India', 'purchase_date': '2025-04-15', 'notes': '8x22x7mm, shielded', 'unit_price': 1.2},
    {'name': 'Jumper Wires (Pack of 65)', 'category': 'Electronics', 'quantity': 50, 'min_threshold': 10, 'location': 'Bengaluru Lab - Shelf 2', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-09-10', 'notes': 'Male-to-male, assorted lengths', 'unit_price': 4.0},
    {'name': 'Heat Shrink Tubing Kit', 'category': 'Consumables', 'quantity': 18, 'min_threshold': 5, 'location': 'Hyderabad Workshop - Rack B', 'supplier_name': 'Fastener World India', 'purchase_date': '2025-07-05', 'notes': 'Assorted sizes and colors', 'unit_price': 12.0},
    {'name': 'Oscilloscope Probe', 'category': 'Tools', 'quantity': 6, 'min_threshold': 3, 'location': 'Electronics Lab', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-06-28', 'notes': '100MHz, 10X/1X switchable', 'unit_price': 28.0},
    {'name': 'Stepper Motor NEMA 17', 'category': 'Mechanical', 'quantity': 15, 'min_threshold': 5, 'location': 'Storage Room 2', 'supplier_name': 'MechParts India', 'purchase_date': '2025-08-20', 'notes': '1.8 degree step angle, bipolar', 'unit_price': 14.0},
    {'name': 'Solder Wire (Sn63/Pb37)', 'category': 'Consumables', 'quantity': 4, 'min_threshold': 5, 'location': 'Hyderabad Workshop - Rack A', 'supplier_name': 'Fastener World India', 'purchase_date': '2025-05-10', 'notes': '0.8mm diameter, 100g spool', 'unit_price': 8.5},
    {'name': 'ESP32 DevKit V1', 'category': 'Electronics', 'quantity': 20, 'min_threshold': 8, 'location': 'Electronics Lab', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-09-05', 'notes': 'WiFi + Bluetooth module', 'unit_price': 10.0},
    {'name': 'Torque Wrench Set', 'category': 'Tools', 'quantity': 4, 'min_threshold': 2, 'location': 'Hyderabad Workshop - Rack B', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-03-15', 'notes': '1/4" drive, 5-25 Nm', 'unit_price': 65.0},
    {'name': 'Linear Guide Rail', 'category': 'Mechanical', 'quantity': 8, 'min_threshold': 3, 'location': 'Storage Room 2', 'supplier_name': 'MechParts India', 'purchase_date': '2025-07-12', 'notes': 'MGN12H, 300mm length', 'unit_price': 22.0},
    {'name': 'Capacitor Assortment Kit', 'category': 'Electronics', 'quantity': 10, 'min_threshold': 3, 'location': 'Bengaluru Lab - Shelf 1', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-08-25', 'notes': '24 values, ceramic, 10pF to 100uF', 'unit_price': 15.0},
    {'name': 'Isopropyl Alcohol 99%', 'category': 'Consumables', 'quantity': 7, 'min_threshold': 3, 'location': 'Storage Room 1', 'supplier_name': 'ChemSupply India', 'purchase_date': '2025-09-01', 'notes': '1L bottle, electronics grade', 'unit_price': 9.0},
    {'name': 'Cable Ties (100 pack)', 'category': 'Consumables', 'quantity': 25, 'min_threshold': 5, 'location': 'Hyderabad Workshop - Rack A', 'supplier_name': 'Fastener World India', 'purchase_date': '2025-06-15', 'notes': '200mm, black nylon', 'unit_price': 3.5},
    {'name': 'Power Supply 12V 5A', 'category': 'Electronics', 'quantity': 10, 'min_threshold': 4, 'location': 'Chennai Lab - Workbench', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-07-30', 'notes': 'Switching, regulated', 'unit_price': 18.0},
    {'name': 'Timing Belt GT2', 'category': 'Mechanical', 'quantity': 12, 'min_threshold': 4, 'location': 'Storage Room 2', 'supplier_name': 'MechParts India', 'purchase_date': '2025-08-10', 'notes': '6mm width, open end, per meter', 'unit_price': 3.0},
    {'name': 'LED Strip (5m Roll)', 'category': 'Electronics', 'quantity': 6, 'min_threshold': 2, 'location': 'Bengaluru Lab - Shelf 2', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-09-12', 'notes': 'WS2812B, 60 LEDs/m, addressable', 'unit_price': 25.0},
    {'name': 'Caliper Digital', 'category': 'Tools', 'quantity': 5, 'min_threshold': 2, 'location': 'Chennai Lab - Cabinet 3', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-04-20', 'notes': '150mm, 0.01mm resolution', 'unit_price': 35.0},
    {'name': 'Thermal Paste', 'category': 'Consumables', 'quantity': 15, 'min_threshold': 5, 'location': 'Storage Room 1', 'supplier_name': 'ChemSupply India', 'purchase_date': '2025-08-01', 'notes': 'Arctic MX-4, 4g tube', 'unit_price': 7.0},
    {'name': 'Stepper Driver A4988', 'category': 'Electronics', 'quantity': 22, 'min_threshold': 8, 'location': 'Electronics Lab', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-07-25', 'notes': 'With heatsink, 2A max', 'unit_price': 4.5},
    {'name': 'Aluminum Extrusion 2020', 'category': 'Mechanical', 'quantity': 18, 'min_threshold': 5, 'location': 'Storage Room 2', 'supplier_name': 'MechParts India', 'purchase_date': '2025-06-05', 'notes': '500mm length, T-slot profile', 'unit_price': 8.0},
    {'name': 'Wire Stripper', 'category': 'Tools', 'quantity': 8, 'min_threshold': 3, 'location': 'Hyderabad Workshop - Rack A', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-05-18', 'notes': 'Self-adjusting, AWG 10-24', 'unit_price': 22.0},
    {'name': 'Flux Pen', 'category': 'Consumables', 'quantity': 1, 'min_threshold': 5, 'location': 'Hyderabad Workshop - Rack B', 'supplier_name': 'Fastener World India', 'purchase_date': '2025-09-08', 'notes': 'No-clean, rosin-based', 'unit_price': 6.0},
    {'name': 'OLED Display 0.96"', 'category': 'Electronics', 'quantity': 16, 'min_threshold': 5, 'location': 'Bengaluru Lab - Shelf 1', 'supplier_name': 'ElectroMart India', 'purchase_date': '2025-08-18', 'notes': 'I2C, 128x64, SSD1306', 'unit_price': 5.5},
    {'name': 'Spring Assortment Kit', 'category': 'Mechanical', 'quantity': 3, 'min_threshold': 2, 'location': 'Storage Room 1', 'supplier_name': 'MechParts India', 'purchase_date': '2025-07-08', 'notes': '200 pieces, various sizes', 'unit_price': 18.0},
    {'name': 'Hot Glue Gun', 'category': 'Tools', 'quantity': 6, 'min_threshold': 2, 'location': 'Hyderabad Workshop - Rack A', 'supplier_name': 'ToolCraft Supplies', 'purchase_date': '2025-06-22', 'notes': '60W, with 20 glue sticks', 'unit_price': 15.0},
]

REQUESTS = [
    {'item_name': 'Arduino Uno R3', 'requested_qty': 5, 'requested_by': 'Dr. Priya Sharma', 'request_date': '2026-03-08', 'status': 'Pending', 'notes': 'For robotics workshop'},
    {'item_name': 'Digital Multimeter', 'requested_qty': 2, 'requested_by': 'Prof. Rajesh Kumar', 'request_date': '2026-03-07', 'status': 'Pending', 'notes': 'Lab session next week'},
    {'item_name': 'ESP32 DevKit V1', 'requested_qty': 8, 'requested_by': 'Arjun Mehta', 'request_date': '2026-03-06', 'status': 'Approved', 'notes': 'IoT course project'},
    {'item_name': 'Stepper Motor NEMA 17', 'requested_qty': 4, 'requested_by': 'Ananya Reddy', 'request_date': '2026-03-05', 'status': 'Issued', 'notes': 'CNC machine build'},
    {'item_name': 'Soldering Iron Kit', 'requested_qty': 3, 'requested_by': 'Vikram Singh', 'request_date': '2026-03-04', 'status': 'Rejected', 'notes': 'All kits currently in use'},
    {'item_name': 'Servo Motor SG90', 'requested_qty': 10, 'requested_by': 'Dr. Priya Sharma', 'request_date': '2026-03-09', 'status': 'Pending', 'notes': 'Robotics competition prep'},
    {'item_name': 'Power Supply 12V 5A', 'requested_qty': 2, 'requested_by': 'Rohan Desai', 'request_date': '2026-03-10', 'status': 'Pending', 'notes': 'Test bench setup'},
    {'item_name': 'LED Strip (5m Roll)', 'requested_qty': 2, 'requested_by': 'Kavya Nair', 'request_date': '2026-03-03', 'status': 'Approved', 'notes': 'Art installation project'},
    {'item_name': 'Raspberry Pi 4 Model B', 'requested_qty': 3, 'requested_by': 'Prof. Rajesh Kumar', 'request_date': '2026-03-10', 'status': 'Pending', 'notes': 'Server cluster demo'},
    {'item_name': 'Caliper Digital', 'requested_qty': 1, 'requested_by': 'Ananya Reddy', 'request_date': '2026-03-02', 'status': 'Issued', 'notes': 'Precision measurements'},
]

BORROWED = [
    {'item_name': 'Digital Multimeter', 'quantity': 1, 'borrowed_by': 'Prof. Rajesh Kumar', 'borrow_date': '2026-02-20', 'expected_return_date': '2026-03-06', 'status': 'Overdue'},
    {'item_name': 'Soldering Iron Kit', 'quantity': 1, 'borrowed_by': 'Arjun Mehta', 'borrow_date': '2026-03-01', 'expected_return_date': '2026-03-15', 'status': 'Active'},
    {'item_name': 'Torque Wrench Set', 'quantity': 1, 'borrowed_by': 'Vikram Singh', 'borrow_date': '2026-02-28', 'expected_return_date': '2026-03-14', 'status': 'Active'},
    {'item_name': 'Oscilloscope Probe', 'quantity': 1, 'borrowed_by': 'Dr. Priya Sharma', 'borrow_date': '2026-02-15', 'expected_return_date': '2026-03-01', 'status': 'Overdue'},
    {'item_name': 'Caliper Digital', 'quantity': 1, 'borrowed_by': 'Ananya Reddy', 'borrow_date': '2026-03-02', 'expected_return_date': '2026-03-16', 'status': 'Active'},
    {'item_name': 'Stepper Motor NEMA 17', 'quantity': 4, 'borrowed_by': 'Ananya Reddy', 'borrow_date': '2026-03-05', 'expected_return_date': '2026-03-19', 'status': 'Active'},
    {'item_name': 'Wire Stripper', 'quantity': 1, 'borrowed_by': 'Rohan Desai', 'borrow_date': '2026-02-10', 'expected_return_date': '2026-02-24', 'status': 'Returned', 'actual_return_date': '2026-02-23'},
    {'item_name': 'Hot Glue Gun', 'quantity': 1, 'borrowed_by': 'Kavya Nair', 'borrow_date': '2026-03-08', 'expected_return_date': '2026-03-22', 'status': 'Active'},
]

ACTIVITIES = [
    {'type': 'issued', 'description': 'Stepper Motor NEMA 17 (x4) issued to Ananya Reddy', 'timestamp': '2026-03-10T14:30:00', 'user': 'Admin'},
    {'type': 'requested', 'description': 'Power Supply 12V 5A (x2) requested by Rohan Desai', 'timestamp': '2026-03-10T11:15:00', 'user': 'Rohan Desai'},
    {'type': 'approved', 'description': 'LED Strip request approved for Kavya Nair', 'timestamp': '2026-03-09T16:45:00', 'user': 'Admin'},
    {'type': 'restocked', 'description': 'Breadboard 830-Point restocked (+20 units)', 'timestamp': '2026-03-09T10:00:00', 'user': 'Admin'},
    {'type': 'returned', 'description': 'Wire Stripper returned by Rohan Desai', 'timestamp': '2026-02-23T09:30:00', 'user': 'Rohan Desai'},
    {'type': 'rejected', 'description': 'Soldering Iron Kit request rejected for Vikram Singh', 'timestamp': '2026-03-04T13:20:00', 'user': 'Admin'},
    {'type': 'requested', 'description': 'Raspberry Pi 4 (x3) requested by Prof. Rajesh Kumar', 'timestamp': '2026-03-10T09:00:00', 'user': 'Prof. Rajesh Kumar'},
    {'type': 'issued', 'description': 'Caliper Digital (x1) issued to Ananya Reddy', 'timestamp': '2026-03-02T15:00:00', 'user': 'Admin'},
    {'type': 'restocked', 'description': 'Solder Wire (Sn63/Pb37) restocked (+10 units)', 'timestamp': '2026-03-01T11:30:00', 'user': 'Admin'},
    {'type': 'requested', 'description': 'Servo Motor SG90 (x10) requested by Dr. Priya Sharma', 'timestamp': '2026-03-09T08:45:00', 'user': 'Dr. Priya Sharma'},
]


def parse_date(s):
    return datetime.strptime(s, '%Y-%m-%d').date() if s else None


def parse_datetime(s):
    if not s:
        return None
    dt = datetime.fromisoformat(s.replace('Z', '+00:00'))
    if timezone.is_naive(dt):
        dt = timezone.make_aware(dt)
    return dt


class Command(BaseCommand):
    help = 'Load canonical demo data (idempotent: skips if Supplier table has rows).'

    def handle(self, *args, **options):
        if Supplier.objects.exists():
            self.stdout.write(self.style.WARNING('Data already exists; skipping seed.'))
            return

        self.stdout.write('Seeding suppliers...')
        for s in SUPPLIERS:
            s = dict(s)
            s['last_purchase_date'] = parse_date(s['last_purchase_date'])
            Supplier.objects.create(**s)

        self.stdout.write('Seeding inventory...')
        supplier_by_name = {s.name: s for s in Supplier.objects.all()}
        for inv in INVENTORY:
            inv = dict(inv)
            supplier_name = inv.pop('supplier_name')
            inv['supplier'] = supplier_by_name.get(supplier_name)
            inv['purchase_date'] = parse_date(inv['purchase_date'])
            InventoryItem.objects.create(**inv)

        self.stdout.write('Seeding requests...')
        item_by_name = {i.name: i for i in InventoryItem.objects.all()}
        for r in REQUESTS:
            r = dict(r)
            name = r.pop('item_name')
            if name not in item_by_name:
                raise CommandError(f'Seed data error: request references unknown inventory item "{name}".')
            r['item'] = item_by_name[name]
            r['request_date'] = parse_date(r['request_date'])
            ItemRequest.objects.create(**r)

        self.stdout.write('Seeding borrowed...')
        for b in BORROWED:
            b = dict(b)
            name = b.pop('item_name')
            if name not in item_by_name:
                raise CommandError(f'Seed data error: borrowed record references unknown inventory item "{name}".')
            item = item_by_name[name]
            b['item'] = item
            b['borrow_date'] = parse_date(b['borrow_date'])
            b['expected_return_date'] = parse_date(b['expected_return_date'])
            b['actual_return_date'] = parse_date(b.get('actual_return_date'))
            qty = b.get('quantity', 1)
            BorrowedItem.objects.create(**b)
            if b.get('status') in ('Active', 'Overdue'):
                item.quantity = max(item.quantity - qty, 0)
                item.save(update_fields=['quantity'])

        self.stdout.write('Seeding activity...')
        for a in ACTIVITIES:
            a = dict(a)
            ts = parse_datetime(a.pop('timestamp')) or timezone.now()
            ActivityEntry.objects.create(
                type=a['type'],
                description=a['description'],
                user=a['user'],
                timestamp=ts,
            )

        self.stdout.write(self.style.SUCCESS('Seed complete.'))
