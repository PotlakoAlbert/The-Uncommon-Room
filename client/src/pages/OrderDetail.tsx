import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
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

export default function OrderDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const { isAuthenticated } = useSelector((state: RootState) => state.auth);

  const { data: order, isLoading, error } = useQuery({
    queryKey: ['/api/orders', id],
    enabled: isAuthenticated && !!id,
    queryFn: async () => {
      console.log('[OrderDetail] Fetching order:', id);
      const response = await apiRequest('GET', `/api/orders/${id}`);
      const data = await response.json();
      console.log('[OrderDetail] Fetched order:', data);
      return data;
    },
  });

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-login-required-order-detail-title">
            Login Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-login-required-order-detail-description">
            Please log in to view order details.
          </p>
          <Button onClick={() => setLocation('/login')} data-testid="button-login-to-view-order">
            Login to Continue
          </Button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">error_outline</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-order-not-found-title">
            Order Not Found
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-order-not-found-description">
            The order you're looking for doesn't exist or you don't have permission to view it.
          </p>
          <Button onClick={() => setLocation('/orders')} data-testid="button-back-to-orders">
            Back to Orders
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-4xl mx-auto">
          <div className="mb-8">
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-32" />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-32 w-full" />
                </CardContent>
              </Card>
            </div>
            <div>
              <Card>
                <CardHeader>
                  <Skeleton className="h-6 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-48 w-full" />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8" data-testid="breadcrumb-order-detail">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>
              <Button variant="link" onClick={() => setLocation('/')} className="p-0 h-auto" data-testid="link-home-breadcrumb">
                Home
              </Button>
            </li>
            <li>/</li>
            <li>
              <Button variant="link" onClick={() => setLocation('/orders')} className="p-0 h-auto" data-testid="link-orders-breadcrumb">
                Orders
              </Button>
            </li>
            <li>/</li>
            <li className="text-foreground">Order #UCR-{order.ordId}</li>
          </ol>
        </nav>

        {/* Order Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2" data-testid="text-order-detail-title">
              Order #UCR-{order.ordId}
            </h1>
            <p className="text-muted-foreground" data-testid="text-order-detail-date">
              Placed on {new Date(order.orderDate).toLocaleDateString('en-ZA', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </p>
          </div>
          <Badge 
            className={`${getStatusColor(order.status)} text-sm px-3 py-1`}
            data-testid="badge-order-detail-status"
          >
            {getStatusLabel(order.status)}
          </Badge>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Order Items and Progress */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Progress */}
            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-order-progress-title">Order Progress</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        ['pending', 'confirmed', 'in_production', 'ready', 'delivered'].includes(order.status) 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-border text-muted-foreground'
                      }`}>
                        <span className="material-icons text-sm">receipt</span>
                      </div>
                      <span className="text-xs text-center font-medium">Order Placed</span>
                      <span className="text-xs text-muted-foreground text-center">
                        {new Date(order.orderDate).toLocaleDateString()}
                      </span>
                    </div>
                    <div className={`flex-1 h-0.5 mx-2 ${
                      ['confirmed', 'in_production', 'ready', 'delivered'].includes(order.status) 
                        ? 'bg-primary' 
                        : 'bg-border'
                    }`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        ['confirmed', 'in_production', 'ready', 'delivered'].includes(order.status) 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-border text-muted-foreground'
                      }`}>
                        <span className="material-icons text-sm">check_circle</span>
                      </div>
                      <span className="text-xs text-center font-medium">Confirmed</span>
                    </div>
                    <div className={`flex-1 h-0.5 mx-2 ${
                      ['in_production', 'ready', 'delivered'].includes(order.status) 
                        ? 'bg-primary' 
                        : 'bg-border'
                    }`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        order.status === 'in_production' 
                          ? 'bg-accent text-accent-foreground' 
                          : ['ready', 'delivered'].includes(order.status) 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-border text-muted-foreground'
                      }`}>
                        <span className="material-icons text-sm">build</span>
                      </div>
                      <span className="text-xs text-center font-medium">In Production</span>
                    </div>
                    <div className={`flex-1 h-0.5 mx-2 ${
                      ['ready', 'delivered'].includes(order.status) 
                        ? 'bg-primary' 
                        : 'bg-border'
                    }`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        order.status === 'ready' 
                          ? 'bg-accent text-accent-foreground' 
                          : order.status === 'delivered' 
                            ? 'bg-primary text-primary-foreground' 
                            : 'bg-border text-muted-foreground'
                      }`}>
                        <span className="material-icons text-sm">local_shipping</span>
                      </div>
                      <span className="text-xs text-center font-medium">Ready</span>
                    </div>
                    <div className={`flex-1 h-0.5 mx-2 ${
                      order.status === 'delivered' ? 'bg-primary' : 'bg-border'
                    }`}></div>
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center mb-2 ${
                        order.status === 'delivered' 
                          ? 'bg-primary text-primary-foreground' 
                          : 'bg-border text-muted-foreground'
                      }`}>
                        <span className="material-icons text-sm">home</span>
                      </div>
                      <span className="text-xs text-center font-medium">Delivered</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Order Items */}
            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-order-items-title">Order Items</CardTitle>
              </CardHeader>
              <CardContent>
                {order.items && order.items.length > 0 ? (
                  <div className="space-y-4">
                    {order.items.map((item: any, index: number) => (
                      <div key={index} className="flex items-center space-x-4 p-4 bg-muted rounded-lg" data-testid={`order-item-${index}`}>
                        {item.products?.mainImage && (
                          <img 
                            src={item.products.mainImage} 
                            alt={item.products.name}
                            className="w-16 h-16 object-cover rounded"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-medium" data-testid={`text-item-name-${index}`}>
                            {item.products?.name || 'Product'}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`text-item-quantity-${index}`}>
                            Quantity: {item.order_items?.quantity || 1}
                          </p>
                          <p className="text-sm text-muted-foreground" data-testid={`text-item-unit-price-${index}`}>
                            Unit Price: R {parseFloat(item.order_items?.unitPrice || '0').toLocaleString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-medium" data-testid={`text-item-total-${index}`}>
                            R {(parseFloat(item.order_items?.unitPrice || '0') * (item.order_items?.quantity || 1)).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground" data-testid="text-no-items">
                    No items found for this order.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary and Details */}
          <div className="space-y-6">
            {/* Order Summary */}
            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-order-summary-detail-title">Order Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span>Total Amount</span>
                    <span className="font-bold text-primary" data-testid="text-order-total-amount">
                      R {parseFloat(order.totalAmount).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Method</span>
                    <span className="capitalize" data-testid="text-order-payment-method">
                      {order.paymentMethod}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Payment Status</span>
                    <span className={`font-medium ${
                      order.paymentStatus === 'paid' ? 'text-green-600' : 
                      order.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                    }`} data-testid="text-order-payment-status">
                      {getStatusLabel(order.paymentStatus)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Information */}
            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-shipping-info-detail-title">Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm text-muted-foreground">Shipping Address</h4>
                    <p className="whitespace-pre-line" data-testid="text-shipping-address-detail">
                      {order.shippingAddress}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Contact Support */}
            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-need-help-title">Need Help?</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  If you have any questions about your order, feel free to contact us.
                </p>
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => setLocation('/inquiry')}
                    data-testid="button-contact-support"
                  >
                    <span className="material-icons mr-2">support_agent</span>
                    Contact Support
                  </Button>
                  <div className="text-sm text-muted-foreground space-y-1">
                    <p>📧 hello@theuncommonroom.co.za</p>
                    <p>📞 +27 XX XXX XXXX</p>
                    <p>📱 @theuncommonroom_za</p>
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
