import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { envoyerEmail } from '@/lib/email'

export async function POST() {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const { data: utilisateur } = await supabase
    .from('utilisateurs')
    .select('nom, prenom, entreprise:entreprises(nom, nom_expediteur)')
    .eq('id', user.id)
    .single()

  const emailDestinataire = user.email!
  const entreprise = utilisateur?.entreprise as { nom?: string; nom_expediteur?: string } | null
  const nomEntreprise = entreprise?.nom ?? 'Votre entreprise'
  const nomExpediteur = entreprise?.nom_expediteur

  const result = await envoyerEmail({
    to: emailDestinataire,
    toName: `${utilisateur?.prenom ?? ''} ${utilisateur?.nom ?? ''}`.trim(),
    sujet: `✅ Test email VisitPro — ${nomEntreprise}`,
    html: `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:Arial,sans-serif">
  <div style="max-width:480px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb">
    <div style="background:#1E3A5F;border-radius:12px 12px 0 0;padding:20px;text-align:center">
      <div style="color:#93C5FD;font-size:12px;text-transform:uppercase;letter-spacing:.05em">VisitPro</div>
      <div style="color:#fff;font-size:18px;font-weight:500;margin-top:4px">✅ Email de test reçu !</div>
    </div>
    <div style="padding:28px 32px">
      <p style="color:#333;font-size:14px;line-height:1.6;margin:0 0 16px">
        Les emails de notification de <strong>${nomEntreprise}</strong> sont bien configurés et fonctionnels.
      </p>
      <p style="color:#555;font-size:13px;line-height:1.6;margin:0 0 12px">
        Vos visiteurs recevront automatiquement des emails lors de :
      </p>
      <ul style="color:#555;font-size:13px;line-height:1.8;padding-left:20px;margin:0 0 20px">
        <li>Confirmation d'un rendez-vous</li>
        <li>Rappel la veille du rendez-vous</li>
        <li>Enregistrement de leur arrivée</li>
      </ul>
      <p style="color:#888;font-size:12px;margin:0;border-top:1px solid #e5e7eb;padding-top:16px">
        Message envoyé automatiquement par VisitPro pour le compte de ${nomEntreprise}.
      </p>
    </div>
  </div>
</body>
</html>`,
    texte: `Test email VisitPro — ${nomEntreprise}\n\nLes emails sont bien configurés.\n\nVisitPro`,
    fromName: nomExpediteur ? `${nomExpediteur} via VisitPro` : undefined,
  })

  if (result.success) {
    return NextResponse.json({ success: true, message: `Email de test envoyé à ${emailDestinataire}` })
  }
  return NextResponse.json({ success: false, error: result.erreur }, { status: 500 })
}
