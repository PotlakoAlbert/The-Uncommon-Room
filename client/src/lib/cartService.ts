import { apiRequest } from "./queryClient";

export interface ServerCartItem {
  id: number;
  productId: number;
  quantity: number;
  customNotes?: string;
  product: {
    prodId: number;
    name: string;
    price: string;
    mainImage?: string;
  };
}

export interface LocalCartItem {
  cartItemId: number;
  prodId: number;
  name: string;
  price: string;
  quantity: number;
  customNotes?: string;
  mainImage?: string;
}

export class CartService {
  // Sync local cart with server cart on login
  static async syncCartOnLogin(localCartItems: LocalCartItem[]): Promise<LocalCartItem[]> {
    try {
      console.log('[CartService] Beginning sync after login, local items:', localCartItems.length);
      // Get token from localStorage directly to ensure it's available
      const token = localStorage.getItem('token');
      console.log('[CartService] Token available for sync:', token ? 'yes' : 'no');
      
      // Get server cart to check if it exists
      const cartResponse = await apiRequest('GET', '/api/cart');
      console.log('[CartService] Server cart response status:', cartResponse.status);
      
      // If user has items in local cart, add them to server
      if (localCartItems.length > 0) {
        console.log('[CartService] Syncing local items to server');
        for (const localItem of localCartItems) {
          await this.addToServerCart({
            productId: localItem.prodId,
            quantity: localItem.quantity,
            customNotes: localItem.customNotes,
          });
        }
      }

      // Fetch updated server cart and convert to local format
  const updatedResponse = await apiRequest('GET', '/api/cart');
  const updatedCart = await updatedResponse.json();
  // Server returns an array of items. Fallback to .items when needed.
  const serverItems = Array.isArray(updatedCart) ? updatedCart : (updatedCart?.items ?? []);
  return this.convertServerCartToLocal(serverItems);
    } catch (error) {
      console.error('Failed to sync cart:', error);
      // Return local cart if sync fails
      return localCartItems;
    }
  }

  // Add item to server cart
  static async addToServerCart(item: {
    productId: number;
    quantity: number;
    customNotes?: string;
  }): Promise<void> {
    try {
      // Get token directly from localStorage for this critical operation
      const token = localStorage.getItem('token');
      console.log('[CartService] Adding to cart, token available:', token ? 'yes' : 'no');
      
      // Server expects POST /api/cart with body { productId, quantity, customNotes }
      const response = await apiRequest('POST', '/api/cart', item);
      console.log('[CartService] Add to cart response status:', response.status);
      
      if (!response.ok) {
        const text = await response.text();
        console.error('[CartService] Add to cart failed:', response.status, text);
      }
    } catch (error) {
      console.error('Failed to add item to server cart:', error);
      throw error;
    }
  }

  // Update item in server cart
  static async updateServerCartItem(id: number, quantity: number, customNotes?: string): Promise<void> {
    try {
  // Server route is PUT /api/cart/item/:id
  await apiRequest('PUT', `/api/cart/item/${id}`, { quantity, customNotes });
    } catch (error) {
      console.error('Failed to update server cart item:', error);
      throw error;
    }
  }

  // Remove item from server cart
  static async removeFromServerCart(id: number): Promise<void> {
    try {
  // Server route is DELETE /api/cart/item/:id
  await apiRequest('DELETE', `/api/cart/item/${id}`);
    } catch (error) {
      console.error('Failed to remove item from server cart:', error);
      throw error;
    }
  }

  // Get server cart
  static async getServerCart(): Promise<LocalCartItem[]> {
    try {
      const response = await apiRequest('GET', '/api/cart', undefined, { throwOn401: false });
      // If unauthorized, throw so thunk is rejected and auth flag remains false
      if (response.status === 401) {
        throw new Error('Unauthorized');
      }
      
  const serverCart = await response.json();
  // Server returns an array of items. Fallback to .items when needed.
  const serverItems = Array.isArray(serverCart) ? serverCart : (serverCart?.items ?? []);
  return this.convertServerCartToLocal(serverItems);
    } catch (error) {
      console.error('Failed to get server cart:', error);
  // Propagate error for thunk rejection
  throw error;
    }
  }

  // Convert server cart items to local cart format
  static convertServerCartToLocal(serverItems: ServerCartItem[]): LocalCartItem[] {
    return serverItems.map(item => ({
      cartItemId: item.id,
      prodId: item.product.prodId,
      name: item.product.name,
      price: item.product.price,
      quantity: item.quantity,
      customNotes: item.customNotes,
      mainImage: item.product.mainImage,
    }));
  }

  // Convert local cart items to server format
  static convertLocalCartToServer(localItems: LocalCartItem[]): Array<{
    productId: number;
    quantity: number;
    customNotes?: string;
  }> {
    return localItems.map(item => ({
      productId: item.prodId,
      quantity: item.quantity,
      customNotes: item.customNotes,
    }));
  }
}

