import * as v from 'valibot'

const saleQuantity = v.pipe(
  v.number('Jumlah harus berupa angka.'),
  v.finite('Jumlah harus berupa angka yang valid.'),
  v.minValue(0.001, 'Jumlah harus lebih besar dari 0.'),
  v.maxValue(999999999.999, 'Jumlah terlalu besar.'),
  v.check(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.0000001,
    'Jumlah maksimal memiliki 3 angka di belakang koma.',
  ),
)

const saleItemSchema = v.object({
  productId: v.pipe(
    v.string('Pilih barang.'),
    v.trim(),
    v.minLength(1, 'Pilih barang.'),
  ),
  quantity: saleQuantity,
})

const checkoutFields = {
  paymentMethod: v.picklist(['lunas', 'utang'], 'Pilih metode pembayaran.'),
  customerName: v.optional(v.union([
    v.literal(''),
    v.pipe(
      v.string('Nama pembeli wajib diisi untuk pembayaran utang.'),
      v.trim(),
      v.minLength(1, 'Nama pembeli wajib diisi untuk pembayaran utang.'),
    ),
  ])),
  customerContact: v.optional(v.union([
    v.literal(''),
    v.pipe(
      v.string('Kontak pembeli wajib diisi untuk pembayaran utang.'),
      v.trim(),
      v.minLength(1, 'Kontak pembeli wajib diisi untuk pembayaran utang.'),
    ),
  ])),
}

function hasCustomerForDebt(input: {
  paymentMethod: 'lunas' | 'utang'
  customerName?: string
  customerContact?: string
}) {
  return input.paymentMethod !== 'utang' || Boolean(input.customerName?.trim() && input.customerContact?.trim())
}

export const saleCheckoutSchema = v.pipe(
  v.object(checkoutFields),
  v.check(hasCustomerForDebt, 'Isi nama dan kontak pembeli untuk pembayaran utang.'),
)

export const saleCreateSchema = v.pipe(
  v.object({
    ...checkoutFields,
    items: v.pipe(
      v.array(saleItemSchema, 'Keranjang tidak dapat dibaca.'),
      v.minLength(1, 'Pilih setidaknya satu barang.'),
    ),
  }),
  v.check((input) => hasCustomerForDebt(input), 'Isi nama dan kontak pembeli untuk pembayaran utang.'),
)

export type SaleCheckoutInput = v.InferOutput<typeof saleCheckoutSchema>
export type SaleCreateInput = v.InferOutput<typeof saleCreateSchema>

const MAX_RUPIAH = 2147483647n

/** Hitung dan bulatkan satu baris ke Rupiah terdekat (setengah dibulatkan ke atas). */
export function calculateSaleLineSubtotal(unitPrice: number, quantity: number): number {
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isFinite(quantity) || quantity <= 0) {
    throw new RangeError('Harga atau jumlah tidak valid.')
  }

  const scaledQuantity = quantity * 1000
  const thousandths = Math.round(scaledQuantity)
  if (!Number.isSafeInteger(thousandths) || Math.abs(scaledQuantity - thousandths) >= 0.0000001) {
    throw new RangeError('Jumlah maksimal memiliki 3 angka di belakang koma.')
  }

  const subtotal = (BigInt(unitPrice) * BigInt(thousandths) + 500n) / 1000n
  if (subtotal > MAX_RUPIAH) {
    throw new RangeError('Subtotal barang melebihi batas penyimpanan Rupiah.')
  }

  return Number(subtotal)
}

/** Jumlahkan subtotal yang sudah dibulatkan per baris. */
export function calculateSaleTotal(lines: readonly { unitPrice: number; quantity: number }[]): number {
  let total = 0n
  for (const line of lines) {
    total += BigInt(calculateSaleLineSubtotal(line.unitPrice, line.quantity))
    if (total > MAX_RUPIAH) {
      throw new RangeError('Total transaksi melebihi batas penyimpanan Rupiah.')
    }
  }
  return Number(total)
}
