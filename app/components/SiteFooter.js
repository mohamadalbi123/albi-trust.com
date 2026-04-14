import Link from "next/link";

const links = [
  { href: "/assessment", label: "Assessment" },
  { href: "https://x.com/albi_trust", label: "X", external: true },
  { href: "/disclaimer", label: "Disclaimer" },
  { href: "/privacy", label: "Privacy Policy" },
  { href: "/cookies", label: "Cookie Policy" },
  { href: "/terms", label: "Terms of Use" },
];

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-inner">
        <div className="brand">
          <span className="brand-mark brand-mark-image" aria-hidden="true">
            <img src="/brand/albitrust-face-symbol.png" alt="" />
          </span>
          <span>Albi Trust</span>
        </div>

        <div className="footer-links-block" aria-label="Footer links">
          <div className="footer-links">
            {links.map((link) =>
              link.external ? (
                <a key={link.href} href={link.href} target="_blank" rel="noreferrer">
                  {link.label}
                </a>
              ) : (
                <Link key={link.href} href={link.href}>
                  {link.label}
                </Link>
              ),
            )}
          </div>
        </div>
      </div>
      <p className="footer-note" style={{ paddingTop: 26, margin: 0 }}>
        © 2026 Albi Trust. Built for traders who want clearer diagnosis, more structure, and better execution.
      </p>
    </footer>
  );
}
