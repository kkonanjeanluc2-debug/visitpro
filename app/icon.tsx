import { ImageResponse } from 'next/og'

export const size        = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: 'linear-gradient(145deg, #1E3A5F 0%, #0D2040 100%)',
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
          position: 'relative',
        }}
      >
        {/* Lettre V */}
        <span
          style={{
            color: 'white',
            fontSize: 22,
            fontWeight: 800,
            lineHeight: 1,
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          V
        </span>
        {/* Pastille accent verte */}
        <div
          style={{
            position: 'absolute',
            bottom: 4,
            right: 4,
            width: 7,
            height: 7,
            borderRadius: 999,
            background: '#1DB98F',
          }}
        />
      </div>
    ),
    { ...size },
  )
}
