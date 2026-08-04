import { ClipboardList } from '../icons'
import AppLayout from '@/components/AppLayout'

export default function Recolectar() {
  return (
    <AppLayout
      crumbs={[{ label: 'Recolectar' }]}
      icon={<ClipboardList size={22} />}
    >
      <p style={{ color: 'var(--muted)' }}>Próximamente</p>
    </AppLayout>
  )
}
