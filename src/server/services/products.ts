import { asc, eq } from 'drizzle-orm'
import { getDb } from '@/db/client'
import { products } from '@/db/schema'
import type { ProductCreateInput, ProductPriceUpdateInput } from '@/shared/validators/products'
import { ApiError } from '@/server/api/errors'

export type ProductDto = {
  id: string
  name: string
  unit: string
  buyPrice: number
  sellPrice: number
  photoUrl: string | null
  stock: number
  showInCatalog: boolean
  createdAt: string
  updatedAt: string
}

function serializeProduct(product: typeof products.$inferSelect): ProductDto {
  return {
    id: product.id,
    name: product.name,
    unit: product.unit,
    buyPrice: product.buyPrice,
    sellPrice: product.sellPrice,
    photoUrl: product.photoUrl,
    stock: Number(product.stock),
    showInCatalog: product.showInCatalog,
    createdAt: product.createdAt.toISOString(),
    updatedAt: product.updatedAt.toISOString(),
  }
}

export async function listProducts(): Promise<ProductDto[]> {
  const rows = await getDb().select().from(products).orderBy(asc(products.name))
  return rows.map(serializeProduct)
}

export async function createProduct(input: ProductCreateInput): Promise<ProductDto> {
  const [product] = await getDb()
    .insert(products)
    .values({
      id: crypto.randomUUID(),
      name: input.name,
      unit: input.unit,
      buyPrice: input.buyPrice,
      sellPrice: input.sellPrice,
    })
    .returning()

  if (!product) {
    throw new ApiError(500, 'Barang gagal disimpan.')
  }

  return serializeProduct(product)
}

export async function updateProductPrices(id: string, input: ProductPriceUpdateInput): Promise<ProductDto> {
  const [product] = await getDb()
    .update(products)
    .set({
      buyPrice: input.buyPrice,
      sellPrice: input.sellPrice,
      updatedAt: new Date(),
    })
    .where(eq(products.id, id))
    .returning()

  if (!product) {
    throw new ApiError(404, 'Barang tidak ditemukan.')
  }

  return serializeProduct(product)
}
