import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store/store";
import { clearCart } from "@/store/cartSlice";
import CartItem from "@/components/CartItem";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Cart() {
  const [, setLocation] = useLocation();
  const dispatch = useDispatch();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const subtotal = cartItems.reduce((total, item) => 
    total + (parseFloat(item.price) * item.quantity), 0
  );
  const shipping = subtotal > 0 ? 500 : 0; // R500 shipping fee
  const total = subtotal + shipping;

  const handleProceedToCheckout = () => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    setLocation('/checkout');
  };

  const handleClearCart = () => {
    dispatch(clearCart());
  };

  if (cartItems.length === 0) {
    return (
      <div className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">shopping_cart</div>
          <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-empty-cart-title">
            Your Cart is Empty
          </h1>
          <p className="text-muted-foreground mb-6" data-testid="text-empty-cart-description">
            Looks like you haven't added any items to your cart yet.
          </p>
          <Button 
            onClick={() => setLocation('/products')}
            className="bg-primary text-primary-foreground hover:bg-primary/90"
            data-testid="button-continue-shopping"
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <section className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-cart-title">
            Shopping Cart ({cartItems.length} {cartItems.length === 1 ? 'item' : 'items'})
          </h1>
          <Button 
            variant="outline" 
            onClick={handleClearCart}
            data-testid="button-clear-cart"
          >
            <span className="material-icons mr-2">clear_all</span>
            Clear Cart
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Cart Items */}
          <div className="lg:col-span-2 space-y-4">
            {cartItems.map((item) => (
              <CartItem key={item.cartItemId} item={item} />
            ))}
          </div>

          {/* Order Summary */}
          <div className="lg:col-span-1">
            <Card className="material-shadow sticky top-24">
              <CardHeader>
                <CardTitle data-testid="text-order-summary-title">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Subtotal ({cartItems.length} items)</span>
                    <span data-testid="text-subtotal">R {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span data-testid="text-shipping">
                      {shipping > 0 ? `R ${shipping.toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary" data-testid="text-total">
                        R {total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-3 pt-4">
                  <Button 
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    onClick={handleProceedToCheckout}
                    data-testid="button-proceed-to-checkout"
                  >
                    <span className="material-icons mr-2">payment</span>
                    Proceed to Checkout
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/products')}
                    data-testid="button-continue-shopping-summary"
                  >
                    Continue Shopping
                  </Button>
                </div>

                {/* Additional Info */}
                <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <span className="material-icons text-primary text-sm">local_shipping</span>
                    <span>Free delivery for orders over R2000</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-icons text-primary text-sm">security</span>
                    <span>Secure checkout</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-icons text-primary text-sm">support_agent</span>
                    <span>Customer support available</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </section>
  );
}
