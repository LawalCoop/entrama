import Link from 'next/link'
import EntramaSvg from './EntramaSvg'
import styles from './TopPanel.module.css'

export type Breadcrumb = {
  label: string
  href?: string
  icon?: React.ReactNode
}

type Props = {
  crumbs?: Breadcrumb[]
  icon?: React.ReactNode
}

export default function TopPanel({ crumbs, icon }: Props) {
  const isHome = !crumbs?.length

  return (
    <header className={styles.panel}>
      <nav className={styles.nav}>
        {isHome ? (
          <span className={styles.title}>Entrama</span>
        ) : (
          <Link href="/" className={styles.titleMuted}>Entrama</Link>
        )}

        {crumbs?.map((crumb, i) => (
          <span key={i} className={styles.crumbGroup}>
            <span className={styles.sep}>›</span>
            {crumb.href ? (
              <Link href={crumb.href} className={styles.crumbLink}>{crumb.label}</Link>
            ) : (
              <span className={styles.crumbActive}>{crumb.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className={styles.trailing}>
        {isHome ? <EntramaSvg /> : icon}
      </div>
    </header>
  )
}
