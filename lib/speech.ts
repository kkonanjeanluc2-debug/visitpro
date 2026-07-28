// Lecture vocale via Web Speech API
// Fonctionne quand l'app est ouverte (onglet actif ou en arrière-plan)

let voixFR: SpeechSynthesisVoice | null = null

function chargerVoixFR() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return
  const choisir = () => {
    const voix = window.speechSynthesis.getVoices()
    voixFR =
      voix.find(v => v.lang === 'fr-FR' && v.localService) ??
      voix.find(v => v.lang.startsWith('fr')) ??
      voix[0] ??
      null
  }
  choisir()
  // Les voix sont chargées de manière asynchrone dans certains navigateurs
  if (window.speechSynthesis.onvoiceschanged !== undefined) {
    window.speechSynthesis.onvoiceschanged = choisir
  }
}

export function initialiserSpeech() {
  if (typeof window === 'undefined') return
  chargerVoixFR()
}

export function lireVisite(nomVisiteur: string, motif?: string | null) {
  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return

  const motifTexte = motif?.trim() ? `. Motif : ${motif.trim()}` : ''
  const texte = `Attention. Visiteur : ${nomVisiteur}${motifTexte}`

  // Annuler toute lecture en cours
  window.speechSynthesis.cancel()

  const utterance = new SpeechSynthesisUtterance(texte)
  utterance.lang = 'fr-FR'
  utterance.rate = 0.9
  utterance.pitch = 1.05
  utterance.volume = 1

  if (voixFR) utterance.voice = voixFR

  window.speechSynthesis.speak(utterance)
}
