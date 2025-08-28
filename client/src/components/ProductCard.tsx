import { Link } from "wouter";
import { useDispatch } from "react-redux";
import { addToCart } from "@/store/cartSlice";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

interface Product {
  prodId: number;
  name: string;
  description: string;
  price: string;
  category: string;
  mainImage?: string;
  material?: string;
}

interface ProductCardProps {
  product: Product;
}

export default function ProductCard({ product }: ProductCardProps) {
  const dispatch = useDispatch();
  const { toast } = useToast();

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      // In a real app, this would make an API call
      dispatch(addToCart({
        cartItemId: Date.now(), // Temporary ID
        prodId: product.prodId,
        name: product.name,
        price: product.price,
        quantity: 1,
        mainImage: product.mainImage,
      }));

      toast({
        title: "Added to Cart",
        description: `${product.name} has been added to your cart.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add item to cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Link href={`/products/${product.prodId}`}>
      <div className="bg-card rounded-lg material-shadow hover-lift transition-all cursor-pointer" data-testid={`card-product-${product.prodId}`}>
        {product.mainImage && (
          <img 
            src={product.mainImage} 
            alt={product.name}
            className="w-full h-48 object-cover rounded-t-lg"
            data-testid={`img-product-${product.prodId}`}
          />
        )}
        <div className="p-4">
          <h3 className="font-medium text-lg mb-2" data-testid={`text-product-name-${product.prodId}`}>
            {product.name}
          </h3>
          <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid={`text-product-description-${product.prodId}`}>
            {product.description}
          </p>
          {product.material && (
            <p className="text-xs text-muted-foreground mb-3" data-testid={`text-product-material-${product.prodId}`}>
              Material: {product.material}
            </p>
          )}
          <div className="flex justify-between items-center">
            <span className="text-xl font-bold text-primary" data-testid={`text-product-price-${product.prodId}`}>
              R {parseFloat(product.price).toLocaleString()}
            </span>
            <Button 
              onClick={handleAddToCart}
              className="bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
              data-testid={`button-add-to-cart-${product.prodId}`}
            >
              Add to Cart
            </Button>
          </div>
        </div>
      </div>
    </Link>
  );
}
