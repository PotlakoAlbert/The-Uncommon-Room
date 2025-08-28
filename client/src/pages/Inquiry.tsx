import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const inquirySchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  subject: z.string().min(1, "Subject is required"),
  message: z.string().min(10, "Message must be at least 10 characters"),
  inquiryType: z.enum(["general", "product", "custom_design", "quote"]),
});

type InquiryFormData = z.infer<typeof inquirySchema>;

export default function Inquiry() {
  const { toast } = useToast();

  const form = useForm<InquiryFormData>({
    resolver: zodResolver(inquirySchema),
    defaultValues: {
      name: "",
      email: "",
      subject: "",
      message: "",
      inquiryType: "general",
    },
  });

  const submitInquiryMutation = useMutation({
    mutationFn: async (data: InquiryFormData) => {
      const response = await apiRequest('POST', '/api/inquiries', data);
      return response.json();
    },
    onSuccess: () => {
      form.reset();
      toast({
        title: "Inquiry Sent Successfully",
        description: "Thank you for contacting us. We'll get back to you within 24 hours.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Send Inquiry",
        description: error.message || "Please try again later",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: InquiryFormData) => {
    submitInquiryMutation.mutate(data);
  };

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-4xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-4" data-testid="text-inquiry-title">
            Contact Us
          </h1>
          <p className="text-muted-foreground max-w-2xl mx-auto" data-testid="text-inquiry-description">
            Have a question about our furniture, need a quote, or want to discuss a custom design? 
            We'd love to hear from you. Send us a message and we'll get back to you soon.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Contact Form */}
          <Card className="material-shadow">
            <CardHeader>
              <CardTitle data-testid="text-inquiry-form-title">Send us a Message</CardTitle>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Enter your full name"
                              {...field}
                              data-testid="input-inquiry-name"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email Address *</FormLabel>
                          <FormControl>
                            <Input
                              type="email"
                              placeholder="your@email.com"
                              {...field}
                              data-testid="input-inquiry-email"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="inquiryType"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Inquiry Type *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-inquiry-type">
                                <SelectValue placeholder="Select inquiry type" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="general">General Question</SelectItem>
                              <SelectItem value="product">Product Information</SelectItem>
                              <SelectItem value="custom_design">Custom Design</SelectItem>
                              <SelectItem value="quote">Request Quote</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="subject"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Brief subject of your inquiry"
                              {...field}
                              data-testid="input-inquiry-subject"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Message *</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us more about your inquiry, requirements, or questions..."
                            rows={6}
                            {...field}
                            data-testid="textarea-inquiry-message"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    disabled={submitInquiryMutation.isPending}
                    data-testid="button-send-inquiry"
                  >
                    {submitInquiryMutation.isPending ? (
                      <>
                        <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                        Sending Message...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2">send</span>
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-contact-info-title">Contact Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <span className="material-icons text-primary mt-1">location_on</span>
                  <div>
                    <h3 className="font-medium">Address</h3>
                    <p className="text-muted-foreground" data-testid="text-contact-address">
                      Cape Town, South Africa
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="material-icons text-primary mt-1">phone</span>
                  <div>
                    <h3 className="font-medium">Phone</h3>
                    <p className="text-muted-foreground" data-testid="text-contact-phone">
                      +27 XX XXX XXXX
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="material-icons text-primary mt-1">email</span>
                  <div>
                    <h3 className="font-medium">Email</h3>
                    <p className="text-muted-foreground" data-testid="text-contact-email">
                      hello@theuncommonroom.co.za
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <span className="material-icons text-primary mt-1">camera_alt</span>
                  <div>
                    <h3 className="font-medium">Social Media</h3>
                    <p className="text-muted-foreground" data-testid="text-contact-instagram">
                      @theuncommonroom_za
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardHeader>
                <CardTitle data-testid="text-business-hours-title">Business Hours</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span>Monday - Friday</span>
                  <span className="text-muted-foreground">8:00 AM - 5:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Saturday</span>
                  <span className="text-muted-foreground">9:00 AM - 2:00 PM</span>
                </div>
                <div className="flex justify-between">
                  <span>Sunday</span>
                  <span className="text-muted-foreground">Closed</span>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow bg-accent/10">
              <CardContent className="pt-6">
                <div className="text-center">
                  <span className="material-icons text-primary text-4xl mb-2">schedule</span>
                  <h3 className="font-medium mb-2" data-testid="text-response-time-title">Quick Response</h3>
                  <p className="text-sm text-muted-foreground">
                    We typically respond to inquiries within 24 hours during business days.
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
