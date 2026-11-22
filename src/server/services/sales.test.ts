import assert from 'node:assert/strict'
import test from 'node:test'
import { createSaleRequestHash } from './sales'
import type { SaleCreateInput } from '@/shared/validators/sales'

const firstRequest: SaleCreateInput = {
  paymentMethod: 'lunas',
  items: [
    { productId: 'product-b', quantity: 1.5 },
    { productId: 'product-a', quantity: 2 },
  ],
}

test('kunci payload penjualan tidak berubah jika urutan item berubah', () => {
  const reordered: SaleCreateInput = {
    ...firstRequest,
    items: [...firstRequest.items].reverse(),
  }
  assert.equal(createSaleRequestHash(firstRequest), createSaleRequestHash(reordered))
})

test('baris produk berulang dinormalisasi ke payload yang sama', () => {
  const split: SaleCreateInput = {
    paymentMethod: 'lunas',
    items: [
      { productId: 'product-a', quantity: 1 },
      { productId: 'product-a', quantity: 1 },
      { productId: 'product-b', quantity: 1.5 },
    ],
  }
  assert.equal(createSaleRequestHash(firstRequest), createSaleRequestHash(split))
})

test('payload penjualan berbeda memiliki hash berbeda', () => {
  const changed: SaleCreateInput = {
    ...firstRequest,
    items: [{ productId: 'product-a', quantity: 2.001 }],
  }
  assert.notEqual(createSaleRequestHash(firstRequest), createSaleRequestHash(changed))
})

test('harga yang terlihat adalah bagian dari identitas permintaan dan tidak bisa berubah saat retry', () => {
  const cachedPrice: SaleCreateInput = {
    ...firstRequest,
    expectedPrices: [
      { productId: 'product-a', sellPrice: 12000 },
      { productId: 'product-b', sellPrice: 8000 },
    ],
  }
  const changedPrice: SaleCreateInput = {
    ...cachedPrice,
    expectedPrices: [
      { productId: 'product-a', sellPrice: 12500 },
      { productId: 'product-b', sellPrice: 8000 },
    ],
  }
  assert.notEqual(createSaleRequestHash(cachedPrice), createSaleRequestHash(changedPrice))
})
