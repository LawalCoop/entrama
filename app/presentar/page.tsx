import { Presentation } from '../icons'
import AppLayout from '@/components/AppLayout'

export default function Presentar() {
  return (
    <AppLayout
      crumbs={[{ label: 'Presentar' }]}
      icon={<Presentation size={22} />}
    >
      <p style={{ color: 'var(--muted)' }}>Próximamente</p>
    </AppLayout>
  )
}
