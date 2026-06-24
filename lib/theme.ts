// Gestion du thème couleurs par entreprise

export function hexToRgbChannels(hex: string): string {
  const clean = hex.replace('#', '')
  const r = parseInt(clean.slice(0, 2), 16)
  const g = parseInt(clean.slice(2, 4), 16)
  const b = parseInt(clean.slice(4, 6), 16)
  if (isNaN(r) || isNaN(g) || isNaN(b)) return ''
  return `${r} ${g} ${b}`
}

function darkenChannels(hex: string, amount: number): string {
  const clean = hex.replace('#', '')
  const r = Math.max(0, parseInt(clean.slice(0, 2), 16) - amount)
  const g = Math.max(0, parseInt(clean.slice(2, 4), 16) - amount)
  const b = Math.max(0, parseInt(clean.slice(4, 6), 16) - amount)
  return `${r} ${g} ${b}`
}

export function applyTheme(primary?: string | null, accent?: string | null) {
  if (typeof document === 'undefined') return
  const root = document.documentElement

  if (primary && /^#[0-9A-Fa-f]{6}$/.test(primary)) {
    root.style.setProperty('--color-primary-rgb',        hexToRgbChannels(primary))
    root.style.setProperty('--color-primary-dark-rgb',   darkenChannels(primary, 8))
    root.style.setProperty('--color-primary-darker-rgb', darkenChannels(primary, 16))
  }

  if (accent && /^#[0-9A-Fa-f]{6}$/.test(accent)) {
    root.style.setProperty('--color-accent-rgb',         hexToRgbChannels(accent))
    root.style.setProperty('--color-accent-dark-rgb',    darkenChannels(accent, 8))
    root.style.setProperty('--color-accent-darker-rgb',  darkenChannels(accent, 16))
  }
}

// Convertit des canaux RGB "R G B" en hex #RRGGBB
export function rgbChannelsToHex(channels: string): string {
  const [r, g, b] = channels.trim().split(' ').map(Number)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}
