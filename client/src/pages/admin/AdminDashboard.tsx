import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";

export default function AdminDashboard() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['/api/admin/dashboard'],
    enabled: isAuthenticated && user?.role === 'admin',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/dashboard');
      if (!response.ok) throw new Error('Failed to fetch dashboard stats');
      return response.json();
    },
  });

  const { data: recentOrders, isLoading: ordersLoading } = useQuery({
    queryKey: ['/api/admin/orders'],
    enabled: isAuthenticated && user?.role === 'admin',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/orders');
      if (!response.ok) throw new Error('Failed to fetch orders');
      const orders = await response.json();
      return orders.slice(0, 5); // Show only recent 5 orders
    },
  });

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-access-required-description">
            You need admin privileges to access this page.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-login-redirect">
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

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

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-dashboard-title">
              Admin Dashboard
            </h1>
            <p className="text-muted-foreground" data-testid="text-admin-welcome">
              Welcome back, {user?.name}
            </p>
          </div>
          <div className="flex gap-4">
            <Button 
              onClick={() => setLocation('/admin/admins')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-manage-admins"
            >
              <span className="material-icons mr-2">admin_panel_settings</span>
              Manage Admins
            </Button>
            <Button 
              onClick={() => setLocation('/admin/products')}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-add-new-product"
            >
              <span className="material-icons mr-2">add</span>
              Add New Product
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {statsLoading ? (
            Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <Skeleton className="w-12 h-12 rounded-lg mr-4" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-8 w-16" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <>
              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <span className="material-icons text-primary">shopping_cart</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold" data-testid="text-total-orders">
                        {stats?.totalOrders || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-accent/10 rounded-lg">
                      <span className="material-icons text-accent">attach_money</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Revenue</p>
                      <p className="text-2xl font-bold" data-testid="text-total-revenue">
                        R {parseFloat(stats?.totalRevenue || '0').toLocaleString()}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-secondary/10 rounded-lg">
                      <span className="material-icons text-secondary-foreground">inventory</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Products</p>
                      <p className="text-2xl font-bold" data-testid="text-total-products">
                        {stats?.totalProducts || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <span className="material-icons text-primary">people</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Customers</p>
                      <p className="text-2xl font-bold" data-testid="text-total-customers">
                        {stats?.totalCustomers || 0}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Button 
            onClick={() => setLocation('/admin/orders')}
            variant="outline" 
            className="p-6 h-auto flex flex-col space-y-2"
            data-testid="button-manage-orders"
          >
            <span className="material-icons text-2xl text-primary">assignment</span>
            <span>Manage Orders</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/admin/products')}
            variant="outline" 
            className="p-6 h-auto flex flex-col space-y-2"
            data-testid="button-manage-products"
          >
            <span className="material-icons text-2xl text-primary">category</span>
            <span>Manage Products</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/admin/customers')}
            variant="outline" 
            className="p-6 h-auto flex flex-col space-y-2"
            data-testid="button-manage-customers"
          >
            <span className="material-icons text-2xl text-primary">people</span>
            <span>View Customers</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/admin/inquiries')}
            variant="outline" 
            className="p-6 h-auto flex flex-col space-y-2"
            data-testid="button-manage-inquiries"
          >
            <span className="material-icons text-2xl text-primary">support_agent</span>
            <span>View Inquiries</span>
          </Button>
          
          <Button 
            onClick={() => setLocation('/admin/reports')}
            variant="outline" 
            className="p-6 h-auto flex flex-col space-y-2"
            data-testid="button-view-reports"
          >
            <span className="material-icons text-2xl text-primary">assessment</span>
            <span>View Reports</span>
          </Button>
        </div>

        {/* Recent Orders Table */}
        <Card className="material-shadow">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle data-testid="text-recent-orders-title">Recent Orders</CardTitle>
              <Button 
                variant="outline" 
                onClick={() => setLocation('/admin/orders')}
                data-testid="button-view-all-orders"
              >
                View All Orders
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {ordersLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 3 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-12 rounded" />
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <Skeleton className="h-6 w-16" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : recentOrders?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Order ID</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Amount</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {recentOrders.map((order: any) => (
                      <tr key={order.orders.ordId} className="border-b border-border" data-testid={`order-row-${order.orders.ordId}`}>
                        <td className="p-4" data-testid={`text-order-id-${order.orders.ordId}`}>
                          #UCR-{order.orders.ordId}
                        </td>
                        <td className="p-4" data-testid={`text-customer-name-${order.orders.ordId}`}>
                          {order.customers?.name || 'Unknown'}
                        </td>
                        <td className="p-4" data-testid={`text-order-amount-${order.orders.ordId}`}>
                          R {parseFloat(order.orders.totalAmount).toLocaleString()}
                        </td>
                        <td className="p-4">
                          <span 
                            className={`px-2 py-1 rounded-full text-xs ${getStatusColor(order.orders.status)}`}
                            data-testid={`badge-order-status-${order.orders.ordId}`}
                          >
                            {getStatusLabel(order.orders.status)}
                          </span>
                        </td>
                        <td className="p-4" data-testid={`text-order-date-${order.orders.ordId}`}>
                          {new Date(order.orders.orderDate).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => setLocation(`/admin/orders`)}
                              data-testid={`button-view-order-${order.orders.ordId}`}
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
              <div className="text-center py-8">
                <div className="material-icons text-4xl text-muted-foreground mb-2">assignment</div>
                <p className="text-muted-foreground" data-testid="text-no-recent-orders">
                  No recent orders to display
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
