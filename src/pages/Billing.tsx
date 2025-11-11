import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, ScanLine, Award, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import InvoiceDialog from "@/components/InvoiceDialog";
import BarcodeScanner from "@/components/BarcodeScanner";
import CustomerDialog from "@/components/CustomerDialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  gst: number;
}

const Billing = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "upi">("cash");
  const [isInvoiceOpen, setIsInvoiceOpen] = useState(false);
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [isCustomerDialogOpen, setIsCustomerDialogOpen] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [pointsToRedeem, setPointsToRedeem] = useState(0);
  const { user } = useAuth();

  useEffect(() => {
    fetchProducts();

    // Set up realtime subscription for product stock updates
    const channel = supabase
      .channel('billing-products')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'products'
        },
        (payload) => {
          setProducts(prev => 
            prev.map(p => p.id === payload.new.id ? payload.new : p)
          );
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*');

      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSearchProduct = async (query?: string) => {
    const searchTerm = query || searchQuery;
    
    if (!searchTerm) {
      toast.error("Please enter a product name or barcode");
      return;
    }

    const product = products.find(
      (p) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.barcode === searchTerm
    );

    if (product) {
      if (product.stock <= 0) {
        toast.error("Product out of stock");
        return;
      }
      addToCart(product);
      setSearchQuery("");
    } else {
      toast.error("Product not found");
    }
  };

  const addToCart = (product: any) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) {
        toast.error("Not enough stock available");
        return;
      }
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { 
        id: product.id,
        name: product.name,
        price: product.price,
        gst: product.gst || 0,
        quantity: 1 
      }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    const product = products.find(p => p.id === id);
    
    if (quantity < 1) {
      removeFromCart(id);
      return;
    }

    if (product && quantity > product.stock) {
      toast.error("Not enough stock available");
      return;
    }

    setCart(cart.map((item) => (item.id === id ? { ...item, quantity } : item)));
  };

  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const calculateGST = () => {
    return cart.reduce((sum, item) => {
      const itemTotal = item.price * item.quantity;
      return sum + (itemTotal * item.gst) / 100;
    }, 0);
  };

  const calculateTierDiscount = () => {
    if (!customer?.tier) return 0;
    const subtotal = calculateSubtotal();
    return (subtotal * customer.tier.discount_percentage) / 100;
  };

  const calculatePointsDiscount = () => {
    // 100 points = ₹10 discount
    return (pointsToRedeem / 100) * 10;
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const gst = calculateGST();
    const tierDiscount = calculateTierDiscount();
    const pointsDiscount = calculatePointsDiscount();
    return subtotal + gst - tierDiscount - pointsDiscount;
  };

  const calculatePointsEarned = () => {
    if (!customer) return 0;
    const multiplier = customer.tier?.points_multiplier || 1.0;
    const total = calculateTotal();
    // 1 point per ₹10 spent
    return Math.floor((total / 10) * multiplier);
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsInvoiceOpen(true);
  };

  const handleCompletePayment = async () => {
    if (!user) {
      toast.error("Please login to complete payment");
      return;
    }

    try {
      // Create sale record
      const { data: saleData, error: saleError } = await supabase
        .from('sales')
        .insert({
          cashier_id: user.id,
          customer_id: customer?.id || null,
          payment_method: paymentMethod,
          subtotal: calculateSubtotal(),
          gst_amount: calculateGST(),
          total: calculateTotal(),
        })
        .select()
        .single();

      if (saleError) throw saleError;

      // Create sale items (stock will be automatically reduced by trigger)
      const saleItems = cart.map(item => ({
        sale_id: saleData.id,
        product_id: item.id,
        product_name: item.name,
        quantity: item.quantity,
        price: item.price,
        gst: item.gst,
      }));

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems);

      if (itemsError) throw itemsError;

      // Handle loyalty transactions if customer exists
      if (customer) {
        // Redeem points if any
        if (pointsToRedeem > 0) {
          await supabase.from('loyalty_transactions').insert({
            customer_id: customer.id,
            sale_id: saleData.id,
            points_redeemed: pointsToRedeem,
            transaction_type: 'redeem',
            description: `Redeemed ${pointsToRedeem} points for sale ${saleData.id}`,
          });
        }

        // Award points
        const pointsEarned = calculatePointsEarned();
        if (pointsEarned > 0) {
          await supabase.from('loyalty_transactions').insert({
            customer_id: customer.id,
            sale_id: saleData.id,
            points_earned: pointsEarned,
            transaction_type: 'earn',
            description: `Earned ${pointsEarned} points from sale ${saleData.id}`,
          });
        }
      }

      toast.success("Payment completed successfully!");
      setCart([]);
      setCustomer(null);
      setPointsToRedeem(0);
      setIsInvoiceOpen(false);
      
      // Refresh products to get updated stock
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || "Failed to complete payment");
    }
  };

  const handleBarcodeScanned = (code: string) => {
    setSearchQuery(code);
    handleSearchProduct(code);
  };

  const paymentMethods = [
    { id: "cash", label: "Cash", icon: Banknote },
    { id: "card", label: "Card", icon: CreditCard },
    { id: "upi", label: "UPI", icon: Smartphone },
  ];

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Billing</h1>
            <p className="text-muted-foreground mt-1">Quick checkout for customers</p>
          </div>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Product Search</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search product by name or scan barcode..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyPress={(e) => e.key === "Enter" && handleSearchProduct()}
                    className="pl-10"
                  />
                </div>
                <Button variant="outline" onClick={() => setIsScannerOpen(true)}>
                  <ScanLine className="h-4 w-4 mr-2" />
                  Scan
                </Button>
                <Button onClick={() => handleSearchProduct()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5" />
                Shopping Cart
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="h-12 w-12 mx-auto mb-2 opacity-50" />
                  <p>Cart is empty. Add products to get started.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {cart.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05 }}
                      className="flex items-center justify-between p-4 bg-muted/30 rounded-lg"
                    >
                      <div className="flex-1">
                        <h4 className="font-semibold text-foreground">{item.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          ₹{item.price} × {item.quantity} + GST {item.gst}%
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            -
                          </Button>
                          <span className="w-8 text-center font-semibold">{item.quantity}</span>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            +
                          </Button>
                        </div>
                        <div className="text-right min-w-[80px]">
                          <p className="font-semibold text-primary">
                            ₹{(item.price * item.quantity).toFixed(2)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => removeFromCart(item.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Loyalty Customer Card */}
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Loyalty Customer
                </span>
                {customer && (
                  <Button variant="ghost" size="sm" onClick={() => setCustomer(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {customer ? (
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-semibold">{customer.name}</h3>
                      <p className="text-sm text-muted-foreground">{customer.phone}</p>
                    </div>
                    {customer.tier && (
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${customer.tier.color}20`,
                          color: customer.tier.color,
                          borderColor: customer.tier.color,
                        }}
                      >
                        {customer.tier.tier_name}
                      </Badge>
                    )}
                  </div>
                  
                  <Separator />
                  
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Available Points</span>
                      <span className="font-semibold">{customer.total_points}</span>
                    </div>
                    {customer.tier && customer.tier.discount_percentage > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Tier Discount</span>
                        <span className="font-semibold text-green-600">
                          {customer.tier.discount_percentage}%
                        </span>
                      </div>
                    )}
                    {cart.length > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Points to Earn</span>
                        <span className="font-semibold text-primary">
                          +{calculatePointsEarned()}
                        </span>
                      </div>
                    )}
                  </div>

                  {customer.total_points >= 100 && (
                    <div className="space-y-2 pt-2 border-t">
                      <Label className="text-sm">Redeem Points (100 pts = ₹10)</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          min="0"
                          max={Math.min(customer.total_points, Math.floor(calculateTotal() * 10))}
                          step="100"
                          value={pointsToRedeem}
                          onChange={(e) => setPointsToRedeem(Math.min(parseInt(e.target.value) || 0, customer.total_points))}
                          placeholder="0"
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setPointsToRedeem(Math.min(customer.total_points, Math.floor(calculateTotal() * 10)))}
                        >
                          Max
                        </Button>
                      </div>
                      {pointsToRedeem > 0 && (
                        <p className="text-xs text-green-600">
                          -₹{calculatePointsDiscount().toFixed(2)} discount
                        </p>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <Button variant="outline" className="w-full" onClick={() => setIsCustomerDialogOpen(true)}>
                  <Award className="h-4 w-4 mr-2" />
                  Add Loyalty Customer
                </Button>
              )}
            </CardContent>
          </Card>

          {/* Payment Summary Card */}
          <Card className="border-border/50 sticky top-6">
            <CardHeader>
              <CardTitle>Payment Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-medium">₹{calculateSubtotal().toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">GST</span>
                  <span className="font-medium">₹{calculateGST().toFixed(2)}</span>
                </div>
                {customer?.tier && calculateTierDiscount() > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Tier Discount</span>
                    <span className="font-medium text-green-600">-₹{calculateTierDiscount().toFixed(2)}</span>
                  </div>
                )}
                {pointsToRedeem > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Points Discount</span>
                    <span className="font-medium text-green-600">-₹{calculatePointsDiscount().toFixed(2)}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="font-semibold">Total</span>
                  <span className="text-2xl font-bold text-primary">
                    ₹{calculateTotal().toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">Payment Method</p>
                <div className="grid grid-cols-3 gap-2">
                  {paymentMethods.map((method) => (
                    <Button
                      key={method.id}
                      variant={paymentMethod === method.id ? "default" : "outline"}
                      className="flex flex-col h-auto py-3"
                      onClick={() => setPaymentMethod(method.id as typeof paymentMethod)}
                    >
                      <method.icon className="h-5 w-5 mb-1" />
                      <span className="text-xs">{method.label}</span>
                    </Button>
                  ))}
                </div>
              </div>

              <Button
                onClick={handleCheckout}
                className="w-full"
                size="lg"
                disabled={cart.length === 0}
              >
                Complete Payment
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <InvoiceDialog
        open={isInvoiceOpen}
        onOpenChange={setIsInvoiceOpen}
        cart={cart}
        subtotal={calculateSubtotal()}
        gst={calculateGST()}
        total={calculateTotal()}
        paymentMethod={paymentMethod}
        onComplete={handleCompletePayment}
      />

      <BarcodeScanner
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScan={handleBarcodeScanned}
      />

      <CustomerDialog
        open={isCustomerDialogOpen}
        onOpenChange={setIsCustomerDialogOpen}
        onSelectCustomer={setCustomer}
      />
    </DashboardLayout>
  );
};

export default Billing;
