import { Hono } from 'hono'
import * as v from 'valibot'
import { getAuth } from '@/server/auth'
import { ApiError, firstValidationMessage, readJsonBody } from '@/server/api/errors'
import { requireRole } from '@/server/middleware/permissions'
import { createProduct, listProducts, updateProductPrices } from '@/server/services/products'
import { createSale } from '@/server/services/sales'
import { createStockIn, listStockIns } from '@/server/services/stock-ins'
import { createCashierAccount, listCashierAccounts } from '@/server/services/users'
import { productCreateSchema, productPriceUpdateSchema } from '@/shared/validators/products'
import { saleCreateSchema } from '@/shared/validators/sales'
import { stockInCreateSchema } from '@/shared/validators/stock-ins'
import { cashierCreateSchema } from '@/shared/validators/users'

export const api = new Hono()

api.onError((error, context) => {
  if (error instanceof ApiError) {
    return context.json({ error: error.message }, error.status)
  }

  console.error(error)
  return context.json({ error: 'Terjadi kesalahan di server. Coba lagi.' }, 500)
})

api.get('/api/health', (context) => {
  return context.json({
    ok: true,
    service: 'kasier',
    stage: 'tahap-3',
  })
})

api.on(['GET', 'POST'], '/api/auth/*', (context) => {
  return getAuth().handler(context.req.raw)
})

api.on(['GET', 'POST'], '/api/auth', (context) => {
  return getAuth().handler(context.req.raw)
})

api.get('/api/products', async (context) => {
  await requireRole(context.req.raw, ['kasir', 'pemilik'])
  return context.json({ products: await listProducts() })
})

api.post('/api/products', async (context) => {
  await requireRole(context.req.raw, ['pemilik'])
  const body = await readJsonBody(context.req.raw)
  const result = v.safeParse(productCreateSchema, body)
  if (!result.success) {
    throw new ApiError(400, firstValidationMessage(result.issues))
  }

  return context.json({ product: await createProduct(result.output) }, 201)
})

api.patch('/api/products/:id', async (context) => {
  await requireRole(context.req.raw, ['pemilik'])
  const body = await readJsonBody(context.req.raw)
  const result = v.safeParse(productPriceUpdateSchema, body)
  if (!result.success) {
    throw new ApiError(400, firstValidationMessage(result.issues))
  }

  return context.json({ product: await updateProductPrices(context.req.param('id'), result.output) })
})

api.get('/api/stock-ins', async (context) => {
  await requireRole(context.req.raw, ['kasir', 'pemilik'])
  return context.json({ stockIns: await listStockIns() })
})

api.post('/api/stock-ins', async (context) => {
  const session = await requireRole(context.req.raw, ['kasir', 'pemilik'])
  const body = await readJsonBody(context.req.raw)
  const result = v.safeParse(stockInCreateSchema, body)
  if (!result.success) {
    throw new ApiError(400, firstValidationMessage(result.issues))
  }

  return context.json({ stockIn: await createStockIn(result.output, session.user.id) }, 201)
})

api.post('/api/sales', async (context) => {
  const session = await requireRole(context.req.raw, ['kasir', 'pemilik'])
  const body = await readJsonBody(context.req.raw)
  const result = v.safeParse(saleCreateSchema, body)
  if (!result.success) {
    throw new ApiError(400, firstValidationMessage(result.issues))
  }

  return context.json({ sale: await createSale(result.output, session.user.id) }, 201)
})

api.get('/api/users', async (context) => {
  await requireRole(context.req.raw, ['pemilik'])
  return context.json({ users: await listCashierAccounts() })
})

api.post('/api/users', async (context) => {
  await requireRole(context.req.raw, ['pemilik'])
  const body = await readJsonBody(context.req.raw)
  const result = v.safeParse(cashierCreateSchema, body)
  if (!result.success) {
    throw new ApiError(400, firstValidationMessage(result.issues))
  }

  return context.json({ user: await createCashierAccount(result.output) }, 201)
})
