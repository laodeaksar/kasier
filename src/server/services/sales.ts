import { createHash } from 'node:crypto'
import { and, asc, eq, gte, inArray, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { customers, products, saleItems, sales } from '@/db/schema'
import { ApiError } from '@/server/api/errors'
import type { SaleCreateInput } from '@/shared/validators/sales'
import { calculateSaleLineSubtotal, calculateSaleTotal } from '@/shared/validators/sales'

const MAX_QUANTITY_THOUSANDTHS = 999999999999n

type SaleLine = {
  productId: string
  quantityThousandths: bigint
}

type SaleResponse = {
  id: string
  total: number
  paymentMethod: 'lunas' | 'utang'
  customerId: string | null
  createdAt: string
  items: Array<{ productId: string; productName: string; unit: string; quantity: number; unitPrice: number; subtotal: number }>
}

function formatQuantity(quantityThousandths: bigint): string {
  const whole = quantityThousandths / 1000n
  const fraction = (quantityThousandths % 1000n).toString().padStart(3, '0')
  return `${whole}.${fraction}`
}

function parseDatabaseQuantity(value: string): bigint {
  const [whole = '0', fraction = ''] = value.split('.')
  return BigInt(whole) * 1000n + BigInt((fraction + '000').slice(0, 3))
}

function formatDisplayQuantity(value: string): string {
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 3 }).format(Number(value))
}

function normalizeLines(input: SaleCreateInput): SaleLine[] {
  const quantities = new Map<string, bigint>()

  for (const item of input.items) {
    const itemThousandths = BigInt(Math.round(item.quantity * 1000))
    const combined = (quantities.get(item.productId) ?? 0n) + itemThousandths
    if (combined > MAX_QUANTITY_THOUSANDTHS) {
      throw new ApiError(400, 'Jumlah gabungan barang terlalu besar.')
    }
    quantities.set(item.productId, combined)
  }

  return [...quantities.entries()]
    .map(([productId, quantityThousandths]) => ({ productId, quantityThousandths }))
    .sort((a, b) => a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0)
}

export function createSaleRequestHash(input: SaleCreateInput): string {
  const canonicalRequest = JSON.stringify({
    paymentMethod: input.paymentMethod,
    items: normalizeLines(input).map((line) => ({
      productId: line.productId,
      quantityThousandths: line.quantityThousandths.toString(),
    })),
    expectedPrices: input.expectedPrices
      ? [...input.expectedPrices].sort((a, b) => a.productId.localeCompare(b.productId))
      : null,
    customerName: input.customerName?.trim() ?? null,
    customerContact: input.customerContact?.trim() ?? null,
  })
  return createHash('sha256').update(canonicalRequest).digest('hex')
}

function normalizeExpectedPrices(input: SaleCreateInput): Map<string, number> | null {
  if (!input.expectedPrices) return null
  const expectedPrices = new Map<string, number>()
  for (const item of input.expectedPrices) {
    if (expectedPrices.has(item.productId)) {
      throw new ApiError(400, 'Data harga pada keranjang tidak valid. Muat ulang daftar barang.')
    }
    expectedPrices.set(item.productId, item.sellPrice)
  }
  const itemIds = normalizeLines(input).map((line) => line.productId)
  if (expectedPrices.size !== itemIds.length || itemIds.some((id) => !expectedPrices.has(id))) {
    throw new ApiError(400, 'Daftar harga pada keranjang tidak cocok. Muat ulang daftar barang.')
  }
  return expectedPrices
}

async function findSaleByKey(idempotencyKey: string, createdBy: string): Promise<{ sale: SaleResponse; requestHash: string | null } | null> {
  const db = getDb()
  const [storedSale] = await db.select().from(sales).where(and(
    eq(sales.idempotencyKey, idempotencyKey),
    eq(sales.createdBy, createdBy),
  )).limit(1)
  if (!storedSale) return null
  const rows = await db
    .select({
      productId: saleItems.productId,
      productName: products.name,
      unit: products.unit,
      quantity: saleItems.quantity,
      unitPrice: saleItems.unitPrice,
    })
    .from(saleItems)
    .innerJoin(products, eq(products.id, saleItems.productId))
    .where(eq(saleItems.saleId, storedSale.id))
    .orderBy(asc(saleItems.productId))

  return {
    requestHash: storedSale.idempotencyRequestHash,
    sale: {
      id: storedSale.id,
      total: storedSale.total,
      paymentMethod: storedSale.paymentMethod,
      customerId: storedSale.customerId,
      createdAt: storedSale.createdAt.toISOString(),
      items: rows.map((row) => ({
        productId: row.productId,
        productName: row.productName,
        unit: row.unit,
        quantity: Number(row.quantity),
        unitPrice: row.unitPrice,
        subtotal: calculateSaleLineSubtotal(row.unitPrice, Number(row.quantity)),
      })),
    },
  }
}

function assertMatchingIdempotentRequest(storedHash: string | null, requestHash: string): void {
  if (storedHash !== requestHash) {
    throw new ApiError(409, 'Kunci transaksi ini sudah dipakai untuk isi berbeda. Periksa antrean sebelum mencoba lagi.')
  }
}

