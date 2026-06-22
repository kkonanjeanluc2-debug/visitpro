let _ctx: AudioContext | null = null

/**
 * À appeler dans un useEffect au montage du composant.
 * Crée l'AudioContext et le réactive sur chaque interaction utilisateur.
 * Retourne la fonction de cleanup pour useEffect.
 */
export function initialiserAudio(): () => void {
  if (typeof window === 'undefined') return () => {}

  try {
    if (!_ctx) {
      const Ctor =
        window.AudioContext ||
        (window as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!Ctor) return () => {}
      _ctx = new Ctor()
    }
  } catch {
    return () => {}
  }

  // Le navigateur suspend l'AudioContext s'il n'y a pas eu de geste utilisateur.
  // On le réactive à chaque click/touch pour qu'il soit prêt quand le son arrive.
  const resume = () => {
    if (_ctx?.state === 'suspended') _ctx.resume().catch(() => {})
  }

  document.addEventListener('click', resume)
  document.addEventListener('touchstart', resume)

  return () => {
    document.removeEventListener('click', resume)
    document.removeEventListener('touchstart', resume)
  }
}

export type TypeSon = 'nouvelle_visite' | 'changement_statut' | 'decision'

export function jouerSon(type: TypeSon = 'changement_statut'): void {
  const ctx = _ctx
  if (!ctx) return

  const executer = () => {
    try {
      if (type === 'nouvelle_visite') {
        // Mélodie montante Do-Mi-Sol
        note(ctx, 523.25, 0,    0.22)
        note(ctx, 659.25, 0.16, 0.22)
        note(ctx, 783.99, 0.32, 0.38)
      } else if (type === 'decision') {
        // Deux notes descendantes
        note(ctx, 880,    0,   0.22)
        note(ctx, 659.25, 0.2, 0.30)
      } else {
        // Double bip – changement de statut
        note(ctx, 880, 0,   0.13)
        note(ctx, 880, 0.2, 0.13)
      }
    } catch {}
  }

  if (ctx.state === 'suspended') {
    ctx.resume().then(executer).catch(() => {})
  } else if (ctx.state === 'running') {
    executer()
  }
}

function note(ctx: AudioContext, freq: number, delai: number, duree: number) {
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.type = 'sine'
  osc.frequency.value = freq
  const t = ctx.currentTime + delai
  gain.gain.setValueAtTime(0, t)
  gain.gain.linearRampToValueAtTime(0.25, t + 0.025)
  gain.gain.exponentialRampToValueAtTime(0.001, t + duree)
  osc.start(t)
  osc.stop(t + duree + 0.05)
}
