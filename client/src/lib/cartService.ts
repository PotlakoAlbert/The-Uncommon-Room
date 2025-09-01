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
      // Get server cart to check if it exists
      await apiRequest('GET', '/api/cart');
      
      // If user has items in local cart, add them to server
      if (localCartItems.length > 0) {
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
      
      return this.convertServerCartToLocal(updatedCart.items || []);
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
      await apiRequest('POST', '/api/cart/items', item);
    } catch (error) {
      console.error('Failed to add item to server cart:', error);
      throw error;
    }
  }

  // Update item in server cart
  static async updateServerCartItem(id: number, quantity: number, customNotes?: string): Promise<void> {
    try {
      await apiRequest('PUT', `/api/cart/items/${id}`, { quantity, customNotes });
    } catch (error) {
      console.error('Failed to update server cart item:', error);
      throw error;
    }
  }

  // Remove item from server cart
  static async removeFromServerCart(id: number): Promise<void> {
    try {
      await apiRequest('DELETE', `/api/cart/items/${id}`);
    } catch (error) {
      console.error('Failed to remove item from server cart:', error);
      throw error;
    }
  }

  // Get server cart
  static async getServerCart(): Promise<LocalCartItem[]> {
    try {
      const response = await apiRequest('GET', '/api/cart', undefined, { throwOn401: false });
      
      // If unauthorized, return empty array (user not authenticated)
      if (response.status === 401) {
        return [];
      }
      
      const serverCart = await response.json();
      return this.convertServerCartToLocal(serverCart.items || []);
    } catch (error) {
      console.error('Failed to get server cart:', error);
      // Return empty array if server request fails (user not authenticated)
      return [];
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

