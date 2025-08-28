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
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  description: z.string().optional(),
  price: z.string().min(1, "Price is required"),
  category: z.enum(["headboards", "tables", "seating", "storage", "custom"]),
  material: z.string().optional(),
  dimensions: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function AdminProducts() {
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user, isAuthenticated } = useSelector((state: RootState) => state.auth);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<FileList | null>(null);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      name: "",
      description: "",
      price: "",
      category: "tables",
      material: "",
      dimensions: "",
    },
  });

  const { data: products, isLoading } = useQuery({
    queryKey: ['/api/products'],
    enabled: isAuthenticated && user?.type === 'admin',
  });

  const createProductMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      
      Object.entries(data).forEach(([key, value]) => {
        if (value) formData.append(key, value);
      });
      
      if (selectedFiles) {
        Array.from(selectedFiles).forEach((file) => {
          formData.append('images', file);
        });
      }

      const response = await fetch('/api/admin/products', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData,
      });

      if (!response.ok) throw new Error('Failed to create product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      form.reset();
      setSelectedFiles(null);
      setIsAddDialogOpen(false);
      toast({
        title: "Product Created",
        description: "The product has been added successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Create Product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: number) => {
      const token = localStorage.getItem('token');
      const response = await fetch(`/api/admin/products/${productId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (!response.ok) throw new Error('Failed to delete product');
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/products'] });
      toast({
        title: "Product Deleted",
        description: "The product has been removed successfully.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Failed to Delete Product",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSelectedFiles(event.target.files);
  };

  const onSubmit = (data: ProductFormData) => {
    createProductMutation.mutate(data);
  };

  const handleDeleteProduct = (productId: number) => {
    if (confirm('Are you sure you want to delete this product?')) {
      deleteProductMutation.mutate(productId);
    }
  };

  if (!isAuthenticated || user?.type !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">lock</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-admin-products-access-required-title">
            Admin Access Required
          </h1>
          <p className="text-muted-foreground mb-4" data-testid="text-admin-products-access-required-description">
            You need admin privileges to manage products.
          </p>
          <Button onClick={() => setLocation('/admin/login')} data-testid="button-admin-products-login-redirect">
            Go to Admin Login
          </Button>
        </div>
      </div>
    );
  }

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'headboards':
        return 'bg-blue-100 text-blue-800';
      case 'tables':
        return 'bg-green-100 text-green-800';
      case 'seating':
        return 'bg-purple-100 text-purple-800';
      case 'storage':
        return 'bg-orange-100 text-orange-800';
      case 'custom':
        return 'bg-pink-100 text-pink-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl md:text-3xl font-bold" data-testid="text-admin-products-title">
            Product Management
          </h1>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-add-product"
              >
                <span className="material-icons mr-2">add</span>
                Add Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle data-testid="text-add-product-title">Add New Product</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Product Name *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Enter product name"
                            {...field}
                            data-testid="input-product-name"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Product description..."
                            rows={3}
                            {...field}
                            data-testid="textarea-product-description"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="price"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Price (R) *</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.01"
                              placeholder="0.00"
                              {...field}
                              data-testid="input-product-price"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-product-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="headboards">Headboards</SelectItem>
                              <SelectItem value="tables">Tables</SelectItem>
                              <SelectItem value="seating">Seating</SelectItem>
                              <SelectItem value="storage">Storage</SelectItem>
                              <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="material"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Material</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., Oak, Pine, Metal"
                              {...field}
                              data-testid="input-product-material"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="dimensions"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dimensions</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g., 200cm x 100cm x 75cm"
                              {...field}
                              data-testid="input-product-dimensions"
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-2">Product Images</label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <span className="material-icons text-2xl text-muted-foreground mb-2">cloud_upload</span>
                      <p className="text-muted-foreground mb-2">Upload product images</p>
                      <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden"
                        id="product-images"
                        data-testid="input-product-images"
                      />
                      <label htmlFor="product-images">
                        <Button type="button" variant="secondary" className="cursor-pointer" data-testid="button-choose-product-images">
                          Choose Images
                        </Button>
                      </label>
                      <p className="text-xs text-muted-foreground mt-2">
                        First image will be the main image
                      </p>
                      {selectedFiles && selectedFiles.length > 0 && (
                        <div className="mt-2">
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

                  <div className="flex gap-4 pt-4">
                    <Button
                      type="submit"
                      className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90"
                      disabled={createProductMutation.isPending}
                      data-testid="button-create-product"
                    >
                      {createProductMutation.isPending ? (
                        <>
                          <span className="material-icons animate-spin mr-2">hourglass_empty</span>
                          Creating...
                        </>
                      ) : (
                        <>
                          <span className="material-icons mr-2">add</span>
                          Create Product
                        </>
                      )}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsAddDialogOpen(false)}
                      data-testid="button-cancel-product"
                    >
                      Cancel
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Products Grid */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, index) => (
              <Card key={index} className="material-shadow">
                <CardContent className="p-4">
                  <Skeleton className="w-full h-48 rounded-lg mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-full mb-3" />
                  <div className="flex justify-between items-center">
                    <Skeleton className="h-6 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : products?.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {products.map((product: any) => (
              <Card key={product.prodId} className="material-shadow" data-testid={`product-card-${product.prodId}`}>
                <CardContent className="p-4">
                  {product.mainImage && (
                    <img 
                      src={product.mainImage} 
                      alt={product.name}
                      className="w-full h-48 object-cover rounded-lg mb-4"
                      data-testid={`img-product-${product.prodId}`}
                    />
                  )}
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg" data-testid={`text-product-name-${product.prodId}`}>
                      {product.name}
                    </h3>
                    <Badge 
                      className={`${getCategoryColor(product.category)} text-xs`}
                      data-testid={`badge-product-category-${product.prodId}`}
                    >
                      {product.category}
                    </Badge>
                  </div>
                  
                  <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`text-product-description-${product.prodId}`}>
                    {product.description || 'No description available'}
                  </p>
                  
                  <div className="space-y-2 mb-4">
                    <div className="flex justify-between text-sm">
                      <span>Price:</span>
                      <span className="font-medium text-primary" data-testid={`text-product-price-${product.prodId}`}>
                        R {parseFloat(product.price).toLocaleString()}
                      </span>
                    </div>
                    {product.material && (
                      <div className="flex justify-between text-sm">
                        <span>Material:</span>
                        <span className="text-muted-foreground" data-testid={`text-product-material-${product.prodId}`}>
                          {product.material}
                        </span>
                      </div>
                    )}
                    {product.dimensions && (
                      <div className="flex justify-between text-sm">
                        <span>Dimensions:</span>
                        <span className="text-muted-foreground" data-testid={`text-product-dimensions-${product.prodId}`}>
                          {product.dimensions}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between text-sm">
                      <span>Status:</span>
                      <span className={`${product.active ? 'text-green-600' : 'text-red-600'}`} data-testid={`text-product-status-${product.prodId}`}>
                        {product.active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="flex-1"
                      onClick={() => setLocation(`/products/${product.prodId}`)}
                      data-testid={`button-view-product-${product.prodId}`}
                    >
                      <span className="material-icons mr-1 text-sm">visibility</span>
                      View
                    </Button>
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteProduct(product.prodId)}
                      disabled={deleteProductMutation.isPending}
                      data-testid={`button-delete-product-${product.prodId}`}
                    >
                      <span className="material-icons text-sm">delete</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="material-icons text-6xl text-muted-foreground mb-4">inventory_2</div>
            <h3 className="text-xl font-medium mb-2" data-testid="text-no-products-title">
              No Products Available
            </h3>
            <p className="text-muted-foreground mb-4" data-testid="text-no-products-description">
              Start by adding your first product to the catalog.
            </p>
            <Button 
              onClick={() => setIsAddDialogOpen(true)}
              data-testid="button-add-first-product"
            >
              Add Your First Product
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
