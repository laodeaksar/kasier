import * as v from 'valibot'

const quantity = v.pipe(
  v.number('Jumlah harus berupa angka.'),
  v.finite('Jumlah harus berupa angka yang valid.'),
  v.minValue(0.001, 'Jumlah harus lebih besar dari 0.'),
  v.maxValue(999999999.999, 'Jumlah terlalu besar.'),
  v.check(
    (value) => Math.abs(value * 1000 - Math.round(value * 1000)) < 0.0000001,
    'Jumlah maksimal memiliki 3 angka di belakang koma.',
  ),
)

const stockInBuyPrice = v.pipe(
  v.number('Harga beli harus berupa angka.'),
  v.integer('Harga beli harus bilangan bulat Rupiah.'),
  v.minValue(0, 'Harga beli tidak boleh kurang dari Rp0.'),
  v.maxValue(2147483647, 'Harga beli terlalu besar.'),
)

const receivedDate = v.pipe(
  v.string('Tanggal barang masuk wajib diisi.'),
  v.regex(/^\d{4}-\d{2}-\d{2}$/, 'Gunakan tanggal yang valid.'),
  v.check((value) => {
    const date = new Date(`${value}T00:00:00Z`)
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  }, 'Gunakan tanggal yang valid.'),
)

export const stockInCreateSchema = v.object({
  productId: v.pipe(v.string('Pilih barang.'), v.minLength(1, 'Pilih barang.')),
  quantity,
  buyPrice: stockInBuyPrice,
  receivedDate,
})

export type StockInCreateInput = v.InferOutput<typeof stockInCreateSchema>
