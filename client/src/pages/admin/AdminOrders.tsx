import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const orderStatuses = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'confirmed', label: 'Confirmed', color: 'bg-blue-100 text-blue-800' },
  { value: 'in_production', label: 'In Production', color: 'bg-orange-100 text-orange-800' },
  { value: 'ready', label: 'Ready', color: 'bg-purple-100 text-purple-800' },
  { value: 'delivered', label: 'Delivered', color: 'bg-green-100 text-green-800' },
  { value: 'cancelled', label: 'Cancelled', color: 'bg-red-100 text-red-800' },
];

export default function AdminOrders() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: orders, isLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
    enabled: isAuthenticated && user?.role === 'admin',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      return response.json();
    },
  });

  const updateOrderStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/orders/${orderId}/status`, { status });
      if (!response.ok) throw new Error('Failed to update order status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/orders'] });
      toast({
        title: "Order Status Updated",
        description: "The order status has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const { data: orderDetails, isLoading: orderDetailsLoading } = useQuery({
    queryKey: ['/api/orders', selectedOrder?.orders?.ordId],
    enabled: !!selectedOrder?.orders?.ordId,
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/orders/${selectedOrder.orders.ordId}`);
      if (!response.ok) throw new Error('Failed to fetch order details');
      return response.json();
    },
  });

  const getStatusColor = (status: string) => {
    const statusObj = orderStatuses.find(s => s.value === status);
    return statusObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const statusObj = orderStatuses.find(s => s.value === status);
    return statusObj?.label || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    updateOrderStatusMutation.mutate({ orderId, status: newStatus });
  };

  const viewOrderDetails = (order: any) => {
    setSelectedOrder(order);
    setIsDetailsDialogOpen(true);
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-orders-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-orders-access-required-description">
            You need admin privileges to manage orders.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-orders-login-redirect">
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-orders-title">
            Order Management
          </h1>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setLocation('/admin/dashboard')}
              data-testid="button-back-to-dashboard"
            >
              <span className="material-icons mr-2">dashboard</span>
              Dashboard
            </Button>
          </div>
        </div>

        {/* Orders Table */}
        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-all-orders-title">All Orders</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : orders?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Order ID</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Payment</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {orders.map((order: any) => (
                      <tr key={order.orders.ordId} className="border-b border-border" data-testid={`admin-order-row-${order.orders.ordId}`}>
                        <td className="p-4" data-testid={`text-admin-order-id-${order.orders.ordId}`}>
                          #UCR-{order.orders.ordId}
                        </td>
                        <td className="p-4" data-testid={`text-admin-customer-name-${order.orders.ordId}`}>
                          {order.customers?.name || 'Unknown'}
                        </td>
                        <td className="p-4" data-testid={`text-admin-order-amount-${order.orders.ordId}`}>
                          R {parseFloat(order.orders.totalAmount).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <Select
                            value={order.orders.status}
                            onValueChange={(value) => handleStatusChange(order.orders.ordId, value)}
                            disabled={updateOrderStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-40" data-testid={`select-order-status-${order.orders.ordId}`}>
                              <SelectValue>
                                <Badge className={`${getStatusColor(order.orders.status)} text-xs`}>
                                  {getStatusLabel(order.orders.status)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {orderStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4">
                          <span className={`text-sm ${
                            order.orders.paymentStatus === 'paid' ? 'text-green-600' : 
                            order.orders.paymentStatus === 'pending' ? 'text-yellow-600' : 'text-red-600'
                          }`} data-testid={`text-admin-payment-status-${order.orders.ordId}`}>
                            {getStatusLabel(order.orders.paymentStatus)}
                          </span>
                        </td>
                        <td className="p-4" data-testid={`text-admin-order-date-${order.orders.ordId}`}>
                          {new Date(order.orders.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewOrderDetails(order)}
                              data-testid={`button-view-admin-order-${order.orders.ordId}`}
                            >
                              <span className="material-icons text-sm">visibility</span>
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="material-icons text-6xl text-muted-foreground mb-4">assignment</div>
                <h3 className="text-xl font-medium mb-2" data-testid="text-no-orders-admin-title">
                  No Orders Found
                </h3>
                <p className="text-muted-foreground" data-testid="text-no-orders-admin-description">
                  Orders will appear here when customers place them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Order Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-order-details-admin-title">
                Order Details - #UCR-{selectedOrder?.orders?.ordId}
              </DialogTitle>
            </DialogHeader>
            
            {orderDetailsLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-32 w-full" />
                <Skeleton className="h-24 w-full" />
              </div>
            ) : orderDetails ? (
              <div className="space-y-6">
                {/* Order Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h3 className="font-medium mb-2">Customer Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedOrder?.customers?.name}</p>
                      <p><strong>Email:</strong> {selectedOrder?.customers?.email}</p>
                      <p><strong>Phone:</strong> {selectedOrder?.customers?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h3 className="font-medium mb-2">Order Information</h3>
                    <div className="space-y-1 text-sm">
                      <p><strong>Order Date:</strong> {new Date(orderDetails.orderDate).toLocaleDateString()}</p>
                      <p><strong>Payment Method:</strong> {orderDetails.paymentMethod?.toUpperCase()}</p>
                      <p><strong>Total Amount:</strong> R {parseFloat(orderDetails.totalAmount).toLocaleString()}</p>
                    </div>
                  </div>
                </div>

                {/* Shipping Address */}
                {orderDetails.shippingAddress && (
                  <div>
                    <h3 className="font-medium mb-2">Shipping Address</h3>
                    <p className="text-sm bg-muted p-3 rounded whitespace-pre-line">
                      {orderDetails.shippingAddress}
                    </p>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <h3 className="font-medium mb-2">Order Items</h3>
                  {orderDetails.items && orderDetails.items.length > 0 ? (
                    <div className="space-y-3">
                      {orderDetails.items.map((item: any, index: number) => (
                        <div key={index} className="flex items-center space-x-4 p-3 bg-muted rounded" data-testid={`admin-order-item-${index}`}>
                          {item.products?.mainImage && (
                            <img 
                              src={item.products.mainImage} 
                              alt={item.products.name}
                              className="w-16 h-16 object-cover rounded"
                            />
                          )}
                          <div className="flex-1">
                            <h4 className="font-medium">{item.products?.name || 'Product'}</h4>
                            <p className="text-sm text-muted-foreground">
                              Quantity: {item.order_items?.quantity || 1} × R {parseFloat(item.order_items?.unitPrice || '0').toLocaleString()}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">
                              R {(parseFloat(item.order_items?.unitPrice || '0') * (item.order_items?.quantity || 1)).toLocaleString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm">No items found for this order.</p>
                  )}
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">Failed to load order details.</p>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
