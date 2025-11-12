import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Package, DollarSign, Calendar, Download, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const Reports = () => {
  const [salesData, setSalesData] = useState<any[]>([]);
  const [stockData, setStockData] = useState<any[]>([]);
  const [profitData, setProfitData] = useState<any[]>([]);
  const [bestSellers, setBestSellers] = useState<any[]>([]);
  const [dateRange, setDateRange] = useState("today");
  const [loading, setLoading] = useState(true);
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "cashier") {
      toast.error("Access denied. Admins and Managers only.");
      navigate("/billing");
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchAllReports();
  }, [dateRange]);

  const fetchAllReports = async () => {
    setLoading(true);
    try {
      const [sales, stock, profit, sellers] = await Promise.all([
        fetchSalesReport(),
        fetchStockReport(),
        fetchProfitReport(),
        fetchBestSellers(),
      ]);
      setSalesData(sales);
      setStockData(stock);
      setProfitData(profit);
      setBestSellers(sellers);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalesReport = async () => {
    const { data, error } = await supabase
      .from("sales")
      .select(`
        *,
        sale_items(quantity, price, product_name)
      `)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  };

  const fetchStockReport = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("stock", { ascending: true });

    if (error) throw error;
    return data || [];
  };

  const fetchProfitReport = async () => {
    const { data, error } = await supabase
      .rpc("profit_loss_summary" as any);

    if (error) {
      // Fallback if view doesn't work
      const { data: sales } = await supabase.from("sales").select("*");
      return sales || [];
    }
    return data || [];
  };

  const fetchBestSellers = async () => {
    const { data, error } = await supabase
      .from("sale_items")
      .select(`
        product_id,
        product_name,
        quantity,
        price
      `);

    if (error) throw error;

    // Aggregate manually
    const aggregated = (data || []).reduce((acc: any, item: any) => {
      if (!acc[item.product_id]) {
        acc[item.product_id] = {
          product_name: item.product_name,
          total_quantity: 0,
          total_revenue: 0,
        };
      }
      acc[item.product_id].total_quantity += item.quantity;
      acc[item.product_id].total_revenue += item.quantity * item.price;
      return acc;
    }, {});

    return Object.values(aggregated).sort((a: any, b: any) => b.total_quantity - a.total_quantity).slice(0, 10);
  };

  const exportToCSV = (data: any[], filename: string) => {
    const csv = [
      Object.keys(data[0] || {}).join(","),
      ...data.map(row => Object.values(row).join(","))
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    toast.success("Report exported successfully");
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold">Reports & Analytics</h1>
            <p className="text-muted-foreground mt-1">Comprehensive business insights</p>
          </div>
          <div className="flex gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <Tabs defaultValue="sales" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="sales">Sales Report</TabsTrigger>
            <TabsTrigger value="stock">Stock Report</TabsTrigger>
            <TabsTrigger value="profit">Profit/Loss</TabsTrigger>
            <TabsTrigger value="bestsellers">Best Sellers</TabsTrigger>
          </TabsList>

          <TabsContent value="sales">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Sales Transactions</CardTitle>
                <Button onClick={() => exportToCSV(salesData, "sales-report")} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Subtotal</TableHead>
                      <TableHead>GST</TableHead>
                      <TableHead>Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {salesData.slice(0, 50).map((sale) => (
                      <TableRow key={sale.id}>
                        <TableCell>{new Date(sale.created_at).toLocaleString()}</TableCell>
                        <TableCell>{sale.sale_items?.length || 0}</TableCell>
                        <TableCell className="capitalize">{sale.payment_method}</TableCell>
                        <TableCell>₹{Number(sale.subtotal).toFixed(2)}</TableCell>
                        <TableCell>₹{Number(sale.gst_amount).toFixed(2)}</TableCell>
                        <TableCell className="font-semibold">₹{Number(sale.total).toFixed(2)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stock">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Current Stock Levels</CardTitle>
                <Button onClick={() => exportToCSV(stockData, "stock-report")} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Barcode</TableHead>
                      <TableHead>Current Stock</TableHead>
                      <TableHead>Min Level</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.map((product) => (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{product.category}</TableCell>
                        <TableCell>{product.barcode}</TableCell>
                        <TableCell>{product.stock}</TableCell>
                        <TableCell>{product.min_stock_level || 10}</TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            product.stock <= (product.min_stock_level || 10)
                              ? "bg-red-100 text-red-800"
                              : product.stock <= (product.min_stock_level || 10) * 2
                              ? "bg-yellow-100 text-yellow-800"
                              : "bg-green-100 text-green-800"
                          }`}>
                            {product.stock <= (product.min_stock_level || 10) ? "Low Stock" : "In Stock"}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profit">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Profit & Loss Analysis</CardTitle>
                <Button onClick={() => exportToCSV(profitData, "profit-loss")} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Revenue</div>
                      <div className="text-2xl font-bold text-green-600">
                        ₹{salesData.reduce((sum, s) => sum + Number(s.total), 0).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Discounts</div>
                      <div className="text-2xl font-bold text-orange-600">
                        ₹{salesData.reduce((sum, s) => sum + Number(s.discount_amount || 0), 0).toFixed(2)}
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="text-sm text-muted-foreground">Total Transactions</div>
                      <div className="text-2xl font-bold text-blue-600">{salesData.length}</div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bestsellers">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Top 10 Best Selling Products</CardTitle>
                <Button onClick={() => exportToCSV(bestSellers, "best-sellers")} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Export CSV
                </Button>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Rank</TableHead>
                      <TableHead>Product</TableHead>
                      <TableHead>Quantity Sold</TableHead>
                      <TableHead>Revenue</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {bestSellers.map((product: any, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-bold">#{index + 1}</TableCell>
                        <TableCell className="font-medium">{product.product_name}</TableCell>
                        <TableCell>{product.total_quantity}</TableCell>
                        <TableCell className="text-green-600 font-semibold">
                          ₹{Number(product.total_revenue).toFixed(2)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default Reports;
