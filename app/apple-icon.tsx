import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 180,
          height: 180,
          background: '#1E3A5F',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
          gap: 0,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 100,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: 'sans-serif',
          }}
        >
          V
        </span>
        <span
          style={{
            color: '#1DB98F',
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 8,
            fontFamily: 'sans-serif',
            marginTop: -6,
          }}
        >
          PRO
        </span>
      </div>
    ),
    { width: 180, height: 180 },
  )
}
