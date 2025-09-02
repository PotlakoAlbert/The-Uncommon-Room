import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient, QueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useAppSelector } from "@/store/hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";

const adminSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  phone: z.string().optional(),
  address: z.string().optional(),
});

type AdminFormData = z.infer<typeof adminSchema>;

interface Admin {
  adminId: number;
  name: string;
  email: string;
  phone?: string;
  address?: string;
}

export default function AdminManagement() {
  const [, setLocation] = useLocation();
  const { isAuthenticated, user } = useAppSelector(state => state.auth);
  const { toast } = useToast();
  const queryClient: QueryClient = useQueryClient();
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  // Form setup
  const form = useForm<z.infer<typeof adminSchema>>({
    resolver: zodResolver(adminSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
      phone: "",
      address: "",
    },
  });

  // Fetch admins
  const { data: admins, isLoading } = useQuery({
    queryKey: ['admins'] as const,
    queryFn: async () => {
      const response = await apiRequest('GET', '/api/admins');
      return response.json() as Promise<Admin[]>;
    },
  });

  // Add admin mutation
  const addAdminMutation = useMutation({
    mutationFn: async (data: AdminFormData) => {
      const response = await apiRequest('POST', '/api/admins', data);
      return response.json() as Promise<Admin>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      setIsAddAdminOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Admin has been added successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to add admin",
        variant: "destructive",
      });
    },
  });

  // Remove admin mutation
  const removeAdminMutation = useMutation({
    mutationFn: async (adminId: number) => {
      const response = await apiRequest('DELETE', `/api/admins/${adminId}`);
      await response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admins'] });
      toast({
        title: "Success",
        description: "Admin has been removed successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: error.message || "Failed to remove admin",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: AdminFormData) => {
    addAdminMutation.mutate(data);
  };

  // Check for admin access
  if (!isAuthenticated || user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4">
            You need admin privileges to manage administrators.
          </p>
          <Button onClick={() => setLocation('/admin/login')}>
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto space-y-8">
      <div className="flex flex-col space-y-8">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Admin Management</h1>
          <Dialog open={isAddAdminOpen} onOpenChange={setIsAddAdminOpen}>
            <DialogTrigger asChild>
              <Button>
                <span className="material-icons mr-2">person_add</span>
                Add Admin
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Admin</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Name</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter admin name" {...field} />
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
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter admin email" {...field} />
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
                          <Input type="password" placeholder="Enter admin password" {...field} />
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
                        <FormLabel>Phone (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} />
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
                        <FormLabel>Address (Optional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter address" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Button
                    type="submit"
                    className="w-full"
                    disabled={addAdminMutation.isPending}
                  >
                    {addAdminMutation.isPending ? (
                      <>
                        <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                        Adding Admin...
                      </>
                    ) : (
                      <>
                        <span className="material-icons mr-2">person_add</span>
                        Add Admin
                      </>
                    )}
                  </Button>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        <div>
          <Card>
            <CardHeader>
              <CardTitle>Administrators</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-4">
                  <div className="material-icons animate-spin">hourglass_empty</div>
                  <p className="text-muted-foreground mt-2">Loading administrators...</p>
                </div>
              ) : (
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {admins?.map((admin: Admin) => (
                    <TableRow key={admin.adminId}>
                      <TableCell>{admin.name}</TableCell>
                      <TableCell>{admin.email}</TableCell>
                      <TableCell>{admin.phone || '-'}</TableCell>
                      <TableCell>{admin.address || '-'}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to remove this admin?')) {
                              removeAdminMutation.mutate(admin.adminId);
                            }
                          }}
                          disabled={removeAdminMutation.isPending}
                        >
                          <span className="material-icons">person_remove</span>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}