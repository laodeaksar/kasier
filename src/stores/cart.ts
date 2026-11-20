import { Store } from '@tanstack/react-store'

export type CartItem = {
  productId: string
  quantity: number
}

export const cartStore = new Store<{ items: CartItem[] }>({
  items: [],
})
