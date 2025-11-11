import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Search, Award, TrendingUp, Users as UsersIcon, Phone, Mail, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import DashboardLayout from "@/components/DashboardLayout";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  total_points: number;
  lifetime_points: number;
  total_spent: number;
  tier?: any;
}

const Customers = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalPoints: 0,
    averageSpent: 0,
  });
  const { role } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (role && role !== "admin") {
      toast.error("Access denied. Admin only.");
      navigate("/dashboard");
    }
  }, [role, navigate]);

  useEffect(() => {
    fetchCustomers();

    const channel = supabase
      .channel("customers-changes")
      .on("postgres_changes", { event: "*", schema: "public", table: "customers" }, fetchCustomers)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchCustomers = async () => {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch tiers for each customer
      const customersWithTiers = await Promise.all(
        (data || []).map(async (customer) => {
          const { data: tierData } = await supabase.rpc("get_customer_tier", {
            customer_points: customer.total_points,
          });
          return {
            ...customer,
            tier: tierData && tierData.length > 0 ? tierData[0] : null,
          };
        })
      );

      setCustomers(customersWithTiers);

      // Calculate stats
      const totalCustomers = customersWithTiers.length;
      const totalPoints = customersWithTiers.reduce((sum, c) => sum + c.total_points, 0);
      const totalSpent = customersWithTiers.reduce((sum, c) => sum + Number(c.total_spent), 0);
      const averageSpent = totalCustomers > 0 ? totalSpent / totalCustomers : 0;

      setStats({ totalCustomers, totalPoints, averageSpent });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      customer.phone.includes(searchQuery) ||
      (customer.email && customer.email.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return;

    try {
      const { error } = await supabase.from("customers").delete().eq("id", id);

      if (error) throw error;
      toast.success("Customer deleted successfully");
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const statCards = [
    { title: "Total Customers", value: stats.totalCustomers, icon: UsersIcon, color: "text-blue-500" },
    { title: "Total Points", value: stats.totalPoints.toLocaleString(), icon: Award, color: "text-yellow-500" },
    { title: "Avg. Spent", value: `₹${stats.averageSpent.toFixed(0)}`, icon: TrendingUp, color: "text-green-500" },
  ];

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
        <div>
          <h1 className="text-3xl font-bold text-foreground">Loyalty Customers</h1>
          <p className="text-muted-foreground mt-1">Manage customer loyalty program</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {statCards.map((stat, index) => (
            <motion.div
              key={stat.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
            >
              <Card className="border-border/50">
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

        <Card className="border-border/50">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, phone, or email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredCustomers.map((customer, index) => (
                <motion.div
                  key={customer.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-md transition-shadow border-border/50">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-semibold text-lg">{customer.name}</h3>
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
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                              <Phone className="h-3 w-3" />
                              <span>{customer.phone}</span>
                            </div>
                            {customer.email && (
                              <div className="flex items-center gap-2">
                                <Mail className="h-3 w-3" />
                                <span>{customer.email}</span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-start gap-4">
                          <div className="text-right">
                            <Badge variant="outline" className="gap-1 mb-2">
                              <Award className="h-3 w-3" />
                              {customer.total_points} points
                            </Badge>
                            <p className="text-sm text-muted-foreground">
                              Total: ₹{customer.total_spent.toFixed(2)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Lifetime: {customer.lifetime_points} pts
                            </p>
                          </div>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(customer.id)}
                            className="text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default Customers;
