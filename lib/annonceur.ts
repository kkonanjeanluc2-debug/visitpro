// Annonces vocales de l'écran d'affichage — côté navigateur uniquement.
//
// Toutes les annonces passent par UNE file : une annonce ne commence que lorsque
// la précédente est entièrement terminée (carillon + voix), suivie d'une courte
// pause. Deux messages ne peuvent donc jamais être lus en même temps.

export type Annonce = {
  cle: string               // identifiant unique : une même clé n'est jamais lue deux fois
  texte: string
  priorite: number          // 0 = passe avant les annonces de priorité supérieure en attente
  carillon?: boolean
  dureeMinMs?: number       // durée minimale d'affichage (même si la voix est plus courte)
  onDebut?: () => void
  onFin?: () => void
}

const PAUSE_ENTRE_ANNONCES_MS = 1200
const DUREE_MAX_VOIX_MS = 25_000   // sécurité si le navigateur ne signale jamais la fin

let audioCtx: AudioContext | null = null
let methodeTTS: 'speech' | 'audio' | null = null
let sonActif = false
let enCours = false
const file: Annonce[] = []
const dejaAnnoncees = new Set<string>()
// Référence conservée : sinon Chrome peut libérer l'énoncé et ne jamais déclencher onend
let enonceCourant: SpeechSynthesisUtterance | null = null
let sourceCourante: AudioBufferSourceNode | null = null
let audioCourant: HTMLAudioElement | null = null

const attendre = (ms: number) => new Promise<void>(r => setTimeout(r, ms))

// ── Activation ───────────────────────────────────────────────────────────────

// À appeler depuis un geste utilisateur (clic) : déverrouille la lecture audio.
export function deverrouillerAudio() {
  try {
    if (!audioCtx) {
      type AnyAC = typeof AudioContext
      const AC: AnyAC | undefined =
        (window as unknown as Record<string, AnyAC>).AudioContext ??
        (window as unknown as Record<string, AnyAC>).webkitAudioContext
      if (!AC) return
      audioCtx = new AC()
    }
    if (audioCtx.state === 'suspended') audioCtx.resume().catch(() => {})
  } catch { /* */ }
}

// Sans geste utilisateur : le navigateur autorise-t-il déjà le son ? (mode kiosque, préférence du site)
export async function sonAutoriseSansGeste(): Promise<boolean> {
  deverrouillerAudio()
  if (!audioCtx) return false
  if (audioCtx.state === 'running') return true
  try { await Promise.race([audioCtx.resume(), attendre(300)]) } catch { /* */ }
  return (audioCtx.state as AudioContextState) === 'running'
}

export function activerSon(actif: boolean) {
  sonActif = actif
  if (!actif) arreterVoix()
}

// ── File d'annonces ──────────────────────────────────────────────────────────

export function annoncer(a: Annonce) {
  if (dejaAnnoncees.has(a.cle) || file.some(x => x.cle === a.cle)) return
  // Insertion stable par priorité
  const idx = file.findIndex(x => x.priorite > a.priorite)
  if (idx === -1) file.push(a)
  else file.splice(idx, 0, a)
  void traiterFile()
}

// Retire une annonce encore en attente (ex. bienvenue d'un visiteur déjà appelé)
export function retirer(cle: string) {
  const idx = file.findIndex(x => x.cle === cle)
  if (idx !== -1) file.splice(idx, 1)
}

// Marque une clé comme déjà traitée sans la lire (état initial de l'écran)
export function marquerAnnoncee(cle: string) {
  dejaAnnoncees.add(cle)
}

export function estOccupe() {
  return enCours || file.length > 0
}

async function traiterFile() {
  if (enCours) return
  enCours = true
  try {
    while (file.length > 0) {
      const a = file.shift()!
      dejaAnnoncees.add(a.cle)
      try { a.onDebut?.() } catch { /* */ }

      const lecture = (async () => {
        if (!sonActif) return
        // Une TV en veille peut avoir suspendu l'audio : on tente de le réveiller
        if (audioCtx && audioCtx.state === 'suspended') {
          try { await Promise.race([audioCtx.resume(), attendre(300)]) } catch { /* */ }
        }
        if (a.carillon) await jouerCarillon()
        await parler(a.texte)
      })()
      await Promise.all([lecture.catch(() => {}), attendre(a.dureeMinMs ?? 0)])

      try { a.onFin?.() } catch { /* */ }
      await attendre(PAUSE_ENTRE_ANNONCES_MS)
    }
  } finally {
    enCours = false
  }
}

// ── Carillon « ding-dong » ───────────────────────────────────────────────────

