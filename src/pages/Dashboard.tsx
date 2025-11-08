import { motion } from "framer-motion";
import { TrendingUp, Package, DollarSign, Users, ShoppingBag, ArrowUpRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardLayout from "@/components/DashboardLayout";
import SalesChart from "@/components/SalesChart";
import TopProductsChart from "@/components/TopProductsChart";
import { useEffect, useState } from "react";

const Dashboard = () => {
  const [counters, setCounters] = useState({
    sales: 0,
    products: 0,
    revenue: 0,
    customers: 0,
  });

  // Animate counters on mount
  useEffect(() => {
    const targets = { sales: 1247, products: 342, revenue: 45280, customers: 89 };
    const duration = 2000;
    const steps = 60;
    const interval = duration / steps;

    let currentStep = 0;
    const timer = setInterval(() => {
      currentStep++;
      const progress = currentStep / steps;
      
      setCounters({
        sales: Math.floor(targets.sales * progress),
        products: Math.floor(targets.products * progress),
        revenue: Math.floor(targets.revenue * progress),
        customers: Math.floor(targets.customers * progress),
      });

      if (currentStep >= steps) {
        clearInterval(timer);
        setCounters(targets);
      }
    }, interval);

    return () => clearInterval(timer);
  }, []);

  const stats = [
    {
      title: "Total Sales",
      value: counters.sales,
      change: "+12.5%",
      icon: ShoppingBag,
      color: "text-primary",
      bgColor: "bg-primary/10",
    },
    {
      title: "Products in Stock",
      value: counters.products,
      change: "+5.2%",
      icon: Package,
      color: "text-accent",
      bgColor: "bg-accent/10",
    },
    {
      title: "Revenue",
      value: `₹${counters.revenue.toLocaleString()}`,
      change: "+18.3%",
      icon: DollarSign,
      color: "text-success",
      bgColor: "bg-success/10",
    },
    {
      title: "Customers Today",
      value: counters.customers,
      change: "+7.1%",
      icon: Users,
      color: "text-warning",
      bgColor: "bg-warning/10",
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground mt-1">Welcome back! Here's your store overview.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow cursor-pointer border-border/50">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className={`${stat.bgColor} p-3 rounded-xl`}>
                      <stat.icon className={`h-6 w-6 ${stat.color}`} />
                    </div>
                    <div className="flex items-center text-success text-sm font-medium">
                      <ArrowUpRight className="h-4 w-4 mr-1" />
                      {stat.change}
                    </div>
                  </div>
                  <div>
                    <p className="text-muted-foreground text-sm mb-1">{stat.title}</p>
                    <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Sales Trend
                </CardTitle>
                <CardDescription>Last 7 days sales performance</CardDescription>
              </CardHeader>
              <CardContent>
                <SalesChart />
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
          >
            <Card className="border-border/50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Package className="h-5 w-5 text-accent" />
                  Top Products
                </CardTitle>
                <CardDescription>Best selling items this week</CardDescription>
              </CardHeader>
              <CardContent>
                <TopProductsChart />
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard;
