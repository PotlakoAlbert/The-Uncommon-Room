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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

const adminLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type AdminLoginFormData = z.infer<typeof adminLoginSchema>;

export default function AdminLogin() {
  const [, setLocation] = useLocation();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const form = useForm<AdminLoginFormData>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: AdminLoginFormData) => {
      const response = await apiRequest('POST', '/api/admin/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      dispatch(loginSuccess({
        user: { ...data.admin, type: 'admin' },
        token: data.token,
      }));
      toast({
        title: "Admin Login Successful",
        description: "Welcome to the admin panel!",
      });
      setLocation('/admin/dashboard');
    },
    onError: (error: any) => {
      toast({
        title: "Admin Login Failed",
        description: error.message || "Invalid admin credentials",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminLoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 md:px-8 lg:px-16 bg-muted">
      <div className="w-full max-w-md">
        <Card className="material-shadow">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4">
              <span className="material-icons text-2xl">admin_panel_settings</span>
            </div>
            <CardTitle className="text-2xl font-bold text-primary" data-testid="text-admin-login-title">
              Admin Panel
            </CardTitle>
            <p className="text-muted-foreground" data-testid="text-admin-login-subtitle">
              Sign in to access the admin dashboard
            </p>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Admin Email</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="admin@theuncommonroom.co.za"
                          {...field}
                          data-testid="input-admin-email"
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
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input
                          type="password"
                          placeholder="Enter admin password"
                          {...field}
                          data-testid="input-admin-password"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  disabled={loginMutation.isPending}
                  data-testid="button-admin-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span className="material-icons mr-2">login</span>
                      Sign In to Admin Panel
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => setLocation('/')}
                className="text-muted-foreground"
                data-testid="button-back-to-site"
              >
                <span className="material-icons mr-2">arrow_back</span>
                Back to Main Site
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Security Notice */}
        <Card className="mt-4 material-shadow bg-destructive/10">
          <CardContent className="pt-6">
            <div className="flex items-center space-x-3">
              <span className="material-icons text-destructive">security</span>
              <div>
                <h3 className="font-medium text-destructive">Authorized Access Only</h3>
                <p className="text-sm text-muted-foreground">
                  This admin panel is restricted to authorized personnel only. All access is logged and monitored.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
