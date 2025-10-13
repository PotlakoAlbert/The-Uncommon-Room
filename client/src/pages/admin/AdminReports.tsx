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
// Chart components temporarily disabled for build fix
// TODO: Implement proper recharts components
const ChartPlaceholder = ({ data, options, ...props }: any) => {
  const chartTitle = options?.plugins?.title?.text || "Chart";
  const chartData = data?.datasets?.[0]?.data || [];
  const chartLabels = data?.labels || [];
  
  return (
    <div className="bg-gray-50 p-6 rounded-lg text-center">
      <div className="material-icons text-4xl text-gray-400 mb-2">bar_chart</div>
      <h4 className="font-medium text-gray-600 mb-2">{chartTitle}</h4>
      <p className="text-sm text-gray-500 mb-4">Chart visualization coming soon</p>
      {chartLabels.length > 0 && (
        <div className="text-left max-h-32 overflow-y-auto">
          {chartLabels.slice(0, 5).map((label: string, index: number) => (
            <div key={index} className="flex justify-between text-sm py-1 border-b border-gray-200">
              <span>{label}</span>
              <span className="font-medium">
                {chartData[index] ? `${chartData[index]}` : 'N/A'}
              </span>
            </div>
          ))}
          {chartLabels.length > 5 && (
            <div className="text-xs text-gray-400 mt-2">
              ...and {chartLabels.length - 5} more items
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Placeholder components to replace Chart.js components
const Bar = ChartPlaceholder;
const Line = ChartPlaceholder;
const Pie = ChartPlaceholder;
const Doughnut = ChartPlaceholder;

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
  { value: 'customDesigns', label: 'Custom Designs Report', description: 'Custom design requests and status' },
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
    enabled: false,
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
        
        const normalizeData = (data: any) => {
          if (!data) return data;
          
          const parseNumericField = (value: any) => {
            if (value === null || value === undefined) return 0;
            if (typeof value === 'number') return value;
            if (typeof value === 'string') {
              const parsed = parseFloat(value);
              return !isNaN(parsed) ? parsed : 0;
            }
            return 0;
          };
          
          if (selectedReportType === 'inventory') {
            console.log('Normalizing inventory data...');
            
            data.totalProducts = parseNumericField(data.totalProducts);
            data.totalValue = parseNumericField(data.totalValue);
            data.lowStockItems = parseNumericField(data.lowStockItems);
            data.outOfStockItems = parseNumericField(data.outOfStockItems);
            
            if (!data.inventoryData || !Array.isArray(data.inventoryData)) {
              console.warn('inventoryData is not an array, initializing empty array');
              data.inventoryData = [];
            } else {
              console.log(`Normalizing ${data.inventoryData.length} inventory items`);
            }
            
            data.inventoryData = data.inventoryData.map((item: any) => {
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
            
            data.totalRequests = parseNumericField(data.totalRequests);
            data.pendingRequests = parseNumericField(data.pendingRequests);
            data.approvedRequests = parseNumericField(data.approvedRequests);
            data.rejectedRequests = parseNumericField(data.rejectedRequests);
            
            if (!data.customDesignsData || !Array.isArray(data.customDesignsData)) {
              console.warn('customDesignsData is not an array, initializing empty array');
              data.customDesignsData = [];
            } else {
              console.log(`Normalizing ${data.customDesignsData.length} custom design requests`);
            }
            
            const ensureArray = (val: any): any[] => {
              if (Array.isArray(val)) return val;
              if (val === null || val === undefined) return [];
              if (typeof val === 'string') {
                try {
                  const parsed = JSON.parse(val);
                  return Array.isArray(parsed) ? parsed : [val];
                } catch {
                  return [val];
                }
              }
              return [val];
            };
            
            data.customDesignsData = data.customDesignsData.map((item: any) => {
              console.log('Original custom design item:', JSON.stringify(item));
              
              return {
                id: parseNumericField(item.id),
                customer_name: item.customer_name || 'Unknown',
                customer_email: item.customer_email || 'No email provided',
                status: item.status || 'Pending',
                description: item.description || 'No description',
                budget: typeof item.budget === 'string' ? item.budget : String(item.budget || '0'),
                timeline: item.timeline || 'N/A',
                reference_links: ensureArray(item.reference_links),
                created_at: item.created_at || null
              };
            });
            
            if (data.statusBreakdown || data.recentRequests) {
              console.log('Also found old format custom designs data, normalizing...');
              
              data.statusBreakdown = Array.isArray(data.statusBreakdown) ? data.statusBreakdown : [];
              data.recentRequests = Array.isArray(data.recentRequests) ? data.recentRequests : [];
              
              data.statusBreakdown = data.statusBreakdown.map((item: any) => ({
                status: item.status || 'unknown',
                count: parseNumericField(item.count)
              }));
              
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
            
            data.statusBreakdown = Array.isArray(data.statusBreakdown) ? data.statusBreakdown : [];
            data.recentRequests = Array.isArray(data.recentRequests) ? data.recentRequests : [];
            
            data.statusBreakdown = data.statusBreakdown.map((item: any) => ({
              status: item.status || 'unknown',
              count: parseNumericField(item.count)
            }));
            
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

  useEffect(() => {
    console.log('Report data changed:', reportData);
    console.log('Is loading:', isLoading);
    console.log('Error:', error);
    
    if (reportData) {
      console.log('Report type:', selectedReportType);
      
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
      
      if (result.data) {
        const sanitizeData = (obj: any) => {
          if (!obj) return obj;
          
          Object.keys(obj).forEach(key => {
            const value = obj[key];
            
            if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
              if (value instanceof Date) {
                obj[key] = value;
              } else {
                try {
                  obj[key] = JSON.stringify(value);
                } catch (e) {
                  obj[key] = `[Object]`;
                }
              }
            }
          });
        };
        
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
      
      const blob = await response.blob();
      if (blob.size < 100) {
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

            {/* --- SALES REPORT VISUALS --- */}
            {selectedReportType === "sales" && (
              <>
                {/* Sales Trend Analysis */}
                {reportData.salesByMonth && reportData.salesByMonth.length > 0 && (
                  <Card className="material-shadow">
                    <CardHeader>
                      <CardTitle>Sales Trend Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-medium mb-4">Monthly Revenue Trend</h4>
                          <Line
                            data={{
                              labels: reportData.salesByMonth.map((m: any) => m.month),
                              datasets: [
                                {
                                  label: 'Revenue (R)',
                                  data: reportData.salesByMonth.map((m: any) => m.sales),
                                  borderColor: 'rgb(34, 197, 94)',
                                  backgroundColor: 'rgba(34, 197, 94, 0.1)',
                                  tension: 0.3,
                                  fill: true,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { position: 'top' },
                              },
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium mb-4">Order Volume Trend</h4>
                          <Line
                            data={{
                              labels: reportData.salesByMonth.map((m: any) => m.month),
                              datasets: [
                                {
                                  label: 'Orders',
                                  data: reportData.salesByMonth.map((m: any) => m.orders),
                                  borderColor: 'rgb(59, 130, 246)',
                                  backgroundColor: 'rgba(59, 130, 246, 0.1)',
                                  tension: 0.3,
                                  fill: true,
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { position: 'top' },
                              },
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Top Selling Products */}
                {reportData.topSellingProducts && reportData.topSellingProducts.length > 0 && (
                  <Card className="material-shadow">
                    <CardHeader>
                      <CardTitle>Top Selling Products Analysis</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                        <div>
                          <h4 className="font-medium mb-4">Units Sold Distribution</h4>
                          <Pie
                            data={{
                              labels: reportData.topSellingProducts.map((p: any) => p.name),
                              datasets: [
                                {
                                  label: 'Units Sold',
                                  data: reportData.topSellingProducts.map((p: any) => p.quantitySold),
                                  backgroundColor: [
                                    'rgba(34,197,94,0.6)',
                                    'rgba(59,130,246,0.6)',
                                    'rgba(139,92,246,0.6)',
                                    'rgba(251,191,36,0.6)',
                                    'rgba(239,68,68,0.6)',
                                  ],
                                },
                              ],
                            }}
                            options={{
                              plugins: {
                                legend: { position: 'bottom' },
                              },
                            }}
                          />
                        </div>
                        <div>
                          <h4 className="font-medium mb-4">Revenue Comparison</h4>
                          <Bar
                            data={{
                              labels: reportData.topSellingProducts.map((p: any) => p.name),
                              datasets: [
                                {
                                  label: 'Revenue (R)',
                                  data: reportData.topSellingProducts.map((p: any) => p.revenue),
                                  backgroundColor: 'rgba(34, 197, 94, 0.6)',
                                },
                              ],
                            }}
                            options={{
                              responsive: true,
                              plugins: {
                                legend: { position: 'top' },
                              },
                            }}
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Sales by Month */}
                {reportData.salesByMonth && reportData.salesByMonth.length > 0 && (
                  <Card className="material-shadow">
                    <CardHeader>
                      <CardTitle>Monthly Sales Performance</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="mb-6">
                        <Bar
                          data={{
                            labels: reportData.salesByMonth.map((m: any) => m.month),
                            datasets: [
                              {
                                label: 'Sales (R)',
                                data: reportData.salesByMonth.map((m: any) => m.sales),
                                backgroundColor: 'rgba(34,197,94,0.6)',
                              },
                              {
                                label: 'Orders',
                                data: reportData.salesByMonth.map((m: any) => m.orders),
                                backgroundColor: 'rgba(59,130,246,0.4)',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: { position: 'top' },
                            },
                          }}
                        />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </>
            )}

            {/* --- INVENTORY REPORT VISUALS --- */}
            {selectedReportType === "inventory" && (
              <>
                <Card className="material-shadow">
                  <CardHeader>
                    <CardTitle>Inventory Overview</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                      <div>
                        <h4 className="font-medium mb-4">Stock Status Distribution</h4>
                        <Doughnut
                          data={{
                            labels: ['Adequate Stock', 'Low Stock', 'Out of Stock'],
                            datasets: [
                              {
                                data: [
                                  (reportData.totalProducts || 0) - (reportData.lowStockItems || 0) - (reportData.outOfStockItems || 0),
                                  reportData.lowStockItems || 0,
                                  reportData.outOfStockItems || 0,
                                ],
                                backgroundColor: [
                                  'rgba(34, 197, 94, 0.6)',
                                  'rgba(251, 191, 36, 0.6)',
                                  'rgba(239, 68, 68, 0.6)',
                                ],
                              },
                            ],
                          }}
                          options={{
                            plugins: {
                              legend: { position: 'bottom' },
                            },
                          }}
                        />
                      </div>
                      <div>
                        <h4 className="font-medium mb-4">Price Range Distribution</h4>
                        <Bar
                          data={{
                            labels: ['Under R100', 'R100-500', 'R500-1000', 'R1000+'],
                            datasets: [
                              {
                                label: 'Number of Products',
                                data: (() => {
                                  const ranges = [0, 0, 0, 0];
                                  reportData.inventoryData?.forEach((item: any) => {
                                    const price = parseFloat(item.price) || 0;
                                    if (price < 100) ranges[0]++;
                                    else if (price < 500) ranges[1]++;
                                    else if (price < 1000) ranges[2]++;
                                    else ranges[3]++;
                                  });
                                  return ranges;
                                })(),
                                backgroundColor: 'rgba(139, 92, 246, 0.6)',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: { position: 'top' },
                            },
                          }}
                        />
                      </div>
                    </div>

                    {/* Category Distribution */}
                    {reportData.inventoryData?.some((item: any) => item.category) && (
                      <div>
                        <h4 className="font-medium mb-4">Inventory by Category</h4>
                        <Bar
                          data={{
                            labels: (() => {
                              const categories = [...new Set(reportData.inventoryData.map((item: any) => item.category || 'Uncategorized'))];
                              return categories;
                            })(),
                            datasets: [
                              {
                                label: 'Products per Category',
                                data: (() => {
                                  const categoryCount: { [key: string]: number } = {};
                                  reportData.inventoryData.forEach((item: any) => {
                                    const category = item.category || 'Uncategorized';
                                    categoryCount[category] = (categoryCount[category] || 0) + 1;
                                  });
                                  return Object.values(categoryCount);
                                })(),
                                backgroundColor: 'rgba(59, 130, 246, 0.6)',
                              },
                            ],
                          }}
                          options={{
                            responsive: true,
                            plugins: {
                              legend: { position: 'top' },
                            },
                          }}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            )}

            {/* --- CUSTOMER REPORT VISUALS --- */}
            {selectedReportType === "customers" && reportData.topCustomers && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle>Customer Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Top Customers by Spending</h4>
                      <Bar
                        data={{
                          labels: reportData.topCustomers.slice(0, 8).map((c: any) => c.name),
                          datasets: [
                            {
                              label: 'Total Spent (R)',
                              data: reportData.topCustomers.slice(0, 8).map((c: any) => parseFloat(c.totalSpent)),
                              backgroundColor: 'rgba(168, 85, 247, 0.6)',
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'top' },
                          },
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium mb-4">Customer Order Distribution</h4>
                      <Doughnut
                        data={{
                          labels: ['1 Order', '2-5 Orders', '6+ Orders'],
                          datasets: [
                            {
                              data: (() => {
                                const ranges = [0, 0, 0];
                                reportData.topCustomers.forEach((c: any) => {
                                  const orders = parseInt(c.totalOrders) || 0;
                                  if (orders === 1) ranges[0]++;
                                  else if (orders <= 5) ranges[1]++;
                                  else ranges[2]++;
                                });
                                return ranges;
                              })(),
                              backgroundColor: [
                                'rgba(59, 130, 246, 0.6)',
                                'rgba(139, 92, 246, 0.6)',
                                'rgba(236, 72, 153, 0.6)',
                              ],
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            legend: { position: 'bottom' },
                          },
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* --- PRODUCT REPORT VISUALS --- */}
            {selectedReportType === "products" && reportData.productPerformance && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle>Product Performance Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Revenue vs Units Sold</h4>
                      <Bar
                        data={{
                          labels: reportData.productPerformance.slice(0, 6).map((p: any) => p.name),
                          datasets: [
                            {
                              label: "Revenue (R)",
                              data: reportData.productPerformance.slice(0, 6).map((p: any) => parseFloat(p.totalRevenue)),
                              backgroundColor: "rgba(34, 197, 94, 0.6)",
                              yAxisID: "y",
                            },
                            {
                              label: "Units Sold",
                              data: reportData.productPerformance.slice(0, 6).map((p: any) => parseInt(p.totalSold)),
                              backgroundColor: "rgba(59, 130, 246, 0.6)",
                              yAxisID: "y1",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          interaction: { mode: "index", intersect: false },
                          plugins: {
                            legend: { position: "top" },
                          },
                          scales: {
                            y: {
                              type: "linear",
                              display: true,
                              position: "left",
                              title: { display: true, text: "Revenue (R)" },
                            },
                            y1: {
                              type: "linear",
                              display: true,
                              position: "right",
                              title: { display: true, text: "Units Sold" },
                              grid: { drawOnChartArea: false },
                            },
                          },
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium mb-4">Top Products by Order Count</h4>
                      <Bar
                        data={{
                          labels: reportData.productPerformance.slice(0, 8).map((p: any) =>
                            p.name.length > 15 ? p.name.substring(0, 15) + "..." : p.name
                          ),
                          datasets: [
                            {
                              label: "Order Count",
                              data: reportData.productPerformance.slice(0, 8).map((p: any) => parseInt(p.orderCount)),
                              backgroundColor: "rgba(251, 191, 36, 0.6)",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: "top" },
                          },
                        }}
                      />
                    </div>
                  </div>
                  
                  {/* Category Performance */}
                  {reportData.productPerformance.some((p: any) => p.category) && (
                    <div className="mt-6">
                      <h4 className="font-medium mb-4">Performance by Category</h4>
                      <Bar
                        data={{
                          labels: (() => {
                            const categories = [
                              ...new Set(reportData.productPerformance.map((p: any) => p.category || "Uncategorized")),
                            ];
                            return categories;
                          })(),
                          datasets: [
                            {
                              label: "Total Revenue (R)",
                              data: (() => {
                                const categoryRevenue: { [key: string]: number } = {};
                                reportData.productPerformance.forEach((p: any) => {
                                  const category = p.category || "Uncategorized";
                                  categoryRevenue[category] = (categoryRevenue[category] || 0) + parseFloat(p.totalRevenue);
                                });
                                return Object.values(categoryRevenue);
                              })(),
                              backgroundColor: "rgba(139, 92, 246, 0.6)",
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: "top" },
                          },
                        }}
                      />
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* --- CUSTOM DESIGNS REPORT VISUALS --- */}
            {selectedReportType === "customDesigns" && reportData.customDesignsData && (
              <Card className="material-shadow">
                <CardHeader>
                  <CardTitle>Custom Designs Analytics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-4">Request Status Distribution</h4>
                      <Doughnut
                        data={{
                          labels: ['Pending', 'Approved', 'Rejected', 'Other'],
                          datasets: [
                            {
                              data: [
                                reportData.pendingRequests || 0,
                                reportData.approvedRequests || 0,
                                reportData.rejectedRequests || 0,
                                (reportData.totalRequests || 0) - 
                                  (reportData.pendingRequests || 0) - 
                                  (reportData.approvedRequests || 0) - 
                                  (reportData.rejectedRequests || 0)
                              ],
                              backgroundColor: [
                                'rgba(251, 191, 36, 0.6)',
                                'rgba(34, 197, 94, 0.6)',
                                'rgba(239, 68, 68, 0.6)',
                                'rgba(156, 163, 175, 0.6)',
                              ],
                            },
                          ],
                        }}
                        options={{
                          plugins: {
                            legend: { position: 'bottom' },
                          },
                        }}
                      />
                    </div>
                    <div>
                      <h4 className="font-medium mb-4">Budget Range Distribution</h4>
                      <Bar
                        data={{
                          labels: ['Under R500', 'R500-2000', 'R2000-5000', 'R5000+'],
                          datasets: [
                            {
                              label: 'Number of Requests',
                              data: (() => {
                                const ranges = [0, 0, 0, 0];
                                reportData.customDesignsData.forEach((item: any) => {
                                  const budget = parseFloat(item.budget) || 0;
                                  if (budget < 500) ranges[0]++;
                                  else if (budget < 2000) ranges[1]++;
                                  else if (budget < 5000) ranges[2]++;
                                  else ranges[3]++;
                                });
                                return ranges;
                              })(),
                              backgroundColor: 'rgba(59, 130, 246, 0.6)',
                            },
                          ],
                        }}
                        options={{
                          responsive: true,
                          plugins: {
                            legend: { position: 'top' },
                          },
                        }}
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Existing data tables and lists remain below the charts */}
            {/* Top Selling Products List */}
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

            {/* Recent Orders Table */}
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

            {/* Inventory Details Table */}
            {selectedReportType === 'inventory' && reportData?.inventoryData?.length > 0 && (
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