import Link from "next/link";
import { redirect } from "next/navigation";
import {
  LayoutDashboard,
  Boxes,
  Coins,
  Car,
  GitCompareArrows,
  Tags,
  Factory,
  MessageSquareWarning,
  MessagesSquare,
  Bot,
} from "lucide-react";
import { clearSessionCookie } from "@/lib/auth";

const NAV = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/parts", label: "Parts", icon: Boxes },
  { href: "/admin/prices", label: "Prices", icon: Coins },
  { href: "/admin/vehicles", label: "Vehicles", icon: Car },
  { href: "/admin/compatibility", label: "Compatibility", icon: GitCompareArrows },
  { href: "/admin/aliases", label: "Aliases", icon: Tags },
  { href: "/admin/manufacturers", label: "Manufacturers", icon: Factory },
  { href: "/admin/feedback", label: "Feedback", icon: MessageSquareWarning },
  { href: "/admin/conversations", label: "AI Conversations", icon: MessagesSquare },
];

export function Sidebar() {
  return (
    <aside className="flex w-56 shrink-0 flex-col border-r bg-muted/40">
      <div className="border-b p-4">
        <div className="font-bold">DEGOONY SALES INTELLIGENCE</div>
        <div className="text-muted-foreground text-xs">Admin Console</div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        ))}
        <Link
          href="/"
          className="flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
        >
          <Bot className="h-4 w-4" />
          Customer Chat
        </Link>
      </nav>
      <div className="border-t p-3">
        <form
          action={async () => {
            "use server";
            await clearSessionCookie();
            redirect("/admin/login");
          }}
        >
          <button type="submit" className="w-full rounded-md px-3 py-2 text-left text-sm hover:bg-accent hover:text-accent-foreground">
            Sign out
          </button>
        </form>
      </div>
    </aside>
  );
}
