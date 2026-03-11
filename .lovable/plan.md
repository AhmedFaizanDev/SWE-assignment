

# Engineering Inventory Management System

A modern, visually engaging dashboard prototype for managing engineering lab tools, equipment, and components. All data is in-memory with realistic mock data. No auth, no database.

## Global Layout
- **Sidebar** (~240px): Fixed left navigation with icons + labels for Dashboard, Inventory, Requests, Borrowed Equipment, Suppliers, Reports. Highlighted active page, collapsible on mobile.
- **Top Bar**: Page title (left), global search input (center), notification bell with dropdown + user avatar dropdown (right).
- Smooth page transitions between sections.

## Pages

### 1. Dashboard
- **4 Summary Cards** in responsive grid: Total Inventory Items, Low Stock Items, Active Borrowed Equipment, Pending Requests. Animated counters and staggered fade-in on load.
- **Low Stock Alert Panel**: Table of items below threshold with status badges.
- **Recent Activity Feed**: Timeline of recent actions (issued, returned, restocked) with icons and timestamps.
- **Inventory Distribution Chart** (bar chart by category) with loading animation.

### 2. Inventory Management
- Searchable, sortable, paginated data table with columns: Item Name, Category, Quantity, Location, Status, Actions (View/Edit/Delete).
- **Add Item** button opens a modal form with fields: Item Name, Category (dropdown), Quantity, Min Threshold, Location, Supplier (dropdown), Purchase Date (date picker), Notes.
- Edit modal pre-fills data. Delete with confirmation dialog.
- Color-coded status badges (Available/Low Stock/Critical).

### 3. Item Requests
- Table: Request ID, Item Name, Requested Qty, Requested By, Request Date, Status, Actions.
- Status badges: Pending (gray), Approved (green), Rejected (red), Issued (blue).
- Actions: Approve, Reject, Mark as Issued. Approving + issuing moves item to Borrowed Equipment and updates inventory quantities.
- "New Request" modal form.

### 4. Borrowed Equipment
- Table: Equipment Name, Borrowed By, Borrow Date, Expected Return Date, Status, Actions.
- Status: Active (blue), Returned (green), Overdue (red).
- Actions: Mark Returned (updates inventory qty), Extend Return Date (date picker popover).

### 5. Suppliers
- Table: Supplier Name, Contact Info, Items Supplied, Last Purchase Date, Total Orders.
- Add/Edit supplier modal. View supplier detail panel.

### 6. Reports & Analytics
- **Inventory Distribution**: Bar chart (items by category).
- **Monthly Usage**: Line chart (usage trends over 12 months).
- **Most Used Equipment**: Horizontal bar chart (top 10 items).
- Charts animate in on load with smooth transitions.

## Design & Interactions
- Modern, expressive visual style with soft shadows, layered surfaces, subtle gradients/accents.
- Custom color palette: slate/charcoal primary, light backgrounds, blue accents, green/yellow/red status colors.
- Staggered card animations on page load, smooth route transitions.
- Table row hover highlights, card hover elevation effects.
- Modal forms with soft entrance/exit animations.
- Notification panel slides in from bell icon with unread indicators.
- Skeleton loaders for initial data display.
- Fully responsive: desktop (full sidebar), tablet (collapsible), mobile (stacked cards).

## Mock Data
- ~30 inventory items across Electronics, Mechanical, Tools, Consumables categories.
- ~10 pending/active requests, ~8 borrowed items (some overdue), ~6 suppliers.
- 12 months of usage trend data, recent activity entries.
- All CRUD operations work in-memory within the session.

