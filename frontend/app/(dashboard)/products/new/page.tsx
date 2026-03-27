"use client";

import { ChangeEvent, FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { PageHeader, Panel } from "@/components/dashboard/ui";
import {
  createProduct,
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  User,
} from "@/lib/inventoryscout-api";
import {
  combineCategory,
  getSubcategories,
  productCategories,
} from "@/lib/product-categories";

type NewProductFormState = {
  name: string;
  mainCategory: string;
  subcategory: string;
  url: string;
  description: string;
};

export default function AddProductPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [form, setForm] = useState<NewProductFormState>({
    name: "",
    mainCategory: "",
    subcategory: "",
    url: "",
    description: "",
  });
  const [isLoadingUser, setIsLoadingUser] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        setUser(currentUser);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to prepare product creation.",
        );
      } finally {
        setIsLoadingUser(false);
      }
    }

    void loadUser();
  }, []);

  const handleChange =
    (field: keyof NewProductFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  function handleMainCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setForm((currentForm) => ({
      ...currentForm,
      mainCategory: event.target.value,
      subcategory: "",
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) {
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await createProduct(user.id, {
        name: form.name.trim(),
        category:
          combineCategory(form.mainCategory, form.subcategory) || null,
        url: form.url.trim() || null,
        description: form.description.trim() || null,
      });
      router.push("/products");
      router.refresh();
    } catch (submitError) {
      setError(
        submitError instanceof InventoryScoutApiError || submitError instanceof Error
          ? submitError.message
          : "Unable to create this product.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        badge="Products"
        title="Add Product"
        description="Save a product idea here so you can come back, run AI checks, and compare it against competitors later."
      />

      <Panel title="New Product Form">
        {isLoadingUser ? (
          <p className="text-sm text-slate-500">Preparing your product workspace...</p>
        ) : (
          <form className="grid gap-4 lg:grid-cols-2" onSubmit={handleSubmit}>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={form.name}
                onChange={handleChange("name")}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Main Category
              </span>
              <select
                value={form.mainCategory}
                onChange={handleMainCategoryChange}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              >
                <option value="">Select main category</option>
                {productCategories.map((category) => (
                  <option key={category.main} value={category.main}>
                    {category.main}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className="text-sm font-medium text-slate-700">
                Subcategory
              </span>
              <select
                value={form.subcategory}
                onChange={handleChange("subcategory")}
                disabled={!form.mainCategory}
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select subcategory</option>
                {getSubcategories(form.mainCategory).map((subcategory) => (
                  <option key={subcategory} value={subcategory}>
                    {subcategory}
                  </option>
                ))}
              </select>
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Product URL</span>
              <input
                value={form.url}
                onChange={handleChange("url")}
                placeholder="Paste the product page if you have one"
                className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
            </label>
            <label className="block lg:col-span-2">
              <span className="text-sm font-medium text-slate-700">Description</span>
              <textarea
                value={form.description}
                onChange={handleChange("description")}
                placeholder="Add a short note about what makes this product interesting"
                className="mt-2 min-h-36 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
              />
            </label>

            {error ? <p className="text-sm text-rose-600 lg:col-span-2">{error}</p> : null}

            <p className="text-sm leading-6 text-slate-500 lg:col-span-2">
              A stronger product record usually leads to a stronger AI result.
              If you have a product page and a short description, add both.
            </p>

            <div className="flex flex-wrap gap-3 lg:col-span-2">
              <button
                type="submit"
                disabled={isSubmitting || !user}
                className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? "Creating..." : "Create Product"}
              </button>
            </div>
          </form>
        )}
      </Panel>
    </div>
  );
}
