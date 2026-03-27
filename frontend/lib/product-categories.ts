export const productCategories = [
  {
    main: "Electronics & Gadgets",
    subcategories: [
      "Mobile Phones",
      "Mobile Accessories",
      "Computer Accessories",
      "Smart Devices (IoT)",
      "Wearables",
      "Audio Devices",
      "Cameras & Photography",
      "Gaming Equipment",
      "Portable Electronics",
      "Home Electronics",
    ],
  },
  {
    main: "Home & Living",
    subcategories: [
      "Furniture",
      "Home Decor",
      "Kitchenware",
      "Bedding & Linen",
      "Lighting",
      "Storage & Organization",
      "Cleaning Supplies",
      "Home Improvement Tools",
    ],
  },
  {
    main: "Fashion & Apparel",
    subcategories: [
      "Men's Clothing",
      "Women's Clothing",
      "Kids' Clothing",
      "Footwear",
      "Bags & Luggage",
      "Jewelry & Accessories",
      "Watches",
    ],
  },
  {
    main: "Beauty & Personal Care",
    subcategories: [
      "Skincare",
      "Haircare",
      "Makeup",
      "Fragrances",
      "Men's Grooming",
      "Personal Hygiene Products",
      "Beauty Tools & Devices",
    ],
  },
  {
    main: "Health & Fitness",
    subcategories: [
      "Fitness Equipment",
      "Supplements",
      "Wellness Products",
      "Medical Supplies",
      "Weight Loss Products",
      "Sports Gear",
    ],
  },
  {
    main: "Baby, Kids & Toys",
    subcategories: [
      "Baby Products",
      "Educational Toys",
      "Outdoor Toys",
      "School Supplies",
      "Kids Accessories",
    ],
  },
  {
    main: "Automotive",
    subcategories: [
      "Car Accessories",
      "Car Electronics",
      "Spare Parts",
      "Maintenance Tools",
      "Motorcycle Accessories",
    ],
  },
  {
    main: "Pets",
    subcategories: [
      "Pet Food",
      "Pet Accessories",
      "Pet Grooming",
      "Pet Health Products",
    ],
  },
  {
    main: "Office & Business",
    subcategories: [
      "Office Supplies",
      "Stationery",
      "Packaging Materials",
      "Retail Equipment",
      "Industrial Tools",
    ],
  },
  {
    main: "Food & Beverages",
    subcategories: [
      "Packaged Foods",
      "Snacks",
      "Beverages",
      "Organic Products",
      "Specialty Foods",
    ],
  },
  {
    main: "Construction & Industrial",
    subcategories: [
      "Building Materials",
      "Electrical Supplies",
      "Plumbing",
      "Heavy Equipment",
      "Safety Gear",
    ],
  },
  {
    main: "Events & Lifestyle",
    subcategories: [
      "Party Supplies",
      "Gift Items",
      "Seasonal Products",
      "Wedding Accessories",
      "Decoration Items",
    ],
  },
  {
    main: "Agriculture & Farming",
    subcategories: [
      "Farm Tools",
      "Seeds & Fertilizers",
      "Irrigation Equipment",
      "Livestock Supplies",
    ],
  },
  {
    main: "Energy & Power",
    subcategories: [
      "Solar Products",
      "Batteries",
      "Generators",
      "Power Tools",
    ],
  },
];

export function combineCategory(mainCategory: string, subcategory: string) {
  if (!mainCategory || !subcategory) {
    return "";
  }

  return `${mainCategory} > ${subcategory}`;
}

export function parseCategorySelection(category: string | null | undefined) {
  if (!category) {
    return {
      mainCategory: "",
      subcategory: "",
    };
  }

  const [mainCategory = "", subcategory = ""] = category.split(" > ");

  if (
    productCategories.some(
      (entry) =>
        entry.main === mainCategory &&
        entry.subcategories.includes(subcategory),
    )
  ) {
    return { mainCategory, subcategory };
  }

  for (const entry of productCategories) {
    if (entry.subcategories.includes(category)) {
      return {
        mainCategory: entry.main,
        subcategory: category,
      };
    }
  }

  return {
    mainCategory: "",
    subcategory: "",
  };
}

export function getSubcategories(mainCategory: string) {
  return (
    productCategories.find((entry) => entry.main === mainCategory)?.subcategories ??
    []
  );
}
