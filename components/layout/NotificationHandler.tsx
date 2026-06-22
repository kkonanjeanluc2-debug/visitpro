'use client'

import { useEffect } from 'react'
import { useNotifications } from '@/hooks/useNotifications'

interface Props {
  utilisateurId: string
}

export default function NotificationHandler({ utilisateurId }: Props) {
  const { nonLues } = useNotifications(utilisateurId)

  useEffect(() => {
    document.title = nonLues > 0 ? `(${nonLues}) VisitPro` : 'VisitPro'
  }, [nonLues])

  return null
}
