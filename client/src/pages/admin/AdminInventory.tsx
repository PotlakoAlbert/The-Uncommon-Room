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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const updateStockSchema = z.object({
  quantity: z.string().min(1, "Quantity is required").transform(Number),
});

type UpdateStockFormData = z.infer<typeof updateStockSchema>;

export default function AdminInventory() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);

  const form = useForm<UpdateStockFormData>({
    resolver: zodResolver(updateStockSchema),
    defaultValues: {
      quantity: 0,
    },
  });

  const { data: inventory, isLoading } = useQuery({
    queryKey: ['/api/admin/inventory'],
    enabled: isAuthenticated && user?.type === 'admin',
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/admin/inventory', {
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to fetch inventory');
      return response.json();
    },
  });

  const updateStockMutation = useMutation({
    mutationFn: async ({ prodId, quantity }: { prodId: number; quantity: number }) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/inventory/${prodId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ quantity }),
      });
      if (!response.ok) throw new Error('Failed to update inventory');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/admin/inventory'] });
      form.reset();
      setIsUpdateDialogOpen(false);
      setSelectedProduct(null);
      toast({
        title: "Inventory Updated",
        description: "Stock quantity has been updated successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Update Inventory",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const openUpdateDialog = (inventoryItem: any) => {
    setSelectedProduct(inventoryItem);
    form.setValue('quantity', inventoryItem.inventory?.quantity || 0);
    setIsUpdateDialogOpen(true);
  };

  const onSubmit = (data: UpdateStockFormData) => {
    if (!selectedProduct) return;
    updateStockMutation.mutate({
      prodId: selectedProduct.products.prodId,
      quantity: data.quantity,
    });
  };

  const getStockStatus = (quantity: number) => {
    if (quantity === 0) return { label: 'Out of Stock', color: 'bg-red-100 text-red-800' };
    if (quantity <= 5) return { label: 'Low Stock', color: 'bg-yellow-100 text-yellow-800' };
    if (quantity <= 10) return { label: 'Medium Stock', color: 'bg-orange-100 text-orange-800' };
    return { label: 'In Stock', color: 'bg-green-100 text-green-800' };
  };

  if (!isAuthenticated || user?.type !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-inventory-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-inventory-access-required-description">
            You need admin privileges to manage inventory.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-inventory-login-redirect">
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
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-inventory-title">
            Inventory Management
          </h1>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setLocation('/admin/dashboard')}
              data-testid="button-back-to-dashboard-inventory"
            >
              <span className="material-icons mr-2">dashboard</span>
              Dashboard
            </Button>
            <Button 
              onClick={() => setLocation('/admin/products')}
              data-testid="button-manage-products-inventory"
            >
              <span className="material-icons mr-2">category</span>
              Manage Products
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        {!isLoading && inventory && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-primary/10 rounded-lg">
                    <span className="material-icons text-primary">inventory</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Total Products</p>
                    <p className="text-2xl font-bold" data-testid="text-total-products-inventory">
                      {inventory.length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <span className="material-icons text-red-600">warning</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Out of Stock</p>
                    <p className="text-2xl font-bold text-red-600" data-testid="text-out-of-stock-count">
                      {inventory.filter((item: any) => (item.inventory?.quantity || 0) === 0).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <span className="material-icons text-yellow-600">trending_down</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Low Stock</p>
                    <p className="text-2xl font-bold text-yellow-600" data-testid="text-low-stock-count">
                      {inventory.filter((item: any) => {
                        const qty = item.inventory?.quantity || 0;
                        return qty > 0 && qty <= 5;
                      }).length}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="material-shadow">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-3 bg-green-100 rounded-lg">
                    <span className="material-icons text-green-600">trending_up</span>
                  </div>
                  <div className="ml-4">
                    <p className="text-sm text-muted-foreground">Total Stock</p>
                    <p className="text-2xl font-bold text-green-600" data-testid="text-total-stock-count">
                      {inventory.reduce((total: number, item: any) => total + (item.inventory?.quantity || 0), 0)}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Inventory Table */}
        <Card className="material-shadow">
          <CardHeader>
            <CardTitle data-testid="text-inventory-list-title">Product Inventory</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border rounded">
                    <Skeleton className="w-16 h-16 rounded" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-8 w-24" />
                  </div>
                ))}
              </div>
            ) : inventory?.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-4 font-medium">Product</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Price</th>
                      <th className="text-left p-4 font-medium">Stock Quantity</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">Last Updated</th>
                      <th className="text-left p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventory.map((item: any) => {
                      const product = item.products;
                      const stock = item.inventory;
                      const quantity = stock?.quantity || 0;
                      const status = getStockStatus(quantity);
                      
                      return (
                        <tr key={product.prodId} className="border-b border-border" data-testid={`inventory-row-${product.prodId}`}>
                          <td className="p-4">
                            <div className="flex items-center space-x-3">
                              {product.mainImage && (
                                <img 
                                  src={product.mainImage} 
                                  alt={product.name}
                                  className="w-12 h-12 object-cover rounded"
                                />
                              )}
                              <div>
                                <h4 className="font-medium" data-testid={`text-product-name-inventory-${product.prodId}`}>
                                  {product.name}
                                </h4>
                                <p className="text-sm text-muted-foreground">
                                  ID: {product.prodId}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="p-4">
                            <Badge variant="outline" className="capitalize" data-testid={`badge-category-inventory-${product.prodId}`}>
                              {product.category}
                            </Badge>
                          </td>
                          <td className="p-4" data-testid={`text-price-inventory-${product.prodId}`}>
                            R {parseFloat(product.price).toLocaleString()}
                          </td>
                          <td className="p-4">
                            <span className="text-lg font-medium" data-testid={`text-quantity-inventory-${product.prodId}`}>
                              {quantity}
                            </span>
                            <span className="text-sm text-muted-foreground ml-1">units</span>
                          </td>
                          <td className="p-4">
                            <Badge className={`${status.color} text-xs`} data-testid={`badge-status-inventory-${product.prodId}`}>
                              {status.label}
                            </Badge>
                          </td>
                          <td className="p-4" data-testid={`text-updated-inventory-${product.prodId}`}>
                            {stock?.lastUpdated 
                              ? new Date(stock.lastUpdated).toLocaleDateString()
                              : 'Never'
                            }
                          </td>
                          <td className="p-4">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => openUpdateDialog(item)}
                              data-testid={`button-update-stock-${product.prodId}`}
                            >
                              <span className="material-icons mr-1 text-sm">edit</span>
                              Update Stock
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-12">
                <div className="material-icons text-6xl text-muted-foreground mb-4">inventory_2</div>
                <h3 className="text-xl font-medium mb-2" data-testid="text-no-inventory-title">
                  No Inventory Data
                </h3>
                <p className="text-muted-foreground mb-4" data-testid="text-no-inventory-description">
                  Add products to start tracking inventory.
                </p>
                <Button onClick={() => setLocation('/admin/products')} data-testid="button-add-products-inventory">
                  Add Products
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Update Stock Dialog */}
        <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle data-testid="text-update-stock-title">
                Update Stock - {selectedProduct?.products?.name}
              </DialogTitle>
            </DialogHeader>
            
            {selectedProduct && (
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="flex items-center space-x-3 mb-4">
                    {selectedProduct.products.mainImage && (
                      <img 
                        src={selectedProduct.products.mainImage} 
                        alt={selectedProduct.products.name}
                        className="w-16 h-16 object-cover rounded"
                      />
                    )}
                    <div>
                      <h4 className="font-medium">{selectedProduct.products.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Current Stock: {selectedProduct.inventory?.quantity || 0} units
                      </p>
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="quantity"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>New Stock Quantity *</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            min="0"
                            placeholder="Enter quantity"
                            {...field}
                            data-testid="input-stock-quantity"
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
                      disabled={updateStockMutation.isPending}
                      data-testid="button-save-stock"
                    >
                      {updateStockMutation.isPending ? (
                        <>
                          <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                          Updating...
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-2">save</span>
                          Update Stock
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsUpdateDialogOpen(false)}
                      data-testid="button-cancel-stock"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
