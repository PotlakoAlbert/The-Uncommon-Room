import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

interface ReportData {
  totalSales: number;
  totalOrders: number;
  totalCustomers: number;
  totalProducts: number;
  topSellingProducts: Array<{
    name: string;
    quantitySold: number;
    revenue: number;
  }>;
  recentOrders: Array<{
    id: number;
    customerName: string;
    total: number;
    status: string;
    createdAt: string;
  }>;
  salesByMonth: Array<{
    month: string;
    sales: number;
    orders: number;
  }>;
}

const reportTypes = [
  { value: 'sales', label: 'Sales Report', description: 'Revenue, orders, and sales analytics' },
  { value: 'inventory', label: 'Inventory Report', description: 'Stock levels and product performance' },
  { value: 'customers', label: 'Customer Report', description: 'Customer analytics and behavior' },
  { value: 'products', label: 'Product Report', description: 'Product performance and popularity' },
  { value: 'custom_designs', label: 'Custom Designs Report', description: 'Custom design requests and status' },
];

const dateRanges = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: '90d', label: 'Last 90 Days' },
  { value: '1y', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' },
];

export default function AdminReports() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  
  const [selectedReportType, setSelectedReportType] = useState('sales');
  const [selectedDateRange, setSelectedDateRange] = useState('30d');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const { data: reportData, isLoading, refetch, error } = useQuery({
    queryKey: ['/api/admin/reports', selectedReportType, selectedDateRange, customStartDate, customEndDate],
    enabled: false, // Don't auto-fetch, wait for manual trigger
    queryFn: async () => {
      const params = new URLSearchParams({
        type: selectedReportType,
        range: selectedDateRange,
      });
      
      if (selectedDateRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      
      const response = await apiRequest('GET', `/api/admin/reports?${params}`);
      if (!response.ok) throw new Error('Failed to fetch report data');
      const data = await response.json();
      console.log('Report data received:', data);
      return data;
    },
  });

  // Debug: Log reportData changes
  useEffect(() => {
    console.log('Report data changed:', reportData);
    console.log('Is loading:', isLoading);
    console.log('Error:', error);
  }, [reportData, isLoading, error]);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await refetch();
      console.log('Refetch result:', result);
      console.log('Report data after refetch:', reportData);
      toast({
        title: "Report Generated",
        description: "Your report has been generated successfully.",
      });
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'excel') => {
    try {
      const params = new URLSearchParams({
        type: selectedReportType,
        range: selectedDateRange,
        format,
      });
      
      if (selectedDateRange === 'custom' && customStartDate && customEndDate) {
        params.append('startDate', customStartDate);
        params.append('endDate', customEndDate);
      }
      
      const response = await apiRequest('GET', `/api/admin/reports/export?${params}`);
      if (!response.ok) throw new Error('Failed to export report');
      
      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${selectedReportType}-report-${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast({
        title: "Report Exported",
        description: `Report exported as ${format.toUpperCase()} successfully.`,
      });
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-reports-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-reports-access-required-description">
            You need admin privileges to access reports.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-reports-login-redirect">
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-reports-title">
            Reports & Analytics
          </h1>
          <Button 
            variant="outline"
            onClick={() => setLocation('/admin/dashboard')}
            data-testid="button-back-to-dashboard-reports"
          >
            <span className="material-icons mr-2">dashboard</span>
            Dashboard
          </Button>
        </div>

        {/* Report Configuration */}
        <Card className="material-shadow mb-8">
          <CardHeader>
            <CardTitle data-testid="text-report-configuration-title">Report Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div>
                <Label htmlFor="report-type" className="text-sm font-medium">Report Type</Label>
                <Select value={selectedReportType} onValueChange={setSelectedReportType}>
                  <SelectTrigger data-testid="select-report-type">
                    <SelectValue placeholder="Select report type" />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        <div>
                          <div className="font-medium">{type.label}</div>
                          <div className="text-xs text-muted-foreground">{type.description}</div>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="date-range" className="text-sm font-medium">Date Range</Label>
                <Select value={selectedDateRange} onValueChange={setSelectedDateRange}>
                  <SelectTrigger data-testid="select-date-range">
                    <SelectValue placeholder="Select date range" />
                  </SelectTrigger>
                  <SelectContent>
                    {dateRanges.map((range) => (
                      <SelectItem key={range.value} value={range.value}>
                        {range.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedDateRange === 'custom' && (
                <>
                  <div>
                    <Label htmlFor="start-date" className="text-sm font-medium">Start Date</Label>
                    <Input
                      type="date"
                      value={customStartDate}
                      onChange={(e) => setCustomStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>
                  <div>
                    <Label htmlFor="end-date" className="text-sm font-medium">End Date</Label>
                    <Input
                      type="date"
                      value={customEndDate}
                      onChange={(e) => setCustomEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-4 mt-6">
              <Button 
                onClick={generateReport}
                disabled={isGenerating}
                data-testid="button-generate-report"
              >
                {isGenerating ? (
                  <>
                    <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                    Generating...
                  </>
                ) : (
                  <>
                    <span className="material-icons mr-2">assessment</span>
                    Generate Report
                  </>
                )}
              </Button>
              
              {reportData && (
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => exportReport('pdf')}
                    data-testid="button-export-pdf"
                  >
                    <span className="material-icons mr-2">picture_as_pdf</span>
                    Export PDF
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportReport('csv')}
                    data-testid="button-export-csv"
                  >
                    <span className="material-icons mr-2">table_chart</span>
                    Export CSV
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => exportReport('excel')}
                    data-testid="button-export-excel"
                  >
                    <span className="material-icons mr-2">grid_on</span>
                    Export Excel
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Report Results */}
        {isLoading ? (
          <div className="space-y-6">
            <Card className="material-shadow">
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton key={index} className="h-24 w-full" />
                  ))}
                </div>
              </CardContent>
            </Card>
            <Card className="material-shadow">
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        ) : reportData ? (
          <div className="space-y-6">
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-green-100 rounded-lg">
                      <span className="material-icons text-green-600">attach_money</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Total Sales</p>
                      <p className="text-2xl font-bold text-green-600" data-testid="text-total-sales">
                        R {reportData.totalSales?.toLocaleString() || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-blue-100 rounded-lg">
                      <span className="material-icons text-blue-600">shopping_cart</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-2xl font-bold text-blue-600" data-testid="text-total-orders">
                        {reportData.totalOrders || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <span className="material-icons text-purple-600">people</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Total Customers</p>
                      <p className="text-2xl font-bold text-purple-600" data-testid="text-total-customers">
                        {reportData.totalCustomers || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="material-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center">
                    <div className="p-3 bg-orange-100 rounded-lg">
                      <span className="material-icons text-orange-600">inventory</span>
                    </div>
                    <div className="ml-4">
                      <p className="text-sm text-muted-foreground">Total Products</p>
                      <p className="text-2xl font-bold text-orange-600" data-testid="text-total-products">
                        {reportData.totalProducts || '0'}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Selling Products */}
            {reportData.topSellingProducts && reportData.topSellingProducts.length > 0 && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle data-testid="text-top-selling-products-title">Top Selling Products</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.topSellingProducts.map((product: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center mr-3">
                            <span className="text-sm font-bold text-primary">#{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium" data-testid={`text-product-name-${index}`}>
                              {product.name}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              {product.quantitySold} units sold
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600" data-testid={`text-product-revenue-${index}`}>
                            R {product.revenue?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Orders */}
            {reportData.recentOrders && reportData.recentOrders.length > 0 && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle data-testid="text-recent-orders-title">Recent Orders</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-4 font-medium">Order ID</th>
                          <th className="text-left p-4 font-medium">Customer</th>
                          <th className="text-left p-4 font-medium">Total</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.recentOrders.map((order: any) => (
                          <tr key={order.id} className="border-b border-border">
                            <td className="p-4" data-testid={`text-order-id-${order.id}`}>
                              #{order.id}
                            </td>
                            <td className="p-4" data-testid={`text-order-customer-${order.id}`}>
                              {order.customerName}
                            </td>
                            <td className="p-4" data-testid={`text-order-total-${order.id}`}>
                              R {order.total?.toLocaleString() || '0'}
                            </td>
                            <td className="p-4">
                              <Badge 
                                className={`${
                                  order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                                  order.status === 'cancelled' ? 'bg-red-100 text-red-800' :
                                  'bg-blue-100 text-blue-800'
                                }`}
                                data-testid={`badge-order-status-${order.id}`}
                              >
                                {order.status}
                              </Badge>
                            </td>
                            <td className="p-4" data-testid={`text-order-date-${order.id}`}>
                              {new Date(order.createdAt).toLocaleDateString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Sales by Month */}
            {reportData.salesByMonth && reportData.salesByMonth.length > 0 && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle data-testid="text-sales-by-month-title">Sales by Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {reportData.salesByMonth.map((month: any, index: number) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                        <div>
                          <p className="font-medium" data-testid={`text-month-${index}`}>
                            {month.month}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {month.orders} orders
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600" data-testid={`text-month-sales-${index}`}>
                            R {month.sales?.toLocaleString() || '0'}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <Card className="material-shadow">
            <CardContent className="text-center py-12">
              <div className="material-icons text-6xl text-muted-foreground mb-4">assessment</div>
              <h3 className="text-xl font-medium mb-2" data-testid="text-no-report-data-title">
                No Report Data
              </h3>
              <p className="text-muted-foreground" data-testid="text-no-report-data-description">
                Generate a report to view analytics and insights.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
