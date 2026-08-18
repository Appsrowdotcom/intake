'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/adl', label: 'Responses' },
  { href: '/adl/questions', label: 'Questions' },
]

export function AdlNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Admin">
      {links.map((link) => {
        const active =
          link.href === '/adl'
            ? pathname === '/adl' || (pathname.startsWith('/adl/') && !pathname.startsWith('/adl/questions'))
            : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full border px-3.5 py-2 text-sm font-bold ${
              active ? 'border-ink bg-ink text-white' : 'border-line bg-white text-ink'
            }`}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
