import { ImageResponse } from 'next/og'

export const size        = { width: 180, height: 180 }
export const contentType = 'image/png'

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #1E3A5F 0%, #0D2040 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 36,
        }}
      >
        <span
          style={{
            color: 'white',
            fontSize: 100,
            fontWeight: 800,
            lineHeight: 1,
            letterSpacing: -3,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          V
        </span>
        <span
          style={{
            color: '#1DB98F',
            fontSize: 26,
            fontWeight: 700,
            letterSpacing: 9,
            marginTop: -8,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          PRO
        </span>
      </div>
    ),
    { ...size },
  )
}
