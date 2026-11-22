import { sql } from 'drizzle-orm'
import {
  boolean,
  check,
  date,
  integer,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core'

export const paymentMethodEnum = pgEnum('payment_method', ['lunas', 'utang'])

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').notNull().default(false),
    image: text('image'),
    role: text('role').notNull().default('kasir'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('user_role_valid', sql`${table.role} in ('kasir', 'pemilik')`),
  ],
)

export const session = pgTable('session', {
  id: text('id').primaryKey(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  token: text('token').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  ipAddress: text('ip_address'),
  userAgent: text('user_agent'),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
})

export const account = pgTable('account', {
  id: text('id').primaryKey(),
  accountId: text('account_id').notNull(),
  providerId: text('provider_id').notNull(),
  userId: text('user_id')
    .notNull()
    .references(() => user.id, { onDelete: 'cascade' }),
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  idToken: text('id_token'),
  accessTokenExpiresAt: timestamp('access_token_expires_at', { withTimezone: true }),
  refreshTokenExpiresAt: timestamp('refresh_token_expires_at', { withTimezone: true }),
  scope: text('scope'),
  password: text('password'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const verification = pgTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const products = pgTable(
  'products',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    unit: text('unit').notNull(),
    buyPrice: integer('buy_price').notNull(),
    sellPrice: integer('sell_price').notNull(),
    photoUrl: text('photo_url'),
    stock: numeric('stock', { precision: 12, scale: 3 }).notNull().default('0'),
    showInCatalog: boolean('show_in_catalog').notNull().default(false),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('products_stock_non_negative', sql`${table.stock} >= 0`),
    check('products_buy_price_non_negative', sql`${table.buyPrice} >= 0`),
    check('products_sell_price_non_negative', sql`${table.sellPrice} >= 0`),
  ],
)

export const stockIns = pgTable(
  'stock_ins',
  {
    id: text('id').primaryKey(),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    buyPrice: integer('buy_price').notNull(),
    receivedDate: date('received_date', { mode: 'string' }).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    check('stock_ins_quantity_positive', sql`${table.quantity} > 0`),
    check('stock_ins_buy_price_non_negative', sql`${table.buyPrice} >= 0`),
  ],
)

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  contact: text('contact').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
})

export const sales = pgTable(
  'sales',
  {
    id: text('id').primaryKey(),
    total: integer('total').notNull(),
    paymentMethod: paymentMethodEnum('payment_method').notNull(),
    idempotencyKey: text('idempotency_key').unique(),
    idempotencyRequestHash: text('idempotency_request_hash'),
    customerId: text('customer_id').references(() => customers.id),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    voidedAt: timestamp('voided_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('sales_total_non_negative', sql`${table.total} >= 0`)],
)

export const saleItems = pgTable(
  'sale_items',
  {
    saleId: text('sale_id')
      .notNull()
      .references(() => sales.id, { onDelete: 'cascade' }),
    productId: text('product_id')
      .notNull()
      .references(() => products.id),
    quantity: numeric('quantity', { precision: 12, scale: 3 }).notNull(),
    unitPrice: integer('unit_price').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.saleId, table.productId] }),
    check('sale_items_quantity_positive', sql`${table.quantity} > 0`),
    check('sale_items_unit_price_non_negative', sql`${table.unitPrice} >= 0`),
  ],
)

export const debts = pgTable(
  'debts',
  {
    id: text('id').primaryKey(),
    customerId: text('customer_id')
      .notNull()
      .references(() => customers.id),
    saleId: text('sale_id')
      .notNull()
      .references(() => sales.id),
    amount: integer('amount').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('debts_sale_id_unique').on(table.saleId),
    check('debts_amount_positive', sql`${table.amount} > 0`),
  ],
)

export const debtPayments = pgTable(
  'debt_payments',
  {
    id: text('id').primaryKey(),
    debtId: text('debt_id')
      .notNull()
      .references(() => debts.id, { onDelete: 'cascade' }),
    amount: integer('amount').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [check('debt_payments_amount_positive', sql`${table.amount} > 0`)],
)
