import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const data = [
  { name: "Tata Salt", sales: 320 },
  { name: "Amul Milk", sales: 280 },
  { name: "Fortune Oil", sales: 250 },
  { name: "Britannia Bread", sales: 220 },
  { name: "Parle-G", sales: 180 },
];

const TopProductsChart = () => {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
        <XAxis dataKey="name" className="text-muted-foreground text-xs" angle={-45} textAnchor="end" height={80} />
        <YAxis className="text-muted-foreground text-xs" />
        <Tooltip
          contentStyle={{
            backgroundColor: "hsl(var(--card))",
            border: "1px solid hsl(var(--border))",
            borderRadius: "0.5rem",
          }}
          labelStyle={{ color: "hsl(var(--foreground))" }}
        />
        <Bar dataKey="sales" fill="hsl(var(--accent))" radius={[8, 8, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
};

export default TopProductsChart;
