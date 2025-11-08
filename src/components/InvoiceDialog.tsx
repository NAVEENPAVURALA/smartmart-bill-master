import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Printer } from "lucide-react";

interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
  gst: number;
}

interface InvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  cart: CartItem[];
  subtotal: number;
  gst: number;
  total: number;
  paymentMethod: string;
  onComplete: () => void;
}

const InvoiceDialog = ({
  open,
  onOpenChange,
  cart,
  subtotal,
  gst,
  total,
  paymentMethod,
  onComplete,
}: InvoiceDialogProps) => {
  const invoiceNumber = `INV-${Date.now()}`;
  const date = new Date().toLocaleDateString();
  const time = new Date().toLocaleTimeString();

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Invoice</DialogTitle>
        </DialogHeader>

        <div id="invoice-content" className="space-y-6 print:p-8">
          {/* Header */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-primary">SmartMart</h1>
            <p className="text-sm text-muted-foreground">
              123 Market Street, City Center, PIN: 123456
            </p>
            <p className="text-sm text-muted-foreground">GSTIN: 27AABCU9603R1ZM</p>
          </div>

          <Separator />

          {/* Invoice Details */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="font-semibold">Invoice No:</p>
              <p className="text-muted-foreground">{invoiceNumber}</p>
            </div>
            <div className="text-right">
              <p className="font-semibold">Date & Time:</p>
              <p className="text-muted-foreground">
                {date} {time}
              </p>
            </div>
          </div>

          <Separator />

          {/* Items Table */}
          <div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">Item</th>
                  <th className="text-center py-2">Qty</th>
                  <th className="text-right py-2">Price</th>
                  <th className="text-right py-2">GST</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {cart.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.name}</td>
                    <td className="text-center py-2">{item.quantity}</td>
                    <td className="text-right py-2">₹{item.price.toFixed(2)}</td>
                    <td className="text-right py-2">{item.gst}%</td>
                    <td className="text-right py-2">
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Subtotal:</span>
              <span>₹{subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>GST:</span>
              <span>₹{gst.toFixed(2)}</span>
            </div>
            <Separator />
            <div className="flex justify-between text-lg font-bold">
              <span>Total:</span>
              <span className="text-primary">₹{total.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm text-muted-foreground">
              <span>Payment Method:</span>
              <span className="uppercase">{paymentMethod}</span>
            </div>
          </div>

          <Separator />

          <div className="text-center text-sm text-muted-foreground">
            <p>Thank you for shopping with SmartMart!</p>
            <p>For queries, contact: support@smartmart.com</p>
          </div>
        </div>

        <div className="flex gap-2 print:hidden">
          <Button onClick={handlePrint} variant="outline" className="flex-1 gap-2">
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
          <Button onClick={onComplete} className="flex-1">
            Complete & New Sale
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoiceDialog;
