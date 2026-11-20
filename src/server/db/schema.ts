import {
  mysqlTable,
  int,
  varchar,
  text,
  decimal,
  timestamp,
  mysqlEnum,
  boolean,
} from 'drizzle-orm/mysql-core';

// ─── Jobs ─────────────────────────────────────────────────────────────────────

export const jobs = mysqlTable('jobs', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  address: varchar('address', { length: 500 }),
  status: mysqlEnum('status', ['pending', 'in_progress', 'completed', 'on_hold', 'cancelled']).notNull().default('pending'),
  budget: decimal('budget', { precision: 12, scale: 2 }),
  startDate: varchar('start_date', { length: 20 }),
  endDate: varchar('end_date', { length: 20 }),
  notes: text('notes'),
  scopeNotes: text('scope_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Job Materials ─────────────────────────────────────────────────────────────

export const jobMaterials = mysqlTable('job_materials', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unit: varchar('unit', { length: 50 }).notNull().default('ea'),
  estimatedCost: decimal('estimated_cost', { precision: 12, scale: 2 }),
  status: mysqlEnum('status', ['needed', 'ordered', 'received']).notNull().default('needed'),
  vendor: varchar('vendor', { length: 255 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Expenses ─────────────────────────────────────────────────────────────────

export const expenses = mysqlTable('expenses', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id),
  vendor: varchar('vendor', { length: 255 }).notNull(),
  description: varchar('description', { length: 500 }).notNull(),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  category: mysqlEnum('category', ['materials', 'labor', 'equipment', 'permits', 'other']).notNull().default('other'),
  receiptUrl: varchar('receipt_url', { length: 1000 }),
  expenseDate: varchar('expense_date', { length: 20 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Invoices ─────────────────────────────────────────────────────────────────

export const invoices = mysqlTable('invoices', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  status: mysqlEnum('status', ['draft', 'sent', 'paid', 'overdue', 'cancelled']).notNull().default('draft'),
  clientName: varchar('client_name', { length: 255 }).notNull().default(''),
  clientEmail: varchar('client_email', { length: 255 }),
  clientAddress: varchar('client_address', { length: 500 }),
  projectDescription: varchar('project_description', { length: 1000 }),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  tax: decimal('tax', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull().default('0'),
  dueDate: varchar('due_date', { length: 20 }),
  notes: text('notes'),
  viewToken: varchar('view_token', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const invoiceLineItems = mysqlTable('invoice_line_items', {
  id: int('id').primaryKey().autoincrement(),
  invoiceId: int('invoice_id').notNull().references(() => invoices.id),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
  type: mysqlEnum('type', ['labor', 'materials', 'other']).notNull().default('other'),
});

// ─── Documents ────────────────────────────────────────────────────────────────

export const documents = mysqlTable('documents', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  name: varchar('name', { length: 255 }).notNull(),
  fileUrl: varchar('file_url', { length: 1000 }).notNull(),
  fileType: varchar('file_type', { length: 100 }),
  fileSize: int('file_size'),
  category: mysqlEnum('category', ['contract', 'permit', 'photo', 'estimate', 'other']).notNull().default('other'),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});


// ─── Estimates ────────────────────────────────────────────────────────────────

export const estimates = mysqlTable('estimates', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id),
  estimateNumber: varchar('estimate_number', { length: 50 }).notNull().unique(),
  status: mysqlEnum('status', ['draft', 'sent', 'approved', 'declined']).notNull().default('draft'),
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  clientAddress: varchar('client_address', { length: 500 }),
  projectDescription: text('project_description'),
  subtotal: decimal('subtotal', { precision: 12, scale: 2 }).notNull().default('0'),
  taxRate: decimal('tax_rate', { precision: 5, scale: 2 }).notNull().default('0'),
  taxAmount: decimal('tax_amount', { precision: 12, scale: 2 }).notNull().default('0'),
  total: decimal('total', { precision: 12, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  validUntil: varchar('valid_until', { length: 20 }),
  viewToken: varchar('view_token', { length: 64 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const estimateLineItems = mysqlTable('estimate_line_items', {
  id: int('id').primaryKey().autoincrement(),
  estimateId: int('estimate_id').notNull().references(() => estimates.id),
  description: varchar('description', { length: 500 }).notNull(),
  category: mysqlEnum('category', ['labor', 'materials', 'equipment', 'other']).notNull().default('other'),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unit: varchar('unit', { length: 50 }).default('each'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull(),
  lineTotal: decimal('line_total', { precision: 12, scale: 2 }).notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  photoUrl: varchar('photo_url', { length: 1000 }),
});

// ─── Company Settings ────────────────────────────────────────────────────────

export const companySettings = mysqlTable('company_settings', {
  id: int('id').primaryKey().autoincrement(),
  companyName: varchar('company_name', { length: 255 }).notNull().default(''),
  address: varchar('address', { length: 500 }).notNull().default(''),
  city: varchar('city', { length: 255 }).notNull().default(''),
  state: varchar('state', { length: 100 }).notNull().default(''),
  zip: varchar('zip', { length: 20 }).notNull().default(''),
  phone: varchar('phone', { length: 50 }).notNull().default(''),
  email: varchar('email', { length: 255 }).notNull().default(''),
  website: varchar('website', { length: 255 }).notNull().default(''),
  logoOnPrint: int('logo_on_print').notNull().default(1),
  defaultLaborRate: decimal('default_labor_rate', { precision: 10, scale: 2 }).notNull().default('65'),
  defaultOverheadPct: decimal('default_overhead_pct', { precision: 5, scale: 2 }).notNull().default('15'),
  defaultProfitPct: decimal('default_profit_pct', { precision: 5, scale: 2 }).notNull().default('20'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Document Settings ────────────────────────────────────────────────────────

export const documentSettings = mysqlTable('document_settings', {
  id: int('id').primaryKey().autoincrement(),
  estimatePrefix: varchar('estimate_prefix', { length: 20 }).notNull().default('EST'),
  estimateYearFormat: int('estimate_year_format').notNull().default(1),
  invoicePrefix: varchar('invoice_prefix', { length: 20 }).notNull().default('INV'),
  invoiceYearFormat: int('invoice_year_format').notNull().default(1),
  estimateTerms: text('estimate_terms').notNull().default(''),
  invoiceTerms: text('invoice_terms').notNull().default(''),
  estimateHeaderText: varchar('estimate_header_text', { length: 500 }).notNull().default(''),
  estimateFooterText: varchar('estimate_footer_text', { length: 500 }).notNull().default(''),
  invoiceHeaderText: varchar('invoice_header_text', { length: 500 }).notNull().default(''),
  invoiceFooterText: varchar('invoice_footer_text', { length: 500 }).notNull().default(''),
  estimateSignatureLine: int('estimate_signature_line').notNull().default(1),
  estimateEmailMessage: text('estimate_email_message').notNull().default(''),
  invoiceEmailMessage: text('invoice_email_message').notNull().default(''),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Price Library ──────────────────────────────────────────────────────────────

export const priceLibrary = mysqlTable('price_library', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  category: varchar('category', { length: 50 }).notNull().default('materials'),
  unit: varchar('unit', { length: 50 }).notNull().default('ea'),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull().default('0.00'),
  vendor: varchar('vendor', { length: 255 }),
  sku: varchar('sku', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Payments ─────────────────────────────────────────────────────────────────

export const payments = mysqlTable('payments', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id),
  invoiceId: int('invoice_id').references(() => invoices.id),
  amount: decimal('amount', { precision: 12, scale: 2 }).notNull(),
  paymentDate: varchar('payment_date', { length: 20 }).notNull(),
  method: mysqlEnum('method', ['cash', 'check', 'card', 'transfer', 'other']).notNull().default('check'),
  referenceNumber: varchar('reference_number', { length: 100 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});


// ─── AI Takeoff: Projects ──────────────────────────────────────────────────────

export const takeoffProjects = mysqlTable('takeoff_projects', {
  id: int('id').primaryKey().autoincrement(),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  address: varchar('address', { length: 500 }),
  description: text('description'),
  dimensions: text('dimensions'),
  status: mysqlEnum('status', ['draft', 'analyzed', 'complete']).notNull().default('draft'),
  notes: text('notes'),
  linkedJobId: int('linked_job_id'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── AI Takeoff: Photos ────────────────────────────────────────────────────────

export const takeoffPhotos = mysqlTable('takeoff_photos', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => takeoffProjects.id),
  filename: varchar('filename', { length: 500 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: int('size_bytes'),
  aiCaption: text('ai_caption'),
  uploadedAt: timestamp('uploaded_at').defaultNow(),
});

// ─── AI Takeoff: Material Categories ──────────────────────────────────────────

export const takeoffCategories = mysqlTable('takeoff_categories', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 100 }).notNull(),
  sortOrder: int('sort_order').notNull().default(0),
});

// ─── AI Takeoff: Material Items ────────────────────────────────────────────────

export const takeoffMaterials = mysqlTable('takeoff_materials', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => takeoffProjects.id),
  category: varchar('category', { length: 100 }).notNull().default('Miscellaneous'),
  name: varchar('name', { length: 500 }).notNull(),
  description: text('description'),
  quantity: decimal('quantity', { precision: 12, scale: 3 }).notNull().default('1'),
  unit: varchar('unit', { length: 50 }).notNull().default('ea'),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }).notNull().default('0'),
  wastePercent: decimal('waste_percent', { precision: 5, scale: 2 }).notNull().default('10'),
  extendedPrice: decimal('extended_price', { precision: 14, scale: 2 }).notNull().default('0'),
  supplier: varchar('supplier', { length: 255 }),
  productInfo: text('product_info'),
  priceSource: varchar('price_source', { length: 100 }),
  priceDate: varchar('price_date', { length: 20 }),
  productLink: varchar('product_link', { length: 1000 }),
  aiGenerated: int('ai_generated').notNull().default(0),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── AI Takeoff: Estimates ─────────────────────────────────────────────────────

export const takeoffEstimates = mysqlTable('takeoff_estimates', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => takeoffProjects.id),
  materialSubtotal: decimal('material_subtotal', { precision: 14, scale: 2 }).notNull().default('0'),
  wasteAllowance: decimal('waste_allowance', { precision: 14, scale: 2 }).notNull().default('0'),
  laborCost: decimal('labor_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  laborNotes: text('labor_notes'),
  salesTaxRate: decimal('sales_tax_rate', { precision: 5, scale: 3 }).notNull().default('7.000'),
  salesTax: decimal('sales_tax', { precision: 14, scale: 2 }).notNull().default('0'),
  markupPercent: decimal('markup_percent', { precision: 5, scale: 2 }).notNull().default('15'),
  markupAmount: decimal('markup_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  totalEstimate: decimal('total_estimate', { precision: 14, scale: 2 }).notNull().default('0'),
  notes: text('notes'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── AI Scope Builder: Projects ───────────────────────────────────────────────

export const scopeProjects = mysqlTable('scope_projects', {
  id: int('id').primaryKey().autoincrement(),
  projectName: varchar('project_name', { length: 255 }).notNull(),
  customerName: varchar('customer_name', { length: 255 }).notNull(),
  customerEmail: varchar('customer_email', { length: 255 }),
  customerPhone: varchar('customer_phone', { length: 50 }),
  jobAddress: varchar('job_address', { length: 500 }),
  description: text('description'),
  dimensions: text('dimensions'),
  specialInstructions: text('special_instructions'),
  status: mysqlEnum('scope_status', ['estimating', 'proposal_sent', 'approved', 'in_progress', 'completed', 'declined']).notNull().default('estimating'),
  linkedJobId: int('linked_job_id'),
  linkedTakeoffId: int('linked_takeoff_id'),
  // Proposal fields (editable, customer-facing)
  proposalPaymentSchedule: text('proposal_payment_schedule'),
  proposalDuration: varchar('proposal_duration', { length: 255 }),
  proposalWarranty: text('proposal_warranty'),
  proposalExclusions: text('proposal_exclusions'),
  proposalNotes: text('proposal_notes'),
  sellingPrice: decimal('selling_price', { precision: 14, scale: 2 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── AI Scope Builder: Photos ─────────────────────────────────────────────────

export const scopePhotos = mysqlTable('scope_photos', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => scopeProjects.id),
  filename: varchar('filename', { length: 500 }).notNull(),
  originalName: varchar('original_name', { length: 500 }),
  mimeType: varchar('mime_type', { length: 100 }),
  url: varchar('url', { length: 1000 }),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── AI Scope Builder: Tasks ──────────────────────────────────────────────────

export const scopeTasks = mysqlTable('scope_tasks', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => scopeProjects.id),
  phase: mysqlEnum('phase', ['preparation', 'demolition', 'installation', 'finishing']).notNull().default('installation'),
  description: text('description').notNull(),
  sortOrder: int('sort_order').notNull().default(0),
  flagged: int('flagged').notNull().default(0),
  flagNote: varchar('flag_note', { length: 500 }),
  aiGenerated: int('ai_generated').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── AI Scope Builder: Labor ──────────────────────────────────────────────────

export const scopeLabor = mysqlTable('scope_labor', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => scopeProjects.id),
  taskId: int('task_id').references(() => scopeTasks.id),
  description: varchar('description', { length: 500 }).notNull(),
  hours: decimal('hours', { precision: 8, scale: 2 }).notNull().default('0'),
  workers: int('workers').notNull().default(1),
  crewDays: decimal('crew_days', { precision: 8, scale: 2 }).notNull().default('0'),
  rate: decimal('rate', { precision: 10, scale: 2 }).notNull().default('65'),
  extended: decimal('extended', { precision: 14, scale: 2 }).notNull().default('0'),
  assumptions: text('assumptions'),
  requiresInspection: int('requires_inspection').notNull().default(0),
  aiGenerated: int('ai_generated').notNull().default(0),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── AI Scope Builder: Cost Summary ──────────────────────────────────────────

export const scopeCostSummary = mysqlTable('scope_cost_summary', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => scopeProjects.id),
  materialCost: decimal('material_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  wasteAllowance: decimal('waste_allowance', { precision: 14, scale: 2 }).notNull().default('0'),
  laborCost: decimal('labor_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  subcontractorCost: decimal('subcontractor_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  equipmentRental: decimal('equipment_rental', { precision: 14, scale: 2 }).notNull().default('0'),
  deliveryCharges: decimal('delivery_charges', { precision: 14, scale: 2 }).notNull().default('0'),
  disposalCost: decimal('disposal_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  permitAllowance: decimal('permit_allowance', { precision: 14, scale: 2 }).notNull().default('0'),
  miscExpenses: decimal('misc_expenses', { precision: 14, scale: 2 }).notNull().default('0'),
  totalDirectCost: decimal('total_direct_cost', { precision: 14, scale: 2 }).notNull().default('0'),
  overheadPct: decimal('overhead_pct', { precision: 5, scale: 2 }).notNull().default('15'),
  overhead: decimal('overhead', { precision: 14, scale: 2 }).notNull().default('0'),
  profitPct: decimal('profit_pct', { precision: 5, scale: 2 }).notNull().default('20'),
  profitMargin: decimal('profit_margin', { precision: 14, scale: 2 }).notNull().default('0'),
  sellingPrice: decimal('selling_price', { precision: 14, scale: 2 }).notNull().default('0'),
  grossProfit: decimal('gross_profit', { precision: 14, scale: 2 }).notNull().default('0'),
  grossProfitPct: decimal('gross_profit_pct', { precision: 5, scale: 2 }).notNull().default('0'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── AI Scope Builder: Change Orders ─────────────────────────────────────────

export const scopeChangeOrders = mysqlTable('scope_change_orders', {
  id: int('id').primaryKey().autoincrement(),
  projectId: int('project_id').notNull().references(() => scopeProjects.id),
  title: varchar('title', { length: 255 }).notNull(),
  scopeDescription: text('scope_description'),
  additionalMaterials: text('additional_materials'),
  additionalLabor: text('additional_labor'),
  priceAdjustment: decimal('price_adjustment', { precision: 14, scale: 2 }).notNull().default('0'),
  scheduleAdjustment: varchar('schedule_adjustment', { length: 255 }),
  status: mysqlEnum('co_status', ['draft', 'sent', 'approved', 'declined']).notNull().default('draft'),
  approvedAt: timestamp('approved_at'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});


// ─── Employees & Subcontractors ───────────────────────────────────────────────

export const employees = mysqlTable('employees', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  type: mysqlEnum('emp_type', ['employee', 'subcontractor']).notNull().default('employee'),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  specialty: varchar('specialty', { length: 255 }),
  hourlyRate: decimal('hourly_rate', { precision: 10, scale: 2 }),
  notes: text('notes'),
  availability: text('availability'),
  isActive: int('is_active').notNull().default(1),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Job Assignments (employees/subs assigned to jobs) ────────────────────────

export const jobAssignments = mysqlTable('job_assignments', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  employeeId: int('employee_id').notNull().references(() => employees.id),
  role: varchar('role', { length: 255 }),
  scheduledHours: decimal('scheduled_hours', { precision: 8, scale: 2 }),
  actualHours: decimal('actual_hours', { precision: 8, scale: 2 }),
  startDate: varchar('start_date', { length: 20 }),
  endDate: varchar('end_date', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Calendar Events ──────────────────────────────────────────────────────────

export const calendarEvents = mysqlTable('calendar_events', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id),
  title: varchar('title', { length: 255 }).notNull(),
  type: mysqlEnum('event_type', ['job_start', 'job_end', 'delivery', 'appointment', 'inspection', 'deadline', 'other']).notNull().default('other'),
  eventDate: varchar('event_date', { length: 20 }).notNull(),
  endDate: varchar('end_date', { length: 20 }),
  startTime: varchar('start_time', { length: 10 }),
  endTime: varchar('end_time', { length: 10 }),
  description: text('description'),
  assignedEmployeeId: int('assigned_employee_id').references(() => employees.id),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Project Stages / Progress ────────────────────────────────────────────────

export const projectStages = mysqlTable('project_stages', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  stage: mysqlEnum('stage', [
    'not_started', 'scheduled', 'preparation', 'demolition', 'framing',
    'rough_in', 'insulation', 'drywall', 'flooring', 'cabinet_installation',
    'painting', 'finishing', 'final_inspection', 'completed'
  ]).notNull().default('not_started'),
  progressPct: int('progress_pct').notNull().default(0),
  notes: text('notes'),
  expectedCompletionDate: varchar('expected_completion_date', { length: 20 }),
  actualCompletionDate: varchar('actual_completion_date', { length: 20 }),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Job Photos ───────────────────────────────────────────────────────────────

export const jobPhotos = mysqlTable('job_photos', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  filename: varchar('filename', { length: 500 }).notNull(),
  originalName: varchar('original_name', { length: 255 }),
  url: varchar('url', { length: 1000 }).notNull(),
  category: mysqlEnum('photo_category', ['before', 'demolition', 'during', 'installation', 'after', 'inspection']).notNull().default('during'),
  description: text('description'),
  takenBy: varchar('taken_by', { length: 255 }),
  takenAt: varchar('taken_at', { length: 20 }),
  mimeType: varchar('mime_type', { length: 100 }),
  sizeBytes: int('size_bytes'),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Material Orders ──────────────────────────────────────────────────────────

export const materialOrders = mysqlTable('material_orders', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id),
  description: varchar('description', { length: 500 }).notNull(),
  quantity: decimal('quantity', { precision: 10, scale: 2 }).notNull().default('1'),
  unit: varchar('unit', { length: 50 }).notNull().default('ea'),
  supplier: varchar('supplier', { length: 255 }),
  productLink: varchar('product_link', { length: 1000 }),
  unitPrice: decimal('unit_price', { precision: 12, scale: 2 }),
  totalCost: decimal('total_cost', { precision: 12, scale: 2 }),
  status: mysqlEnum('order_status', ['needed', 'price_checking', 'ready_to_order', 'ordered', 'partially_received', 'received', 'returned', 'backordered']).notNull().default('needed'),
  orderDate: varchar('order_date', { length: 20 }),
  expectedDelivery: varchar('expected_delivery', { length: 20 }),
  actualDelivery: varchar('actual_delivery', { length: 20 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Job Completion Checklist ─────────────────────────────────────────────────

export const completionChecklist = mysqlTable('completion_checklist', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  item: varchar('item', { length: 500 }).notNull(),
  completed: int('completed').notNull().default(0),
  completedAt: timestamp('completed_at'),
  notes: text('notes'),
  photoUrl: varchar('photo_url', { length: 1000 }),
  sortOrder: int('sort_order').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Customers ────────────────────────────────────────────────────────────────

export const customers = mysqlTable('customers', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: varchar('address', { length: 500 }),
  notes: text('notes'),
  warrantyInfo: text('warranty_info'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Notifications ────────────────────────────────────────────────────────────

export const notifications = mysqlTable('notifications', {
  id: int('id').primaryKey().autoincrement(),
  type: mysqlEnum('notif_type', ['upcoming_job', 'schedule_change', 'employee_assignment', 'material_delivery', 'delayed_project', 'overdue_payment', 'inspection_deadline', 'job_ready', 'price_change', 'price_refresh_failed', 'price_unavailable']).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message').notNull(),
  jobId: int('job_id').references(() => jobs.id),
  read: int('read').notNull().default(0),
  createdAt: timestamp('created_at').defaultNow(),
});

// ─── Daily Schedules ──────────────────────────────────────────────────────────

export const dailySchedules = mysqlTable('daily_schedules', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').notNull().references(() => jobs.id),
  scheduleDate: varchar('schedule_date', { length: 20 }).notNull(),
  startTime: varchar('start_time', { length: 10 }),
  endTime: varchar('end_time', { length: 10 }),
  tasks: text('tasks'),
  materialsNeeded: text('materials_needed'),
  specialInstructions: text('special_instructions'),
  jobSiteNotes: text('job_site_notes'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── BetterAuth Tables ───────────────────────────────────────────────────────

export const user = mysqlTable('user', {
  id: varchar('id', { length: 36 }).primaryKey(),
  name: varchar('name', { length: 255 }),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: boolean('email_verified').default(false),
  image: text('image'),
  isAdmin: boolean('is_admin').default(false),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const session = mysqlTable('session', {
  id: varchar('id', { length: 36 }).primaryKey(),
  expiresAt: timestamp('expires_at').notNull(),
  token: varchar('token', { length: 255 }).notNull().unique(),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const account = mysqlTable('account', {
  id: varchar('id', { length: 36 }).primaryKey(),
  accountId: varchar('account_id', { length: 255 }).notNull(),
  providerId: varchar('provider_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 36 })
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at'),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
  scope: text('scope'),
  password: varchar('password', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const verification = mysqlTable('verification', {
  id: varchar('id', { length: 36 }).primaryKey(),
  identifier: varchar('identifier', { length: 255 }).notNull(),
  value: varchar('value', { length: 255 }).notNull(),
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Contracts ────────────────────────────────────────────────────────────────

export const contracts = mysqlTable('contracts', {
  id: int('id').primaryKey().autoincrement(),
  jobId: int('job_id').references(() => jobs.id, { onDelete: 'set null' }),
  contractNumber: varchar('contract_number', { length: 50 }),
  status: mysqlEnum('contract_status', ['draft', 'sent', 'signed', 'cancelled']).notNull().default('draft'),
  // Parties
  clientName: varchar('client_name', { length: 255 }).notNull(),
  clientEmail: varchar('client_email', { length: 255 }),
  clientPhone: varchar('client_phone', { length: 50 }),
  clientAddress: varchar('client_address', { length: 500 }),
  contractorName: varchar('contractor_name', { length: 255 }),
  contractorLicense: varchar('contractor_license', { length: 100 }),
  contractorPhone: varchar('contractor_phone', { length: 50 }),
  contractorEmail: varchar('contractor_email', { length: 255 }),
  contractorAddress: varchar('contractor_address', { length: 500 }),
  // Project details
  projectAddress: varchar('project_address', { length: 500 }),
  projectDescription: text('project_description'),
  scopeOfWork: text('scope_of_work'),
  // Financials
  contractAmount: decimal('contract_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  depositAmount: decimal('deposit_amount', { precision: 14, scale: 2 }).notNull().default('0'),
  depositDueDate: varchar('deposit_due_date', { length: 20 }),
  paymentSchedule: text('payment_schedule'),
  // Dates
  startDate: varchar('start_date', { length: 20 }),
  estimatedEndDate: varchar('estimated_end_date', { length: 20 }),
  signedDate: varchar('signed_date', { length: 20 }),
  // Terms
  warrantyPeriod: varchar('warranty_period', { length: 100 }),
  terms: text('terms'),
  notes: text('notes'),
  // Signatures (stored as text/base64 data URLs)
  clientSignature: text('client_signature'),
  contractorSignature: text('contractor_signature'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Supplier Pricing ────────────────────────────────────────────────────────

export const supplierPrices = mysqlTable('supplier_prices', {
  id: int('id').primaryKey().autoincrement(),
  materialId: int('material_id').references(() => priceLibrary.id, { onDelete: 'cascade' }),
  supplier: mysqlEnum('supplier', ['Menards', "Lowe's"]).notNull(),
  storeLocation: varchar('store_location', { length: 255 }).notNull().default('Terre Haute, IN'),
  retailerProductId: varchar('retailer_product_id', { length: 255 }),
  sku: varchar('sku', { length: 100 }),
  upc: varchar('upc', { length: 50 }),
  productName: varchar('product_name', { length: 500 }),
  productDescription: text('product_description'),
  unit: varchar('unit', { length: 50 }),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }),
  productUrl: text('product_url'),
  verifiedAt: timestamp('verified_at'),
  availabilityStatus: mysqlEnum('availability_status', ['available', 'unavailable', 'unknown']).notNull().default('unknown'),
  matchConfidence: mysqlEnum('match_confidence', ['high', 'medium', 'low', 'none']).notNull().default('none'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

export const priceHistory = mysqlTable('price_history', {
  id: int('id').primaryKey().autoincrement(),
  materialId: int('material_id').references(() => priceLibrary.id, { onDelete: 'cascade' }),
  supplier: mysqlEnum('supplier', ['Menards', "Lowe's"]).notNull(),
  unitPrice: decimal('unit_price', { precision: 10, scale: 2 }).notNull(),
  selectedEstimatePrice: decimal('selected_estimate_price', { precision: 10, scale: 2 }),
  selectedSupplier: mysqlEnum('selected_supplier', ['Menards', "Lowe's"]),
  comparisonStatus: mysqlEnum('comparison_status', ['complete', 'incomplete', 'unavailable', 'unit_mismatch']).notNull().default('incomplete'),
  recordedAt: timestamp('recorded_at').defaultNow(),
});

export const pricingRefreshHistory = mysqlTable('pricing_refresh_history', {
  id: int('id').primaryKey().autoincrement(),
  startedAt: timestamp('started_at').notNull(),
  completedAt: timestamp('completed_at'),
  status: mysqlEnum('refresh_status', ['running', 'completed', 'failed']).notNull().default('running'),
  materialsChecked: int('materials_checked').notNull().default(0),
  pricesUpdated: int('prices_updated').notNull().default(0),
  priceIncreases: int('price_increases').notNull().default(0),
  priceDecreases: int('price_decreases').notNull().default(0),
  failures: int('failures').notNull().default(0),
  errorDetails: text('error_details'),
});

export const supplierConnectionStatus = mysqlTable('supplier_connection_status', {
  id: int('id').primaryKey().autoincrement(),
  supplier: mysqlEnum('supplier_name', ['Menards', "Lowe's"]).notNull().unique(),
  connectionStatus: mysqlEnum('connection_status', ['connected', 'awaiting_authorization', 'error', 'unconfigured']).notNull().default('unconfigured'),
  lastSuccessfulCheck: timestamp('last_successful_check'),
  lastError: text('last_error'),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow(),
});

// ─── Vendors ──────────────────────────────────────────────────────────────────

export const vendors = mysqlTable('vendors', {
  id: int('id').primaryKey().autoincrement(),
  name: varchar('name', { length: 255 }).notNull(),
  trade: varchar('trade', { length: 255 }),
  contactName: varchar('contact_name', { length: 255 }),
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  address: varchar('address', { length: 500 }),
  notes: text('notes'),
  createdAt: timestamp('created_at').defaultNow(),
});
