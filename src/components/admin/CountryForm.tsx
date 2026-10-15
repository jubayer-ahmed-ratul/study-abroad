"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { SafeCountry } from "@/models/Country";
import { suggestSlug } from "@/lib/countries/validation";

interface CountryFormProps {
  mode: "create" | "edit";
  countryId?: string;
  initial?: Partial<SafeCountry>;
  cloudinaryEnabled: boolean;
}

interface ApiResult {
  status: string;
  message?: string;
  errors?: string[];
}

export default function CountryForm({ mode, countryId, initial, cloudinaryEnabled }: CountryFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [imageUrl, setImageUrl] = useState(initial?.flagImageUrl ?? "");
  const [imagePublicId, setImagePublicId] = useState(initial?.flagImagePublicId ?? "");
  const [uploading, setUploading] = useState(false);
  const [pending, setPending] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    setFormErrors([]);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/uploads/country-image", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as ApiResult & {
        data?: { url: string; publicId: string };
      };
      if (!response.ok || !body.data) {
        setFormErrors([body.message ?? "Image upload failed."]);
        return;
      }
      setImageUrl(body.data.url);
      setImagePublicId(body.data.publicId);
    } catch {
      setFormErrors(["Image upload failed."]);
    } finally {
      setUploading(false);
    }
  }

  function clearImage() {
    setImageUrl("");
    setImagePublicId("");
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || uploading) return;
    setPending(true);
    setFormErrors([]);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      shortDescription,
      description,
      metaTitle,
      metaDescription,
      isPublished,
      flagImageUrl: imageUrl,
      flagImagePublicId: imagePublicId,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/countries" : `/api/admin/countries/${countryId}`,
        {
          method: mode === "create" ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const body = (await response.json()) as ApiResult;
      if (!response.ok) {
        setFormErrors(body.errors?.length ? body.errors : [body.message ?? "Save failed."]);
        setPending(false);
        return;
      }
      router.push("/admin/countries");
      router.refresh();
    } catch {
      setFormErrors(["Save failed. Check your connection."]);
      setPending(false);
    }
  }

  const inputClass =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="country-name" className="text-sm font-medium">
          Country name *
        </label>
        <input
          id="country-name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          disabled={pending}
          required
          className={inputClass}
          placeholder="Canada"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="country-slug" className="text-sm font-medium">
          Slug *
        </label>
        <input
          id="country-slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          disabled={pending}
          required
          className={`${inputClass} font-mono`}
          placeholder="canada"
        />
        <p className="text-xs text-zinc-500">Suggested from the name; editable. Lowercase letters, numbers, hyphens.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <span className="text-sm font-medium">Flag image</span>
        {!cloudinaryEnabled ? (
          <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            Image uploads are unavailable: Cloudinary is not configured. Other fields save normally.
          </p>
        ) : (
          <>
            {imageUrl ? (
              <span className="inline-flex items-center gap-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={imageUrl} alt="Country flag preview" className="h-16 w-auto rounded border" />
                <button
                  type="button"
                  onClick={clearImage}
                  disabled={pending}
                  className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium disabled:opacity-60"
                >
                  Remove
                </button>
              </span>
            ) : null}
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={pending || uploading}
              onChange={(event) => handleFile(event.target.files?.[0])}
              aria-label="Upload flag image (JPEG, PNG, or WebP, max 2 MB)"
              className="text-sm"
            />
            {uploading && <p className="text-xs text-zinc-500">Uploading…</p>}
          </>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="country-short" className="text-sm font-medium">
          Short description
        </label>
        <input
          id="country-short"
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          disabled={pending}
          maxLength={300}
          className={inputClass}
          placeholder="One-line introduction"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="country-desc" className="text-sm font-medium">
          Detailed description
        </label>
        <textarea
          id="country-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
          rows={6}
          className={inputClass}
          placeholder="Study options, costs, lifestyle…"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country-metatitle" className="text-sm font-medium">
            SEO title
          </label>
          <input
            id="country-metatitle"
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            disabled={pending}
            maxLength={70}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="country-metadesc" className="text-sm font-medium">
            SEO description
          </label>
          <input
            id="country-metadesc"
            value={metaDescription}
            onChange={(event) => setMetaDescription(event.target.value)}
            disabled={pending}
            maxLength={160}
            className={inputClass}
          />
        </div>
      </div>

      <label className="inline-flex items-center gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={isPublished}
          onChange={(event) => setIsPublished(event.target.checked)}
          disabled={pending}
          className="h-4 w-4"
        />
        Published (visible on public pages)
      </label>

      {formErrors.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          <ul className="list-disc pl-5">
            {formErrors.map((message) => (
              <li key={message}>{message}</li>
            ))}
          </ul>
        </div>
      )}

      <button
        type="submit"
        disabled={pending || uploading}
        className="w-fit rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-900"
      >
        {pending ? "Saving…" : mode === "create" ? "Create country" : "Save changes"}
      </button>
    </form>
  );
}
