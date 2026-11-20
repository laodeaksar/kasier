import { desc, eq, sql } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { products, stockIns, user } from '@/db/schema'
import type { StockInCreateInput } from '@/shared/validators/stock-ins'
import { ApiError } from '@/server/api/errors'

export type StockInDto = {
  id: string
  productId: string
  productName: string
  unit: string
  quantity: number
  buyPrice: number
  receivedDate: string
  createdBy: string
  createdAt: string
}

export async function listStockIns(): Promise<StockInDto[]> {
  const rows = await getDb()
    .select({
      id: stockIns.id,
      productId: stockIns.productId,
      productName: products.name,
      unit: products.unit,
      quantity: stockIns.quantity,
      buyPrice: stockIns.buyPrice,
      receivedDate: stockIns.receivedDate,
      createdBy: user.name,
      createdAt: stockIns.createdAt,
    })
    .from(stockIns)
    .innerJoin(products, eq(stockIns.productId, products.id))
    .innerJoin(user, eq(stockIns.createdBy, user.id))
    .orderBy(desc(stockIns.receivedDate), desc(stockIns.createdAt))

  return rows.map((row) => ({
    ...row,
    quantity: Number(row.quantity),
    createdAt: row.createdAt.toISOString(),
  }))
}

export async function createStockIn(input: StockInCreateInput, createdBy: string) {
  return getDb().transaction(async (tx) => {
    const [product] = await tx
      .select({ id: products.id, name: products.name })
      .from(products)
      .where(eq(products.id, input.productId))
      .limit(1)

    if (!product) {
      throw new ApiError(404, 'Barang yang dipilih tidak ditemukan.')
    }

    const [stockIn] = await tx
      .insert(stockIns)
      .values({
        id: crypto.randomUUID(),
        productId: input.productId,
        quantity: input.quantity.toString(),
        buyPrice: input.buyPrice,
        receivedDate: input.receivedDate,
        createdBy,
      })
      .returning()

    const [updatedProduct] = await tx
      .update(products)
      .set({
        stock: sql`${products.stock} + ${input.quantity.toString()}`,
        updatedAt: new Date(),
      })
      .where(eq(products.id, input.productId))
      .returning({ stock: products.stock })

    if (!stockIn || !updatedProduct) {
      throw new ApiError(500, 'Barang masuk gagal disimpan.')
    }

    return {
      id: stockIn.id,
      productId: stockIn.productId,
      productName: product.name,
      quantity: Number(stockIn.quantity),
      buyPrice: stockIn.buyPrice,
      receivedDate: stockIn.receivedDate,
      stockAfter: Number(updatedProduct.stock),
    }
  })
}
