import { forwardRef } from "react";

interface CartItem {
  name: string;
  price: number;
  quantity: number;
  gst: number;
}

interface ReceiptPrintProps {
  cart: CartItem[];
  subtotal: number;
  gst: number;
  discount: number;
  total: number;
  paymentMethod: string;
  customer?: any;
  cashierName?: string;
  invoiceNumber?: string;
}

const ReceiptPrint = forwardRef<HTMLDivElement, ReceiptPrintProps>((props, ref) => {
  const { cart, subtotal, gst, discount, total, paymentMethod, customer, cashierName, invoiceNumber } = props;

  return (
    <div ref={ref} className="p-8 bg-white text-black font-mono" style={{ width: "80mm" }}>
      <div className="text-center mb-4">
        <h1 className="text-2xl font-bold">SMARTMART</h1>
        <p className="text-sm">Retail Billing System</p>
        <p className="text-xs">123 Market Street, City</p>
        <p className="text-xs">Phone: +91 1234567890</p>
        <p className="text-xs">GSTIN: 29ABCDE1234F1Z5</p>
      </div>

      <div className="border-t-2 border-b-2 border-dashed border-black py-2 mb-2 text-xs">
        <div className="flex justify-between">
          <span>Invoice: {invoiceNumber || "INV-" + Date.now()}</span>
          <span>{new Date().toLocaleString()}</span>
        </div>
        {cashierName && (
          <div className="flex justify-between">
            <span>Cashier: {cashierName}</span>
          </div>
        )}
        {customer && (
          <div className="flex justify-between">
            <span>Customer: {customer.name}</span>
            <span>Points: {customer.total_points}</span>
          </div>
        )}
      </div>

      <table className="w-full text-xs mb-2">
        <thead>
          <tr className="border-b border-black">
            <th className="text-left py-1">Item</th>
            <th className="text-right py-1">Qty</th>
            <th className="text-right py-1">Price</th>
            <th className="text-right py-1">Total</th>
          </tr>
        </thead>
        <tbody>
          {cart.map((item, index) => (
            <tr key={index} className="border-b border-dashed border-gray-400">
              <td className="py-1">{item.name}</td>
              <td className="text-right">{item.quantity}</td>
              <td className="text-right">₹{item.price.toFixed(2)}</td>
              <td className="text-right">₹{(item.price * item.quantity).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-t-2 border-black pt-2 mb-2 text-xs">
        <div className="flex justify-between py-1">
          <span>Subtotal:</span>
          <span>₹{subtotal.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>GST:</span>
          <span>₹{gst.toFixed(2)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between py-1 text-green-600">
            <span>Discount:</span>
            <span>-₹{discount.toFixed(2)}</span>
          </div>
        )}
        <div className="flex justify-between py-2 text-lg font-bold border-t-2 border-black">
          <span>TOTAL:</span>
          <span>₹{total.toFixed(2)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span>Payment Mode:</span>
          <span className="uppercase">{paymentMethod}</span>
        </div>
      </div>

      <div className="text-center text-xs border-t-2 border-dashed border-black pt-2">
        <p className="mb-1">Thank you for shopping with us!</p>
        <p className="text-xs">Please visit again</p>
        <p className="text-xs mt-2">** No exchange without receipt **</p>
      </div>

      <div className="text-center text-xs mt-4">
        <p>Powered by SmartMart POS</p>
      </div>
    </div>
  );
});

ReceiptPrint.displayName = "ReceiptPrint";

export default ReceiptPrint;
