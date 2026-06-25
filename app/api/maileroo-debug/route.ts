import { NextResponse } from 'next/server'

export async function GET() {
  const apiKey = process.env.MAILEROO_API_KEY
  const fromEmail = process.env.MAILEROO_FROM_EMAIL ?? 'noreply@visiteurpro.com'

  if (!apiKey) {
    return NextResponse.json({ erreur: 'MAILEROO_API_KEY manquante' })
  }

  const form = new URLSearchParams()
  form.append('from',    fromEmail)
  form.append('to',      'kkonanjeanluc2@gmail.com')
  form.append('subject', 'Test VisitPro')
  form.append('html',    '<p>Test email Maileroo</p>')
  form.append('plain',   'Test email Maileroo')

  const res = await fetch('https://smtp.maileroo.com/send', {
    method: 'POST',
    headers: {
      'X-API-Key':    apiKey,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: form.toString(),
  })

  const responseData = await res.json().catch(() => null)

  return NextResponse.json({
    status:         res.status,
    ok:             res.ok,
    request_body:   form.toString(),
    response:       responseData,
    api_key_prefix: apiKey.substring(0, 8) + '...',
  })
}
