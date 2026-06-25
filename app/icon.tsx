import { ImageResponse } from 'next/og'

export const runtime     = 'edge'
export const size        = { width: 32, height: 32 }
export const contentType = 'image/png'

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: 32,
          height: 32,
          background: '#1E3A5F',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 7,
        }}
      >
        <span
          style={{
            color: '#ffffff',
            fontSize: 21,
            fontWeight: 900,
            lineHeight: 1,
            fontFamily: 'sans-serif',
          }}
        >
          V
        </span>
      </div>
    ),
    { width: 32, height: 32 },
  )
}
