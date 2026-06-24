export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      {/* Titre + badge */}
      <div className="flex items-center gap-3">
        <div className="h-7 bg-gray-200 rounded-lg w-56" />
        <div className="h-6 bg-gray-200 rounded-full w-20" />
      </div>

      {/* Bloc principal */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-28 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Section contenu */}
      <div className="h-64 bg-gray-200 rounded-xl" />

      {/* Lignes paramètres */}
      <div className="space-y-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-12 bg-gray-200 rounded-lg" />
        ))}
      </div>
    </div>
  )
}
