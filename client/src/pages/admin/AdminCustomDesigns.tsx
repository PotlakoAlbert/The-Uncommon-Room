import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const updateDesignSchema = z.object({
  status: z.enum(["submitted", "under_review", "quoted", "approved", "rejected"]),
  quoteAmount: z.string().optional(),
});

type UpdateDesignFormData = z.infer<typeof updateDesignSchema>;

const designStatuses = [
  { value: 'submitted', label: 'Submitted', color: 'bg-blue-100 text-blue-800' },
  { value: 'under_review', label: 'Under Review', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'quoted', label: 'Quoted', color: 'bg-purple-100 text-purple-800' },
  { value: 'approved', label: 'Approved', color: 'bg-green-100 text-green-800' },
  { value: 'rejected', label: 'Rejected', color: 'bg-red-100 text-red-800' },
];

export default function AdminCustomDesigns() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [selectedDesign, setSelectedDesign] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const form = useForm<UpdateDesignFormData>({
    resolver: zodResolver(updateDesignSchema),
    defaultValues: {
      status: "submitted",
      quoteAmount: "",
    },
  });

  const { data: customDesigns, isLoading, error } = useQuery({
    queryKey: ['/api/admin/custom-designs'],
    enabled: isAuthenticated && user?.role === 'admin',
    queryFn: async () => {
      console.log('=== STARTING CUSTOM DESIGNS FETCH ===');
      console.log('Auth state:', { isAuthenticated, userRole: user?.role, userId: user?.id });
      
      try {
        console.log('Making API request to: /api/admin/custom-designs');
        const response = await apiRequest('GET', '/api/admin/custom-designs');
        
        console.log('API Response received:');
        console.log('- Status:', response.status);
        console.log('- OK:', response.ok);
        console.log('- Headers:', Object.fromEntries(response.headers.entries()));
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('API Error Response:', errorText);
          throw new Error(`Failed to fetch custom designs: ${response.status} - ${errorText}`);
        }
        
        const data = await response.json();
        console.log('=== RAW API RESPONSE DATA ===');
        console.log('Data type:', typeof data);
        console.log('Is array:', Array.isArray(data));
        console.log('Data length:', data?.length);
        console.log('Full data structure:', data);
        
        if (Array.isArray(data) && data.length > 0) {
          console.log('=== FIRST ITEM ANALYSIS ===');
          console.log('First item:', data[0]);
          console.log('Has custom_design_requests:', !!data[0]?.custom_design_requests);
          console.log('Has users:', !!data[0]?.users);
          
          if (data[0]?.custom_design_requests) {
            console.log('Custom design requests keys:', Object.keys(data[0].custom_design_requests));
            console.log('Custom design requests values:', data[0].custom_design_requests);
          }
          
          if (data[0]?.users) {
            console.log('User keys:', Object.keys(data[0].users));
            console.log('User values:', data[0].users);
          }
          
          console.log('=== ALL ITEMS STRUCTURE CHECK ===');
          data.forEach((item, index) => {
            console.log(`Item ${index}:`, {
              hasCustomDesignRequests: !!item?.custom_design_requests,
              hasUsers: !!item?.users,
              designId: item?.custom_design_requests?.id,
              status: item?.custom_design_requests?.status,
              userName: item?.users?.name
            });
          });
        } else if (data?.length === 0) {
          console.log('Empty array returned from API');
        } else {
          console.warn('Unexpected data format:', data);
        }
        
        console.log('=== END CUSTOM DESIGNS FETCH ===');
        return data;
        
      } catch (error) {
        console.error('=== FETCH ERROR ===');
        console.error('Error type:', error?.constructor?.name);
        console.error('Error message:', (error as Error)?.message);
        console.error('Full error:', error);
        console.error('=== END FETCH ERROR ===');
        throw error;
      }
    },
  });

  // Log the final query state
  console.log('=== QUERY STATE ===');
  console.log('isLoading:', isLoading);
  console.log('error:', error);
  console.log('hasData:', !!customDesigns);
  console.log('dataLength:', customDesigns?.length);
  console.log('=== END QUERY STATE ===');

  const updateDesignStatusMutation = useMutation({
    mutationFn: async ({ designId, status, quoteAmount }: { designId: number; status: string; quoteAmount?: string }) => {
      const payload: any = { status };
      if (quoteAmount && quoteAmount !== '') {
        // Ensure quoteAmount is a valid number
        const parsedAmount = parseFloat(quoteAmount);
        if (!isNaN(parsedAmount)) {
          payload.quoteAmount = parsedAmount.toString();
        }
      }
      console.log('Updating design status:', { designId, payload });
      const response = await apiRequest('PUT', `/api/admin/custom-designs/${designId}/status`, payload);
      if (!response.ok) throw new Error('Failed to update design status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/custom-designs'] });
      toast({
        title: "Design Status Updated",
        description: "The design status has been updated successfully.",
      });
      setIsUpdateDialogOpen(false);
    },
    onError: (error: any) => {
      console.error('Update error:', error);
      toast({
        title: "Failed to Update Status",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const getStatusColor = (status: string) => {
    const statusObj = designStatuses.find(s => s.value === status);
    return statusObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const statusObj = designStatuses.find(s => s.value === status);
    return statusObj?.label || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const viewDesignDetails = (design: any) => {
    setSelectedDesign(design);
    setIsDetailsDialogOpen(true);
  };

  const openUpdateDialog = (design: any) => {
    console.log('Opening update dialog for design:', design);
    setSelectedDesign(design);
    
    // Handle both transformed and raw data formats
    const designData = design.custom_design_requests || design;
    
    if (designData) {
      form.setValue('status', designData.status as "submitted" | "under_review" | "quoted" | "approved" | "rejected");
      form.setValue('quoteAmount', designData.quoteAmount || '');
      console.log('Set form values:', { status: designData.status, quoteAmount: designData.quoteAmount });
    } else {
      console.error('No design data found in:', design);
    }
    
    setIsUpdateDialogOpen(true);
  };

  const onSubmit = (data: UpdateDesignFormData) => {
    console.log('Form submit with data:', data);
    console.log('Selected design:', selectedDesign);
    
    if (!selectedDesign) {
      console.error('No selected design');
      toast({
        title: "Error",
        description: "No design selected",
        variant: "destructive",
      });
      return;
    }
    
    // Handle both transformed and raw data formats
    const designData = selectedDesign.custom_design_requests || selectedDesign;
    const designId = designData?.id || designData?.designId;
    
    console.log('Design data:', designData);
    console.log('Design ID:', designId);
    
    if (!designId) {
      console.error('Could not determine design ID from:', { selectedDesign, designData });
      toast({
        title: "Error",
        description: "Could not determine design ID",
        variant: "destructive",
      });
      return;
    }
    
    console.log('Submitting mutation with:', { designId, status: data.status, quoteAmount: data.quoteAmount });
    updateDesignStatusMutation.mutate({
      designId,
      status: data.status,
      quoteAmount: data.quoteAmount,
    });
  };

  // ===== RENDER LOGGING =====
  console.log('=== COMPONENT RENDER ===');
  console.log('Auth state:', { isAuthenticated, userRole: user?.role });
  console.log('Query state:', { isLoading, hasError: !!error, hasData: !!customDesigns });
  console.log('Data state:', { 
    customDesigns: customDesigns, 
    isArray: Array.isArray(customDesigns),
    length: customDesigns?.length 
  });
  
  if (customDesigns && Array.isArray(customDesigns)) {
    console.log('=== DATA VALIDATION ===');
    const validItems = customDesigns.filter(item => item?.custom_design_requests);
    const invalidItems = customDesigns.filter(item => !item?.custom_design_requests);
    console.log('Valid items (have custom_design_requests):', validItems.length);
    console.log('Invalid items (missing custom_design_requests):', invalidItems.length);
    
    if (invalidItems.length > 0) {
      console.warn('Invalid items found:', invalidItems);
    }
    
    console.log('Sample valid item:', validItems[0]);
  }
  console.log('=== END COMPONENT RENDER ===');

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-designs-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-designs-access-required-description">
            You need admin privileges to manage custom designs.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-designs-login-redirect">
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-designs-title">
            Custom Design Requests
          </h1>
          <Button 
            variant="outline"
            onClick={() => setLocation('/admin/dashboard')}
            data-testid="button-back-to-dashboard-designs"
          >
            <span className="material-icons mr-2">dashboard</span>
            Dashboard
          </Button>
        </div>

        {/* Summary Cards */}
        {!isLoading && customDesigns && (() => {
          console.log('=== RENDERING SUMMARY CARDS ===');
          console.log('customDesigns for summary:', customDesigns);
          console.log('Total items:', customDesigns.length);
          
          const pendingItems = customDesigns.filter((item: any) => {
            // Handle both transformed and raw data formats
            const designData = item.custom_design_requests || item;
            const hasCDR = !!designData;
            const status = designData?.status;
            const isPending = ['submitted', 'under_review'].includes(status);
            console.log(`Item ${designData?.id}:`, { hasCDR, status, isPending, isTransformed: !!item.custom_design_requests });
            return hasCDR && isPending;
          });
          
          const approvedItems = customDesigns.filter((item: any) => {
            const designData = item.custom_design_requests || item;
            return designData && designData.status === 'approved';
          });
          
          const quotedItems = customDesigns.filter((item: any) => {
            const designData = item.custom_design_requests || item;
            return designData && designData.status === 'quoted';
          });
          
          console.log('Summary counts:', {
            total: customDesigns.length,
            pending: pendingItems.length,
            approved: approvedItems.length,
            quoted: quotedItems.length
          });
          console.log('=== END SUMMARY CARDS ===');
          
          return (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <span className="material-icons text-primary">design_services</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Total Requests</p>
                    <p className="text-2xl font-bold" data-testid="text-total-designs">
                      {customDesigns.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <span className="material-icons text-blue-600">schedule</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Pending Review</p>
                    <p className="text-2xl font-bold text-blue-600" data-testid="text-pending-designs">
                      {pendingItems.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <span className="material-icons text-green-600">check_circle</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-approved-designs">
                      {approvedItems.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-purple-100 rounded-lg">
                    <span className="material-icons text-purple-600">request_quote</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Quoted</p>
                    <p className="text-2xl font-bold text-purple-600" data-testid="text-quoted-designs">
                      {quotedItems.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          );
        })()}

        {/* Filters */}
        <Card className="material-shadow mb-6">
          <CardHeader>
            <CardTitle className="flex items-center text-base">
              <span className="material-icons mr-2 text-primary">filter_list</span>
              Quick Filters & Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap items-center gap-6">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">View:</span>
                <select 
                  className="border border-border rounded px-3 py-1.5 text-sm bg-background"
                  defaultValue="all"
                  onChange={(e) => {
                    // Filter functionality can be implemented here
                    console.log('Filter changed:', e.target.value);
                  }}
                >
                  <option value="all">All Requests</option>
                  <option value="with-images">📸 With Images Only</option>
                  <option value="without-images">🚫 No Images</option>
                  <option value="pending">⏳ Pending Review</option>
                  <option value="approved">✅ Approved</option>
                  <option value="quoted">💰 Quoted</option>
                </select>
              </div>
              
              {!isLoading && customDesigns && (
                <div className="flex items-center space-x-4 text-sm">
                  <div className="flex items-center space-x-1 text-muted-foreground">
                    <span className="material-icons text-xs">analytics</span>
                    <span>Total: {customDesigns.length}</span>
                  </div>
                  <div className="flex items-center space-x-1 text-blue-600">
                    <span className="material-icons text-xs">image</span>
                    <span>
                      With Images: {customDesigns.filter((item: any) => {
                        const designData = item.custom_design_requests || item;
                        const images = Array.isArray(designData?.referenceImages) ? designData.referenceImages : [];
                        return images.length > 0;
                      }).length}
                    </span>
                  </div>
                  <div className="flex items-center space-x-1 text-green-600">
                    <span className="material-icons text-xs">cloud_done</span>
                    <span>
                      Cloud Images: {customDesigns.reduce((count: number, item: any) => {
                        const designData = item.custom_design_requests || item;
                        const images = Array.isArray(designData?.referenceImages) ? designData.referenceImages : [];
                        return count + images.filter((img: string) => img.includes('res.cloudinary.com')).length;
                      }, 0)}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Custom Designs Table */}
        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-design-requests-title">Design Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {(() => {
              console.log('=== CARD CONTENT RENDERING ===');
              console.log('isLoading:', isLoading);
              console.log('error:', error);
              console.log('customDesigns:', customDesigns);
              console.log('customDesigns type:', typeof customDesigns);
              console.log('customDesigns is array:', Array.isArray(customDesigns));
              console.log('customDesigns length:', customDesigns?.length);
              console.log('=== END CARD CONTENT RENDERING ===');
              
              if (error) {
                console.error('=== DISPLAYING ERROR STATE ===');
                console.error('Error details:', error);
                return (
                  <div className="text-center py-12">
                    <div className="material-icons text-6xl text-red-500 mb-4">error</div>
                    <h3 className="text-xl font-medium mb-2" data-testid="text-error-title">
                      Failed to Load Custom Designs
                    </h3>
                    <p className="text-muted-foreground mb-4" data-testid="text-error-description">
                      {error instanceof Error ? error.message : 'An unexpected error occurred'}
                    </p>
                    <Button onClick={() => window.location.reload()}>
                      <span className="material-icons mr-2">refresh</span>
                      Retry
                    </Button>
                  </div>
                );
              }
              
              if (isLoading) {
                console.log('=== DISPLAYING LOADING STATE ===');
                return (
                  <div className="space-y-4">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                        <Skeleton className="h-4 w-16" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                        <Skeleton className="h-6 w-20" />
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-8 w-24" />
                      </div>
                    ))}
                  </div>
                );
              }
              
              if (customDesigns && customDesigns.length > 0) {
                console.log('=== DISPLAYING TABLE ===');
                return (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead className="bg-muted">
                        <tr>
                          <th className="text-left p-4 font-medium">Request ID</th>
                          <th className="text-left p-4 font-medium">Customer</th>
                          <th className="text-left p-4 font-medium">Furniture Type</th>
                          <th className="text-left p-4 font-medium">Images</th>
                          <th className="text-left p-4 font-medium">Budget Range</th>
                          <th className="text-left p-4 font-medium">Status</th>
                          <th className="text-left p-4 font-medium">Quote Amount</th>
                          <th className="text-left p-4 font-medium">Date</th>
                          <th className="text-left p-4 font-medium">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {(() => {
                          console.log('=== RENDERING TABLE ROWS ===');
                          console.log('customDesigns for table:', customDesigns);
                          console.log('customDesigns length:', customDesigns?.length);
                          
                          if (!customDesigns || !Array.isArray(customDesigns)) {
                            console.warn('customDesigns is not an array:', customDesigns);
                            return null;
                          }
                          
                          const validDesigns = customDesigns.filter((design: any) => {
                            // Handle both transformed and raw data formats
                            const hasTransformedStructure = design && design.custom_design_requests;
                            const hasRawStructure = design && design.id && design.furnitureType;
                            
                            const isValid = hasTransformedStructure || hasRawStructure;
                            
                            if (!isValid) {
                              console.warn('Invalid design found (neither transformed nor raw):', design);
                            } else if (hasRawStructure && !hasTransformedStructure) {
                              console.log('Found raw design data (not transformed):', design);
                            }
                            
                            return isValid;
                          });
                          
                          console.log('Valid designs after filter:', validDesigns.length);
                          console.log('Valid designs:', validDesigns);
                          
                          return validDesigns.map((design: any, index: number) => {
                            // Handle both transformed and raw data formats
                            const isTransformed = !!design.custom_design_requests;
                            const designData = isTransformed ? design.custom_design_requests : design;
                            const userData = isTransformed ? design.users : design.user; // Fix: raw format has user property
                            
                            const designId = designData.id || designData.designId;
                            console.log(`Rendering row ${index} for design ID: ${designId}`, {
                              isTransformed,
                              design,
                              designData,
                              userData
                            });
                            
                            return (
                              <tr key={designId} className="border-b border-border" data-testid={`design-row-${designId}`}>
                                <td className="p-4" data-testid={`text-design-id-${designId}`}>
                                  #{designId}
                                </td>
                                <td className="p-4" data-testid={`text-design-customer-${designId}`}>
                                  {userData?.name || 'Unknown Customer'}
                                </td>
                                <td className="p-4 capitalize" data-testid={`text-design-type-${designId}`}>
                                  {designData.furnitureType}
                                </td>
                                <td className="p-4" data-testid={`images-design-${designId}`}>
                                  {(() => {
                                    const referenceImages = Array.isArray(designData.referenceImages) ? designData.referenceImages : [];
                                    const referenceLinks = Array.isArray(designData.referenceLinks) ? designData.referenceLinks : [];
                                    
                                    // Extract image URLs from links
                                    const isImageUrl = (url: string) => 
                                      /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(url) || 
                                      url.includes('res.cloudinary.com') || 
                                      url.includes('images.unsplash.com');
                                    
                                    const imageFromLinks = referenceLinks.filter(isImageUrl);
                                    const allImages = [...referenceImages, ...imageFromLinks];
                                    
                                    if (allImages.length === 0) {
                                      return (
                                        <div className="flex items-center text-muted-foreground text-sm">
                                          <span className="material-icons mr-1 text-xs">image_not_supported</span>
                                          No images
                                        </div>
                                      );
                                    }
                                    
                                    return (
                                      <div className="flex items-center space-x-1">
                                        {allImages.slice(0, 3).map((imageUrl, idx) => (
                                          <div 
                                            key={idx}
                                            className="relative group cursor-pointer"
                                            onClick={() => window.open(imageUrl, '_blank')}
                                          >
                                            <img 
                                              src={imageUrl}
                                              alt={`Reference ${idx + 1}`}
                                              className="w-8 h-8 rounded border object-cover hover:scale-110 transition-transform"
                                              onError={(e) => {
                                                e.currentTarget.src = '/placeholder-image.png';
                                              }}
                                            />
                                          </div>
                                        ))}
                                        {allImages.length > 3 && (
                                          <div className="flex items-center justify-center w-8 h-8 bg-muted rounded border text-xs font-medium">
                                            +{allImages.length - 3}
                                          </div>
                                        )}
                                        <div className="ml-2 flex items-center text-xs text-muted-foreground">
                                          <span className="material-icons mr-1 text-xs">image</span>
                                          {allImages.length}
                                        </div>
                                      </div>
                                    );
                                  })()}
                                </td>
                                <td className="p-4" data-testid={`text-design-budget-${designId}`}>
                                  {designData.budgetRange || 'Not specified'}
                                </td>
                                <td className="p-4">
                                  <Badge className={`${getStatusColor(designData.status)} text-xs`} data-testid={`badge-design-status-${designId}`}>
                                    {getStatusLabel(designData.status)}
                                  </Badge>
                                </td>
                                <td className="p-4" data-testid={`text-design-quote-${designId}`}>
                                  {designData.quoteAmount 
                                    ? `R ${parseFloat(designData.quoteAmount).toLocaleString()}`
                                    : 'Not quoted'
                                  }
                                </td>
                                <td className="p-4" data-testid={`text-design-date-${designId}`}>
                                  {new Date(designData.createdAt).toLocaleDateString()}
                                </td>
                                <td className="p-4">
                                  <div className="flex space-x-2">
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      onClick={() => viewDesignDetails(design)}
                                      data-testid={`button-view-design-${designId}`}
                                    >
                                      <span className="material-icons text-sm">visibility</span>
                                    </Button>
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => openUpdateDialog(design)}
                                      data-testid={`button-update-design-${designId}`}
                                    >
                                      <span className="material-icons text-sm">edit</span>
                                    </Button>
                                  </div>
                                </td>
                              </tr>
                            );
                          });
                        })()}
                      </tbody>
                    </table>
                  </div>
                );
              }
              
              // Empty state
              console.log('=== DISPLAYING EMPTY STATE ===');
              return (
                <div className="text-center py-12">
                  <div className="material-icons text-6xl text-muted-foreground mb-4">design_services</div>
                  <h3 className="text-xl font-medium mb-2" data-testid="text-no-designs-title">
                    No Custom Design Requests
                  </h3>
                  <p className="text-muted-foreground" data-testid="text-no-designs-description">
                    Custom design requests will appear here when customers submit them.
                  </p>
                </div>
              );
            })() as React.ReactNode}
          </CardContent>
        </Card>

        {/* Design Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-design-details-title">
                Custom Design Request - #{(() => {
                  const designData = selectedDesign?.custom_design_requests || selectedDesign;
                  return designData?.id || designData?.designId || 'Unknown';
                })()}
              </DialogTitle>
            </DialogHeader>
            
            {selectedDesign && (() => {
              // Handle both transformed and raw data formats
              const designData = selectedDesign.custom_design_requests || selectedDesign;
              const userData = selectedDesign.users || selectedDesign.user;
              
              if (!designData) return null;
              
              return (
                <div className="space-y-6">
                  {/* Request Header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-medium capitalize" data-testid={`text-detail-design-type-${designData.id}`}>
                        {designData.furnitureType}
                      </h3>
                      <p className="text-sm text-muted-foreground">
                        Submitted on {new Date(designData.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Badge className={`${getStatusColor(designData.status)}`}>
                        {getStatusLabel(designData.status)}
                      </Badge>
                      {designData.quoteAmount && (
                        <Badge variant="outline">
                          R {parseFloat(designData.quoteAmount).toLocaleString()}
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Customer and Design Information */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-medium mb-3">Customer Information</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Name:</strong> {userData?.name || 'Unknown'}</p>
                        <p><strong>Email:</strong> {userData?.email || 'Unknown'}</p>
                        <p><strong>Phone:</strong> {userData?.phone || 'Not provided'}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium mb-3">Design Specifications</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Furniture Type:</strong> {designData.furnitureType}</p>
                        <p><strong>Budget Range:</strong> {designData.budgetRange || 'Not specified'}</p>
                        <p><strong>Material:</strong> {designData.materialPreference || 'Not specified'}</p>
                        <p><strong>Color:</strong> {designData.colorPreference || 'Not specified'}</p>
                        {designData.dimensions && (
                          <p><strong>Dimensions:</strong> {designData.dimensions}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Special Requirements */}
                  {designData.specialRequirements && (
                    <div>
                      <h4 className="font-medium mb-2">Special Requirements</h4>
                      <div className="bg-muted p-4 rounded-lg">
                        <p className="text-sm whitespace-pre-line" data-testid={`text-detail-requirements-${designData.id}`}>
                          {designData.specialRequirements}
                        </p>
                      </div>
                    </div>
                  )}

                  {/* References (Images + Links) */}
                  {(Array.isArray(designData.referenceImages) && designData.referenceImages.length > 0) ||
                   (Array.isArray(designData.referenceLinks) && designData.referenceLinks.length > 0) ? (
                    <div>
                      <h4 className="font-medium mb-3">References</h4>
                      {(() => {
                        const uploads: string[] = Array.isArray(designData.referenceImages)
                          ? designData.referenceImages
                          : [];
                        const linksField: string[] = Array.isArray(designData.referenceLinks)
                          ? designData.referenceLinks
                          : [];
                      const isImageUrl = (u: string) => /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(u) || u.includes('res.cloudinary.com');
                      const imageLinks = linksField.filter(isImageUrl);
                      const otherLinks = linksField.filter((u) => !isImageUrl(u));
                      const imagesOnly: string[] = [...uploads, ...imageLinks];
                      return (
                        <>
                          {imagesOnly.length > 0 && (
                            <div>
                              <div className="flex items-center justify-between mb-3">
                                <h5 className="font-medium text-sm">Reference Images ({imagesOnly.length})</h5>
                                <div className="flex items-center text-xs text-muted-foreground">
                                  <span className="material-icons mr-1 text-xs">info</span>
                                  Click to view full size
                                </div>
                              </div>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                                {imagesOnly.map((image: string, index: number) => (
                                  <div 
                                    key={index}
                                    className="relative group cursor-pointer bg-gray-50 rounded-lg overflow-hidden border hover:shadow-lg transition-shadow"
                                    onClick={() => window.open(image, '_blank')}
                                  >
                                    <img
                                      src={image}
                                      alt={`Reference ${index + 1}`}
                                      className="w-full h-32 object-cover group-hover:scale-105 transition-transform duration-200"
                                      data-testid={`img-reference-${designData.id}-${index}`}
                                      onError={(e) => {
                                        e.currentTarget.src = '/placeholder-image.png';
                                        e.currentTarget.alt = 'Image not available';
                                      }}
                                    />
                                    <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-20 transition-all duration-200 flex items-center justify-center">
                                      <span className="material-icons text-white opacity-0 group-hover:opacity-100 transition-opacity">
                                        zoom_in
                                      </span>
                                    </div>
                                    <div className="absolute bottom-1 right-1 bg-black bg-opacity-70 text-white text-xs px-2 py-1 rounded">
                                      {index + 1}
                                    </div>
                                  </div>
                                ))}
                              </div>
                              {imagesOnly.some(img => img.includes('res.cloudinary.com')) && (
                                <div className="flex items-center text-xs text-green-600 bg-green-50 border border-green-200 rounded px-2 py-1 w-fit">
                                  <span className="material-icons mr-1 text-xs">cloud_done</span>
                                  Images stored in cloud storage
                                </div>
                              )}
                            </div>
                          )}
                          {otherLinks.length > 0 && (
                            <div>
                              <h5 className="font-medium mb-2">Reference Links</h5>
                              <ul className="list-disc pl-6 space-y-1 text-sm">
                                {otherLinks.map((link: string, idx: number) => (
                                  <li key={idx}>
                                    <a href={link} target="_blank" rel="noopener noreferrer" className="text-primary underline break-all">
                                      {link}
                                    </a>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                ) : null}

                  {/* Quick Actions */}
                  <div className="flex gap-2 pt-4 border-t">
                    <Button 
                      variant="default"
                      onClick={() => {
                        setIsDetailsDialogOpen(false);
                        openUpdateDialog(selectedDesign);
                      }}
                      data-testid={`button-update-from-details-${designData.id}`}
                    >
                      <span className="material-icons mr-2">edit</span>
                      Update Status
                    </Button>
                    
                    <Button 
                      variant="outline"
                      onClick={() => {
                        const email = userData?.email;
                        if (email) {
                          window.location.href = `mailto:${email}?subject=Re: Custom Design Request #${designData.id}`;
                        }
                      }}
                      disabled={!userData?.email}
                      data-testid={`button-email-customer-${designData.id}`}
                    >
                      <span className="material-icons mr-2">email</span>
                      Email Customer
                    </Button>
                  </div>
                </div>
              );
            })()}
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle data-testid="text-update-design-status-title">
                Update Design Status - #{(() => {
                  const designData = selectedDesign?.custom_design_requests || selectedDesign;
                  return designData?.id || designData?.designId || 'Unknown';
                })()}
              </DialogTitle>
            </DialogHeader>
            
            {selectedDesign && (() => {
              const designData = selectedDesign.custom_design_requests || selectedDesign;
              const userData = selectedDesign.users || selectedDesign.user;
              
              if (!designData) {
                return (
                  <div className="text-center py-4">
                    <p className="text-red-600">Error: Design request data is missing or corrupted.</p>
                  </div>
                );
              }
              
              return (
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <div className="mb-4">
                      <h4 className="font-medium">{designData.furnitureType}</h4>
                      <p className="text-sm text-muted-foreground">
                        Customer: {userData?.name || 'Unknown Customer'}
                      </p>
                    </div>

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Status *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-design-status">
                                <SelectValue placeholder="Select status" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {designStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="quoteAmount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Quote Amount (R)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="Enter quote amount"
                              {...field}
                              data-testid="input-quote-amount"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div className="flex gap-4 pt-4">
                      <Button
                        type="submit"
                        className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                        disabled={updateDesignStatusMutation.isPending}
                        data-testid="button-save-design-status"
                      >
                        {updateDesignStatusMutation.isPending ? (
                          <>
                            <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                            Updating...
                          </>
                        ) : (
                          <>
                            <span className="material-icons mr-2">save</span>
                            Update Status
                          </>
                        )}
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setIsUpdateDialogOpen(false)}
                        data-testid="button-cancel-design-status"
                      >
                        Cancel
                      </Button>
                    </div>
                  </form>
                </Form>
              );
            })()}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}