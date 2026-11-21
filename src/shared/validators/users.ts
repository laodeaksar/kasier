import * as v from 'valibot'

export const cashierCreateSchema = v.object({
  name: v.pipe(
    v.string('Nama wajib diisi.'),
    v.trim(),
    v.minLength(1, 'Nama wajib diisi.'),
    v.maxLength(120, 'Nama maksimal 120 karakter.'),
  ),
  email: v.pipe(
    v.string('Email wajib diisi.'),
    v.trim(),
    v.email('Masukkan email yang valid.'),
    v.maxLength(254, 'Email terlalu panjang.'),
  ),
  password: v.pipe(
    v.string('Kata sandi wajib diisi.'),
    v.minLength(8, 'Kata sandi minimal 8 karakter.'),
    v.maxLength(128, 'Kata sandi terlalu panjang.'),
  ),
})

export type CashierCreateInput = v.InferOutput<typeof cashierCreateSchema>
