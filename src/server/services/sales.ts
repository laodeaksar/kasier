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

export async function createSale(input: SaleCreateInput, createdBy: string) {
  const lines = normalizeLines(input)
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
