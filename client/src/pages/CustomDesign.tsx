import { useState } from "react";
import { useSelector } from "react-redux";
import { useLocation } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RootState } from "@/store/store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const customDesignSchema = z.object({
  furnitureType: z.string().min(1, "Furniture type is required"),
  dimensions: z.string().optional(),
  materialPreference: z.string().optional(),
  colorPreference: z.string().optional(),
  specialRequirements: z.string().optional(),
  budgetRange: z.string().optional(),
});

type CustomDesignFormData = z.infer<typeof customDesignSchema>;

export default function CustomDesign() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const { isAuthenticated, user } = useSelector((state: RootState) => state.auth);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const form = useForm<CustomDesignFormData>({
    resolver: zodResolver(customDesignSchema),
    defaultValues: {
      furnitureType: "",
      dimensions: "",
      materialPreference: "",
      colorPreference: "",
      specialRequirements: "",
      budgetRange: "",
    },
  });

  const submitDesignMutation = useMutation({
    mutationFn: async (data: CustomDesignFormData) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      // Add form fields
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      
      // Add files
      if (selectedFiles) {
        Array.from(selectedFiles).forEach((file) => {
          formData.append('images', file);
        });
      }

      const response = await fetch('/api/custom-designs', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to submit design request');
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      setSelectedFiles(null);
      toast({
        title: "Design Request Submitted",
        description: "Thank you! We'll review your request and get back to you within 2-3 business days with a quote.",
      });
      if (isAuthenticated) {
        setLocation('/orders');
      }
    },
    onError: (error: any) => {
      toast({
        title: "Submission Failed",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const onSubmit = (data: CustomDesignFormData) => {
    if (!isAuthenticated) {
      setLocation('/login');
      return;
    }
    submitDesignMutation.mutate(data);
  };

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-custom-design-title">
            Custom Design Request
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-custom-design-description">
            Have a unique vision? Let us bring your custom furniture ideas to life with our expert craftsmanship.
            Fill out the form below and we'll provide you with a personalized quote.
          </p>
        </div>

        {!isAuthenticated && (
          <Card className="material-shadow mb-8 bg-accent/10">
            <CardContent className="pt-6">
              <div className="flex items-center space-x-3">
                <span className="material-icons text-primary">info</span>
                <div>
                  <h3 className="font-medium">Login Required</h3>
                  <p className="text-sm text-muted-foreground">
                    Please log in to submit a custom design request. This helps us track your request and send updates.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-design-form-title">Design Request Form</CardTitle>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                {/* Personal Information */}
                {isAuthenticated && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-6 border-b border-border">
                    <div>
                      <label className="block text-sm font-medium mb-2">Full Name</label>
                      <Input 
                        value={user?.name || ''} 
                        disabled 
                        className="bg-muted"
                        data-testid="input-customer-name-readonly"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Email Address</label>
                      <Input 
                        value={user?.email || ''} 
                        disabled 
                        className="bg-muted"
                        data-testid="input-customer-email-readonly"
                      />
                    </div>
                  </div>
                )}

                {/* Design Specifications */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="furnitureType"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Furniture Type *</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-furniture-type">
                              <SelectValue placeholder="Select furniture type" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="headboard">Headboard</SelectItem>
                            <SelectItem value="dining-table">Dining Table</SelectItem>
                            <SelectItem value="coffee-table">Coffee Table</SelectItem>
                            <SelectItem value="chair">Chair/Seating</SelectItem>
                            <SelectItem value="storage">Storage/Cabinet</SelectItem>
                            <SelectItem value="desk">Desk</SelectItem>
                            <SelectItem value="bookshelf">Bookshelf</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="budgetRange"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Budget Range</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-budget-range">
                              <SelectValue placeholder="Select budget range" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="1000-3000">R 1,000 - R 3,000</SelectItem>
                            <SelectItem value="3000-5000">R 3,000 - R 5,000</SelectItem>
                            <SelectItem value="5000-10000">R 5,000 - R 10,000</SelectItem>
                            <SelectItem value="10000-20000">R 10,000 - R 20,000</SelectItem>
                            <SelectItem value="20000+">R 20,000+</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="dimensions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dimensions</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g., 200cm x 100cm x 75cm (L x W x H)"
                          {...field}
                          data-testid="input-dimensions"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="materialPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Material Preference</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-material-preference">
                              <SelectValue placeholder="Select material" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="oak">Oak</SelectItem>
                            <SelectItem value="pine">Pine</SelectItem>
                            <SelectItem value="mahogany">Mahogany</SelectItem>
                            <SelectItem value="cherry">Cherry</SelectItem>
                            <SelectItem value="bamboo">Bamboo</SelectItem>
                            <SelectItem value="metal">Metal</SelectItem>
                            <SelectItem value="mixed">Mixed Materials</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="colorPreference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Color Preference</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="e.g., Natural wood, Dark stain, White"
                            {...field}
                            data-testid="input-color-preference"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="specialRequirements"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Special Requirements</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Describe any special features, functionality, or design elements you'd like to include..."
                          rows={4}
                          {...field}
                          data-testid="textarea-special-requirements"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium mb-2">Reference Images</label>
                  <div className="border-2 border-dashed border-border rounded-lg p-6 text-center">
                    <span className="material-icons text-4xl text-muted-foreground mb-2">cloud_upload</span>
                    <p className="text-muted-foreground mb-2">Upload reference images or inspiration photos</p>
                    <input
                      type="file"
                      multiple
                      accept="image/*,.pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="file-upload"
                      data-testid="input-reference-images"
                    />
                    <label htmlFor="file-upload">
                      <Button type="button" variant="secondary" className="cursor-pointer" data-testid="button-choose-files">
                        Choose Files
                      </Button>
                    </label>
                    <p className="text-xs text-muted-foreground mt-2">
                      Supported: JPG, PNG, PDF (Max 10MB per file, up to 5 files)
                    </p>
                    {selectedFiles && selectedFiles.length > 0 && (
                      <div className="mt-3">
                        <p className="text-sm font-medium">Selected files:</p>
                        <ul className="text-sm text-muted-foreground">
                          {Array.from(selectedFiles).map((file, index) => (
                            <li key={index}>{file.name}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit Button */}
                <div className="text-center pt-4">
                  <Button
                    type="submit"
                    className="bg-primary text-primary-foreground px-8 py-3 rounded-md font-medium hover:bg-primary/90 transition-colors"
                    disabled={submitDesignMutation.isPending}
                    data-testid="button-submit-design-request"
                  >
                    {submitDesignMutation.isPending ? (
                      <>
                        <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                        Submitting Request...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2">design_services</span>
                        Submit Design Request
                      </>
                    )}
                  </Button>
                  <p className="text-sm text-muted-foreground mt-2">
                    We'll review your request and get back to you within 2-3 business days with a quote.
                  </p>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        {/* Process Overview */}
        <Card className="material-shadow mt-8">
          <CardHeader>
            <CardTitle data-testid="text-process-overview-title">Our Custom Design Process</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">chat</span>
                </div>
                <h3 className="font-medium mb-2">1. Consultation</h3>
                <p className="text-sm text-muted-foreground">We review your request and discuss your vision</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">calculate</span>
                </div>
                <h3 className="font-medium mb-2">2. Quote</h3>
                <p className="text-sm text-muted-foreground">We provide a detailed quote and timeline</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">build</span>
                </div>
                <h3 className="font-medium mb-2">3. Creation</h3>
                <p className="text-sm text-muted-foreground">Our craftsmen bring your design to life</p>
              </div>
              
              <div className="text-center">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center mx-auto mb-3">
                  <span className="material-icons">local_shipping</span>
                </div>
                <h3 className="font-medium mb-2">4. Delivery</h3>
                <p className="text-sm text-muted-foreground">We deliver and install your custom piece</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
