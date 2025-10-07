import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { Link, useLocation } from "wouter";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

const getStatusColor = (status: string) => {
  switch (status) {
    case 'pending':
      return 'bg-yellow-100 text-yellow-800';
    case 'confirmed':
      return 'bg-blue-100 text-blue-800';
    case 'in_production':
      return 'bg-orange-100 text-orange-800';
    case 'ready':
      return 'bg-purple-100 text-purple-800';
    case 'delivered':
      return 'bg-green-100 text-green-800';
    case 'cancelled':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

const getStatusLabel = (status: string) => {
  return status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
};

export default function Orders() {
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const { data: orders, isLoading, error } = useQuery({
    queryKey: ['/api/orders'],
    enabled: isAuthenticated,
    queryFn: async () => {
      console.log('[Orders] Fetching orders for authenticated user');
      const response = await apiRequest('GET', '/api/orders');
      const data = await response.json();
      console.log('[Orders] Fetched orders:', data);
      return data;
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-login-required-orders-title">
            Login Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-login-required-orders-description">
            Please log in to view your orders.
          </p>
          <Button onClick={() => setLocation('/login')} data-testid="button-login-to-view-orders">
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-4xl mx-auto text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">error_outline</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-orders-error-title">
            Failed to Load Orders
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-orders-error-description">
            We couldn't load your orders. Please try again.
          </p>
          <Button onClick={() => window.location.reload()} data-testid="button-retry-orders">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-orders-title">
            My Orders
          </h1>
          <Button 
            onClick={() => setLocation('/products')}
            variant="outline"
            data-testid="button-continue-shopping-orders"
          >
            <span className="material-icons mr-2">shopping_bag</span>
            Continue Shopping
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            {Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="material-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <Skeleton className="h-6 w-32 mb-2" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : orders?.length > 0 ? (
          <div className="space-y-6">
            {orders.map((order: any) => (
              <Card key={order.ordId} className="material-shadow hover-lift transition-all" data-testid={`order-card-${order.ordId}`}>
                <CardHeader>
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    <div>
                      <CardTitle className="text-lg" data-testid={`text-order-id-${order.ordId}`}>
                        Order #UCR-{order.ordId}
                      </CardTitle>
                      <p className="text-sm text-muted-foreground" data-testid={`text-order-date-${order.ordId}`}>
                        Placed on {new Date(order.orderDate).toLocaleDateString('en-ZA', {
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge 
                        className={getStatusColor(order.status)}
                        data-testid={`badge-order-status-${order.ordId}`}
                      >
                        {getStatusLabel(order.status)}
                      </Badge>
                      <Link href={`/orders/${order.ordId}`}>
                        <Button variant="ghost" size="sm" data-testid={`button-view-order-${order.ordId}`}>
                          <span className="material-icons">visibility</span>
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                      <p className="font-medium" data-testid={`text-order-amount-${order.ordId}`}>
                        R {parseFloat(order.totalAmount).toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Status</p>
                      <p className={`font-medium ${
                        order.paymentStatus === 'paid' ? 'text-green-600' : 
                        order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                      }`} data-testid={`text-payment-status-${order.ordId}`}>
                        {getStatusLabel(order.paymentStatus)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Payment Method</p>
                      <p className="font-medium capitalize" data-testid={`text-payment-method-${order.ordId}`}>
                        {order.paymentMethod}
                      </p>
                    </div>
                  </div>

                  {/* Order Progress */}
                  <div className="relative">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                          ['pending', 'confirmed', 'in_production', 'ready', 'delivered'].includes(order.status) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-border text-muted-foreground'
                        }`}>
                          <span className="material-icons text-sm">check</span>
                        </div>
                        <span className="text-xs text-center">Order Placed</span>
                      </div>
                      <div className={`flex-1 h-0.5 mx-2 ${
                        ['confirmed', 'in_production', 'ready', 'delivered'].includes(order.status) 
                          ? 'bg-primary' 
                          : 'bg-border'
                      }`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                          ['confirmed', 'in_production', 'ready', 'delivered'].includes(order.status) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-border text-muted-foreground'
                        }`}>
                          <span className="material-icons text-sm">check</span>
                        </div>
                        <span className="text-xs text-center">Confirmed</span>
                      </div>
                      <div className={`flex-1 h-0.5 mx-2 ${
                        ['in_production', 'ready', 'delivered'].includes(order.status) 
                          ? 'bg-primary' 
                          : 'bg-border'
                      }`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                          order.status === 'in_production' 
                            ? 'bg-accent text-accent-foreground' 
                            : ['ready', 'delivered'].includes(order.status) 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-border text-muted-foreground'
                        }`}>
                          <span className="material-icons text-sm">build</span>
                        </div>
                        <span className="text-xs text-center">In Production</span>
                      </div>
                      <div className={`flex-1 h-0.5 mx-2 ${
                        ['ready', 'delivered'].includes(order.status) 
                          ? 'bg-primary' 
                          : 'bg-border'
                      }`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                          order.status === 'ready' 
                            ? 'bg-accent text-accent-foreground' 
                            : order.status === 'delivered' 
                              ? 'bg-primary text-primary-foreground' 
                              : 'bg-border text-muted-foreground'
                        }`}>
                          <span className="material-icons text-sm">local_shipping</span>
                        </div>
                        <span className="text-xs text-center">Ready</span>
                      </div>
                      <div className={`flex-1 h-0.5 mx-2 ${
                        order.status === 'delivered' ? 'bg-primary' : 'bg-border'
                      }`}></div>
                      <div className="flex flex-col items-center">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-2 ${
                          order.status === 'delivered' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-border text-muted-foreground'
                        }`}>
                          <span className="material-icons text-sm">home</span>
                        </div>
                        <span className="text-xs text-center">Delivered</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="material-icons text-6xl text-muted-foreground mb-4">receipt_long</div>
            <h3 className="text-xl font-medium mb-2" data-testid="text-no-orders-title">
              No Orders Yet
            </h3>
            <p className="text-muted-foreground mb-4" data-testid="text-no-orders-description">
              You haven't placed any orders yet. Start shopping to see your orders here.
            </p>
            <Button onClick={() => setLocation('/products')} data-testid="button-start-shopping">
              Start Shopping
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
