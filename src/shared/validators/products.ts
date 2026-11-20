import * as v from 'valibot'

const rupiahPrice = v.pipe(
  v.number('Harga harus berupa angka.'),
  v.integer('Harga harus bilangan bulat Rupiah.'),
  v.minValue(0, 'Harga tidak boleh kurang dari Rp0.'),
  v.maxValue(2147483647, 'Harga terlalu besar.'),
)

export const productCreateSchema = v.object({
  name: v.pipe(
    v.string('Nama barang wajib diisi.'),
    v.trim(),
    v.minLength(1, 'Nama barang wajib diisi.'),
    v.maxLength(120, 'Nama barang maksimal 120 karakter.'),
  ),
  unit: v.pipe(
    v.string('Satuan wajib diisi.'),
    v.trim(),
    v.minLength(1, 'Satuan wajib diisi.'),
    v.maxLength(30, 'Satuan maksimal 30 karakter.'),
  ),
  buyPrice: rupiahPrice,
  sellPrice: rupiahPrice,
})

export const productPriceUpdateSchema = v.object({
  buyPrice: rupiahPrice,
  sellPrice: rupiahPrice,
})

export type ProductCreateInput = v.InferOutput<typeof productCreateSchema>
export type ProductPriceUpdateInput = v.InferOutput<typeof productPriceUpdateSchema>
