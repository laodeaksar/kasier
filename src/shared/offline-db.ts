import Dexie, { type Table } from 'dexie'
import type { SaleCreateInput } from '@/shared/validators/sales'

export type CachedProduct = {
  id: string
  name: string
  unit: string
  sellPrice: number
  stock: number
}

type CacheMetadata = { key: string; value: string }

export type QueuedSaleStatus = 'pending' | 'needs_review'

export type QueuedSale = {
  idempotencyKey: string
  createdBy: string
  payload: SaleCreateInput & { paymentMethod: 'lunas' }
  status: QueuedSaleStatus
  createdAt: string
  lastError?: string
}

class CashierOfflineDatabase extends Dexie {
  products!: Table<CachedProduct, string>
  salesQueue!: Table<QueuedSale, string>
  metadata!: Table<CacheMetadata, string>

  constructor() {
    super('kasier-cashier-offline')
    this.version(1).stores({
      products: 'id',
      salesQueue: 'idempotencyKey, createdBy, status, createdAt',
      metadata: 'key',
    })
  }
}

let database: CashierOfflineDatabase | null = null

function getDatabase(): CashierOfflineDatabase | null {
  if (typeof indexedDB === 'undefined') return null
  database ??= new CashierOfflineDatabase()
  return database
}

export async function saveCachedProducts(products: CachedProduct[]): Promise<void> {
  const db = getDatabase()
  if (!db) return
  const cachedAt = new Date().toISOString()
  await db.transaction('rw', db.products, db.metadata, async () => {
    await db.products.clear()
    await db.products.bulkPut(products)
    await db.metadata.put({ key: 'products-cached-at', value: cachedAt })
  })
}

export async function readCachedProducts(): Promise<CachedProduct[]> {
  return (await getDatabase()?.products.toArray()) ?? []
}

export async function readProductsCachedAt(): Promise<string | null> {
  return (await getDatabase()?.metadata.get('products-cached-at'))?.value ?? null
}

export async function addQueuedSale(sale: QueuedSale): Promise<void> {
  if (sale.payload.paymentMethod !== 'lunas' || 'customerName' in sale.payload || 'customerContact' in sale.payload) {
    throw new Error('Hanya transaksi Lunas tanpa data pembeli yang boleh disimpan offline.')
  }
  const db = getDatabase()
  if (!db) throw new Error('Penyimpanan offline tidak tersedia di browser ini.')
  await db.salesQueue.put(sale)
}

export async function listQueuedSales(createdBy: string): Promise<QueuedSale[]> {
  return (await getDatabase()?.salesQueue.where('createdBy').equals(createdBy).sortBy('createdAt')) ?? []
}

export async function updateQueuedSale(sale: QueuedSale): Promise<void> {
  const db = getDatabase()
  if (!db) return
  await db.salesQueue.put(sale)
}

export async function removeQueuedSale(idempotencyKey: string): Promise<void> {
  await getDatabase()?.salesQueue.delete(idempotencyKey)
}
