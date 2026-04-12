'use client';

import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';

interface Crumb {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: Crumb[];
}

export default function Breadcrumbs({ items }: BreadcrumbsProps) {
  const router = useRouter();
  const pathname = usePathname() || '/';

  return (
    <nav className="lumio-breadcrumbs" aria-label="Breadcrumb">
      <ol className="lumio-breadcrumbs__list">
        {items.map((item, idx) => {
          const isLast = idx === items.length - 1;
          const isSamePageLink = !!item.href && item.href === pathname;
          return (
            <li key={`${item.href ?? 'crumb'}-${idx}`} className="lumio-breadcrumbs__item">
              {item.href && !isLast && !isSamePageLink ? (
                <Link href={item.href} className="lumio-breadcrumbs__link">
                  {item.label}
                </Link>
              ) : item.href && !isLast && isSamePageLink ? (
                <button
                  type="button"
                  className="lumio-breadcrumbs__button"
                  onClick={() => router.refresh()}
                >
                  {item.label}
                </button>
              ) : (
                <span
                  aria-current={isLast ? 'page' : undefined}
                  className={isLast ? 'lumio-breadcrumbs__current' : 'lumio-breadcrumbs__plain'}
                >
                  {item.label}
                </span>
              )}
              {!isLast && (
                <ChevronRight
                  aria-hidden="true"
                  className="lumio-breadcrumbs__separator"
                  size={14}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
