import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useDispatch } from "react-redux";
import { addToCart } from "@/store/cartSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";

export default function ProductDetail() {
  const { id } = useParams();
  const [, setLocation] = useLocation();
  const dispatch = useDispatch();
  const { toast } = useToast();
  const [quantity, setQuantity] = useState(1);
  const [customNotes, setCustomNotes] = useState("");
  const [selectedImage, setSelectedImage] = useState(0);

  const { data: product, isLoading, error } = useQuery({
    queryKey: ['/api/products', id],
    queryFn: async () => {
      const response = await fetch(`/api/products/${id}`);
      if (!response.ok) throw new Error('Product not found');
      return response.json();
    },
  });

  const handleAddToCart = () => {
    if (!product) return;

    dispatch(addToCart({
      cartItemId: Date.now(),
      prodId: product.prodId,
      name: product.name,
      price: product.price,
      quantity,
      customNotes,
      mainImage: product.mainImage,
    }));

    toast({
      title: "Added to Cart",
      description: `${product.name} has been added to your cart.`,
    });
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="material-icons text-6xl text-muted-foreground mb-4">error_outline</div>
          <h1 className="text-2xl font-bold mb-2" data-testid="text-error-title">Product Not Found</h1>
          <p className="text-muted-foreground mb-4" data-testid="text-error-description">
            The product you're looking for doesn't exist or has been removed.
          </p>
          <Button onClick={() => setLocation('/products')} data-testid="button-back-to-products">
            Back to Products
          </Button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="py-12 px-4 md:px-8 lg:px-16">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div>
              <Skeleton className="w-full h-96 rounded-lg mb-4" />
              <div className="grid grid-cols-4 gap-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <Skeleton key={i} className="w-full h-20 rounded-lg" />
                ))}
              </div>
            </div>
            <div>
              <Skeleton className="h-8 w-3/4 mb-4" />
              <Skeleton className="h-6 w-1/4 mb-4" />
              <Skeleton className="h-4 w-full mb-2" />
              <Skeleton className="h-4 w-3/4 mb-6" />
              <Skeleton className="h-32 w-full mb-6" />
              <Skeleton className="h-12 w-32" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  const images = [product.mainImage, ...(product.galleryImages || [])].filter(Boolean);

  return (
    <div className="py-12 px-4 md:px-8 lg:px-16">
      <div className="max-w-6xl mx-auto">
        {/* Breadcrumb */}
        <nav className="mb-8" data-testid="breadcrumb">
          <ol className="flex items-center space-x-2 text-sm text-muted-foreground">
            <li>
              <Button variant="link" onClick={() => setLocation('/')} className="p-0 h-auto" data-testid="link-home">
                Home
              </Button>
            </li>
            <li>/</li>
            <li>
              <Button variant="link" onClick={() => setLocation('/products')} className="p-0 h-auto" data-testid="link-products">
                Products
              </Button>
            </li>
            <li>/</li>
            <li className="text-foreground">{product.name}</li>
          </ol>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Product Images */}
          <div>
            <div className="mb-4">
              <img
                src={images[selectedImage] || '/placeholder-image.jpg'}
                alt={product.name}
                className="w-full h-96 object-cover rounded-lg material-shadow"
                data-testid={`img-product-main`}
              />
            </div>
            {images.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {images.map((image, index) => (
                  <button
                    key={index}
                    onClick={() => setSelectedImage(index)}
                    className={`w-full h-20 rounded-lg overflow-hidden border-2 transition-colors ${
                      selectedImage === index ? 'border-primary' : 'border-border'
                    }`}
                    data-testid={`button-gallery-image-${index}`}
                  >
                    <img
                      src={image}
                      alt={`${product.name} view ${index + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Product Details */}
          <div>
            <h1 className="text-3xl font-bold mb-2" data-testid="text-product-name">
              {product.name}
            </h1>
            
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-bold text-primary" data-testid="text-product-price">
                R {parseFloat(product.price).toLocaleString()}
              </span>
              <Badge variant="secondary" className="capitalize" data-testid="badge-category">
                {product.category}
              </Badge>
            </div>

            <p className="text-muted-foreground mb-6" data-testid="text-product-description">
              {product.description}
            </p>

            {/* Product Specifications */}
            <div className="grid grid-cols-2 gap-4 mb-6">
              {product.material && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Material</h3>
                  <p data-testid="text-product-material">{product.material}</p>
                </div>
              )}
              {product.dimensions && (
                <div>
                  <h3 className="font-medium text-sm text-muted-foreground">Dimensions</h3>
                  <p data-testid="text-product-dimensions">{product.dimensions}</p>
                </div>
              )}
            </div>

            {/* Quantity Selection */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">Quantity</label>
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  disabled={quantity <= 1}
                  data-testid="button-decrease-quantity"
                >
                  <span className="material-icons text-sm">remove</span>
                </Button>
                <Input
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-20 text-center"
                  min="1"
                  data-testid="input-quantity"
                />
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setQuantity(quantity + 1)}
                  data-testid="button-increase-quantity"
                >
                  <span className="material-icons text-sm">add</span>
                </Button>
              </div>
            </div>

            {/* Custom Notes */}
            <div className="mb-6">
              <label className="block text-sm font-medium mb-2">
                Custom Notes (Optional)
              </label>
              <Textarea
                value={customNotes}
                onChange={(e) => setCustomNotes(e.target.value)}
                placeholder="Any special requirements or customization notes..."
                rows={3}
                data-testid="textarea-custom-notes"
              />
            </div>

            {/* Action Buttons */}
            <div className="space-y-4">
              <Button
                size="lg"
                className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleAddToCart}
                data-testid="button-add-to-cart"
              >
                <span className="material-icons mr-2">shopping_cart</span>
                Add to Cart
              </Button>
              
              <div className="grid grid-cols-2 gap-4">
                <Button
                  variant="outline"
                  onClick={() => setLocation('/inquiry')}
                  data-testid="button-ask-question"
                >
                  <span className="material-icons mr-2">help_outline</span>
                  Ask Question
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setLocation('/custom-design')}
                  data-testid="button-custom-design"
                >
                  <span className="material-icons mr-2">design_services</span>
                  Custom Design
                </Button>
              </div>
            </div>

            {/* Additional Info */}
            <div className="mt-8 pt-8 border-t border-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-primary">local_shipping</span>
                  <span>Free delivery in Cape Town</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-primary">build</span>
                  <span>Handcrafted quality</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className="material-icons text-primary">eco</span>
                  <span>Sustainable materials</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
