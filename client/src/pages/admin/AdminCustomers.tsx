import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";

export default function AdminCustomers() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: customers, isLoading } = useQuery({
    queryKey: ['/api/admin/customers'],
    enabled: isAuthenticated && user?.type === 'admin',
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/customers', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch customers');
      return response.json();
    },
  });

  const { data: customerOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/customers', selectedCustomer?.customerId, 'orders'],
    enabled: !!selectedCustomer?.customerId,
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/customers/${selectedCustomer.customerId}/orders`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch customer orders');
      return response.json();
    },
  });

  const viewCustomerDetails = (customer: any) => {
    setSelectedCustomer(customer);
    setIsDetailsDialogOpen(true);
  };

  if (!isAuthenticated || user?.type !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-customers-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-customers-access-required-description">
            You need admin privileges to view customer information.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-customers-login-redirect">
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-customers-title">
            Customer Management
          </h1>
          <Button 
            variant="outline"
            onClick={() => setLocation('/admin/dashboard')}
            data-testid="button-back-to-dashboard-customers"
          >
            <span className="material-icons mr-2">dashboard</span>
            Dashboard
          </Button>
        </div>

        {/* Customers Table */}
        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-all-customers-title">All Customers</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : customers?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Customer ID</th>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Phone</th>
                      <th className="text-left p-4 font-medium">Registration Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customers.map((customer: any) => (
                      <tr key={customer.customerId} className="border-b border-border" data-testid={`customer-row-${customer.customerId}`}>
                        <td className="p-4" data-testid={`text-customer-id-${customer.customerId}`}>
                          #{customer.customerId}
                        </td>
                        <td className="p-4" data-testid={`text-customer-name-${customer.customerId}`}>
                          {customer.name}
                        </td>
                        <td className="p-4" data-testid={`text-customer-email-${customer.customerId}`}>
                          {customer.email}
                        </td>
                        <td className="p-4" data-testid={`text-customer-phone-${customer.customerId}`}>
                          {customer.phone || 'Not provided'}
                        </td>
                        <td className="p-4" data-testid={`text-customer-registration-${customer.customerId}`}>
                          {new Date(customer.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewCustomerDetails(customer)}
                              data-testid={`button-view-customer-${customer.customerId}`}
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
                <div className="material-icons text-6xl text-muted-foreground mb-4">people</div>
                <h3 className="text-xl font-medium mb-2" data-testid="text-no-customers-title">
                  No Customers Found
                </h3>
                <p className="text-muted-foreground" data-testid="text-no-customers-description">
                  Customer information will appear here when users register.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Customer Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-customer-details-title">
                Customer Details - {selectedCustomer?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedCustomer && (
              <div className="space-y-6">
                {/* Customer Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-medium mb-3">Personal Information</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Customer ID:</span>
                        <span data-testid={`text-detail-customer-id-${selectedCustomer.customerId}`}>
                          #{selectedCustomer.customerId}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Name:</span>
                        <span data-testid={`text-detail-customer-name-${selectedCustomer.customerId}`}>
                          {selectedCustomer.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Email:</span>
                        <span data-testid={`text-detail-customer-email-${selectedCustomer.customerId}`}>
                          {selectedCustomer.email}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Phone:</span>
                        <span data-testid={`text-detail-customer-phone-${selectedCustomer.customerId}`}>
                          {selectedCustomer.phone || 'Not provided'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Registration:</span>
                        <span data-testid={`text-detail-customer-registration-${selectedCustomer.customerId}`}>
                          {new Date(selectedCustomer.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Address Information</h3>
                    <div className="text-sm">
                      {selectedCustomer.address ? (
                        <p className="bg-muted p-3 rounded whitespace-pre-line" data-testid={`text-detail-customer-address-${selectedCustomer.customerId}`}>
                          {selectedCustomer.address}
                        </p>
                      ) : (
                        <p className="text-muted-foreground" data-testid={`text-detail-no-address-${selectedCustomer.customerId}`}>
                          No address provided
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Order History */}
                <div>
                  <h3 className="font-medium mb-3">Order History</h3>
                  {ordersLoading ? (
                    <div className="space-y-3">
                      {Array.from({ length: 3 }).map((_, index) => (
                        <Skeleton key={index} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : customerOrders?.length > 0 ? (
                    <div className="space-y-3">
                      {customerOrders.map((order: any) => (
                        <div key={order.ordId} className="flex items-center justify-between p-3 bg-muted rounded" data-testid={`customer-order-${order.ordId}`}>
                          <div>
                            <p className="font-medium">Order #UCR-{order.ordId}</p>
                            <p className="text-sm text-muted-foreground">
                              {new Date(order.orderDate).toLocaleDateString()} • {order.status.replace('_', ' ').replace(/\b\w/g, (l: string) => l.toUpperCase())}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">R {parseFloat(order.totalAmount).toLocaleString()}</p>
                            <p className="text-sm text-muted-foreground">{order.paymentMethod?.toUpperCase()}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-sm" data-testid={`text-no-orders-customer-${selectedCustomer.customerId}`}>
                      This customer hasn't placed any orders yet.
                    </p>
                  )}
                </div>

                {/* Quick Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="outline" 
                    onClick={() => setLocation('/admin/orders')}
                    data-testid="button-view-all-orders-customer"
                  >
                    <span className="material-icons mr-2">assignment</span>
                    View All Orders
                  </Button>
                  <Button 
                    variant="outline"
                    onClick={() => setLocation('/inquiry')}
                    data-testid="button-contact-customer"
                  >
                    <span className="material-icons mr-2">email</span>
                    Contact Customer
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
