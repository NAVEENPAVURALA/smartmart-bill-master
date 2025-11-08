import { useState } from "react";
import { motion } from "framer-motion";
import { Search, Plus, Trash2, ShoppingCart, CreditCard, Banknote, Smartphone, ScanLine, Calculator as CalcIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import DashboardLayout from "@/components/DashboardLayout";
import InvoiceDialog from "@/components/InvoiceDialog";
import BarcodeScanner from "@/components/BarcodeScanner";
import Calculator from "@/components/Calculator";
import { toast } from "sonner";

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
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);

  // Mock product database with barcodes
  const mockProducts = [
    { id: "1", name: "Tata Salt", price: 25, gst: 5, barcode: "8901234567890" },
    { id: "2", name: "Amul Milk 1L", price: 60, gst: 5, barcode: "8901234567891" },
    { id: "3", name: "Fortune Oil 1L", price: 180, gst: 18, barcode: "8901234567892" },
    { id: "4", name: "Britannia Bread", price: 40, gst: 5, barcode: "8901234567893" },
    { id: "5", name: "Parle-G Biscuits", price: 10, gst: 12, barcode: "8901234567894" },
  ];

  const handleSearchProduct = (query?: string) => {
    const searchTerm = query || searchQuery;
    const product = mockProducts.find(
      (p) => 
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        p.id === searchTerm ||
        p.barcode === searchTerm
    );

    if (product) {
      addToCart(product);
      setSearchQuery("");
    } else {
      toast.error("Product not found");
    }
  };

  const addToCart = (product: { id: string; name: string; price: number; gst: number }) => {
    const existingItem = cart.find((item) => item.id === product.id);

    if (existingItem) {
      setCart(
        cart.map((item) =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        )
      );
    } else {
      setCart([...cart, { ...product, quantity: 1 }]);
    }
    toast.success(`${product.name} added to cart`);
  };

  const removeFromCart = (id: string) => {
    setCart(cart.filter((item) => item.id !== id));
  };

  const updateQuantity = (id: string, quantity: number) => {
    if (quantity < 1) {
      removeFromCart(id);
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

  const calculateTotal = () => {
    return calculateSubtotal() + calculateGST();
  };

  const handleCheckout = () => {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setIsInvoiceOpen(true);
  };

  const handleCompletePayment = () => {
    toast.success("Payment completed successfully!");
    setCart([]);
    setIsInvoiceOpen(false);
  };

  const handleBarcodeScanned = (code: string) => {
    setSearchQuery(code);
    handleSearchProduct(code);
    toast.success(`Barcode detected: ${code}`);
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
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Billing</h1>
              <p className="text-muted-foreground mt-1">Quick checkout for customers</p>
            </div>
            <Button 
              variant="outline" 
              onClick={() => setIsCalculatorOpen(true)}
              className="gap-2"
            >
              <CalcIcon className="h-4 w-4" />
              Calculator
            </Button>
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

      <Calculator
        isOpen={isCalculatorOpen}
        onClose={() => setIsCalculatorOpen(false)}
      />
    </DashboardLayout>
  );
};

export default Billing;
