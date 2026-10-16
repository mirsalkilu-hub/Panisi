"use client";

import Image from "next/image";
import Link from "next/link";

const navigation = [
  { label: "Beranda", href: "/", icon: "home" },
  { label: "Koleksi", href: "/koleksi", icon: "grid" },
  { label: "Kontributor", href: "/kontributor", icon: "users" },
  { label: "Unggah Karya", href: "/ajukan", icon: "upload" },
  { label: "Ruang Kerja", href: "/ruang-kerja", icon: "briefcase" },
];

function NavigationIcon({ name }: { name: string }) {
  const paths: Record<string, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    grid: <><rect x="3" y="3" width="8" height="8" rx="1" /><rect x="13" y="3" width="8" height="8" rx="1" /><rect x="3" y="13" width="8" height="8" rx="1" /><rect x="13" y="13" width="8" height="8" rx="1" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="10" cy="7" r="4" /><path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    upload: <><path d="M12 16V4m0 0L7 9m5-5 5 5" /><path d="M4 16v4h16v-4" /></>,
    user: <><circle cx="12" cy="8" r="4" /><path d="M5 21a7 7 0 0 1 14 0" /></>,
    briefcase: <><rect x="3" y="7" width="18" height="14" rx="2" /><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" /></>,
  };
  return <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths[name]}</svg>;
}

export function WorkDetailHeader() {
  return (
    <header className="site-header work-detail-header">
      <Link className="brand" href="/" aria-label="PINISI — Pusat Ilmu dan Informasi Bersinergi">
        <Image className="brand-logo" src="/panisi-logo.svg" alt="PINISI — Pusat Ilmu dan Informasi Bersinergi" width={190} height={48} priority />
      </Link>
      <nav className="desktop-nav" aria-label="Navigasi utama">
        {navigation.map((item) => (
          <Link
            className={item.href === "/koleksi" ? "nav-active" : ""}
            href={item.href}
            key={item.href}
            aria-current={item.href === "/koleksi" ? "page" : undefined}
          >
            <><NavigationIcon name={item.icon} />{item.label}</>
          </Link>
        ))}
      </nav>
      <Link className="button button-outline header-login" href="/koleksi">Kembali ke koleksi</Link>
      <nav className="mobile-bottom-nav" aria-label="Navigasi utama seluler">
          {navigation.map((item) => (
            <Link
              className={item.href === "/koleksi" ? "nav-active" : ""}
              href={item.href}
              key={item.href}
              aria-current={item.href === "/koleksi" ? "page" : undefined}
            >
              <NavigationIcon name={item.icon} /><span>{item.label}</span>
            </Link>
          ))}
      </nav>
    </header>
  );
}
