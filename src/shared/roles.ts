export const roles = ['kasir', 'pemilik'] as const

export type Role = (typeof roles)[number]

export function toRole(value: unknown): Role {
  return value === 'pemilik' ? 'pemilik' : 'kasir'
}
