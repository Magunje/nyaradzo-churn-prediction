export default function LoadingState({ label = "Loading..." }) {
  return (
    <div className="panel flex items-center justify-center gap-3 px-6 py-16 text-ink/60">
      <div className="h-3 w-3 animate-pulse rounded-full bg-fern" />
      <span className="text-sm font-medium">{label}</span>
    </div>
  );
}
