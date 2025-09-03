import { useState } from "react";
import { useLocation } from "wouter";
import { useDispatch } from "react-redux";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { loginSuccess } from "@/store/authSlice";
import { syncCartOnLogin } from "@/store/cartSlice";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(1, "Password is required"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function Login() {
  const [, setLocation] = useLocation();
  const dispatch = useDispatch();
  const { toast } = useToast();

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (data) => {
      // Store token first in localStorage
      localStorage.setItem('token', data.accessToken);
      localStorage.setItem('user', JSON.stringify(data.user || data.customer));
      console.log('[Login] Token saved to localStorage:', data.accessToken.substring(0, 10) + '...');
      
      // Then dispatch to Redux store
      dispatch(loginSuccess({
        user: { ...(data.user || data.customer), type: 'customer' },
        token: data.accessToken,
      }));
      
      // Sync cart after successful login
      dispatch(syncCartOnLogin());
      toast({
        title: "Login Successful",
        description: "Welcome back!",
      });
      setLocation('/');
    },
    onError: (error: any) => {
      let errorMessage = "Invalid email or password";
      if (error.message) {
        if (error.message.includes("No account found")) {
          errorMessage = "No account found for this email. Please register first.";
        } else {
          errorMessage = error.message;
        }
      }
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex items-center justify-center py-12 px-4 md:px-8 lg:px-16 bg-muted">
      <div className="w-full max-w-md">
        <Card className="material-shadow">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold text-primary" data-testid="text-login-title">
              Welcome Back
            </CardTitle>
            <p className="text-muted-foreground" data-testid="text-login-subtitle">
              Sign in to your account to continue
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
                      <FormLabel>Email Address</FormLabel>
                      <FormControl>
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          {...field}
                          data-testid="input-login-email"
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
                          placeholder="Enter your password"
                          {...field}
                          data-testid="input-login-password"
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
                  data-testid="button-login-submit"
                >
                  {loginMutation.isPending ? (
                    <>
                      <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                      Signing In...
                    </>
                  ) : (
                    <>
                      <span className="material-icons mr-2">login</span>
                      Sign In
                    </>
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                Don't have an account?{" "}
                <Link href="/register" className="text-primary hover:text-primary/80 font-medium" data-testid="link-register">
                  Sign up here
                </Link>
              </p>
            </div>

            <div className="mt-4 text-center">
              <Link href="/">
                <Button variant="ghost" className="text-muted-foreground" data-testid="button-back-home">
                  <span className="material-icons mr-2">arrow_back</span>
                  Back to Home
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Demo Account Info */}
        <Card className="mt-4 material-shadow bg-accent/10">
          <CardContent className="pt-6">
            <h3 className="font-medium mb-2" data-testid="text-demo-info-title">Demo Account</h3>
            <p className="text-sm text-muted-foreground">
              For testing purposes, you can create a new account or contact support for demo credentials.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
