import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Calendar, Upload, Plus, FileSpreadsheet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import * as XLSX from "xlsx";

const StockManagement = () => {
  const [lowStockProducts, setLowStockProducts] = useState<any[]>([]);
  const [expiringProducts, setExpiringProducts] = useState<any[]>([]);
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
    fetchStockAlerts();

    const channel = supabase
      .channel("stock-alerts")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, fetchStockAlerts)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStockAlerts = async () => {
    try {
      // Fetch all products and filter manually
      const { data: allProducts, error: productsError } = await supabase.from("products").select("*");
      
      if (productsError) throw productsError;
      
      const products = (allProducts || []) as any[];
      const lowStock = products.filter(p => p.stock <= (p.min_stock_level || 10));
      const expiring = products.filter(p => 
        p.expiry_date && 
        new Date(p.expiry_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
        p.stock > 0
      );

      setLowStockProducts(lowStock);
      setExpiringProducts(expiring);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBulkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = new Uint8Array(event.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        const products = json.map((row: any) => ({
          name: row.Name || row.name,
          category: row.Category || row.category,
          price: Number(row.Price || row.price),
          cost_price: Number(row["Cost Price"] || row.cost_price || 0),
          stock: Number(row.Stock || row.stock),
          barcode: String(row.Barcode || row.barcode),
          gst: Number(row.GST || row.gst || 0),
          min_stock_level: Number(row["Min Stock"] || row.min_stock_level || 10),
          expiry_date: row["Expiry Date"] || row.expiry_date || null,
          brand: row.Brand || row.brand || null,
          sku: row.SKU || row.sku || null,
        }));

        const { error } = await supabase.from("products").insert(products);

        if (error) throw error;

        toast.success(`Successfully uploaded ${products.length} products`);
        fetchStockAlerts();
      } catch (error: any) {
        toast.error(`Upload failed: ${error.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const downloadTemplate = () => {
    const template = [
      {
        Name: "Sample Product",
        Category: "Grocery",
        Price: 100,
        "Cost Price": 80,
        Stock: 50,
        Barcode: "1234567890",
        GST: 5,
        "Min Stock": 10,
        "Expiry Date": "2025-12-31",
        Brand: "Sample Brand",
        SKU: "SKU001",
      },
    ];

    const ws = XLSX.utils.json_to_sheet(template);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Products");
    XLSX.writeFile(wb, "product-upload-template.xlsx");
    toast.success("Template downloaded");
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
            <h1 className="text-3xl font-bold">Stock Management</h1>
            <p className="text-muted-foreground mt-1">Monitor inventory and alerts</p>
          </div>
          <div className="flex gap-2">
            <Button onClick={downloadTemplate} variant="outline">
              <FileSpreadsheet className="h-4 w-4 mr-2" />
              Download Template
            </Button>
            <Button onClick={() => document.getElementById("bulk-upload")?.click()}>
              <Upload className="h-4 w-4 mr-2" />
              Bulk Upload
            </Button>
            <Input
              id="bulk-upload"
              type="file"
              accept=".xlsx,.xls,.csv"
              className="hidden"
              onChange={handleBulkUpload}
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="border-orange-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-orange-600">
                <AlertTriangle className="h-5 w-5" />
                Low Stock Alert ({lowStockProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Current</TableHead>
                    <TableHead>Min Level</TableHead>
                    <TableHead>Needed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {lowStockProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.name}</TableCell>
                      <TableCell>
                        <Badge variant="destructive">{product.stock}</Badge>
                      </TableCell>
                      <TableCell>{product.min_stock_level || 10}</TableCell>
                      <TableCell className="text-orange-600 font-semibold">
                        {(product.min_stock_level || 10) - product.stock}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card className="border-red-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <Calendar className="h-5 w-5" />
                Expiring Soon ({expiringProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Product</TableHead>
                    <TableHead>Expiry Date</TableHead>
                    <TableHead>Days Left</TableHead>
                    <TableHead>Stock</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {expiringProducts.map((product) => {
                    const daysLeft = Math.ceil(
                      (new Date(product.expiry_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
                    );
                    return (
                      <TableRow key={product.id}>
                        <TableCell className="font-medium">{product.name}</TableCell>
                        <TableCell>{new Date(product.expiry_date).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Badge variant={daysLeft <= 7 ? "destructive" : "secondary"}>{daysLeft} days</Badge>
                        </TableCell>
                        <TableCell>{product.stock}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default StockManagement;
