import * as v from 'valibot'

export const loginSchema = v.object({
  email: v.pipe(v.string(), v.trim(), v.email('Masukkan email yang valid.')),
  password: v.pipe(v.string(), v.minLength(8, 'Kata sandi minimal 8 karakter.')),
})

export type LoginInput = v.InferOutput<typeof loginSchema>
