import { useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RootState } from "@/store/store";
import { clearCart } from "@/store/cartSlice";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const checkoutSchema = z.object({
  shippingAddress: z.string().min(1, "Shipping address is required"),
  paymentMethod: z.enum(["cash", "eft", "card"]),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function Checkout() {
  const [, setLocation] = useLocation();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const form = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: {
      shippingAddress: user?.address || "",
      paymentMethod: "eft",
    },
  });

  const subtotal = cartItems.reduce((total, item) => 
    total + (parseFloat(item.price) * item.quantity), 0
  );
  const shipping = subtotal > 2000 ? 0 : 500;
  const total = subtotal + shipping;

  const createOrderMutation = useMutation({
    mutationFn: async (data: CheckoutFormData) => {
      const token = localStorage.getItem('token');
      const response = await apiRequest('POST', '/api/orders', {
        ...data,
        totalAmount: total.toString(),
      });
      return response.json();
    },
    onSuccess: (order) => {
      dispatch(clearCart());
      toast({
        title: "Order Placed Successfully!",
        description: order?.ordId ? `Your order #UCR-${order.ordId} has been confirmed.` : "Your order has been confirmed.",
      });
      if (order?.ordId) {
        setLocation(`/orders/${order.ordId}`);
      } else {
        setLocation('/orders');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Order Failed",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CheckoutFormData) => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    createOrderMutation.mutate(data);
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-login-required-title">
            Login Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-login-required-description">
            Please log in to proceed with checkout.
          </p>
          <Button onClick={() => setLocation('/login')} data-testid="button-login-to-checkout">
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">shopping_cart</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-empty-cart-checkout-title">
            Your Cart is Empty
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-empty-cart-checkout-description">
            Add some items to your cart before proceeding to checkout.
          </p>
          <Button onClick={() => setLocation('/products')} data-testid="button-shop-now">
            Shop Now
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl md:text-3xl font-bold mb-8" data-testid="text-checkout-title">
          Checkout
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Checkout Form */}
          <div>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <Card className="material-shadow">
                  <CardHeader>
                    <CardTitle data-testid="text-shipping-info-title">Shipping Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Name</label>
                        <Input 
                          value={user?.name || ''} 
                          disabled 
                          data-testid="input-customer-name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Email</label>
                        <Input 
                          value={user?.email || ''} 
                          disabled 
                          data-testid="input-customer-email"
                        />
                      </div>
                    </div>

                    <FormField
                      control={form.control}
                      name="shippingAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Shipping Address *</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Enter your full shipping address..."
                              {...field}
                              data-testid="textarea-shipping-address"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </CardContent>
                </Card>

                <Card className="material-shadow">
                  <CardHeader>
                    <CardTitle data-testid="text-payment-info-title">Payment Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select payment method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="eft">EFT / Bank Transfer</SelectItem>
                              <SelectItem value="cash">Cash on Delivery</SelectItem>
                              <SelectItem value="card">Credit/Debit Card</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="mt-4 p-4 bg-muted rounded-lg">
                      <h4 className="font-medium mb-2">Payment Instructions</h4>
                      <p className="text-sm text-muted-foreground">
                        {form.watch('paymentMethod') === 'eft' && 
                          "You will receive banking details via email after placing your order."
                        }
                        {form.watch('paymentMethod') === 'cash' && 
                          "Payment will be collected upon delivery."
                        }
                        {form.watch('paymentMethod') === 'card' && 
                          "Secure card payment will be processed after order confirmation."
                        }
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Button 
                  type="submit" 
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={createOrderMutation.isPending}
                  data-testid="button-place-order"
                >
                  {createOrderMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                      Placing Order...
                    </>
                  ) : (
                    <>
                      <span className="material-icons mr-2">payment</span>
                      Place Order - R {total.toLocaleString()}
                    </>
                  )}
                </Button>
              </form>
            </Form>
          </div>

          {/* Order Summary */}
          <div>
            <Card className="material-shadow sticky top-24">
              <CardHeader>
                <CardTitle data-testid="text-order-summary-checkout-title">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Cart Items */}
                <div className="space-y-3 max-h-64 overflow-y-auto">
                  {cartItems.map((item) => (
                    <div key={item.cartItemId} className="flex items-center space-x-3 p-3 bg-muted rounded-lg" data-testid={`checkout-item-${item.cartItemId}`}>
                      {item.mainImage && (
                        <img 
                          src={item.mainImage} 
                          alt={item.name}
                          className="w-12 h-12 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{item.name}</h4>
                        <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                        {item.customNotes && (
                          <p className="text-xs text-muted-foreground">Note: {item.customNotes}</p>
                        )}
                      </div>
                      <span className="font-medium">
                        R {(parseFloat(item.price) * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Totals */}
                <div className="space-y-3 pt-4 border-t border-border">
                  <div className="flex justify-between">
                    <span>Subtotal</span>
                    <span data-testid="text-checkout-subtotal">R {subtotal.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shipping</span>
                    <span data-testid="text-checkout-shipping">
                      {shipping > 0 ? `R ${shipping.toLocaleString()}` : 'Free'}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3">
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span className="text-primary" data-testid="text-checkout-total">
                        R {total.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Security Info */}
                <div className="text-sm text-muted-foreground space-y-2 pt-4 border-t border-border">
                  <div className="flex items-center space-x-2">
                    <span className="material-icons text-primary text-sm">security</span>
                    <span>Your order is secured with SSL encryption</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="material-icons text-primary text-sm">support_agent</span>
                    <span>Support: hello@theuncommonroom.co.za</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
