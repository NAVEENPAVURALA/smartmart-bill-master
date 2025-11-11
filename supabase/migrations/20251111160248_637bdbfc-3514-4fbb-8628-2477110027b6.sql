-- Create customers table
CREATE TABLE public.customers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  total_points INTEGER NOT NULL DEFAULT 0 CHECK (total_points >= 0),
  lifetime_points INTEGER NOT NULL DEFAULT 0 CHECK (lifetime_points >= 0),
  total_spent DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK (total_spent >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create loyalty tiers table
CREATE TABLE public.loyalty_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  min_points INTEGER NOT NULL CHECK (min_points >= 0),
  discount_percentage DECIMAL(5,2) NOT NULL DEFAULT 0 CHECK (discount_percentage >= 0 AND discount_percentage <= 100),
  points_multiplier DECIMAL(3,2) NOT NULL DEFAULT 1.00 CHECK (points_multiplier >= 1),
  color TEXT NOT NULL DEFAULT '#gray',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(min_points)
);

-- Create loyalty transactions table
CREATE TABLE public.loyalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
  sale_id UUID REFERENCES public.sales(id) ON DELETE SET NULL,
  points_earned INTEGER DEFAULT 0 CHECK (points_earned >= 0),
  points_redeemed INTEGER DEFAULT 0 CHECK (points_redeemed >= 0),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('earn', 'redeem', 'adjustment')),
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add customer_id to sales table
ALTER TABLE public.sales 
ADD COLUMN customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loyalty_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for customers
CREATE POLICY "Authenticated users can view customers"
  ON public.customers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Cashiers and admins can create customers"
  ON public.customers FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Cashiers and admins can update customers"
  ON public.customers FOR UPDATE
  USING (
    public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins can delete customers"
  ON public.customers FOR DELETE
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for loyalty_tiers
CREATE POLICY "Anyone authenticated can view tiers"
  ON public.loyalty_tiers FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Admins can manage tiers"
  ON public.loyalty_tiers FOR ALL
  USING (public.has_role(auth.uid(), 'admin'));

-- RLS Policies for loyalty_transactions
CREATE POLICY "Authenticated users can view transactions"
  ON public.loyalty_transactions FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Cashiers and admins can create transactions"
  ON public.loyalty_transactions FOR INSERT
  WITH CHECK (
    public.has_role(auth.uid(), 'cashier') OR public.has_role(auth.uid(), 'admin')
  );

-- Function to get customer tier
CREATE OR REPLACE FUNCTION public.get_customer_tier(customer_points INTEGER)
RETURNS TABLE(tier_name TEXT, discount_percentage DECIMAL, points_multiplier DECIMAL, color TEXT)
LANGUAGE SQL
STABLE
AS $$
  SELECT name, discount_percentage, points_multiplier, color
  FROM public.loyalty_tiers
  WHERE min_points <= customer_points
  ORDER BY min_points DESC
  LIMIT 1
$$;

-- Function to calculate points for amount
CREATE OR REPLACE FUNCTION public.calculate_points(amount DECIMAL, multiplier DECIMAL DEFAULT 1.00)
RETURNS INTEGER
LANGUAGE SQL
IMMUTABLE
AS $$
  SELECT FLOOR(amount / 10 * multiplier)::INTEGER
$$;

-- Trigger to update customer points on loyalty transaction
CREATE OR REPLACE FUNCTION public.update_customer_points_on_transaction()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.transaction_type = 'earn' THEN
    UPDATE public.customers
    SET 
      total_points = total_points + NEW.points_earned,
      lifetime_points = lifetime_points + NEW.points_earned,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'redeem' THEN
    UPDATE public.customers
    SET 
      total_points = total_points - NEW.points_redeemed,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  ELSIF NEW.transaction_type = 'adjustment' THEN
    UPDATE public.customers
    SET 
      total_points = total_points + NEW.points_earned - NEW.points_redeemed,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_loyalty_transaction_insert
  AFTER INSERT ON public.loyalty_transactions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_points_on_transaction();

-- Trigger to update customer total_spent on sale
CREATE OR REPLACE FUNCTION public.update_customer_total_spent()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.customer_id IS NOT NULL THEN
    UPDATE public.customers
    SET 
      total_spent = total_spent + NEW.total,
      updated_at = NOW()
    WHERE id = NEW.customer_id;
  END IF;
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER after_sale_insert_update_customer
  AFTER INSERT ON public.sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_customer_total_spent();

-- Trigger for updated_at on customers
CREATE TRIGGER update_customers_updated_at
  BEFORE UPDATE ON public.customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.customers;
ALTER PUBLICATION supabase_realtime ADD TABLE public.loyalty_transactions;

-- Insert default loyalty tiers
INSERT INTO public.loyalty_tiers (name, min_points, discount_percentage, points_multiplier, color) VALUES
  ('Bronze', 0, 0, 1.00, '#CD7F32'),
  ('Silver', 500, 5, 1.25, '#C0C0C0'),
  ('Gold', 1500, 10, 1.50, '#FFD700'),
  ('Platinum', 3000, 15, 2.00, '#E5E4E2');
