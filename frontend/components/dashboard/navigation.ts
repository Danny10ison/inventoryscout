export type DashboardNavItem = {
  label: string;
  href: string;
};

export type DashboardNavSection = {
  title: string;
  items: DashboardNavItem[];
};

export const dashboardNavSections: DashboardNavSection[] = [
  {
    title: "Dashboard",
    items: [{ label: "Home", href: "/" }],
  },
  {
    title: "Products",
    items: [
      { label: "All Products", href: "/products" },
      { label: "Add Product", href: "/products/new" },
      { label: "Insights", href: "/products/insights" },
    ],
  },
  {
    title: "Competitors",
    items: [
      { label: "All Competitors", href: "/competitors" },
      { label: "Add Competitor", href: "/competitors/new" },
      { label: "Activities", href: "/competitors/activities" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { label: "Demand", href: "/intelligence/product-demand" },
      { label: "Competitors", href: "/intelligence/competitor-analysis" },
      { label: "Recommendations", href: "/intelligence/recommendations" },
    ],
  },
  {
    title: "Settings",
    items: [{ label: "Profile", href: "/settings" }],
  },
];
