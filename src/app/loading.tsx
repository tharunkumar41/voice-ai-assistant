import { PageSpinner } from "@/components/ui/spinner";

/**
 * Root-level Suspense fallback. Shown automatically by Next.js while an
 * async server component (e.g. the dashboard layout's auth check + the
 * dashboard page's data queries) is still resolving, so navigating in
 * never looks stuck with a blank screen.
 */
export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <PageSpinner label="Loading..." />
    </div>
  );
}
