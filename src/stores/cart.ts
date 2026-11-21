import { Store } from '@tanstack/react-store'

export type CartItem = {
  productId: string
  quantity: number
}

type CartState = {
  items: CartItem[]
}

export const cartStore = new Store<CartState>({ items: [] })

export function addCartItem(productId: string, quantity: number) {
  cartStore.setState((state) => {
    const existing = state.items.find((item) => item.productId === productId)
    if (existing) {
      return {
        ...state,
        items: state.items.map((item) => item.productId === productId
          ? { ...item, quantity: item.quantity + quantity }
          : item),
      }
    }

    return { ...state, items: [...state.items, { productId, quantity }] }
  })
}

export function setCartItemQuantity(productId: string, quantity: number) {
  cartStore.setState((state) => ({
    ...state,
    items: state.items.map((item) => item.productId === productId ? { ...item, quantity } : item),
  }))
}

export function removeCartItem(productId: string) {
  cartStore.setState((state) => ({
    ...state,
    items: state.items.filter((item) => item.productId !== productId),
  }))
}

export function clearCart() {
  cartStore.setState((state) => ({ ...state, items: [] }))
}
