
export function TournamentLoading() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-white text-lg">Loading tournament details...</p>
        </div>
      </div>
    </div>
  );
}

export function TournamentNotFound() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900">
      <div className="container mx-auto px-4 py-8">
        <div className="text-center">
          <p className="text-white text-lg">Tournament not found</p>
        </div>
      </div>
    </div>
  );
}
