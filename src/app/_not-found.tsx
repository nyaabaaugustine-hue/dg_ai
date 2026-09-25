import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center space-y-4">
        <h1 className="text-6xl font-bold text-muted-foreground/50">404</h1>
        <p className="text-xl text-muted-foreground">Page not found</p>
        <Link href="/" className="inline-flex items-center gap-2 text-primary hover:underline">
          Go home
        </Link>
      </div>
    </div>
  );
}