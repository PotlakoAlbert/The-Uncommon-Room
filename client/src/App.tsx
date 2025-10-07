import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Provider, useSelector, useDispatch } from "react-redux";
import { store, RootState } from "./store/store";
import { fetchServerCart, setCartAuthentication } from "./store/cartSlice";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Layout from "@/components/Layout";
import Home from "@/pages/Home";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Cart from "@/pages/Cart";
import Checkout from "@/pages/Checkout";
import Orders from "@/pages/Orders";
import OrderDetail from "@/pages/OrderDetail";
import Login from "@/pages/Login";
import Register from "@/pages/Register";
import Profile from "@/pages/Profile";
import Inquiry from "@/pages/Inquiry";
import CustomDesign from "@/pages/CustomDesign";
import AdminLogin from "@/pages/admin/AdminLogin";
import AdminDashboard from "@/pages/admin/AdminDashboard";
import AdminProducts from "@/pages/admin/AdminProducts";
import AdminOrders from "@/pages/admin/AdminOrders";
import AdminCustomers from "@/pages/admin/AdminCustomers";
import AdminInquiries from "@/pages/admin/AdminInquiries";
import AdminInventory from "@/pages/admin/AdminInventory";
import AdminCustomDesigns from "@/pages/admin/AdminCustomDesigns";
import AdminReports from "@/pages/admin/AdminReports";
import AdminManagement from "@/pages/admin/AdminManagement";
import NotFound from "@/pages/not-found";

function Router() {
  const dispatch = useDispatch();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);
  const { isAuthenticated: cartIsAuthenticated } = useSelector((state: RootState) => state.cart);
  
  // Load server cart for authenticated users on app start
  // Only fetch if user is authenticated and cart is not already authenticated
  useEffect(() => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    const allLocalStorageKeys = Object.keys(localStorage);
    
    console.log('[App] === INITIAL LOAD DEBUG ===');
    console.log('[App] Auth status:', isAuthenticated);
    console.log('[App] Cart auth status:', cartIsAuthenticated);
    console.log('[App] Token exists:', !!token);
    console.log('[App] Token preview:', token ? token.substring(0, 20) + '...' : 'null');
    console.log('[App] User exists:', !!user);
    console.log('[App] User data:', user ? JSON.parse(user) : 'null');
    console.log('[App] All localStorage keys:', allLocalStorageKeys);
    console.log('[App] Current URL:', window.location.href);
    console.log('[App] Environment:', {
      NODE_ENV: process.env.NODE_ENV,
      VITE_API_URL: import.meta.env.VITE_API_URL
    });
    console.log('[App] === END DEBUG ===');
    
    if ((isAuthenticated || token) && !cartIsAuthenticated) {
      console.log('[App] Fetching server cart on initialization');
      dispatch(fetchServerCart());
    } else if (!isAuthenticated && !token && cartIsAuthenticated) {
      // Mark cart as unauthenticated when user logs out
      console.log('[App] Marking cart as unauthenticated');
      dispatch(setCartAuthentication(false));
    }
  }, [isAuthenticated, cartIsAuthenticated, dispatch]);

  return (
    <Switch>
      {/* Public routes */}
      <Route path="/" component={Home} />
      <Route path="/products" component={Products} />
      <Route path="/products/:id" component={ProductDetail} />
      <Route path="/login" component={Login} />
      <Route path="/register" component={Register} />
      <Route path="/inquiry" component={Inquiry} />
      
      {/* Protected customer routes */}
      <Route path="/cart" component={Cart} />
      <Route path="/checkout" component={Checkout} />
      <Route path="/orders" component={Orders} />
      <Route path="/orders/:id" component={OrderDetail} />
      <Route path="/profile" component={Profile} />
      <Route path="/custom-design" component={CustomDesign} />
      
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/products" component={AdminProducts} />
      <Route path="/admin/orders" component={AdminOrders} />
      <Route path="/admin/customers" component={AdminCustomers} />
      <Route path="/admin/inquiries" component={AdminInquiries} />
      <Route path="/admin/inventory" component={AdminInventory} />
      <Route path="/admin/custom-designs" component={AdminCustomDesigns} />
      <Route path="/admin/reports" component={AdminReports} />
      <Route path="/admin/admins" component={AdminManagement} />
      
      {/* Fallback to 404 */}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Provider store={store}>
        <TooltipProvider>
          <Layout>
            <Router />
          </Layout>
          <Toaster />
        </TooltipProvider>
      </Provider>
    </QueryClientProvider>
  );
}

export default App;
