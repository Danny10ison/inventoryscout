"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useEffect, useState } from "react";

import { MetricCards, PageHeader, Panel } from "@/components/dashboard/ui";
import {
  deleteProduct,
  ensureAuthenticatedUser,
  InventoryScoutApiError,
  listProducts,
  Product,
  updateProduct,
  User,
} from "@/lib/inventoryscout-api";
import {
  combineCategory,
  getSubcategories,
  parseCategorySelection,
  productCategories,
} from "@/lib/product-categories";

type ProductFormState = {
  name: string;
  url: string;
  mainCategory: string;
  subcategory: string;
  description: string;
};

function toProductForm(product: Product): ProductFormState {
  const { mainCategory, subcategory } = parseCategorySelection(product.category);

  return {
    name: product.name,
    url: product.url ?? "",
    mainCategory,
    subcategory,
    description: product.description ?? "",
  };
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function ProductsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [editForm, setEditForm] = useState<ProductFormState>({
    name: "",
    url: "",
    mainCategory: "",
    subcategory: "",
    description: "",
  });

  useEffect(() => {
    async function loadProducts() {
      try {
        const currentUser = await ensureAuthenticatedUser();
        const currentProducts = await listProducts(currentUser.id);
        setUser(currentUser);
        setProducts(currentProducts);
      } catch (loadError) {
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Unable to load products right now.",
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadProducts();
  }, []);

  const handleEditChange =
    (field: keyof ProductFormState) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      setEditForm((currentForm) => ({
        ...currentForm,
        [field]: event.target.value,
      }));
    };

  function handleMainCategoryChange(event: ChangeEvent<HTMLSelectElement>) {
    setEditForm((currentForm) => ({
      ...currentForm,
      mainCategory: event.target.value,
      subcategory: "",
    }));
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setEditForm(toProductForm(product));
    setError(null);
    setFeedback(null);
  }

  function closeEditModal() {
    setEditingProduct(null);
    setEditForm({
      name: "",
      url: "",
      mainCategory: "",
      subcategory: "",
      description: "",
    });
  }

  async function handleDelete(product: Product) {
    if (!user) {
      return;
    }

    const shouldDelete = window.confirm(
      `Delete "${product.name}" from your product registry?`,
    );

    if (!shouldDelete) {
      return;
    }

    setError(null);
    setFeedback(null);

    try {
      await deleteProduct(user.id, product.id);
      setProducts((currentProducts) =>
        currentProducts.filter((currentProduct) => currentProduct.id !== product.id),
      );
      setFeedback(`Deleted ${product.name}.`);
    } catch (deleteError) {
      setError(
        deleteError instanceof InventoryScoutApiError || deleteError instanceof Error
          ? deleteError.message
          : "Unable to delete this product.",
      );
    }
  }

  async function handleEditSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !editingProduct) {
      return;
    }

    setIsSaving(true);
    setError(null);
    setFeedback(null);

    try {
      const updatedProduct = await updateProduct(user.id, editingProduct.id, {
        name: editForm.name.trim(),
        url: editForm.url.trim() || null,
        category:
          combineCategory(editForm.mainCategory, editForm.subcategory) || null,
        description: editForm.description.trim() || null,
      });

      setProducts((currentProducts) =>
        currentProducts.map((product) =>
          product.id === updatedProduct.id ? updatedProduct : product,
        ),
      );
      setFeedback(`Updated ${updatedProduct.name}.`);
      closeEditModal();
    } catch (saveError) {
      setError(
        saveError instanceof InventoryScoutApiError || saveError instanceof Error
          ? saveError.message
          : "Unable to update this product.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  const categoryCount = new Set(
    products.map((product) => product.category).filter(Boolean),
  ).size;

  const insightReadyCount = products.filter(
    (product) => Boolean(product.url) || Boolean(product.description),
  ).length;

  return (
    <>
      <div className="space-y-6">
        <PageHeader
          badge="Products"
          title="All Products"
          description="Keep every product idea in one place so you can check it later instead of restarting your research each time."
          action={{ label: "Add Product", href: "/products/new" }}
        />

        <MetricCards
          items={[
            {
              label: "Total Products",
              value: String(products.length),
              note: "",
            },
            {
              label: "Categories",
              value: String(categoryCount),
              note: "",
            },
            {
              label: "Insight Ready",
              value: String(insightReadyCount),
              note: "",
            },
          ]}
        />

        <Panel title="Product Registry">
          {isLoading ? (
            <p className="text-sm text-slate-500">Loading products...</p>
          ) : (
            <>
              {error ? <p className="mb-4 text-sm text-rose-600">{error}</p> : null}
              {feedback ? (
                <p className="mb-4 text-sm text-emerald-600">{feedback}</p>
              ) : null}

              <div className="overflow-hidden rounded-[1.1rem] border border-slate-200">
                <table className="min-w-full divide-y divide-slate-200 text-left text-sm">
                  <thead className="bg-slate-50">
                    <tr>
                      {["Name", "Category", "URL", "Updated", "Actions"].map(
                        (column) => (
                          <th
                            key={column}
                            className="px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500"
                          >
                            {column}
                          </th>
                        ),
                      )}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 bg-white">
                    {products.length === 0 ? (
                      <tr>
                        <td
                          colSpan={5}
                          className="px-4 py-6 text-center text-slate-500"
                        >
                          No products yet. Add the first item you want to
                          research, then come back here to edit it or open an AI
                          check.{" "}
                          <Link href="/products/new" className="text-sky-700 underline">
                            Add your first product
                          </Link>
                          .
                        </td>
                      </tr>
                    ) : (
                      products.map((product) => (
                        <tr key={product.id}>
                          <td className="px-4 py-3 text-slate-800">{product.name}</td>
                          <td className="px-4 py-3 text-slate-700">
                            {product.category ?? "Uncategorized"}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {product.url ? (
                              <a
                                href={product.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-sky-700 underline"
                              >
                                {product.url}
                              </a>
                            ) : (
                              "No URL"
                            )}
                          </td>
                          <td className="px-4 py-3 text-slate-700">
                            {formatTimestamp(product.updated_at)}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                aria-label={`Edit ${product.name}`}
                                onClick={() => openEditModal(product)}
                                className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M12 20h9" />
                                  <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                aria-label={`Delete ${product.name}`}
                                onClick={() => void handleDelete(product)}
                                className="rounded-lg border border-rose-200 p-2 text-rose-600 transition hover:bg-rose-50 hover:text-rose-700"
                              >
                                <svg
                                  aria-hidden="true"
                                  viewBox="0 0 24 24"
                                  className="h-4 w-4"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="2"
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                >
                                  <path d="M3 6h18" />
                                  <path d="M8 6V4h8v2" />
                                  <path d="M19 6l-1 14H6L5 6" />
                                  <path d="M10 11v6" />
                                  <path d="M14 11v6" />
                                </svg>
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      </div>

      {editingProduct ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4">
          <div className="w-full max-w-2xl rounded-[1.5rem] bg-white p-5 shadow-[0_28px_70px_rgba(15,23,42,0.2)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Edit Product
                </p>
                <h2 className="mt-2 text-xl font-semibold tracking-tight text-slate-950">
                  {editingProduct.name}
                </h2>
              </div>
              <button
                type="button"
                aria-label="Close edit modal"
                onClick={closeEditModal}
                className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-600 transition hover:bg-slate-50"
              >
                Close
              </button>
            </div>

            <form className="mt-5 grid gap-4 lg:grid-cols-2" onSubmit={handleEditSubmit}>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Name</span>
                <input
                  value={editForm.name}
                  onChange={handleEditChange("name")}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">
                  Main Category
                </span>
                <select
                  value={editForm.mainCategory}
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
                  value={editForm.subcategory}
                  onChange={handleEditChange("subcategory")}
                  disabled={!editForm.mainCategory}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                >
                  <option value="">Select subcategory</option>
                  {getSubcategories(editForm.mainCategory).map((subcategory) => (
                    <option key={subcategory} value={subcategory}>
                      {subcategory}
                    </option>
                  ))}
                </select>
              </label>
              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">URL</span>
                <input
                  value={editForm.url}
                  onChange={handleEditChange("url")}
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                />
              </label>
              <label className="block lg:col-span-2">
                <span className="text-sm font-medium text-slate-700">Description</span>
                <textarea
                  value={editForm.description}
                  onChange={handleEditChange("description")}
                  className="mt-2 min-h-36 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-400 focus:bg-white"
                />
              </label>
              <div className="flex flex-wrap gap-3 lg:col-span-2">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-full bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSaving ? "Saving..." : "Save Product"}
                </button>
                <button
                  type="button"
                  onClick={closeEditModal}
                  disabled={isSaving}
                  className="rounded-full border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
