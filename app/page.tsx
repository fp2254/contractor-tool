import Link from "next/link";
import { Button } from "@/components/ui/Button";

export default function LandingPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 p-6 text-center">
      <h1 className="text-4xl font-bold">TradeBase</h1>
      <p className="text-slate-600">Simple customers, quotes, invoices, and jobs for small contractors.</p>
      <Link href="/auth/login">
        <Button className="w-full">Log In</Button>
      </Link>
    </main>
  );
}
