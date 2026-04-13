export default function AppLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-6 animate-pulse">
      <div className="h-8 w-48 rounded-lg" style={{ background: 'rgba(255,255,255,0.08)' }} />
      <div className="h-4 w-64 rounded-lg" style={{ background: 'rgba(255,255,255,0.05)' }} />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-2xl p-6 h-28" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
        ))}
      </div>
      <div className="rounded-2xl h-64" style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }} />
    </div>
  );
}
