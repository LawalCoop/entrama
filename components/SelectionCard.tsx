import Link from 'next/link'
import styles from './SelectionCard.module.css'

type Props = {
  href: string
  icon: React.ReactNode
  iconBg: string
  title: string
  description: string
}

export default function SelectionCard({ href, icon, iconBg, title, description }: Props) {
  return (
    <Link href={href} className={styles.card}>
      <div className={styles.iconBg} style={{ background: iconBg }}>
        {icon}
      </div>
      <span className={styles.title}>{title}</span>
      <span className={styles.desc}>{description}</span>
    </Link>
  )
}
