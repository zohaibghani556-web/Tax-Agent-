export default function AppLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 bg-slate-200 rounded-lg" />
      <div className="h-4 w-64 bg-slate-100 rounded-lg" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-2xl border border-slate-100 p-6 h-28" />
        ))}
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 h-64" />
    </div>
  );
}
