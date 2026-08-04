import type { ReactNode } from 'react'
import TopPanel, { type Breadcrumb } from './TopPanel'
import styles from './AppLayout.module.css'

type Props = {
  crumbs?: Breadcrumb[]
  icon?: React.ReactNode
  children: ReactNode
}

export default function AppLayout({ crumbs, icon, children }: Props) {
  return (
    <div className={styles.shell}>
      <TopPanel crumbs={crumbs} icon={icon} />
      <main className={styles.content}>{children}</main>
    </div>
  )
}
