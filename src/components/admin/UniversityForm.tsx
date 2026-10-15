"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

import type { SafeUniversity, UniversityCountryRef } from "@/models/University";
import type { CountryOption } from "@/lib/universities/service";
import { suggestSlug } from "@/lib/countries/validation";

interface UniversityFormProps {
  mode: "create" | "edit";
  universityId?: string;
  initial?: Partial<SafeUniversity>;
  initialCountryId?: string;
  countries: CountryOption[];
  cloudinaryEnabled: boolean;
}

interface ApiResult {
  status: string;
  message?: string;
  errors?: string[];
}

function ImageField({
  label,
  imageUrl,
  onUploaded,
  onClear,
  uploading,
  setUploading,
  onError,
  disabled,
}: {
  label: string;
  imageUrl: string;
  onUploaded: (url: string, publicId: string) => void;
  onClear: () => void;
  uploading: boolean;
  setUploading: (value: boolean) => void;
  onError: (message: string) => void;
  disabled: boolean;
}) {
  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const form = new FormData();
      form.set("file", file);
      const response = await fetch("/api/admin/uploads/university-image", {
        method: "POST",
        body: form,
      });
      const body = (await response.json()) as ApiResult & {
        data?: { url: string; publicId: string };
      };
      if (!response.ok || !body.data) {
        onError(body.message ?? "Image upload failed.");
        return;
      }
      onUploaded(body.data.url, body.data.publicId);
    } catch {
      onError("Image upload failed.");
    } finally {
      setUploading(false);
    }
  }

  return (
    <span className="flex flex-col gap-1.5">
      <span className="text-sm font-medium">{label}</span>
      {imageUrl ? (
        <span className="inline-flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={imageUrl} alt={`${label} preview`} className="h-16 w-auto rounded border" />
          <button
            type="button"
            onClick={onClear}
            disabled={disabled}
            className="rounded-lg border border-zinc-300 px-2.5 py-1 text-xs font-medium disabled:opacity-60"
          >
            Remove
          </button>
        </span>
      ) : null}
      <input
        type="file"
        accept="image/jpeg,image/png,image/webp"
        disabled={disabled || uploading}
        onChange={(event) => handleFile(event.target.files?.[0])}
        aria-label={`${label} (JPEG, PNG, or WebP, max 2 MB)`}
        className="text-sm"
      />
      {uploading && <span className="text-xs text-zinc-500">Uploading…</span>}
    </span>
  );
}

