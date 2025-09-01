import { createSlice, PayloadAction, createAsyncThunk } from '@reduxjs/toolkit';
import { CartService } from '@/lib/cartService';

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
  isAuthenticated: boolean; // Track authentication state for cart
}

// Async thunks
export const syncCartOnLogin = createAsyncThunk(
  'cart/syncOnLogin',
  async (_, { getState }) => {
    const state = getState() as { cart: CartState };
    const localCartItems = state.cart.items;
    return await CartService.syncCartOnLogin(localCartItems);
  }
);

export const fetchServerCart = createAsyncThunk(
  'cart/fetchServer',
  async () => {
    return await CartService.getServerCart();
  }
);

export const addToServerCart = createAsyncThunk(
  'cart/addToServer',
  async (item: { productId: number; quantity: number; customNotes?: string }) => {
    await CartService.addToServerCart(item);
    return await CartService.getServerCart();
  }
);

export const removeFromServerCart = createAsyncThunk(
  'cart/removeFromServer',
  async (cartItemId: number) => {
    await CartService.removeFromServerCart(cartItemId);
    return await CartService.getServerCart();
  }
);

export const updateServerCartItem = createAsyncThunk(
  'cart/updateServerItem',
  async ({ cartItemId, quantity, customNotes }: { cartItemId: number; quantity: number; customNotes?: string }) => {
    await CartService.updateServerCartItem(cartItemId, quantity, customNotes);
    return await CartService.getServerCart();
  }
);

const initialState: CartState = {
  items: (() => {
    try {
      const raw = localStorage.getItem('cart');
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  })(),
  isOpen: false,
  isAuthenticated: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    setCartItems: (state, action: PayloadAction<CartItem[]>) => {
      state.items = action.payload;
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.prodId === action.payload.prodId);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        state.items.push(action.payload);
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    // New action for adding items when not authenticated (local only)
    addToLocalCart: (state, action: PayloadAction<CartItem>) => {
      const existingItem = state.items.find(item => item.prodId === action.payload.prodId);
      if (existingItem) {
        existingItem.quantity += action.payload.quantity;
      } else {
        // Generate a temporary ID for local cart items
        const tempItem = {
          ...action.payload,
          cartItemId: Date.now() + Math.random(), // Temporary unique ID
        };
        state.items.push(tempItem);
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    updateCartItem: (state, action: PayloadAction<{ id: number; quantity: number; customNotes?: string }>) => {
      const item = state.items.find(item => item.cartItemId === action.payload.id);
      if (item) {
        item.quantity = action.payload.quantity;
        if (action.payload.customNotes !== undefined) {
          item.customNotes = action.payload.customNotes;
        }
      }
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    removeFromCart: (state, action: PayloadAction<number>) => {
      state.items = state.items.filter(item => item.cartItemId !== action.payload);
      localStorage.setItem('cart', JSON.stringify(state.items));
    },
    clearCart: (state) => {
      state.items = [];
      localStorage.removeItem('cart');
    },
    toggleCart: (state) => {
      state.isOpen = !state.isOpen;
    },
    setCartOpen: (state, action: PayloadAction<boolean>) => {
      state.isOpen = action.payload;
    },
    // New action to preserve cart on logout
    preserveCartOnLogout: (state) => {
      // Keep items in localStorage, just mark as unauthenticated
      state.isAuthenticated = false;
      // Don't clear items or localStorage
    },
    // New action to set authentication state
    setCartAuthentication: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(syncCartOnLogin.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('cart', JSON.stringify(action.payload));
      })
      .addCase(syncCartOnLogin.rejected, (state) => {
        // Keep local cart if sync fails
        state.isAuthenticated = false;
      })
      .addCase(fetchServerCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('cart', JSON.stringify(action.payload));
      })
      .addCase(fetchServerCart.rejected, (state) => {
        // Keep local cart if server fetch fails
        state.isAuthenticated = false;
      })
      .addCase(addToServerCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('cart', JSON.stringify(action.payload));
      })
      .addCase(addToServerCart.rejected, (state) => {
        // Keep local cart if server add fails
        state.isAuthenticated = false;
      })
      .addCase(removeFromServerCart.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('cart', JSON.stringify(action.payload));
      })
      .addCase(removeFromServerCart.rejected, (state) => {
        // Keep local cart if server remove fails
        state.isAuthenticated = false;
      })
      .addCase(updateServerCartItem.fulfilled, (state, action) => {
        state.items = action.payload;
        state.isAuthenticated = true;
        localStorage.setItem('cart', JSON.stringify(action.payload));
      })
      .addCase(updateServerCartItem.rejected, (state) => {
        // Keep local cart if server update fails
        state.isAuthenticated = false;
      });
  },
});

export const {
  setCartItems,
  addToCart,
  addToLocalCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  toggleCart,
  setCartOpen,
  preserveCartOnLogout,
  setCartAuthentication,
} = cartSlice.actions;

export default cartSlice.reducer;
