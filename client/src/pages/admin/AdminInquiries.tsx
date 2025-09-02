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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const inquiryStatuses = [
  { value: 'new', label: 'New', color: 'bg-blue-100 text-blue-800' },
  { value: 'responded', label: 'Responded', color: 'bg-green-100 text-green-800' },
  { value: 'closed', label: 'Closed', color: 'bg-gray-100 text-gray-800' },
];

const inquiryTypes = [
  { value: 'general', label: 'General' },
  { value: 'product', label: 'Product' },
  { value: 'custom_design', label: 'Custom Design' },
  { value: 'quote', label: 'Quote' },
];

export default function AdminInquiries() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [selectedInquiry, setSelectedInquiry] = useState<any>(null);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);

  const { data: inquiries, isLoading } = useQuery({
    queryKey: ['/api/admin/inquiries'],
    enabled: isAuthenticated && user?.role === 'admin',
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admin/inquiries');
      if (!response.ok) throw new Error('Failed to fetch inquiries');
      return response.json();
    },
  });

  const updateInquiryStatusMutation = useMutation({
    mutationFn: async ({ inquiryId, status }: { inquiryId: number; status: string }) => {
      const response = await apiRequest('PUT', `/api/admin/inquiries/${inquiryId}/status`, { status });
      if (!response.ok) throw new Error('Failed to update inquiry status');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/inquiries'] });
      toast({
        title: "Inquiry Status Updated",
        description: "The inquiry status has been updated successfully.",
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

  const getStatusColor = (status: string) => {
    const statusObj = inquiryStatuses.find(s => s.value === status);
    return statusObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const statusObj = inquiryStatuses.find(s => s.value === status);
    return statusObj?.label || status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeLabel = (type: string) => {
    const typeObj = inquiryTypes.find(t => t.value === type);
    return typeObj?.label || type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'general':
        return 'bg-blue-100 text-blue-800';
      case 'product':
        return 'bg-green-100 text-green-800';
      case 'custom_design':
        return 'bg-purple-100 text-purple-800';
      case 'quote':
        return 'bg-orange-100 text-orange-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleStatusChange = (inquiryId: number, newStatus: string) => {
    updateInquiryStatusMutation.mutate({ inquiryId, status: newStatus });
  };

  const viewInquiryDetails = (inquiry: any) => {
    setSelectedInquiry(inquiry);
    setIsDetailsDialogOpen(true);
  };

  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-inquiries-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-inquiries-access-required-description">
            You need admin privileges to manage inquiries.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-inquiries-login-redirect">
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-inquiries-title">
            Inquiry Management
          </h1>
          <Button 
            variant="outline"
            onClick={() => setLocation('/admin/dashboard')}
            data-testid="button-back-to-dashboard-inquiries"
          >
            <span className="material-icons mr-2">dashboard</span>
            Dashboard
          </Button>
        </div>

        {/* Inquiries Table */}
        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-all-inquiries-title">All Inquiries</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-8 w-8" />
                  </div>
                ))}
              </div>
            ) : inquiries?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">ID</th>
                      <th className="text-left p-4 font-medium">Name</th>
                      <th className="text-left p-4 font-medium">Email</th>
                      <th className="text-left p-4 font-medium">Subject</th>
                      <th className="text-left p-4 font-medium">Type</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inquiries.map((inquiry: any) => (
                      <tr key={inquiry.inquiryId} className="border-b border-border" data-testid={`inquiry-row-${inquiry.inquiryId}`}>
                        <td className="p-4" data-testid={`text-inquiry-id-${inquiry.inquiryId}`}>
                          #{inquiry.inquiryId}
                        </td>
                        <td className="p-4" data-testid={`text-inquiry-name-${inquiry.inquiryId}`}>
                          {inquiry.name}
                        </td>
                        <td className="p-4" data-testid={`text-inquiry-email-${inquiry.inquiryId}`}>
                          {inquiry.email}
                        </td>
                        <td className="p-4 max-w-xs truncate" data-testid={`text-inquiry-subject-${inquiry.inquiryId}`}>
                          {inquiry.subject}
                        </td>
                        <td className="p-4">
                          <Badge className={`${getTypeColor(inquiry.inquiryType)} text-xs`} data-testid={`badge-inquiry-type-${inquiry.inquiryId}`}>
                            {getTypeLabel(inquiry.inquiryType)}
                          </Badge>
                        </td>
                        <td className="p-4">
                          <Select
                            value={inquiry.status}
                            onValueChange={(value) => handleStatusChange(inquiry.inquiryId, value)}
                            disabled={updateInquiryStatusMutation.isPending}
                          >
                            <SelectTrigger className="w-32" data-testid={`select-inquiry-status-${inquiry.inquiryId}`}>
                              <SelectValue>
                                <Badge className={`${getStatusColor(inquiry.status)} text-xs`}>
                                  {getStatusLabel(inquiry.status)}
                                </Badge>
                              </SelectValue>
                            </SelectTrigger>
                            <SelectContent>
                              {inquiryStatuses.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </td>
                        <td className="p-4" data-testid={`text-inquiry-date-${inquiry.inquiryId}`}>
                          {new Date(inquiry.createdAt).toLocaleDateString()}
                        </td>
                        <td className="p-4">
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => viewInquiryDetails(inquiry)}
                              data-testid={`button-view-inquiry-${inquiry.inquiryId}`}
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
                <div className="material-icons text-6xl text-muted-foreground mb-4">support_agent</div>
                <h3 className="text-xl font-medium mb-2" data-testid="text-no-inquiries-title">
                  No Inquiries Found
                </h3>
                <p className="text-muted-foreground" data-testid="text-no-inquiries-description">
                  Customer inquiries will appear here when they submit them.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Inquiry Details Dialog */}
        <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle data-testid="text-inquiry-details-title">
                Inquiry Details - #{selectedInquiry?.inquiryId}
              </DialogTitle>
            </DialogHeader>
            
            {selectedInquiry && (
              <div className="space-y-6">
                {/* Inquiry Header */}
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-medium" data-testid={`text-detail-inquiry-subject-${selectedInquiry.inquiryId}`}>
                      {selectedInquiry.subject}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Submitted on {new Date(selectedInquiry.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Badge className={`${getTypeColor(selectedInquiry.inquiryType)}`}>
                      {getTypeLabel(selectedInquiry.inquiryType)}
                    </Badge>
                    <Badge className={`${getStatusColor(selectedInquiry.status)}`}>
                      {getStatusLabel(selectedInquiry.status)}
                    </Badge>
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-medium mb-2">Contact Information</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Name:</strong> {selectedInquiry.name}</p>
                      <p><strong>Email:</strong> {selectedInquiry.email}</p>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-medium mb-2">Inquiry Details</h4>
                    <div className="space-y-1 text-sm">
                      <p><strong>Type:</strong> {getTypeLabel(selectedInquiry.inquiryType)}</p>
                      <p><strong>Status:</strong> {getStatusLabel(selectedInquiry.status)}</p>
                      {selectedInquiry.prodId && (
                        <p><strong>Related Product ID:</strong> #{selectedInquiry.prodId}</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Message */}
                <div>
                  <h4 className="font-medium mb-2">Message</h4>
                  <div className="bg-muted p-4 rounded-lg">
                    <p className="text-sm whitespace-pre-line" data-testid={`text-detail-inquiry-message-${selectedInquiry.inquiryId}`}>
                      {selectedInquiry.message}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    variant="default"
                    onClick={() => {
                      window.location.href = `mailto:${selectedInquiry.email}?subject=Re: ${selectedInquiry.subject}`;
                    }}
                    data-testid={`button-reply-inquiry-${selectedInquiry.inquiryId}`}
                  >
                    <span className="material-icons mr-2">reply</span>
                    Reply via Email
                  </Button>
                  
                  {selectedInquiry.status === 'new' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedInquiry.inquiryId, 'responded')}
                      data-testid={`button-mark-responded-${selectedInquiry.inquiryId}`}
                    >
                      <span className="material-icons mr-2">mark_email_read</span>
                      Mark as Responded
                    </Button>
                  )}
                  
                  {selectedInquiry.status !== 'closed' && (
                    <Button 
                      variant="outline"
                      onClick={() => handleStatusChange(selectedInquiry.inquiryId, 'closed')}
                      data-testid={`button-close-inquiry-${selectedInquiry.inquiryId}`}
                    >
                      <span className="material-icons mr-2">close</span>
                      Close Inquiry
                    </Button>
                  )}
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