async function jouerCarillon() {
  if (!audioCtx || audioCtx.state !== 'running') return
  const ctx = audioCtx
  const note = (freq: number, debut: number, duree: number) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, debut)
    gain.gain.exponentialRampToValueAtTime(0.35, debut + 0.02)
    gain.gain.exponentialRampToValueAtTime(0.0001, debut + duree)
    osc.connect(gain).connect(ctx.destination)
    osc.start(debut)
    osc.stop(debut + duree + 0.05)
  }
  const t = ctx.currentTime + 0.05
  note(784, t, 0.9)          // sol
  note(622, t + 0.55, 1.2)   // mi bémol
  await attendre(1900)
}

// ── Voix ─────────────────────────────────────────────────────────────────────

function arreterVoix() {
  try { window.speechSynthesis?.cancel() } catch { /* */ }
  if (sourceCourante) { try { sourceCourante.stop() } catch { /* */ } sourceCourante = null }
  if (audioCourant) { try { audioCourant.pause() } catch { /* */ } audioCourant = null }
}

// Résout lorsque la voix a fini de parler (ou en cas d'échec / délai dépassé)
function parler(texte: string): Promise<void> {
  return new Promise(resolve => {
    let fini = false
    const terminer = () => {
      if (fini) return
      fini = true
      clearTimeout(garde)
      resolve()
    }
    const garde = setTimeout(() => { arreterVoix(); terminer() }, DUREE_MAX_VOIX_MS)
    const viaMp3 = () => { methodeTTS = 'audio'; jouerMp3(texte).then(terminer, terminer) }

    if (methodeTTS === 'audio') { viaMp3(); return }
    parlerNavigateur(texte, terminer, viaMp3)
  })
}

// Synthèse vocale du navigateur. onEchec n'est appelé qu'une fois, et jamais après un début de lecture.
function parlerNavigateur(texte: string, onFin: () => void, onEchec: () => void) {
  const synth = typeof window !== 'undefined' ? window.speechSynthesis : undefined
  if (!synth) { onEchec(); return }

  let demarre = false
  let bascule = false
  const echouer = () => {
    if (demarre || bascule) return
    bascule = true
    try { synth.cancel() } catch { /* */ }
    onEchec()
  }

  const lancer = () => {
    try {
      synth.cancel()
      const utt = new SpeechSynthesisUtterance(texte)
      utt.rate = 0.9
      utt.lang = 'fr-FR'
      const voix = synth.getVoices()
      const fr = voix.find(v => v.lang === 'fr-FR') ?? voix.find(v => v.lang.startsWith('fr'))
      if (fr) utt.voice = fr
      utt.onstart = () => { if (!bascule) { demarre = true; methodeTTS = 'speech' } }
      utt.onend = () => { if (!bascule) onFin() }
      utt.onerror = () => { if (demarre) onFin(); else echouer() }
      enonceCourant = utt
      synth.speak(utt)
      // Première utilisation : si la voix ne démarre pas vite, on bascule sur le MP3
      if (methodeTTS !== 'speech') setTimeout(echouer, 2000)
    } catch { echouer() }
  }

  if (synth.getVoices().length > 0) { lancer(); return }
  let lance = false
  const unique = () => { if (!lance) { lance = true; lancer() } }
  synth.addEventListener('voiceschanged', unique, { once: true })
  setTimeout(unique, 500)
}

// MP3 via notre proxy /api/tts. Résout à la fin de la lecture.
async function jouerMp3(texte: string, essais = 2): Promise<void> {
  for (let i = 0; i < essais; i++) {
    try {
      const res = await fetch(`/api/tts?q=${encodeURIComponent(texte)}`)
      if (!res.ok) throw new Error('tts')
      const buf = await res.arrayBuffer()

      if (audioCtx && audioCtx.state === 'running') {
        const decoded = await audioCtx.decodeAudioData(buf)
        await new Promise<void>(resolve => {
          const src = audioCtx!.createBufferSource()
          src.buffer = decoded
          src.connect(audioCtx!.destination)
          src.onended = () => { if (sourceCourante === src) sourceCourante = null; resolve() }
          sourceCourante = src
          src.start(0)
        })
        return
      }

      const url = URL.createObjectURL(new Blob([buf], { type: 'audio/mpeg' }))
      await new Promise<void>((resolve, reject) => {
        const audio = new Audio(url)
        audioCourant = audio
        audio.onended = () => { URL.revokeObjectURL(url); audioCourant = null; resolve() }
        audio.onerror = () => { URL.revokeObjectURL(url); audioCourant = null; reject(new Error('lecture')) }
        audio.play().catch(reject)
      })
      return
    } catch {
      if (i < essais - 1) await attendre(1000)
    }
  }
}
