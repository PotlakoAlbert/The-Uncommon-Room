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

  const { data: customDesigns, isLoading } = useQuery({
    queryKey: ['/api/admin/custom-designs'],
    enabled: isAuthenticated && user?.role === 'admin',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/custom-designs');
      if (!response.ok) throw new Error('Failed to fetch custom designs');
      return response.json();
    },
  });

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
    setSelectedDesign(design);
    if (design.custom_design_requests) {
      form.setValue('status', design.custom_design_requests.status);
      form.setValue('quoteAmount', design.custom_design_requests.quoteAmount || '');
    }
    setIsUpdateDialogOpen(true);
  };

  const onSubmit = (data: UpdateDesignFormData) => {
    if (!selectedDesign || !selectedDesign.custom_design_requests) return;
    const designId = selectedDesign.custom_design_requests.id || selectedDesign.custom_design_requests.designId;
    if (!designId) {
      toast({
        title: "Error",
        description: "Could not determine design ID",
        variant: "destructive",
      });
      return;
    }
    updateDesignStatusMutation.mutate({
      designId,
      status: data.status,
      quoteAmount: data.quoteAmount,
    });
  };

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
        {!isLoading && customDesigns && (
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
                      {customDesigns.filter((item: any) => item.custom_design_requests && ['submitted', 'under_review'].includes(item.custom_design_requests.status)).length}
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
                      {customDesigns.filter((item: any) => item.custom_design_requests && item.custom_design_requests.status === 'approved').length}
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
                      {customDesigns.filter((item: any) => item.custom_design_requests && item.custom_design_requests.status === 'quoted').length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Custom Designs Table */}
        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-design-requests-title">Design Requests</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
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
            ) : customDesigns?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Request ID</th>
                      <th className="text-left p-4 font-medium">Customer</th>
                      <th className="text-left p-4 font-medium">Furniture Type</th>
                      <th className="text-left p-4 font-medium">Budget Range</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Quote Amount</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {customDesigns.filter((design: any) => design.custom_design_requests).map((design: any) => {
                      // Use id as the primary identifier, fall back to designId if id is not available
                      const designId = design.custom_design_requests.id || design.custom_design_requests.designId;
                      return (
                      <tr key={designId} className="border-b border-border" data-testid={`design-row-${designId}`}>
                        <td className="p-4" data-testid={`text-design-id-${designId}`}>
                          #{designId}
                        </td>
                        <td className="p-4" data-testid={`text-design-customer-${designId}`}>
                          {design.users?.name || design.customers?.name || 'Unknown'}
                        </td>
                        <td className="p-4 capitalize" data-testid={`text-design-type-${designId}`}>
                          {design.custom_design_requests.furnitureType}
                        </td>
                        <td className="p-4" data-testid={`text-design-budget-${designId}`}>
                          {design.custom_design_requests.budgetRange || 'Not specified'}
                        </td>
                        <td className="p-4">
                          <Badge className={`${getStatusColor(design.custom_design_requests.status)} text-xs`} data-testid={`badge-design-status-${designId}`}>
                            {getStatusLabel(design.custom_design_requests.status)}
                          </Badge>
                        </td>
                        <td className="p-4" data-testid={`text-design-quote-${designId}`}>
                          {design.custom_design_requests.quoteAmount 
                            ? `R ${parseFloat(design.custom_design_requests.quoteAmount).toLocaleString()}`
                            : 'Not quoted'
                          }
                        </td>
                        <td className="p-4" data-testid={`text-design-date-${designId}`}>
                          {new Date(design.custom_design_requests.createdAt).toLocaleDateString()}
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
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="material-icons text-6xl text-muted-foreground mb-4">design_services</div>
                <h3 className="text-xl font-medium mb-2" data-testid="text-no-designs-title">
                  No Custom Design Requests
                </h3>
                <p className="text-muted-foreground" data-testid="text-no-designs-description">
                  Custom design requests will appear here when customers submit them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Design Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-design-details-title">
                Custom Design Request - #{selectedDesign?.custom_design_requests?.id || selectedDesign?.custom_design_requests?.designId}
              </DialogTitle>
            </DialogHeader>
            
            {selectedDesign && selectedDesign.custom_design_requests && (
              <div className="space-y-6">
                {/* Request Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium capitalize" data-testid={`text-detail-design-type-${selectedDesign.custom_design_requests.designId}`}>
                      {selectedDesign.custom_design_requests.furnitureType}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {new Date(selectedDesign.custom_design_requests.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${getStatusColor(selectedDesign.custom_design_requests.status)}`}>
                      {getStatusLabel(selectedDesign.custom_design_requests.status)}
                    </Badge>
                    {selectedDesign.custom_design_requests.quoteAmount && (
                      <Badge variant="outline">
                        R {parseFloat(selectedDesign.custom_design_requests.quoteAmount).toLocaleString()}
                      </Badge>
                    )}
                  </div>
                </div>

                {/* Customer and Design Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h4 className="font-medium mb-3">Customer Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Name:</strong> {selectedDesign.users?.name || selectedDesign.customers?.name}</p>
                      <p><strong>Email:</strong> {selectedDesign.users?.email || selectedDesign.customers?.email}</p>
                      <p><strong>Phone:</strong> {selectedDesign.users?.phone || selectedDesign.customers?.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-3">Design Specifications</h4>
                    <div className="space-y-2 text-sm">
                      <p><strong>Furniture Type:</strong> {selectedDesign.custom_design_requests.furnitureType}</p>
                      <p><strong>Budget Range:</strong> {selectedDesign.custom_design_requests.budgetRange || 'Not specified'}</p>
                      <p><strong>Material:</strong> {selectedDesign.custom_design_requests.materialPreference || 'Not specified'}</p>
                      <p><strong>Color:</strong> {selectedDesign.custom_design_requests.colorPreference || 'Not specified'}</p>
                      {selectedDesign.custom_design_requests.dimensions && (
                        <p><strong>Dimensions:</strong> {selectedDesign.custom_design_requests.dimensions}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Special Requirements */}
                {selectedDesign.custom_design_requests.specialRequirements && (
                  <div>
                    <h4 className="font-medium mb-2">Special Requirements</h4>
                    <div className="bg-muted p-4 rounded-lg">
                      <p className="text-sm whitespace-pre-line" data-testid={`text-detail-requirements-${selectedDesign.custom_design_requests.designId}`}>
                        {selectedDesign.custom_design_requests.specialRequirements}
                      </p>
                    </div>
                  </div>
                )}

                {/* References (Images + Links) */}
                {(Array.isArray(selectedDesign.custom_design_requests.referenceImages) && selectedDesign.custom_design_requests.referenceImages.length > 0) ||
                 (Array.isArray(selectedDesign.custom_design_requests.referenceLinks) && selectedDesign.custom_design_requests.referenceLinks.length > 0) ? (
                  <div>
                    <h4 className="font-medium mb-3">References</h4>
                    {(() => {
                      const uploads: string[] = Array.isArray(selectedDesign.custom_design_requests.referenceImages)
                        ? selectedDesign.custom_design_requests.referenceImages
                        : [];
                      const linksField: string[] = Array.isArray(selectedDesign.custom_design_requests.referenceLinks)
                        ? selectedDesign.custom_design_requests.referenceLinks
                        : [];
                      const isImageUrl = (u: string) => /(\.png|\.jpg|\.jpeg|\.gif|\.webp|\.bmp|\.svg)(\?.*)?$/i.test(u) || u.includes('res.cloudinary.com');
                      const imageLinks = linksField.filter(isImageUrl);
                      const otherLinks = linksField.filter((u) => !isImageUrl(u));
                      const imagesOnly: string[] = [...uploads, ...imageLinks];
                      return (
                        <>
                          {imagesOnly.length > 0 && (
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
                              {imagesOnly.map((image: string, index: number) => (
                                <img
                                  key={index}
                                  src={image}
                                  alt={`Reference ${index + 1}`}
                                  className="w-full h-24 object-cover rounded border"
                                  data-testid={`img-reference-${selectedDesign.custom_design_requests.designId}-${index}`}
                                />
                              ))}
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
                    disabled={!selectedDesign?.custom_design_requests}
                    data-testid={`button-update-from-details-${selectedDesign?.custom_design_requests?.designId || 'unknown'}`}
                  >
                    <span className="material-icons mr-2">edit</span>
                    Update Status
                  </Button>
                  
                  <Button 
                    variant="outline"
                    onClick={() => {
                      const email = selectedDesign.users?.email || selectedDesign.customers?.email;
                      if (email && selectedDesign?.custom_design_requests?.designId) {
                        window.location.href = `mailto:${email}?subject=Re: Custom Design Request #${selectedDesign.custom_design_requests.designId}`;
                      }
                    }}
                    disabled={!selectedDesign?.custom_design_requests}
                    data-testid={`button-email-customer-${selectedDesign?.custom_design_requests?.designId || 'unknown'}`}
                  >
                    <span className="material-icons mr-2">email</span>
                    Email Customer
                  </Button>
                </div>
              </div>
            )}
            {selectedDesign && !selectedDesign.custom_design_requests && (
              <div className="text-center py-4">
                <p className="text-red-600">Error: Design request data is missing or corrupted.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>

        {/* Update Status Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle data-testid="text-update-design-status-title">
                Update Design Status - #{selectedDesign?.custom_design_requests?.id || selectedDesign?.custom_design_requests?.designId}
              </DialogTitle>
            </DialogHeader>
            
            {selectedDesign && selectedDesign.custom_design_requests && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="mb-4">
                    <h4 className="font-medium">{selectedDesign.custom_design_requests.furnitureType}</h4>
                    <p className="text-sm text-muted-foreground">
                      Customer: {selectedDesign.users?.name || selectedDesign.customers?.name}
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
            )}
            {selectedDesign && !selectedDesign.custom_design_requests && (
              <div className="text-center py-4">
                <p className="text-red-600">Error: Design request data is missing or corrupted.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
