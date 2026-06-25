import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.MAILEROO_API_KEY
  const fromEmail = process.env.MAILEROO_FROM_EMAIL ?? 'noreply@visiteurpro.com'

  if (!apiKey) {
    return NextResponse.json({ erreur: 'MAILEROO_API_KEY manquante' })
  }

  const bodyObj = {
    from:    fromEmail,
    to:      ['kkonanjeanluc2@gmail.com'],
    subject: 'Test VisitPro',
    html:    '<p>Test email Maileroo</p>',
    plain:   'Test email Maileroo',
  }

  const bodyStr = JSON.stringify(bodyObj)

  const res = await fetch('https://smtp.maileroo.com/send', {
    method: 'POST',
    headers: {
      'X-API-Key':    apiKey,
      'Content-Type': 'application/json',
    },
    body: bodyStr,
  })

  const responseData = await res.json().catch(() => null)

  return NextResponse.json({
    status:       res.status,
    ok:           res.ok,
    request_body: bodyObj,
    response:     responseData,
    api_key_prefix: apiKey.substring(0, 8) + '...',
  })
}
