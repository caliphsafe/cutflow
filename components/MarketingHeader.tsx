import Link from "next/link";
import { Logo } from "./Logo";

export function MarketingHeader() {
  return (
    <header className="marketing-header">
      <Logo />
      <nav aria-label="Primary navigation">
        <a href="#platform">Platform</a>
        <a href="#booking">Booking</a>
        <a href="#pricing">Pricing</a>
      </nav>
      <div className="marketing-actions">
        <Link className="text-button" href="/login">Sign in</Link>
        <Link className="button small" href="/signup">Start free</Link>
      </div>
    </header>
  );
}
