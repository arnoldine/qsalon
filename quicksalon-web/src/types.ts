export type Id = string

export interface Customer {
  id: Id
  customerNumber: string
  firstName: string
  lastName: string
  phone: string
  email?: string | null
  loyaltyPoints: number
  createdAt: string
}

export interface ServiceCategory {
  id: Id
  name: string
  isActive: boolean
}

export interface SalonService {
  id: Id
  name: string
  categoryId: Id
  durationMinutes: number
  price: number
  isActive: boolean
}

export interface Employee {
  id: Id
  name: string
  role: string
  phone?: string | null
  commissionRate: number
  status: string
}

export interface Appointment {
  id: Id
  appointmentNumber: string
  customerId: Id
  employeeId: Id
  serviceId?: Id | null
  appointmentDate: string
  startTime: string
  endTime: string
  status: string
  notes?: string | null
}

export interface AppointmentDisplay {
  id: Id
  appointmentNumber: string
  appointmentDate: string
  startTime: string
  endTime: string
  status: string
  notes?: string | null
  customerId: Id
  customerName: string
  employeeId: Id
  employeeName: string
  serviceId?: Id | null
  serviceName: string
}

export interface PendingReminder extends AppointmentDisplay {
  section: 'NeedsAttention' | 'TodayUpcoming' | 'TomorrowUpcoming'
  reminderType: 'Overrun' | 'Forgotten' | 'Upcoming'
  reminderLabel: string
  triggeredAt: string
}

export type ReminderChannel = 'SMS' | 'WhatsApp' | 'Email'

export interface ReminderSettings {
  autoReminderEnabled: boolean
  leadTime: string
  defaultChannel: ReminderChannel
  numberPrefix?: string | null
  messageTemplate: string
}

export type AppointmentStatus = 'Booked' | 'Confirmed' | 'InProgress' | 'Completed' | 'Cancelled' | 'NoShow'
export type InvoiceStatus = 'Draft' | 'Completed' | 'Voided'
export type EmployeeStatus = 'Active' | 'Inactive' | 'OnLeave'

export interface Product {
  id: Id
  sku: string
  name: string
  costPrice: number
  sellingPrice: number
  quantityOnHand: number
  reorderLevel: number
  isActive: boolean
}

export interface Invoice {
  id: Id
  invoiceNumber: string
  customerId?: Id | null
  appointmentId?: Id | null
  totalAmount: number
  subtotal: number
  amountPaid: number
  status: InvoiceStatus
  createdAt: string
}

export interface PagedResult<T> {
  items: T[]
  totalCount: number
}

export interface LoginResponse {
  token: string
  expiresAt: string
  tenantId: string
  branchId: string
  fullName: string
  tenantName: string
  branchName: string
  roles: string[]
}

export interface AuthProfile {
  userId: string
  fullName: string
  tenantId: string
  tenantName: string
  branchId: string
  branchName: string
  roles: string[]
}

export interface TenantSettings {
  tenantId: string
  salonName?: string | null
  logoUrl?: string | null
  phone?: string | null
  email?: string | null
  address?: string | null
  openingHours?: string | null
  defaultCurrency: string
  taxRate: number
  receiptFooter?: string | null
  enableAppointmentReminders: boolean
  reminderSettings: ReminderSettings
}

export interface TenantAdminItem {
  id: Id
  name: string
  slug: string
  contactEmail?: string | null
  phone?: string | null
  address?: string | null
  isActive: boolean
  createdAt: string
}

export interface BranchAdminItem {
  id: Id
  tenantId: Id
  tenantName: string
  name: string
  address?: string | null
  phone?: string | null
  createdAt: string
}

export interface UserAdminItem {
  id: Id
  tenantId: Id
  tenantName: string
  branchId: Id
  branchName: string
  fullName: string
  username: string
  email?: string | null
  isActive: boolean
  role: string
  createdAt: string
}

export type PurchaseStatus = 'Draft' | 'Received' | 'Cancelled'

export interface Purchase {
  id: Id
  purchaseNumber: string
  supplierId?: Id | null
  supplierName?: string | null
  purchaseDate: string
  status: PurchaseStatus
  totalAmount: number
  amountPaid: number
  notes?: string | null
  createdAt: string
}

export interface PurchaseItem {
  id: Id
  purchaseId: Id
  productId: Id
  description: string
  quantity: number
  unitCost: number
  lineTotal: number
}

export interface Expense {
  id: Id
  expenseNumber: string
  category: string
  description: string
  amount: number
  expenseDate: string
  paymentMethod: string
  reference?: string | null
  createdAt: string
}

export interface SuperAdminStats {
  totalTenants: number
  activeTenants: number
  totalBranches: number
  totalUsers: number
}

export interface TenantProvisionResponse {
  tenantId: Id
  tenantName: string
  branchId: Id
  adminUsername: string
  tempPassword: string
}

export interface Supplier {
  id: Id
  name: string
  contactPerson?: string | null
  phone?: string | null
}

export interface DashboardKpis {
  todaysAppointments: number
  todaysRevenue: number
  pendingPayments: number
  activeCustomers: number
  staffOnDuty: number
  topServices: Array<{ service: string; revenue: number; count: number }>
  topEmployees: Array<{ name: string; commission: number }>
  lowStock: Array<{ name: string; quantityOnHand: number; reorderLevel: number }>
}
