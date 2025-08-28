import { useDispatch } from "react-redux";
import { updateCartItem, removeFromCart } from "@/store/cartSlice";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

interface CartItemProps {
  item: {
    cartItemId: number;
    prodId: number;
    name: string;
    price: string;
    quantity: number;
    customNotes?: string;
    mainImage?: string;
  };
}

export default function CartItem({ item }: CartItemProps) {
  const dispatch = useDispatch();

  const handleQuantityChange = (newQuantity: number) => {
    if (newQuantity > 0) {
      dispatch(updateCartItem({ 
        id: item.cartItemId, 
        quantity: newQuantity 
      }));
    }
  };

  const handleNotesChange = (notes: string) => {
    dispatch(updateCartItem({ 
      id: item.cartItemId, 
      quantity: item.quantity,
      customNotes: notes 
    }));
  };

  const handleRemove = () => {
    dispatch(removeFromCart(item.cartItemId));
  };

  return (
    <div className="bg-card rounded-lg material-shadow p-6" data-testid={`cart-item-${item.cartItemId}`}>
      <div className="flex flex-col md:flex-row gap-4">
        {item.mainImage && (
          <img 
            src={item.mainImage} 
            alt={item.name}
            className="w-full md:w-32 h-32 object-cover rounded-lg"
            data-testid={`img-cart-item-${item.cartItemId}`}
          />
        )}
        <div className="flex-1">
          <h3 className="font-medium text-lg mb-2" data-testid={`text-cart-item-name-${item.cartItemId}`}>
            {item.name}
          </h3>
          
          <div className="mb-3">
            <label className="block text-sm font-medium mb-1">Custom Notes:</label>
            <Textarea
              value={item.customNotes || ''}
              onChange={(e) => handleNotesChange(e.target.value)}
              placeholder="Any special requirements or customization notes..."
              rows={2}
              data-testid={`textarea-custom-notes-${item.cartItemId}`}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(item.quantity - 1)}
                disabled={item.quantity <= 1}
                data-testid={`button-decrease-quantity-${item.cartItemId}`}
              >
                <span className="material-icons text-sm">remove</span>
              </Button>
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => handleQuantityChange(parseInt(e.target.value) || 1)}
                className="w-16 text-center"
                min="1"
                data-testid={`input-quantity-${item.cartItemId}`}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuantityChange(item.quantity + 1)}
                data-testid={`button-increase-quantity-${item.cartItemId}`}
              >
                <span className="material-icons text-sm">add</span>
              </Button>
            </div>
            <div className="text-right">
              <p className="text-lg font-bold text-primary" data-testid={`text-cart-item-total-${item.cartItemId}`}>
                R {(parseFloat(item.price) * item.quantity).toLocaleString()}
              </p>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleRemove}
                data-testid={`button-remove-item-${item.cartItemId}`}
              >
                <span className="material-icons text-sm mr-1">delete</span>
                Remove
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
