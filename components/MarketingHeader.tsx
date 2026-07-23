import Link from "next/link";
import { Logo } from "./Logo";

export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <Logo />
      <nav aria-label="Primary navigation">
        <a href="#platform">Features</a>
        <a href="#booking">Booking</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <div className="marketing-actions">
        <Link className="button small secondary mobile-sign-in" href="/login">Sign in</Link>
        <Link className="button small" href="/signup">Try free</Link>
      </div>
    </header>
  );
}
