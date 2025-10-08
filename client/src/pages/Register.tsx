import { useState } from "react";
import { useLocation } from "wouter";
import { useDispatch } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSuccess } from "@/store/authSlice";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  phone: z.string().max(50, "Phone number is too long").optional(),
  address: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function Register() {
  const [, setLocation] = useLocation();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const form = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
      phone: "",
      address: "",
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: RegisterFormData) => {
      console.log('[Register] Attempting registration with data:', { ...data, password: '***', confirmPassword: '***' });
      const { confirmPassword, ...registrationData } = data;
      
      try {
        const response = await apiRequest('POST', '/api/auth/register', registrationData);
        const result = await response.json();
        console.log('[Register] Registration successful:', result);
        return result;
      } catch (error) {
        console.error('[Register] Registration failed:', error);
        throw error;
      }
    },
    onSuccess: (data) => {
      console.log('[Register] Processing successful registration:', data);
      
      // Store token and user data - handle both token and accessToken
      const token = data.token || data.accessToken;
      if (token) {
        localStorage.setItem('token', token);
      }
      
      if (data.user || data.customer) {
        const userData = data.user || data.customer;
        localStorage.setItem('user', JSON.stringify(userData));
        
        dispatch(loginSuccess({
          user: { ...userData, type: 'customer' },
          token,
        }));
      }
      
      toast({
        title: "Registration Successful",
        description: "Welcome to The Uncommon Room!",
      });
      setLocation('/');
    },
    onError: (error: any) => {
      console.error('[Register] Registration error:', error);
      let errorMessage = "Failed to create account";
      
      if (error.message) {
        if (error.message.includes("Email already registered")) {
          errorMessage = "This email is already registered. Please try logging in instead.";
        } else if (error.message.includes("too long")) {
          errorMessage = "One of the fields is too long. Please check your phone number.";
        } else if (error.message.includes("fetch")) {
          errorMessage = "Network error. Please check your connection and try again.";
        } else {
          errorMessage = error.message;
        }
      }
      
      toast({
        title: "Registration Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: RegisterFormData) => {
    registerMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 md:px-8 lg:px-16 bg-muted">
      <div className="w-full max-w-md">
        <Card className="material-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary" data-testid="text-register-title">
              Create Account
            </CardTitle>
            <p className="text-muted-foreground" data-testid="text-register-subtitle">
              Join us to start your custom furniture journey
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
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
                          data-testid="input-register-name"
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
                          data-testid="input-register-email"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+27 XX XXX XXXX"
                          {...field}
                          data-testid="input-register-phone"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder="Your address for delivery..."
                          rows={2}
                          {...field}
                          data-testid="textarea-register-address"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Create a password (min 6 characters)"
                          {...field}
                          data-testid="input-register-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password *</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Confirm your password"
                          {...field}
                          data-testid="input-register-confirm-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={registerMutation.isPending}
                  data-testid="button-register-submit"
                >
                  {registerMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                      Creating Account...
                    </>
                  ) : (
                    <>
                      <span className="material-icons mr-2">person_add</span>
                      Create Account
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Already have an account?{" "}
                <Link href="/login" className="text-primary hover:text-primary/80 font-medium" data-testid="link-login">
                  Sign in here
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="ghost" className="text-muted-foreground" data-testid="button-back-home-register">
                  <span className="material-icons mr-2">arrow_back</span>
                  Back to Home
                </Button>
              </Link>
            </div>

            <div className="mt-4 text-xs text-muted-foreground text-center">
              By creating an account, you agree to our Terms of Service and Privacy Policy.
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
