import { Presentation } from '../icons'
import AppLayout from '@/components/AppLayout'
import EnConstruccion from '@/components/EnConstruccion'

export default function Presentar() {
  return (
    <AppLayout
      titulo="Presentar"
      icon={<Presentation size={40} />}
    >
      <EnConstruccion />
    </AppLayout>
  )
}
