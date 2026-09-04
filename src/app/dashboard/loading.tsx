export default function DashboardLoading() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3">
      <div
        className="h-10 w-10 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600"
        role="status"
        aria-label="Loading"
      />
      <p className="text-sm text-gray-500">Loading...</p>
    </div>
  );
}