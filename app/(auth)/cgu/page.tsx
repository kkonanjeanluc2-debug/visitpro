import Link from 'next/link'

export const metadata = {
  title: 'Conditions Générales d\'Utilisation — VisitPro',
  description: 'CGU, politique de confidentialité et traitement des données personnelles de VisitPro, conformément à la loi ivoirienne n° 2013-450.',
}

const LAST_UPDATED = '22 août 2025'
const CGU_VERSION  = '1.0'

export default function CGUPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* En-tête */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/login" className="flex items-center gap-2 text-primary font-bold text-lg">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            VisitPro
          </Link>
          <span className="text-xs text-gray-400">Version {CGU_VERSION} — {LAST_UPDATED}</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {/* Titre */}
          <div className="bg-primary px-8 py-10 text-white">
            <h1 className="text-3xl font-bold mb-2">
              Conditions Générales d&apos;Utilisation
            </h1>
            <p className="text-primary-100 text-sm">
              et Politique de Protection des Données à Caractère Personnel
            </p>
            <div className="mt-4 flex gap-4 text-xs text-primary-200">
              <span>Version {CGU_VERSION}</span>
              <span>·</span>
              <span>En vigueur depuis le {LAST_UPDATED}</span>
            </div>
          </div>

          <div className="px-8 py-10 space-y-10 text-gray-700 leading-relaxed">

            {/* Sommaire */}
            <nav className="bg-gray-50 rounded-xl p-5 border border-gray-200">
              <h2 className="font-semibold text-gray-900 text-sm mb-3">Sommaire</h2>
              <ol className="space-y-1 text-sm text-primary list-decimal list-inside">
                {[
                  'Préambule et identification du responsable du traitement',
                  'Objet et champ d\'application',
                  'Définitions',
                  'Accès au service et création de compte',
                  'Description des services',
                  'Obligations du Client',
                  'Obligations de VisitPro',
                  'Données à caractère personnel — Conformité Loi n° 2013-450',
                  'Propriété intellectuelle',
                  'Responsabilité et limitation de garantie',
                  'Durée et résiliation',
                  'Tarification et conditions de paiement',
                  'Dispositions générales',
                  'Droit applicable et juridiction compétente',
                  'Contact et réclamations',
                ].map((item, i) => (
                  <li key={i}><a href={`#art-${i + 1}`} className="hover:underline">{item}</a></li>
                ))}
              </ol>
            </nav>

            {/* Article 1 */}
            <article id="art-1">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 1 — Préambule et identification du responsable du traitement
              </h2>
              <p>
                La plateforme <strong>VisitPro</strong> est un logiciel de gestion des visites et
                des accueils en entreprise (SaaS — Software as a Service), éditée et exploitée par{' '}
                <strong>VisitPro SARL</strong> (ci-après <em>« l&apos;Éditeur »</em>), société de
                droit ivoirien dont le siège social est établi en République de Côte d&apos;Ivoire.
              </p>
              <p className="mt-3">
                L&apos;Éditeur agit en qualité de <strong>responsable du traitement</strong> des
                données à caractère personnel au sens de la{' '}
                <strong>Loi n° 2013-450 du 19 juin 2013</strong> relative à la protection des
                données à caractère personnel en Côte d&apos;Ivoire.
              </p>
              <p className="mt-3">
                Contact du délégué à la protection des données :{' '}
                <strong>dpo@visitpro.ci</strong>
              </p>
            </article>

            {/* Article 2 */}
            <article id="art-2">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 2 — Objet et champ d&apos;application
              </h2>
              <p>
                Les présentes Conditions Générales d&apos;Utilisation (ci-après <em>« CGU »</em>)
                ont pour objet de définir les modalités et conditions d&apos;accès et d&apos;utilisation
                de la plateforme VisitPro, ainsi que les droits et obligations respectifs de
                l&apos;Éditeur et de tout utilisateur (ci-après <em>« le Client »</em>).
              </p>
              <p className="mt-3">
                Toute inscription ou utilisation de la plateforme vaut{' '}
                <strong>acceptation pleine et entière</strong> des présentes CGU et de la politique
                de confidentialité. Si vous n&apos;acceptez pas ces conditions, vous ne pouvez pas
                utiliser le service.
              </p>
              <p className="mt-3">
                Les présentes CGU s&apos;appliquent à l&apos;ensemble des fonctionnalités proposées
                par VisitPro : gestion des visites, badge visiteur, agenda, réunions, comptes rendus,
                messagerie interne, rapports et statistiques.
              </p>
            </article>

            {/* Article 3 */}
            <article id="art-3">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 3 — Définitions
              </h2>
              <dl className="space-y-3">
                {[
                  ['Client', 'Toute personne morale (entreprise, cabinet, institution) qui souscrit au service VisitPro.'],
                  ['Utilisateur', 'Toute personne physique disposant d\'un compte au sein d\'une organisation Cliente (administrateur, secrétaire, collaborateur).'],
                  ['Visiteur', 'Toute personne physique dont les données sont enregistrées lors d\'une visite dans les locaux du Client.'],
                  ['Données personnelles', 'Toute information permettant d\'identifier directement ou indirectement une personne physique (nom, email, téléphone, photographie, etc.), conformément à la Loi n° 2013-450.'],
                  ['Traitement', 'Toute opération effectuée sur des données personnelles : collecte, enregistrement, conservation, utilisation, communication, effacement.'],
                  ['Service', 'La plateforme logicielle VisitPro accessible via internet en mode SaaS.'],
                  ['APDP', 'Autorité de Protection des Données à caractère Personnel, autorité de contrôle ivoirienne compétente en matière de protection des données.'],
                ].map(([terme, def]) => (
                  <div key={terme} className="flex gap-3">
                    <dt className="font-semibold text-gray-900 w-40 flex-shrink-0">{terme}</dt>
                    <dd className="text-gray-600">{def}</dd>
                  </div>
                ))}
              </dl>
            </article>

            {/* Article 4 */}
            <article id="art-4">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 4 — Accès au service et création de compte
              </h2>
              <p>
                L&apos;accès au service est conditionné à la création d&apos;un compte entreprise
                et à l&apos;acceptation des présentes CGU. Le Client s&apos;engage à fournir des
                informations exactes, complètes et à jour lors de l&apos;inscription.
              </p>
              <ul className="mt-4 space-y-2 list-disc list-inside text-gray-600">
                <li>Toute personne souhaitant utiliser VisitPro doit être âgée d&apos;au moins 18 ans ou représenter légalement une entité juridique.</li>
                <li>Le Client est responsable de la confidentialité de ses identifiants de connexion et de toutes les actions effectuées sous son compte.</li>
                <li>En cas de compromission des identifiants, le Client doit immédiatement notifier l&apos;Éditeur à <strong>support@visitpro.ci</strong>.</li>
                <li>L&apos;Éditeur se réserve le droit de suspendre tout compte dont les informations seraient manifestement incorrectes ou frauduleuses.</li>
              </ul>
            </article>

            {/* Article 5 */}
            <article id="art-5">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 5 — Description des services
              </h2>
              <p>VisitPro propose notamment les fonctionnalités suivantes :</p>
              <ul className="mt-3 space-y-1.5 list-disc list-inside text-gray-600">
                <li>Enregistrement et suivi des visites (arrivée, accueil, départ)</li>
                <li>Génération de badges visiteurs</li>
                <li>Gestion de l&apos;agenda et des rendez-vous</li>
                <li>Organisation et compte rendu de réunions avec signature numérique</li>
                <li>Messagerie interne entre utilisateurs</li>
                <li>Rapports d&apos;activité et statistiques</li>
                <li>Notifications par e-mail et messages instantanés</li>
                <li>Gestion des listes noires et contrôle d&apos;accès</li>
              </ul>
              <p className="mt-4">
                L&apos;Éditeur se réserve le droit de modifier, améliorer ou supprimer des
                fonctionnalités à tout moment, en notifiant les Clients au préalable avec un
                délai raisonnable.
              </p>
            </article>

            {/* Article 6 */}
            <article id="art-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 6 — Obligations du Client
              </h2>
              <p>Le Client s&apos;engage à :</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-600">
                <li>Utiliser le service conformément à sa destination et aux lois ivoiriennes en vigueur, notamment la <strong>Loi n° 2013-451 du 19 juin 2013</strong> relative à la lutte contre la cybercriminalité.</li>
                <li>Obtenir le consentement explicite des visiteurs dont les données sont collectées, en les informant de leurs droits conformément à la Loi n° 2013-450.</li>
                <li>Ne pas utiliser le service à des fins illicites, frauduleuses ou contraires à l&apos;ordre public.</li>
                <li>Ne pas tenter d&apos;accéder sans autorisation aux données d&apos;autres Clients ou de modifier les composants techniques de la plateforme.</li>
                <li>S&apos;acquitter des redevances dues dans les délais convenus.</li>
                <li>Maintenir la confidentialité des comptes utilisateurs créés au sein de son organisation.</li>
                <li>Déclarer à l&apos;APDP, si requis par la loi, les traitements de données opérés via VisitPro en tant que responsable du traitement.</li>
              </ul>
            </article>

            {/* Article 7 */}
            <article id="art-7">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 7 — Obligations de VisitPro
              </h2>
              <p>L&apos;Éditeur s&apos;engage à :</p>
              <ul className="mt-3 space-y-2 list-disc list-inside text-gray-600">
                <li>Mettre en œuvre les mesures techniques et organisationnelles appropriées pour assurer la sécurité, la confidentialité et l&apos;intégrité des données.</li>
                <li>Assurer la disponibilité du service avec un niveau de service (SLA) de 99 % par mois, hors maintenances planifiées.</li>
                <li>Notifier le Client dans les meilleurs délais en cas de violation de données susceptible d&apos;affecter ses données ou celles de ses visiteurs.</li>
                <li>Ne pas vendre, louer ou céder les données du Client à des tiers à des fins commerciales.</li>
                <li>Traiter les données uniquement sur instruction du Client et pour l&apos;exécution du service.</li>
                <li>Garantir que les sous-traitants éventuels présentent des garanties suffisantes en matière de protection des données.</li>
              </ul>
            </article>

            {/* Article 8 — DONNÉES PERSONNELLES */}
            <article id="art-8" className="bg-blue-50 border border-blue-200 rounded-xl p-6">
              <h2 className="text-xl font-bold text-blue-900 mb-4 pb-2 border-b border-blue-200">
                Article 8 — Données à caractère personnel
              </h2>
              <p className="text-blue-800 font-medium mb-2">
                Conformément à la Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel en République de Côte d&apos;Ivoire.
              </p>

              <div className="space-y-6 mt-5">
                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.1 Données collectées</h3>
                  <p className="text-sm text-gray-700 mb-2">VisitPro collecte les catégories de données suivantes :</p>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-blue-900">Catégorie</th>
                          <th className="text-left px-3 py-2 font-semibold text-blue-900">Données</th>
                          <th className="text-left px-3 py-2 font-semibold text-blue-900">Personnes concernées</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {[
                          ['Identification', 'Nom, prénom, email, téléphone', 'Utilisateurs, visiteurs'],
                          ['Connexion', 'Adresse IP, horodatage, navigateur', 'Utilisateurs'],
                          ['Activité', 'Historique des visites, statuts, notes', 'Visiteurs'],
                          ['Organisation', 'Nom entreprise, adresse, secteur', 'Clients'],
                          ['Documents', 'Comptes rendus, signatures numériques', 'Utilisateurs'],
                          ['Données sensibles', 'Aucune donnée sensible (santé, opinion, etc.) ne doit être enregistrée sur la plateforme', '—'],
                        ].map(([cat, data, persons]) => (
                          <tr key={cat}>
                            <td className="px-3 py-2 font-medium text-gray-800">{cat}</td>
                            <td className="px-3 py-2 text-gray-600">{data}</td>
                            <td className="px-3 py-2 text-gray-600">{persons}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.2 Finalités du traitement</h3>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li>Fourniture et amélioration du service contractuellement convenu</li>
                    <li>Gestion des accès aux locaux et sécurité des sites</li>
                    <li>Communication relative au compte (alertes, notifications)</li>
                    <li>Facturation et gestion comptable</li>
                    <li>Sécurité informatique et prévention des fraudes</li>
                    <li>Obligations légales (en réponse à une réquisition judiciaire)</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.3 Base légale</h3>
                  <ul className="text-sm text-gray-700 space-y-1 list-disc list-inside">
                    <li><strong>Exécution du contrat</strong> (art. 1er, Loi 2013-450) : traitement nécessaire à la fourniture du service souscrit.</li>
                    <li><strong>Consentement</strong> : collecte des données visiteurs avec information préalable affichée à l&apos;accueil.</li>
                    <li><strong>Intérêt légitime</strong> : sécurité informatique, prévention de la fraude, amélioration du service.</li>
                    <li><strong>Obligation légale</strong> : conservation des journaux d&apos;accès sur réquisition des autorités compétentes.</li>
                  </ul>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.4 Durée de conservation</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm border border-gray-200 rounded-lg overflow-hidden">
                      <thead className="bg-blue-100">
                        <tr>
                          <th className="text-left px-3 py-2 font-semibold text-blue-900">Données</th>
                          <th className="text-left px-3 py-2 font-semibold text-blue-900">Durée</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {[
                          ['Données de compte actif', 'Durée du contrat + 3 ans (prescription commerciale OHADA)'],
                          ['Historique des visites', '5 ans à compter de la date de visite'],
                          ['Journaux de connexion', '12 mois glissants'],
                          ['Comptes rendus de réunion', '10 ans (valeur probante)'],
                          ['Données de facturation', '10 ans (obligation comptable)'],
                          ['Données après résiliation', 'Suppression sous 90 jours sauf obligation légale'],
                        ].map(([data, duree]) => (
                          <tr key={data}>
                            <td className="px-3 py-2 font-medium text-gray-800">{data}</td>
                            <td className="px-3 py-2 text-gray-600">{duree}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.5 Droits des personnes concernées</h3>
                  <p className="text-sm text-gray-700 mb-2">
                    Conformément aux articles 31 à 40 de la Loi n° 2013-450, toute personne concernée dispose des droits suivants :
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {[
                      ['Droit d\'accès', 'Obtenir la confirmation du traitement de vos données et en recevoir une copie.'],
                      ['Droit de rectification', 'Faire corriger toute donnée inexacte ou incomplète.'],
                      ['Droit d\'effacement', 'Demander la suppression de vos données lorsque leur traitement n\'est plus nécessaire.'],
                      ['Droit d\'opposition', 'Vous opposer au traitement fondé sur l\'intérêt légitime de l\'Éditeur.'],
                      ['Droit à la portabilité', 'Recevoir vos données dans un format structuré et lisible par machine.'],
                      ['Droit de limitation', 'Demander la suspension temporaire du traitement de vos données.'],
                    ].map(([droit, desc]) => (
                      <div key={droit} className="bg-white rounded-lg p-3 border border-gray-200">
                        <p className="font-medium text-gray-900 text-sm">{droit}</p>
                        <p className="text-xs text-gray-600 mt-0.5">{desc}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-sm text-gray-700 mt-3">
                    Pour exercer ces droits, contactez-nous à <strong>dpo@visitpro.ci</strong> en joignant une copie de votre pièce d&apos;identité. Nous répondons sous <strong>30 jours ouvrables</strong>. En cas de réponse insatisfaisante, vous pouvez introduire une réclamation auprès de l&apos;{' '}
                    <strong>APDP (Autorité de Protection des Données à caractère Personnel)</strong> — Côte d&apos;Ivoire.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.6 Hébergement et transferts</h3>
                  <p className="text-sm text-gray-700">
                    Les données sont hébergées sur les serveurs de <strong>Supabase Inc.</strong> (prestataire de cloud basé en Allemagne / région UE) bénéficiant de certifications de sécurité (SOC 2 Type II, ISO 27001). Ce transfert hors Côte d&apos;Ivoire est encadré par des clauses contractuelles garantissant un niveau de protection équivalent à la Loi n° 2013-450, conformément à l&apos;article 36 de cette loi. Aucun transfert à des tiers non autorisés n&apos;est effectué.
                  </p>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-900 mb-2">8.7 Sécurité</h3>
                  <p className="text-sm text-gray-700">
                    L&apos;Éditeur met en œuvre les mesures techniques suivantes : chiffrement des communications (TLS 1.3), chiffrement des mots de passe (bcrypt), contrôle d&apos;accès par rôle (RLS), journalisation des accès, sauvegardes quotidiennes. En cas de violation de données présentant un risque élevé, le Client concerné sera notifié dans les <strong>72 heures</strong>.
                  </p>
                </section>
              </div>
            </article>

            {/* Article 9 */}
            <article id="art-9">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 9 — Propriété intellectuelle
              </h2>
              <p>
                La plateforme VisitPro, son code source, son interface graphique, ses bases de données,
                ses algorithmes, ses marques et logos sont la propriété exclusive de l&apos;Éditeur et sont
                protégés par le droit de la propriété intellectuelle applicable en République de Côte d&apos;Ivoire.
              </p>
              <p className="mt-3">
                Le Client bénéficie d&apos;une <strong>licence d&apos;utilisation non exclusive, non transférable
                et révocable</strong> pour la durée du contrat. Cette licence n&apos;inclut aucun droit de copier,
                modifier, distribuer, décompiler, rétro-ingénérer ou créer des œuvres dérivées à partir du service.
              </p>
              <p className="mt-3">
                Les <strong>données du Client</strong> restent sa propriété exclusive. L&apos;Éditeur ne
                revendique aucun droit sur ces données et s&apos;engage à les restituer ou les supprimer
                conformément à l&apos;article 11.
              </p>
            </article>

            {/* Article 10 */}
            <article id="art-10">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 10 — Responsabilité et limitation de garantie
              </h2>
              <p>
                Le service est fourni <strong>« en l&apos;état »</strong>. L&apos;Éditeur s&apos;efforce
                d&apos;assurer la disponibilité et la fiabilité du service, mais ne peut garantir une
                disponibilité ininterrompue.
              </p>
              <p className="mt-3">
                La responsabilité de l&apos;Éditeur ne saurait être engagée en cas de :
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
                <li>Perte de données résultant d&apos;une faute ou négligence du Client</li>
                <li>Interruption du service due à un cas de force majeure</li>
                <li>Dommages indirects, pertes de revenus, pertes d&apos;exploitation</li>
                <li>Utilisation du service par un tiers ayant obtenu les identifiants du Client</li>
                <li>Défaillance du réseau internet indépendante de la volonté de l&apos;Éditeur</li>
              </ul>
              <p className="mt-3">
                En tout état de cause, la responsabilité totale de l&apos;Éditeur est plafonnée au montant
                des sommes effectivement payées par le Client au cours des 12 derniers mois précédant le litige.
              </p>
            </article>

            {/* Article 11 */}
            <article id="art-11">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 11 — Durée et résiliation
              </h2>
              <p>
                Le contrat prend effet à compter de la création du compte et est conclu pour une durée
                indéterminée, tacitement reconduite selon la périodicité d&apos;abonnement choisie.
              </p>
              <p className="mt-3">
                <strong>Résiliation par le Client :</strong> le Client peut résilier son abonnement à
                tout moment, avec effet à l&apos;échéance de la période en cours. Les données resteront
                accessibles jusqu&apos;à la fin de la période payée.
              </p>
              <p className="mt-3">
                <strong>Résiliation par l&apos;Éditeur :</strong> l&apos;Éditeur peut résilier le contrat
                avec un préavis de 30 jours, ou immédiatement en cas de violation grave des présentes CGU,
                de non-paiement persistant, ou d&apos;utilisation illicite du service.
              </p>
              <p className="mt-3">
                À la résiliation, le Client peut exporter ses données pendant 30 jours supplémentaires.
                Passé ce délai, les données sont définitivement supprimées dans un délai de 90 jours.
              </p>
            </article>

            {/* Article 12 */}
            <article id="art-12">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 12 — Tarification et conditions de paiement
              </h2>
              <p>
                Les tarifs en vigueur sont affichés sur la plateforme et peuvent évoluer. Toute modification
                tarifaire est notifiée au Client par e-mail avec un préavis de <strong>30 jours</strong>.
                L&apos;utilisation du service après la date de prise d&apos;effet du nouveau tarif vaut
                acceptation.
              </p>
              <p className="mt-3">
                Les paiements sont exigibles à terme à échoir. En cas de non-paiement à l&apos;échéance,
                l&apos;accès au service peut être suspendu après mise en demeure restée infructueuse pendant
                15 jours. Des pénalités de retard égales à 1,5 fois le taux d&apos;intérêt légal ivoirien
                pourront être appliquées.
              </p>
            </article>

            {/* Article 13 */}
            <article id="art-13">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 13 — Dispositions générales
              </h2>
              <p>
                Si une clause des présentes CGU venait à être déclarée nulle ou inapplicable, les autres
                clauses demeurent valables et continuent de produire leurs effets.
              </p>
              <p className="mt-3">
                Le fait pour l&apos;Éditeur de ne pas se prévaloir d&apos;un manquement du Client ne constitue
                pas une renonciation à invoquer ce manquement dans l&apos;avenir.
              </p>
              <p className="mt-3">
                L&apos;Éditeur se réserve le droit de modifier les présentes CGU à tout moment. Les modifications
                prennent effet <strong>30 jours</strong> après notification par e-mail. La poursuite de l&apos;utilisation
                du service vaut acceptation des nouvelles CGU. Si le Client refuse les nouvelles conditions, il peut
                résilier son contrat sans frais pendant la période de préavis.
              </p>
            </article>

            {/* Article 14 */}
            <article id="art-14">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 14 — Droit applicable et juridiction compétente
              </h2>
              <p>
                Les présentes CGU sont régies par le <strong>droit ivoirien</strong>, notamment :
              </p>
              <ul className="mt-2 space-y-1 list-disc list-inside text-gray-600">
                <li>Loi n° 2013-450 du 19 juin 2013 relative à la protection des données à caractère personnel</li>
                <li>Loi n° 2013-451 du 19 juin 2013 relative à la lutte contre la cybercriminalité</li>
                <li>Loi n° 2017-968 du 8 décembre 2017 relative aux transactions électroniques</li>
                <li>Acte Uniforme OHADA relatif au droit commercial général</li>
              </ul>
              <p className="mt-4">
                En cas de litige, les parties s&apos;engagent à rechercher une solution amiable dans un délai
                de 30 jours. À défaut d&apos;accord, tout litige relatif à l&apos;interprétation ou à l&apos;exécution
                des présentes CGU sera soumis à la compétence exclusive des{' '}
                <strong>Tribunaux d&apos;Abidjan</strong>, République de Côte d&apos;Ivoire.
              </p>
            </article>

            {/* Article 15 */}
            <article id="art-15">
              <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b border-gray-100">
                Article 15 — Contact et réclamations
              </h2>
              <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Support utilisateur</p>
                    <p className="text-gray-600">support@visitpro.ci</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Délégué à la Protection des Données</p>
                    <p className="text-gray-600">dpo@visitpro.ci</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Questions juridiques et facturations</p>
                    <p className="text-gray-600">legal@visitpro.ci</p>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900 mb-1">Autorité de contrôle (APDP)</p>
                    <p className="text-gray-600">Abidjan, Côte d&apos;Ivoire</p>
                  </div>
                </div>
              </div>
            </article>

            {/* Signature */}
            <div className="pt-6 border-t border-gray-200 text-center text-sm text-gray-400">
              <p>VisitPro — Version {CGU_VERSION} — Entrée en vigueur le {LAST_UPDATED}</p>
              <p className="mt-1">Ces conditions constituent l&apos;intégralité de l&apos;accord entre les parties concernant l&apos;utilisation du service.</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
