import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface CartItem {
  cartItemId: number;
  prodId: number;
  name: string;
  price: string;
  quantity: number;
  customNotes?: string;
  mainImage?: string;
}

interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

const initialState: CartState = {
  items: [],
  isOpen: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
    },
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.prodId === action.payload.prodId);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
    },
    updateCartItem: (state, action: PayloadAction<{ id: number; quantity: number; customNotes?: string }>) => {
      const item = state.items.find(item => item.cartItemId === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
        if (action.payload.customNotes !== undefined) {
          item.customNotes = action.payload.customNotes;
        }
      }
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.cartItemId !== action.payload);
    },
    clearCart: (state) => {
      state.items = [];
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    setCartOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
  },
});

export const {
  setCartItems,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  toggleCart,
  setCartOpen,
} = cartSlice.actions;

export default cartSlice.reducer;
