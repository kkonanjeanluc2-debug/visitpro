// Edge Function : retour-auto-dispo
// Cron : toutes les 5 minutes
// Remet à "disponible" les collaborateurs dont dispo_retour_auto est passé

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

Deno.serve(async (_req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('utilisateurs')
    .update({
      statut_dispo: 'disponible',
      dispo_message: null,
      dispo_retour_auto: null,
    })
    .not('dispo_retour_auto', 'is', null)
    .lte('dispo_retour_auto', now)
    .select('id, nom, prenom')

  if (error) {
    return new Response(JSON.stringify({ erreur: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({ retablis: data?.length ?? 0, utilisateurs: data }),
    { headers: { 'Content-Type': 'application/json' } },
  )
})
