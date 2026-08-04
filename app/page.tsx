import { ClipboardList, Presentation } from './icons'
import AppLayout from '@/components/AppLayout'
import SelectionCard from '@/components/SelectionCard'
import styles from './page.module.css'

export default function Home() {
  return (
    <AppLayout>
      <p className={styles.subtitle}>¿Qué querés hacer?</p>
      <div className={styles.cards}>
        <SelectionCard
          href="/recolectar"
          icon={<ClipboardList />}
          iconBg="var(--accent-recolectar-bg)"
          title="Recolectar"
          description="Armá un formulario para juntar respuestas de tu equipo o audiencia."
        />
        <SelectionCard
          href="/presentar"
          icon={<Presentation />}
          iconBg="var(--accent-presentar-bg)"
          title="Presentar"
          description="Creá una presentación interactiva con las respuestas recolectadas."
        />
      </div>
    </AppLayout>
  )
}
