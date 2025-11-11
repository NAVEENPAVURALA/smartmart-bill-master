import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Search, UserPlus, Award } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

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

interface CustomerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCustomer: (customer: Customer) => void;
}

const CustomerDialog = ({ open, onOpenChange, onSelectCustomer }: CustomerDialogProps) => {
  const [searchPhone, setSearchPhone] = useState("");
  const [isNewCustomer, setIsNewCustomer] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: "", phone: "", email: "" });
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [tier, setTier] = useState<any>(null);

  useEffect(() => {
    if (!open) {
      setSearchPhone("");
      setIsNewCustomer(false);
      setNewCustomerData({ name: "", phone: "", email: "" });
      setSearchResults([]);
      setTier(null);
    }
  }, [open]);

  const handleSearch = async () => {
    if (!searchPhone.trim()) {
      toast.error("Please enter a phone number");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .ilike("phone", `%${searchPhone}%`)
        .limit(5);

      if (error) throw error;

      if (data && data.length > 0) {
        setSearchResults(data);
        setIsNewCustomer(false);
      } else {
        setIsNewCustomer(true);
        setNewCustomerData({ ...newCustomerData, phone: searchPhone });
        toast.info("Customer not found. Create a new customer.");
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleCreateCustomer = async () => {
    if (!newCustomerData.name || !newCustomerData.phone) {
      toast.error("Name and phone are required");
      return;
    }

    try {
      const { data, error } = await supabase
        .from("customers")
        .insert({
          name: newCustomerData.name,
          phone: newCustomerData.phone,
          email: newCustomerData.email || null,
        })
        .select()
        .single();

      if (error) throw error;

      toast.success("Customer created successfully");
      onSelectCustomer(data);
      onOpenChange(false);
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const handleSelectCustomer = async (customer: Customer) => {
    // Fetch customer tier
    const { data: tierData } = await supabase
      .rpc("get_customer_tier", { customer_points: customer.total_points });

    if (tierData && tierData.length > 0) {
      customer.tier = tierData[0];
    }

    onSelectCustomer(customer);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Award className="h-5 w-5 text-primary" />
            Loyalty Customer
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search Section */}
          <div className="space-y-2">
            <Label htmlFor="phone">Search by Phone Number</Label>
            <div className="flex gap-2">
              <Input
                id="phone"
                placeholder="Enter phone number"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
              />
              <Button onClick={handleSearch} variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Search Results */}
          {searchResults.length > 0 && (
            <div className="space-y-2">
              <Label>Select Customer</Label>
              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {searchResults.map((customer) => (
                  <div
                    key={customer.id}
                    onClick={() => handleSelectCustomer(customer)}
                    className="p-4 border rounded-lg cursor-pointer hover:bg-muted transition-colors"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold">{customer.name}</h4>
                        <p className="text-sm text-muted-foreground">{customer.phone}</p>
                        {customer.email && (
                          <p className="text-xs text-muted-foreground">{customer.email}</p>
                        )}
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary" className="gap-1">
                          <Award className="h-3 w-3" />
                          {customer.total_points} pts
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          ₹{customer.total_spent.toFixed(0)} spent
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* New Customer Form */}
          {isNewCustomer && (
            <div className="space-y-4 border-t pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <UserPlus className="h-4 w-4" />
                <span>Create New Customer</span>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="new-name">Full Name *</Label>
                <Input
                  id="new-name"
                  placeholder="Customer name"
                  value={newCustomerData.name}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-phone">Phone Number *</Label>
                <Input
                  id="new-phone"
                  placeholder="Phone number"
                  value={newCustomerData.phone}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-email">Email (Optional)</Label>
                <Input
                  id="new-email"
                  type="email"
                  placeholder="Email address"
                  value={newCustomerData.email}
                  onChange={(e) => setNewCustomerData({ ...newCustomerData, email: e.target.value })}
                />
              </div>

              <Button onClick={handleCreateCustomer} className="w-full">
                <UserPlus className="h-4 w-4 mr-2" />
                Create Customer
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default CustomerDialog;
