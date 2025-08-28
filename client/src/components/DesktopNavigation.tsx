import { Link, useLocation } from "wouter";
import { useSelector } from "react-redux";
import { RootState } from "@/store/store";

interface DesktopNavigationProps {
  isAdminRoute: boolean;
}

export default function DesktopNavigation({ isAdminRoute }: DesktopNavigationProps) {
  const [location] = useLocation();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartItemCount = cartItems.reduce((total, item) => total + item.quantity, 0);
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);

  if (isAdminRoute) {
    return (
      <div className="hidden md:block">
        <header className="bg-card border-b border-border material-shadow sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center space-x-8">
                <Link href="/admin/dashboard">
                  <h1 className="text-2xl font-bold text-primary" data-testid="text-admin-title">
                    Admin Panel - The Uncommon Room
                  </h1>
                </Link>
                <nav className="hidden md:flex space-x-6">
                  <Link href="/admin/dashboard">
                    <a className={`${location === '/admin/dashboard' ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-admin-dashboard">
                      Dashboard
                    </a>
                  </Link>
                  <Link href="/admin/products">
                    <a className={`${location === '/admin/products' ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-admin-products">
                      Products
                    </a>
                  </Link>
                  <Link href="/admin/orders">
                    <a className={`${location === '/admin/orders' ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-admin-orders">
                      Orders
                    </a>
                  </Link>
                  <Link href="/admin/customers">
                    <a className={`${location === '/admin/customers' ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-admin-customers">
                      Customers
                    </a>
                  </Link>
                  <Link href="/admin/inquiries">
                    <a className={`${location === '/admin/inquiries' ? 'text-primary' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-admin-inquiries">
                      Inquiries
                    </a>
                  </Link>
                </nav>
              </div>
              <div className="flex items-center space-x-4">
                <span className="text-sm text-muted-foreground" data-testid="text-admin-name">
                  {user?.name}
                </span>
                <Link href="/admin/login">
                  <button className="bg-destructive text-destructive-foreground px-4 py-2 rounded-md hover:bg-destructive/90 transition-colors" data-testid="button-admin-logout">
                    Logout
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="hidden md:block">
      <header className="bg-card border-b border-border material-shadow sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link href="/">
                <h1 className="text-2xl font-bold text-primary" data-testid="text-site-title">The Uncommon Room</h1>
              </Link>
              <nav className="hidden md:flex space-x-6">
                <Link href="/">
                  <a className={`${location === '/' ? 'text-foreground' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-home">
                    Home
                  </a>
                </Link>
                <Link href="/products">
                  <a className={`${location.startsWith('/products') ? 'text-foreground' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-products">
                    Products
                  </a>
                </Link>
                <Link href="/custom-design">
                  <a className={`${location === '/custom-design' ? 'text-foreground' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-custom-design">
                    Custom Design
                  </a>
                </Link>
                <Link href="/inquiry">
                  <a className={`${location === '/inquiry' ? 'text-foreground' : 'text-muted-foreground'} hover:text-primary transition-colors`} data-testid="link-contact">
                    Contact
                  </a>
                </Link>
              </nav>
            </div>
            <div className="flex items-center space-x-4">
              {isAuthenticated ? (
                <>
                  <Link href="/orders">
                    <button className="text-muted-foreground hover:text-primary transition-colors" data-testid="button-orders">
                      My Orders
                    </button>
                  </Link>
                  <Link href="/profile">
                    <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors" data-testid="button-profile">
                      Profile
                    </button>
                  </Link>
                </>
              ) : (
                <>
                  <Link href="/login">
                    <button className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 transition-colors" data-testid="button-login">
                      Login
                    </button>
                  </Link>
                  <Link href="/register">
                    <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors" data-testid="button-signup">
                      Sign Up
                    </button>
                  </Link>
                </>
              )}
              <Link href="/cart">
                <button className="relative p-2 text-muted-foreground hover:text-primary transition-colors" data-testid="button-cart">
                  <span className="material-icons text-2xl">shopping_cart</span>
                  {cartItemCount > 0 && (
                    <span 
                      className="absolute -top-1 -right-1 bg-primary text-primary-foreground text-xs rounded-full w-5 h-5 flex items-center justify-center"
                      data-testid="text-cart-count"
                    >
                      {cartItemCount}
                    </span>
                  )}
                </button>
              </Link>
            </div>
          </div>
        </div>
      </header>
    </div>
  );
}
