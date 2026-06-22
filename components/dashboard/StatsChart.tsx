'use client'

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line
} from 'recharts'

interface VisitesParJourData {
  date: string
  visites: number
}

interface VisitesParCollabData {
  nom: string
  visites: number
}

interface StatsChartProps {
  visitesParJour?: VisitesParJourData[]
  visitesParCollab?: VisitesParCollabData[]
  tauxAcceptation?: { name: string; value: number }[]
  heuresPointe?: { heure: string; visites: number }[]
}

const COULEURS = ['#1D9E75', '#1E3A5F', '#EF9F27', '#E24B4A', '#8B5CF6', '#06B6D4']

export default function StatsChart({ visitesParJour = [], visitesParCollab = [], tauxAcceptation = [], heuresPointe = [] }: StatsChartProps) {
  return (
    <div className="space-y-6">
      {/* Visites par jour */}
      {visitesParJour.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Visites par jour (7 derniers jours)</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitesParJour} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
                  labelStyle={{ fontWeight: 600 }}
                />
                <Bar dataKey="visites" fill="#1D9E75" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Répartition par collaborateur */}
      {visitesParCollab.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-gray-700 mb-3">Visites par collaborateur</h3>
          <div className="h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={visitesParCollab} layout="vertical" margin={{ top: 5, right: 10, left: 60, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nom" tick={{ fontSize: 11 }} width={55} />
                <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                <Bar dataKey="visites" fill="#1E3A5F" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Taux acceptation */}
        {tauxAcceptation.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Taux acceptation vs déclin</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tauxAcceptation}
                    cx="50%"
                    cy="50%"
                    innerRadius={35}
                    outerRadius={60}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {tauxAcceptation.map((_, index) => (
                      <Cell key={index} fill={COULEURS[index % COULEURS.length]} />
                    ))}
                  </Pie>
                  <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {/* Heures de pointe */}
        {heuresPointe.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Heures de pointe</h3>
            <div className="h-40">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={heuresPointe} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="heure" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip contentStyle={{ fontSize: 12, borderRadius: 8 }} />
                  <Line type="monotone" dataKey="visites" stroke="#EF9F27" strokeWidth={2} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
