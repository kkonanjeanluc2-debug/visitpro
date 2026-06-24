export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      {/* Titre */}
      <div className="h-7 bg-gray-200 rounded-lg w-52" />

      {/* Cartes KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Contenu principal */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="h-72 bg-gray-200 rounded-xl" />
        <div className="h-72 bg-gray-200 rounded-xl" />
      </div>

      {/* Liste */}
      <div className="space-y-3">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-gray-200 rounded-xl" />
        ))}
      </div>
    </div>
  )
}
