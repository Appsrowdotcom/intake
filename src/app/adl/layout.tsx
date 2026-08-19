import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Appsrow Discovery — Admin',
  robots: { index: false, follow: false },
}

export default function AdlLayout({ children }: { children: React.ReactNode }) {
  return children
}