export default function UniversityForm({
  mode,
  universityId,
  initial,
  initialCountryId,
  countries,
  cloudinaryEnabled,
}: UniversityFormProps) {
  const router = useRouter();
  const [name, setName] = useState(initial?.name ?? "");
  const [slug, setSlug] = useState(initial?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(initial?.slug));
  const [countryId, setCountryId] = useState(
    initialCountryId ?? (initial?.country as UniversityCountryRef | undefined)?.id ?? ""
  );
  const [shortDescription, setShortDescription] = useState(initial?.shortDescription ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [city, setCity] = useState(initial?.city ?? "");
  const [address, setAddress] = useState(initial?.address ?? "");
  const [establishedYear, setEstablishedYear] = useState(
    initial?.establishedYear !== undefined ? String(initial.establishedYear) : ""
  );
  const [programsText, setProgramsText] = useState((initial?.programs ?? []).join("\n"));
  const [degreeLevelsText, setDegreeLevelsText] = useState((initial?.degreeLevels ?? []).join("\n"));
  const [metaTitle, setMetaTitle] = useState(initial?.metaTitle ?? "");
  const [metaDescription, setMetaDescription] = useState(initial?.metaDescription ?? "");
  const [isPublished, setIsPublished] = useState(initial?.isPublished ?? false);
  const [logoUrl, setLogoUrl] = useState(initial?.logoUrl ?? "");
  const [logoPublicId, setLogoPublicId] = useState(initial?.logoPublicId ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.coverImageUrl ?? "");
  const [coverPublicId, setCoverPublicId] = useState(initial?.coverImagePublicId ?? "");
  const [uploadingCount, setUploadingCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [formErrors, setFormErrors] = useState<string[]>([]);

  const uploading = uploadingCount > 0;
  const trackUploading = (value: boolean) =>
    setUploadingCount((count) => Math.max(0, count + (value ? 1 : -1)));
  const pushError = (message: string) => setFormErrors((errors) => [...errors, message]);

  function handleNameChange(value: string) {
    setName(value);
    if (!slugTouched) setSlug(suggestSlug(value));
  }

  function parseLines(text: string): string[] {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending || uploading) return;
    setPending(true);
    setFormErrors([]);

    const year = establishedYear.trim() === "" ? undefined : Number(establishedYear.trim());
    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      country: countryId,
      shortDescription,
      description,
      website: website.trim(),
      city,
      address,
      establishedYear: year,
      programs: parseLines(programsText),
      degreeLevels: parseLines(degreeLevelsText),
      metaTitle,
      metaDescription,
      isPublished,
      logoUrl,
      logoPublicId,
      coverImageUrl: coverUrl,
      coverImagePublicId: coverPublicId,
    };

    try {
      const response = await fetch(
        mode === "create" ? "/api/admin/universities" : `/api/admin/universities/${universityId}`,
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
      router.push("/admin/universities");
      router.refresh();
    } catch {
      setFormErrors(["Save failed. Check your connection."]);
      setPending(false);
    }
  }

  const inputClass =
    "rounded-lg border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 disabled:opacity-60 dark:border-zinc-700 dark:bg-zinc-900";

  const selectedCountry = countries.find((option) => option.id === countryId);
  const countryIsDraft = selectedCountry && !selectedCountry.isPublished;

  return (
    <form onSubmit={handleSubmit} noValidate className="flex max-w-2xl flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="uni-name" className="text-sm font-medium">
          University name *
        </label>
        <input
          id="uni-name"
          value={name}
          onChange={(event) => handleNameChange(event.target.value)}
          disabled={pending}
          required
          className={inputClass}
          placeholder="University of Toronto"
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="uni-slug" className="text-sm font-medium">
          Slug *
        </label>
        <input
          id="uni-slug"
          value={slug}
          onChange={(event) => {
            setSlug(event.target.value);
            setSlugTouched(true);
          }}
          disabled={pending}
          required
          className={`${inputClass} font-mono`}
          placeholder="university-of-toronto"
        />
        <p className="text-xs text-zinc-500">Suggested from the name; editable. Unique across all universities.</p>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="uni-country" className="text-sm font-medium">
          Country *
        </label>
        <select
          id="uni-country"
          value={countryId}
          onChange={(event) => setCountryId(event.target.value)}
          disabled={pending || countries.length === 0}
          required
          className={inputClass}
        >
          <option value="">Select a country…</option>
          {countries.map((option) => (
            <option key={option.id} value={option.id}>
              {option.name}
              {option.isPublished ? "" : " (draft — stays hidden publicly)"}
            </option>
          ))}
        </select>
        {countries.length === 0 ? (
          <p className="text-xs text-amber-700">No countries exist yet. Create a country first.</p>
        ) : null}
        {countryIsDraft ? (
          <p className="text-xs text-amber-700">
            This country is unpublished — the university stays hidden publicly until the country is published.
          </p>
        ) : null}
      </div>

      {!cloudinaryEnabled ? (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:bg-amber-950 dark:text-amber-300">
          Image uploads are unavailable: Cloudinary is not configured. Other fields save normally.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          <ImageField
            label="Logo"
            imageUrl={logoUrl}
            onUploaded={(url, publicId) => {
              setLogoUrl(url);
              setLogoPublicId(publicId);
            }}
            onClear={() => {
              setLogoUrl("");
              setLogoPublicId("");
            }}
            uploading={uploading}
            setUploading={trackUploading}
            onError={pushError}
            disabled={pending}
          />
          <ImageField
            label="Cover image"
            imageUrl={coverUrl}
            onUploaded={(url, publicId) => {
              setCoverUrl(url);
              setCoverPublicId(publicId);
            }}
            onClear={() => {
              setCoverUrl("");
              setCoverPublicId("");
            }}
            uploading={uploading}
            setUploading={trackUploading}
            onError={pushError}
            disabled={pending}
          />
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label htmlFor="uni-short" className="text-sm font-medium">
          Short description
        </label>
        <input
          id="uni-short"
          value={shortDescription}
          onChange={(event) => setShortDescription(event.target.value)}
          disabled={pending}
          maxLength={300}
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="uni-desc" className="text-sm font-medium">
          Detailed description
        </label>
        <textarea
          id="uni-desc"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={pending}
          rows={6}
          className={inputClass}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-website" className="text-sm font-medium">
            Website URL
          </label>
          <input
            id="uni-website"
            value={website}
            onChange={(event) => setWebsite(event.target.value)}
            disabled={pending}
            placeholder="https://…"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-year" className="text-sm font-medium">
            Established year
          </label>
          <input
            id="uni-year"
            value={establishedYear}
            onChange={(event) => setEstablishedYear(event.target.value)}
            disabled={pending}
            inputMode="numeric"
            placeholder="1827"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-city" className="text-sm font-medium">
            City
          </label>
          <input
            id="uni-city"
            value={city}
            onChange={(event) => setCity(event.target.value)}
            disabled={pending}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-address" className="text-sm font-medium">
            Address
          </label>
          <input
            id="uni-address"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            disabled={pending}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-programs" className="text-sm font-medium">
            Programs (one per line)
          </label>
          <textarea
            id="uni-programs"
            value={programsText}
            onChange={(event) => setProgramsText(event.target.value)}
            disabled={pending}
            rows={4}
            placeholder={"Computer Science\nBusiness Administration"}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-levels" className="text-sm font-medium">
            Degree levels (one per line)
          </label>
          <textarea
            id="uni-levels"
            value={degreeLevelsText}
            onChange={(event) => setDegreeLevelsText(event.target.value)}
            disabled={pending}
            rows={4}
            placeholder={"Bachelor's\nMaster's\nPhD"}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-metatitle" className="text-sm font-medium">
            SEO title
          </label>
          <input
            id="uni-metatitle"
            value={metaTitle}
            onChange={(event) => setMetaTitle(event.target.value)}
            disabled={pending}
            maxLength={70}
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <label htmlFor="uni-metadesc" className="text-sm font-medium">
            SEO description
          </label>
          <input
            id="uni-metadesc"
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
        Published (visible publicly only with a published country)
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
        {pending ? "Saving…" : mode === "create" ? "Create university" : "Save changes"}
      </button>
    </form>
  );
}
