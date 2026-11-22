import assert from 'node:assert/strict'
import test from 'node:test'
import { isRedirect } from '@tanstack/react-router'
import type { AppSession } from '@/routes/__root'
import { requireOwnerRoute, requireRouteSession } from './route-access'

const cashierSession: AppSession = {
  user: { id: 'cashier-1', name: 'Kasir Uji', email: 'kasir@example.test', role: 'kasir' },
}

const ownerSession: AppSession = {
  user: { id: 'owner-1', name: 'Pemilik Uji', email: 'pemilik@example.test', role: 'pemilik' },
}

function redirectsTo(path: string) {
  return (error: unknown) => isRedirect(error) && error.options.to === path
}

test('pengunjung tanpa sesi diarahkan ke halaman login', () => {
  assert.throws(() => requireRouteSession({ session: null }), redirectsTo('/login'))
})

test('kasir yang sudah login boleh membuka route untuk semua role', () => {
  assert.equal(requireRouteSession({ session: cashierSession }), cashierSession)
})

test('kasir tidak boleh membuka route khusus pemilik', () => {
  assert.throws(() => requireOwnerRoute({ session: cashierSession }), redirectsTo('/'))
})

test('pemilik boleh membuka route khusus pemilik', () => {
  assert.equal(requireOwnerRoute({ session: ownerSession }), ownerSession)
})
