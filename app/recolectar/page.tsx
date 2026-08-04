import { ClipboardList } from '../icons'
import AppLayout from '@/components/AppLayout'
import EnConstruccion from '@/components/EnConstruccion'

export default function Recolectar() {
  return (
    <AppLayout
      titulo="Recolectar"
      icon={<ClipboardList size={40} />}
    >
      <EnConstruccion />
    </AppLayout>
  )
}