export async function createSale(input: SaleCreateInput, createdBy: string, idempotencyKey: string): Promise<SaleResponse> {
  const requestHash = createSaleRequestHash(input)
  const alreadySaved = await findSaleByKey(idempotencyKey, createdBy)
  if (alreadySaved) {
    assertMatchingIdempotentRequest(alreadySaved.requestHash, requestHash)
    return alreadySaved.sale
  }

  try {
    return await createSaleTransaction(input, createdBy, idempotencyKey, requestHash)
  } catch (error) {
    // A concurrent retry may hit a stock error or the unique key after the first
    // request commits. Its transaction has rolled back; return only the same payload.
    let committed: Awaited<ReturnType<typeof findSaleByKey>>
    try {
      committed = await findSaleByKey(idempotencyKey, createdBy)
    } catch {
      throw error
    }
    if (!committed) {
      if ((error as { code?: string }).code === '23505') {
        throw new ApiError(409, 'Kunci transaksi sudah digunakan. Buat antrean baru lalu coba lagi.')
      }
      throw error
    }
    assertMatchingIdempotentRequest(committed.requestHash, requestHash)
    return committed.sale
  }
}

async function createSaleTransaction(input: SaleCreateInput, createdBy: string, idempotencyKey: string, requestHash: string) {
  const lines = normalizeLines(input)
  const expectedPrices = normalizeExpectedPrices(input)
  const now = new Date()

  return getDb().transaction(async (tx) => {
    // Lock all selected product rows in a deterministic order so concurrent sales serialize safely.
    const productRows = await tx
      .select({
        id: products.id,
        name: products.name,
        unit: products.unit,
        sellPrice: products.sellPrice,
        stock: products.stock,
      })
      .from(products)
      .where(inArray(products.id, lines.map((line) => line.productId)))
      .orderBy(asc(products.id))
      .for('update')

    const productById = new Map(productRows.map((product) => [product.id, product]))
    if (productById.size !== lines.length) {
      throw new ApiError(404, 'Salah satu barang di keranjang tidak ditemukan. Muat ulang daftar barang.')
    }

    const preparedLines = lines.map((line) => {
      const product = productById.get(line.productId)
      if (!product) {
        throw new ApiError(404, 'Barang yang dipilih tidak ditemukan.')
      }

      if (expectedPrices && expectedPrices.get(product.id) !== product.sellPrice) {
        throw new ApiError(
          409,
          `Harga ${product.name} berubah sejak daftar barang dimuat. Transaksi belum disimpan; muat ulang harga lalu periksa ulang keranjang.`,
        )
      }

      const availableThousandths = parseDatabaseQuantity(product.stock)
      if (availableThousandths < line.quantityThousandths) {
        throw new ApiError(
          409,
          `Stok ${product.name} tidak cukup. Tersedia ${formatDisplayQuantity(product.stock)} ${product.unit}. Kurangi jumlah barang lalu coba lagi.`,
        )
      }

      let lineTotal: number
      try {
        lineTotal = calculateSaleLineSubtotal(product.sellPrice, Number(line.quantityThousandths) / 1000)
      } catch {
        throw new ApiError(400, 'Subtotal barang terlalu besar untuk disimpan dalam Rupiah.')
      }

      return {
        productId: product.id,
        productName: product.name,
        unit: product.unit,
        quantityThousandths: line.quantityThousandths,
        quantity: Number(line.quantityThousandths) / 1000,
        quantityText: formatQuantity(line.quantityThousandths),
        unitPrice: product.sellPrice,
        lineTotal,
      }
    })

    let total: number
    try {
      total = calculateSaleTotal(preparedLines.map((line) => ({
        unitPrice: line.unitPrice,
        quantity: line.quantity,
      })))
    } catch {
      throw new ApiError(400, 'Total transaksi terlalu besar untuk disimpan dalam Rupiah.')
    }

    // Conditional updates remain the final database-level safeguard against overselling.
    for (const line of preparedLines) {
      const [updated] = await tx
        .update(products)
        .set({
          stock: sql`${products.stock} - ${line.quantityText}::numeric`,
          updatedAt: now,
        })
        .where(and(
          eq(products.id, line.productId),
          gte(products.stock, line.quantityText),
        ))
        .returning({ id: products.id })

      if (!updated) {
        throw new ApiError(
          409,
          `Stok ${line.productName} tidak cukup. Muat ulang daftar barang lalu coba lagi.`,
        )
      }
    }

    let customerId: string | null = null
    if (input.paymentMethod === 'utang') {
      if (!input.customerName || !input.customerContact) {
        throw new ApiError(400, 'Isi nama dan kontak pembeli untuk pembayaran utang.')
      }

      customerId = crypto.randomUUID()
      await tx.insert(customers).values({
        id: customerId,
        name: input.customerName,
        contact: input.customerContact,
        createdAt: now,
        updatedAt: now,
      })
    }

    const saleId = crypto.randomUUID()
    const [sale] = await tx
      .insert(sales)
      .values({
        id: saleId,
        total,
        paymentMethod: input.paymentMethod,
        idempotencyKey,
        idempotencyRequestHash: requestHash,
        customerId,
        createdBy,
        createdAt: now,
        updatedAt: now,
      })
      .returning({
        id: sales.id,
        total: sales.total,
        paymentMethod: sales.paymentMethod,
        customerId: sales.customerId,
        createdAt: sales.createdAt,
      })

    if (!sale) {
      throw new ApiError(500, 'Transaksi gagal disimpan. Stok tidak berubah.')
    }

    await tx.insert(saleItems).values(preparedLines.map((line) => ({
      saleId,
      productId: line.productId,
      quantity: line.quantityText,
      unitPrice: line.unitPrice,
      createdAt: now,
      updatedAt: now,
    })))

    return {
      id: sale.id,
      total: sale.total,
      paymentMethod: sale.paymentMethod,
      customerId: sale.customerId,
      createdAt: sale.createdAt.toISOString(),
      items: preparedLines.map((line) => ({
        productId: line.productId,
        productName: line.productName,
        unit: line.unit,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        subtotal: line.lineTotal,
      })),
    }
  })
}
