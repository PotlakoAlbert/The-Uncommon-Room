import { Link, useLocation } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface MobileNavigationProps {
  isAdminRoute: boolean;
}

export default function MobileNavigation({ isAdminRoute }: MobileNavigationProps) {
  const [location] = useLocation();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);

  if (isAdminRoute) {
    return (
      <div className="md:hidden">
        <header className="bg-primary text-primary-foreground material-shadow sticky top-0 z-50">
          <div className="flex items-center justify-between p-4">
            <span className="material-icons text-2xl">admin_panel_settings</span>
            <h1 className="text-lg font-medium">Admin Panel</h1>
            <Link href="/admin/login">
              <button className="material-icons text-2xl">logout</button>
            </Link>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="md:hidden">
      {/* Top App Bar */}
      <header className="bg-primary text-primary-foreground material-shadow sticky top-0 z-50">
        <div className="flex items-center justify-between p-4">
          <button className="material-icons text-2xl" data-testid="button-menu">menu</button>
          <Link href="/">
            <h1 className="text-lg font-medium" data-testid="text-app-title">The Uncommon Room</h1>
          </Link>
          <div className="flex items-center space-x-2">
            <Link href="/cart">
              <button className="material-icons text-2xl relative" data-testid="button-cart">
                shopping_cart
                {cartItemCount > 0 && (
                  <span 
                    className="absolute -top-2 -right-2 bg-accent text-accent-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center"
                    data-testid="text-cart-count"
                  >
                    {cartItemCount}
                  </span>
                )}
              </button>
            </Link>
            <Link href="/profile">
              <button className="material-icons text-2xl" data-testid="button-profile">account_circle</button>
            </Link>
          </div>
        </div>
      </header>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-0 right-0 bg-card border-t border-border z-40">
        <div className="flex">
          <Link href="/">
            <button 
              className={`flex-1 flex flex-col items-center py-2 px-1 ${
                location === '/' ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid="button-nav-home"
            >
              <span className="material-icons text-xl">home</span>
              <span className="text-xs mt-1">Home</span>
            </button>
          </Link>
          <Link href="/products">
            <button 
              className={`flex-1 flex flex-col items-center py-2 px-1 ${
                location.startsWith('/products') ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid="button-nav-products"
            >
              <span className="material-icons text-xl">category</span>
              <span className="text-xs mt-1">Products</span>
            </button>
          </Link>
          <Link href="/cart">
            <button 
              className={`flex-1 flex flex-col items-center py-2 px-1 ${
                location === '/cart' ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid="button-nav-cart"
            >
              <span className="material-icons text-xl">shopping_cart</span>
              <span className="text-xs mt-1">Cart</span>
            </button>
          </Link>
          <Link href="/orders">
            <button 
              className={`flex-1 flex flex-col items-center py-2 px-1 ${
                location.startsWith('/orders') ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid="button-nav-orders"
            >
              <span className="material-icons text-xl">receipt_long</span>
              <span className="text-xs mt-1">Orders</span>
            </button>
          </Link>
          <Link href="/custom-design">
            <button 
              className={`flex-1 flex flex-col items-center py-2 px-1 ${
                location === '/custom-design' ? 'text-primary' : 'text-muted-foreground'
              }`}
              data-testid="button-nav-custom"
            >
              <span className="material-icons text-xl">design_services</span>
              <span className="text-xs mt-1">Custom</span>
            </button>
          </Link>
        </div>
      </nav>
    </div>
  );
}
