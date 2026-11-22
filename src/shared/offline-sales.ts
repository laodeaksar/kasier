import {
  addQueuedSale,
  listQueuedSales,
  removeQueuedSale,
  updateQueuedSale,
  type QueuedSale,
} from '@/shared/offline-db'
import type { SaleCreateInput } from '@/shared/validators/sales'

export type SaleResult = {
  id: string
  total: number
  paymentMethod: 'lunas' | 'utang'
  createdAt: string
  items: Array<{
    productId: string
    productName: string
    unit: string
    quantity: number
    unitPrice: number
    subtotal: number
  }>
}

export type SaleRequestError = Error & { status: number }

function requestError(message: string, status: number): SaleRequestError {
  return Object.assign(new Error(message), { status })
}

export async function sendSale(input: SaleCreateInput, idempotencyKey: string): Promise<SaleResult> {
  let response: Response
  try {
    response = await fetch('/api/sales', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(input),
    })
  } catch {
    throw requestError('Koneksi terputus sebelum server mengonfirmasi transaksi.', 0)
  }

  const payload = (await response.json().catch(() => null)) as { sale?: SaleResult; error?: string } | null
  if (!response.ok) {
    throw requestError(payload?.error ?? 'Transaksi ditolak server. Periksa kembali barang dan stok.', response.status)
  }
  if (!payload?.sale) {
    // The response may have been lost after commit; retry with this same key is safe.
    throw requestError('Server belum memberikan konfirmasi yang dapat dibaca.', 0)
  }
  return payload.sale
}

export async function submitLunasSale(input: SaleCreateInput, createdBy: string): Promise<
  | { status: 'confirmed'; sale: SaleResult }
  | { status: 'pending'; idempotencyKey: string }
  | { status: 'needs_review'; idempotencyKey: string }
> {
  if (input.paymentMethod !== 'lunas') {
    throw new Error('Hanya transaksi Lunas yang dapat disimpan dalam antrean offline.')
  }
  const idempotencyKey = crypto.randomUUID()
  const queued: QueuedSale = {
    idempotencyKey,
    createdBy,
    payload: { ...input, paymentMethod: 'lunas' },
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  // Persist the intent before sending so a lost response can safely be retried after reload.
  await addQueuedSale(queued)
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return { status: 'pending', idempotencyKey }
  }

  try {
    const sale = await sendSale(queued.payload, idempotencyKey)
    await removeQueuedSale(idempotencyKey)
    return { status: 'confirmed', sale }
  } catch (error) {
    const status = (error as SaleRequestError).status ?? 0
    if (status === 0 || status >= 500) {
      return { status: 'pending', idempotencyKey }
    }
    if (status === 401 || status === 403) return { status: 'pending', idempotencyKey }
    await updateQueuedSale({
      ...queued,
      status: 'needs_review',
      lastError: error instanceof Error ? error.message : 'Server menolak transaksi. Tinjau sebelum mencoba transaksi baru.',
    })
    return { status: 'needs_review', idempotencyKey }
  }
}

export async function submitUtangSale(input: SaleCreateInput, idempotencyKey: string): Promise<SaleResult> {
  if (input.paymentMethod !== 'utang') throw new Error('Metode transaksi tidak valid.')
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Pembayaran Utang hanya bisa disimpan saat terhubung ke internet. Data pembeli tidak disimpan offline.')
  }
  return sendSale(input, idempotencyKey)
}

export async function syncQueuedSalesForUser(createdBy: string): Promise<{ confirmed: SaleResult[]; needsReview: number }> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return { confirmed: [], needsReview: 0 }
  const queue = await listQueuedSales(createdBy)
  const confirmed: SaleResult[] = []
  let needsReview = 0

  for (const item of queue) {
    if (item.status !== 'pending') {
      needsReview += 1
      continue
    }

    try {
      const sale = await sendSale(item.payload, item.idempotencyKey)
      await removeQueuedSale(item.idempotencyKey)
      confirmed.push(sale)
    } catch (error) {
      const status = (error as SaleRequestError).status ?? 0
      if (status === 401 || status === 403 || status === 0 || status >= 500) break
      await updateQueuedSale({
        ...item,
        status: 'needs_review',
        lastError: error instanceof Error ? error.message : 'Server menolak transaksi. Periksa kembali sebelum membuat transaksi baru.',
      })
      needsReview += 1
    }
  }

  return { confirmed, needsReview }
}
