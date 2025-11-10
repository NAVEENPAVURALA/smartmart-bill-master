import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Package, DollarSign, AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import SalesChart from "@/components/SalesChart";
import TopProductsChart from "@/components/TopProductsChart";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalSales: 0,
    totalProducts: 0,
    totalRevenue: 0,
    lowStock: 0,
  });
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role === "cashier") {
      navigate("/billing");
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchStats();

    const channel = supabase
      .channel('dashboard-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'sales' }, fetchStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchStats = async () => {
    try {
      const [salesData, productsData] = await Promise.all([
        supabase.from('sales').select('total'),
        supabase.from('products').select('*')
      ]);

      const totalRevenue = salesData.data?.reduce((sum, sale) => sum + Number(sale.total), 0) || 0;
      const totalSales = salesData.data?.length || 0;
      const totalProducts = productsData.data?.length || 0;
      const lowStock = productsData.data?.filter(p => p.stock < 50).length || 0;

      setStats({ totalSales, totalProducts, totalRevenue, lowStock });
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const statCards = [
    { title: "Total Sales", value: stats.totalSales, icon: TrendingUp, color: "text-blue-500" },
    { title: "Products", value: stats.totalProducts, icon: Package, color: "text-green-500" },
    { title: "Revenue", value: `₹${stats.totalRevenue.toFixed(0)}`, icon: DollarSign, color: "text-yellow-500" },
    { title: "Low Stock Items", value: stats.lowStock, icon: AlertTriangle, color: "text-red-500" },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your store overview</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-border/50 hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold mt-2">{stat.value}</p>
                    </div>
                    <stat.icon className={`h-10 w-10 ${stat.color}`} />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Sales Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <SalesChart />
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle>Top Products</CardTitle>
            </CardHeader>
            <CardContent>
              <TopProductsChart />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
