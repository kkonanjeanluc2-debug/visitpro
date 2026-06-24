export default function Loading() {
  return (
    <div className="p-6 space-y-5 animate-pulse">
      {/* En-tête */}
      <div className="flex items-center gap-4">
        <div className="h-7 bg-gray-200 rounded-lg w-48" />
        <div className="h-9 bg-gray-200 rounded-xl w-36 ml-auto" />
      </div>

      {/* Cartes visites */}
      <div className="space-y-3">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-20 bg-gray-200 rounded-xl" />
        ))}
      </div>

      {/* Formulaire / panneau latéral */}
      <div className="h-48 bg-gray-200 rounded-xl" />
    </div>
  )
}
