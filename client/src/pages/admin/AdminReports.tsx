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
      try {
        const params = new URLSearchParams({
          type: selectedReportType,
          range: selectedDateRange,
        });
        
        if (selectedDateRange === 'custom' && customStartDate && customEndDate) {
          params.append('startDate', customStartDate);
          params.append('endDate', customEndDate);
        }
        
        console.log(`Fetching report: ${selectedReportType} for range ${selectedDateRange}`);
        const response = await apiRequest('GET', `/api/admin/reports?${params}`);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Report API error (${response.status}):`, errorText);
          throw new Error(`Failed to fetch report data: ${response.status} ${errorText}`);
        }
        
        const data = await response.json();
        console.log('Report data received:', data);
        
        // Normalize and sanitize data
        const normalizeData = (data: any) => {
          if (!data) return data;
          
          // Convert any string numbers to actual numbers
          const parseNumericField = (value: any) => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              const parsed = parseFloat(value);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          };
          
          // Ensure specific report types have expected structure
          if (selectedReportType === 'inventory') {
            console.log('Normalizing inventory data...');
            
            // Convert string numbers to actual numbers at top level
            data.totalProducts = parseNumericField(data.totalProducts);
            data.totalValue = parseNumericField(data.totalValue);
            data.lowStockItems = parseNumericField(data.lowStockItems);
            data.outOfStockItems = parseNumericField(data.outOfStockItems);
            
            // Ensure inventoryData is an array
            if (!data.inventoryData || !Array.isArray(data.inventoryData)) {
              console.warn('inventoryData is not an array, initializing empty array');
              data.inventoryData = [];
            } else {
              console.log(`Normalizing ${data.inventoryData.length} inventory items`);
            }
            
            // Normalize each inventory item to ensure safe rendering
            data.inventoryData = data.inventoryData.map((item: any) => {
              // Print item details for debugging
              console.log('Original inventory item:', JSON.stringify(item));
              
              return {
                productId: parseNumericField(item.productId),
                name: item.name || 'Unknown',
                category: item.category || 'N/A',
                price: parseNumericField(item.price),
                quantity: parseNumericField(item.quantity),
                costPrice: item.costPrice || '0',
                lastUpdated: item.lastUpdated || null
              };
            });
          }
          
          if (selectedReportType === 'customDesigns') {
            console.log('Normalizing custom designs data...');
            
            // Convert string numbers to actual numbers at top level
            data.totalRequests = parseNumericField(data.totalRequests);
            data.pendingRequests = parseNumericField(data.pendingRequests);
            data.approvedRequests = parseNumericField(data.approvedRequests);
            data.rejectedRequests = parseNumericField(data.rejectedRequests);
            
            // Ensure customDesignsData is an array
            if (!data.customDesignsData || !Array.isArray(data.customDesignsData)) {
              console.warn('customDesignsData is not an array, initializing empty array');
              data.customDesignsData = [];
            } else {
              console.log(`Normalizing ${data.customDesignsData.length} custom design requests`);
            }
            
            // Normalize custom design data
            data.customDesignsData = data.customDesignsData.map((item: any) => {
              // Print item details for debugging
              console.log('Original custom design item:', JSON.stringify(item));
              
              return {
                id: parseNumericField(item.id),
                customer_name: item.customer_name || 'Unknown',
                customer_email: item.customer_email || 'No email provided',
                status: item.status || 'Pending',
                description: item.description || 'No description',
                budget: typeof item.budget === 'string' ? item.budget : String(item.budget || '0'),
                timeline: item.timeline || 'N/A',
                reference_links: item.reference_links || '',
                created_at: item.created_at || null
              };
            });
            
            // If old format exists, still normalize it for backward compatibility
            if (data.statusBreakdown || data.recentRequests) {
              console.log('Also found old format custom designs data, normalizing...');
              
              // Ensure arrays exist
              data.statusBreakdown = Array.isArray(data.statusBreakdown) ? data.statusBreakdown : [];
              data.recentRequests = Array.isArray(data.recentRequests) ? data.recentRequests : [];
              
              // Normalize each status breakdown item
              data.statusBreakdown = data.statusBreakdown.map((item: any) => ({
                status: item.status || 'unknown',
                count: parseNumericField(item.count)
              }));
              
              // Normalize each request
              data.recentRequests = data.recentRequests.map((item: any) => ({
                designId: parseNumericField(item.designId),
                customerName: item.customerName || 'Unknown',
                furnitureType: item.furnitureType || 'Unknown',
                status: item.status || 'unknown',
                quoteAmount: item.quoteAmount ? parseNumericField(item.quoteAmount) : null,
                createdAt: item.createdAt || null
              }));
            }
          }
          
          if (selectedReportType === 'custom_designs') {
            console.log('Normalizing legacy custom_designs data...');
            
            // Ensure arrays exist
            data.statusBreakdown = Array.isArray(data.statusBreakdown) ? data.statusBreakdown : [];
            data.recentRequests = Array.isArray(data.recentRequests) ? data.recentRequests : [];
            
            // Normalize each status breakdown item
            data.statusBreakdown = data.statusBreakdown.map((item: any) => ({
              status: item.status || 'unknown',
              count: parseNumericField(item.count)
            }));
            
            // Normalize each request
            data.recentRequests = data.recentRequests.map((item: any) => ({
              designId: parseNumericField(item.designId),
              customerName: item.customerName || 'Unknown',
              furnitureType: item.furnitureType || 'Unknown',
              status: item.status || 'unknown',
              quoteAmount: item.quoteAmount ? parseNumericField(item.quoteAmount) : null,
              createdAt: item.createdAt || null
            }));
          }
          
          return data;
        };
        
        return normalizeData(data);
      } catch (error) {
        console.error('Error fetching report:', error);
        throw error;
      }
    },
    retry: 1,
    retryDelay: 1000,
  });

  // Debug: Log reportData changes with detailed analysis
  useEffect(() => {
    console.log('Report data changed:', reportData);
    console.log('Is loading:', isLoading);
    console.log('Error:', error);
    
    // Add enhanced debugging for report data
    if (reportData) {
      console.log('Report type:', selectedReportType);
      
      // Debug inventory data
      if (selectedReportType === 'inventory') {
        console.log('Inventory data analysis:');
        console.log('- totalProducts:', typeof reportData.totalProducts, reportData.totalProducts);
        console.log('- totalValue:', typeof reportData.totalValue, reportData.totalValue);
        console.log('- lowStockItems:', typeof reportData.lowStockItems, reportData.lowStockItems);
        console.log('- outOfStockItems:', typeof reportData.outOfStockItems, reportData.outOfStockItems);
        
        if (reportData.inventoryData && Array.isArray(reportData.inventoryData)) {
          console.log('- inventoryData count:', reportData.inventoryData.length);
          if (reportData.inventoryData.length > 0) {
            console.log('- First inventory item:', reportData.inventoryData[0]);
          }
        } else {
          console.warn('- inventoryData is not an array or is missing');
        }
      }
      
      // Debug custom designs data
      if (selectedReportType === 'customDesigns') {
        console.log('Custom designs data analysis:');
        console.log('- totalRequests:', typeof reportData.totalRequests, reportData.totalRequests);
        console.log('- pendingRequests:', typeof reportData.pendingRequests, reportData.pendingRequests);
        console.log('- approvedRequests:', typeof reportData.approvedRequests, reportData.approvedRequests);
        console.log('- rejectedRequests:', typeof reportData.rejectedRequests, reportData.rejectedRequests);
        
        if (reportData.customDesignsData && Array.isArray(reportData.customDesignsData)) {
          console.log('- customDesignsData count:', reportData.customDesignsData.length);
          if (reportData.customDesignsData.length > 0) {
            console.log('- First custom design item:', reportData.customDesignsData[0]);
          }
        } else {
          console.warn('- customDesignsData is not an array or is missing');
        }
      }
    }
  }, [reportData, isLoading, error, selectedReportType]);

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await refetch();
      console.log('Refetch result:', result);
      
      if (result.isError) {
        throw result.error;
      }
      
      // Sanitize data to prevent objects being rendered directly
      if (result.data) {
        // Process the data to ensure all values are renderable
        const sanitizeData = (obj: any) => {
          if (!obj) return obj;
          
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            
            // Check if the value is an object but not an array and not null
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
              // If it's a Date object, keep it
              if (value instanceof Date) {
                obj[key] = value;
              } else {
                // For other objects that might be incorrectly rendered, convert to string
                try {
                  obj[key] = JSON.stringify(value);
                } catch (e) {
                  obj[key] = `[Object]`;
                }
              }
            }
          });
        };
        
        // Apply sanitization to top-level properties
        sanitizeData(result.data);
      }
      
      if (selectedReportType === 'inventory' && (!result.data?.inventoryData || result.data.inventoryData.length === 0)) {
        console.warn('No inventory data returned');
        toast({
          title: "Report Generated",
          description: "The inventory report was generated but no inventory data was found.",
        });
      } else {
        toast({
          title: "Report Generated",
          description: "Your report has been generated successfully.",
        });
      }
    } catch (error: any) {
      console.error('Report generation error:', error);
      toast({
        title: "Report Generation Failed",
        description: error?.message || "Failed to generate report. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const exportReport = async (format: 'pdf' | 'csv' | 'excel') => {
    const exportingToast = toast({
      title: "Exporting Report",
      description: `Preparing ${selectedReportType} report for download...`,
    });
    
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
      
      console.log(`Exporting ${selectedReportType} report as ${format}`);
      const response = await apiRequest('GET', `/api/admin/reports/export?${params}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Export error (${response.status}):`, errorText);
        throw new Error(`Failed to export report: ${response.status} ${errorText}`);
      }
      
      // Create download link
      const blob = await response.blob();
      if (blob.size < 100) {
        // If the file is too small, it might be an error
        const text = await blob.text();
        console.warn('Export returned a very small file, checking content:', text);
        if (text.includes('error') || text.includes('fail')) {
          throw new Error(`Export failed: ${text}`);
        }
      }
      
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
      console.error('Export error:', error);
      toast({
        title: "Export Failed",
        description: error?.message || "Failed to export report. Please try again.",
        variant: "destructive",
      });
    } finally {
      toast.dismiss(exportingToast);
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

            {/* Top Selling Products (Sales report) */}
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

            {/* Recent Orders (Sales report) */}
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

            {/* Sales by Month (Sales report) */}
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

            {/* Inventory Report */}
            {selectedReportType === 'inventory' && (
              <>
                <Card className="material-shadow">
                  <CardHeader>
                    <CardTitle>Inventory Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Products</p>
                        <p className="text-2xl font-bold">
                          {(() => {
                            // Ensure totalProducts is safely rendered as a number
                            if (reportData?.totalProducts === undefined || reportData?.totalProducts === null) return '0';
                            if (typeof reportData.totalProducts === 'number') return reportData.totalProducts.toLocaleString();
                            try {
                              const value = parseFloat(String(reportData.totalProducts));
                              return !isNaN(value) ? value.toLocaleString() : '0';
                            } catch {
                              return '0';
                            }
                          })()}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Value</p>
                        <p className="text-2xl font-bold">
                          R {(() => {
                            // Ensure totalValue is safely rendered as a currency number
                            if (reportData?.totalValue === undefined || reportData?.totalValue === null) return '0';
                            if (typeof reportData.totalValue === 'number') return reportData.totalValue.toLocaleString();
                            try {
                              const value = parseFloat(String(reportData.totalValue));
                              return !isNaN(value) ? value.toLocaleString() : '0';
                            } catch {
                              return '0';
                            }
                          })()}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Low Stock Items</p>
                        <p className="text-2xl font-bold text-yellow-600">
                          {(() => {
                            // Ensure lowStockItems is safely rendered as a number
                            if (reportData?.lowStockItems === undefined || reportData?.lowStockItems === null) return '0';
                            if (typeof reportData.lowStockItems === 'number') return reportData.lowStockItems.toLocaleString();
                            try {
                              const value = parseFloat(String(reportData.lowStockItems));
                              return !isNaN(value) ? value.toLocaleString() : '0';
                            } catch {
                              return '0';
                            }
                          })()}
                        </p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Out of Stock</p>
                        <p className="text-2xl font-bold text-red-600">
                          {(() => {
                            // Ensure outOfStockItems is safely rendered as a number
                            if (reportData?.outOfStockItems === undefined || reportData?.outOfStockItems === null) return '0';
                            if (typeof reportData.outOfStockItems === 'number') return reportData.outOfStockItems.toLocaleString();
                            try {
                              const value = parseFloat(String(reportData.outOfStockItems));
                              return !isNaN(value) ? value.toLocaleString() : '0';
                            } catch {
                              return '0';
                            }
                          })()}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {reportData?.inventoryData?.length > 0 ? (
                  <Card className="material-shadow">
                    <CardHeader>
                      <CardTitle>Inventory Details</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3">Product</th>
                              <th className="text-left p-3">Category</th>
                              <th className="text-left p-3">Price</th>
                              <th className="text-left p-3">Qty</th>
                              <th className="text-left p-3">Last Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.inventoryData.map((row: any, index: number) => (
                              <tr key={row.productId || index} className="border-b border-border">
                                <td className="p-3">{typeof row.name === 'string' ? row.name : 'Unknown'}</td>
                                <td className="p-3 capitalize">{typeof row.category === 'string' ? row.category : 'N/A'}</td>
                                <td className="p-3">
                                  R {(() => {
                                    try {
                                      if (!row.price) return '0';
                                      if (typeof row.price === 'number') return row.price.toLocaleString();
                                      if (typeof row.price === 'string') {
                                        const parsedPrice = parseFloat(row.price);
                                        return !isNaN(parsedPrice) ? parsedPrice.toLocaleString() : '0';
                                      }
                                      return '0';
                                    } catch (e) {
                                      console.error('Error formatting price:', e);
                                      return '0';
                                    }
                                  })()}
                                </td>
                                <td className="p-3">
                                  {(() => {
                                    try {
                                      if (typeof row.quantity === 'number') return row.quantity.toLocaleString();
                                      if (typeof row.quantity === 'string') {
                                        const parsed = parseInt(row.quantity);
                                        return !isNaN(parsed) ? parsed.toLocaleString() : '0';
                                      }
                                      return '0';
                                    } catch (e) {
                                      console.error('Error formatting quantity:', e);
                                      return '0';
                                    }
                                  })()}
                                </td>
                                <td className="p-3">
                                  {(() => {
                                    try {
                                      if (!row.lastUpdated) return '-';
                                      if (row.lastUpdated instanceof Date) {
                                        return row.lastUpdated.toLocaleString();
                                      }
                                      return new Date(String(row.lastUpdated)).toLocaleString();
                                    } catch (e) {
                                      console.error('Error formatting date:', e);
                                      return '-';
                                    }
                                  })()}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                ) : (
                  <Card className="material-shadow">
                    <CardContent className="py-12 text-center">
                      <div className="material-icons text-6xl text-muted-foreground mb-4">inventory_2</div>
                      <h3 className="text-xl font-medium mb-2">No Inventory Data</h3>
                      <p className="text-muted-foreground">
                        There are no products in the inventory or data could not be retrieved.
                      </p>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* Customer Report */}
            {selectedReportType === 'customers' && reportData.topCustomers && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle>Top Customers</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3">Name</th>
                          <th className="text-left p-3">Email</th>
                          <th className="text-left p-3">Orders</th>
                          <th className="text-left p-3">Total Spent</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.topCustomers.map((c: any) => (
                          <tr key={c.id} className="border-b border-border">
                            <td className="p-3">{c.name}</td>
                            <td className="p-3">{c.email}</td>
                            <td className="p-3">{c.totalOrders}</td>
                            <td className="p-3">R {parseFloat(c.totalSpent).toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Product Report */}
            {selectedReportType === 'products' && reportData.productPerformance && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle>Product Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-3">Product</th>
                          <th className="text-left p-3">Category</th>
                          <th className="text-left p-3">Price</th>
                          <th className="text-left p-3">Sold</th>
                          <th className="text-left p-3">Revenue</th>
                          <th className="text-left p-3">Order Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reportData.productPerformance.map((p: any) => (
                          <tr key={p.productId} className="border-b border-border">
                            <td className="p-3">{p.name}</td>
                            <td className="p-3 capitalize">{p.category}</td>
                            <td className="p-3">R {parseFloat(p.price).toLocaleString()}</td>
                            <td className="p-3">{p.totalSold}</td>
                            <td className="p-3">R {parseFloat(p.totalRevenue).toLocaleString()}</td>
                            <td className="p-3">{p.orderCount}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Custom Designs Report - New Format */}
            {selectedReportType === 'customDesigns' && reportData.customDesignsData && (
              <>
                <Card className="material-shadow">
                  <CardHeader>
                    <CardTitle>Custom Design Requests Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold">{reportData.totalRequests || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Pending</p>
                        <p className="text-2xl font-bold">{reportData.pendingRequests || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Approved</p>
                        <p className="text-2xl font-bold">{reportData.approvedRequests || 0}</p>
                      </div>
                      <div className="p-4 border rounded-lg">
                        <p className="text-sm text-muted-foreground">Rejected</p>
                        <p className="text-2xl font-bold">{reportData.rejectedRequests || 0}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card className="material-shadow">
                  <CardHeader>
                    <CardTitle>Custom Design Requests</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-muted">
                          <tr>
                            <th className="text-left p-3">ID</th>
                            <th className="text-left p-3">Customer</th>
                            <th className="text-left p-3">Status</th>
                            <th className="text-left p-3">Budget</th>
                            <th className="text-left p-3">Timeline</th>
                            <th className="text-left p-3">Date</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reportData.customDesignsData.map((item: any, index: number) => (
                            <tr key={item.id || index} className="border-b border-border">
                              <td className="p-3">{item.id || 'N/A'}</td>
                              <td className="p-3">{typeof item.customer_name === 'string' ? item.customer_name : 'Unknown'}</td>
                              <td className="p-3 capitalize">{typeof item.status === 'string' ? item.status : 'pending'}</td>
                              <td className="p-3">{typeof item.budget === 'string' ? item.budget : String(item.budget || '0')}</td>
                              <td className="p-3">{typeof item.timeline === 'string' ? item.timeline : 'N/A'}</td>
                              <td className="p-3">
                                {item.created_at ? 
                                  (() => {
                                    try {
                                      return new Date(item.created_at).toLocaleString();
                                    } catch {
                                      return '-';
                                    }
                                  })() 
                                  : '-'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}

            {/* Custom Designs Report - Old Format */}
            {selectedReportType === 'custom_designs' && (reportData.statusBreakdown || reportData.recentRequests) && (
              <>
                {reportData.statusBreakdown && (
                  <Card className="material-shadow">
                    <CardHeader>
                      <CardTitle>Status Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {reportData.statusBreakdown.map((s: any, index: number) => (
                          <div key={s.status || index} className="p-4 border rounded-lg">
                            <p className="text-sm text-muted-foreground capitalize">{typeof s.status === 'string' ? s.status : 'unknown'}</p>
                            <p className="text-2xl font-bold">{typeof s.count === 'number' ? s.count : (parseInt(String(s.count)) || 0)}</p>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {reportData.recentRequests && (
                  <Card className="material-shadow">
                    <CardHeader>
                      <CardTitle>Recent Custom Design Requests</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead className="bg-muted">
                            <tr>
                              <th className="text-left p-3">Customer</th>
                              <th className="text-left p-3">Type</th>
                              <th className="text-left p-3">Status</th>
                              <th className="text-left p-3">Quote</th>
                              <th className="text-left p-3">Date</th>
                            </tr>
                          </thead>
                          <tbody>
                            {reportData.recentRequests.map((r: any, index: number) => (
                              <tr key={r.designId || index} className="border-b border-border">
                                <td className="p-3">{typeof r.customerName === 'string' ? r.customerName : 'Unknown'}</td>
                                <td className="p-3">{typeof r.furnitureType === 'string' ? r.furnitureType : 'Unknown'}</td>
                                <td className="p-3 capitalize">{typeof r.status === 'string' ? r.status : 'unknown'}</td>
                                <td className="p-3">
                                  {r.quoteAmount ? 
                                    `R ${(() => {
                                      if (typeof r.quoteAmount === 'number') return r.quoteAmount.toLocaleString();
                                      try {
                                        const parsed = parseFloat(r.quoteAmount);
                                        return !isNaN(parsed) ? parsed.toLocaleString() : '0';
                                      } catch {
                                        return '0';
                                      }
                                    })()}` 
                                    : '-'}
                                </td>
                                <td className="p-3">
                                  {r.createdAt ? 
                                    (() => {
                                      try {
                                        return new Date(r.createdAt).toLocaleString();
                                      } catch {
                                        return '-';
                                      }
                                    })() 
                                    : '-'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
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
