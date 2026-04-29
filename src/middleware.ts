import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_LINK_HOSTS } from "@/lib/link-pages/config";

// ── Multi-host routing ────────────────────────────────────────
// The Lavora deployment serves two planes from one Next.js app:
//
//   1. Dashboard (default Vercel domain / app.lavora.de) — open access.
//      The Supabase auth check that lived here previously was a no-op
//      (file was at the wrong path so it never ran), and the user
//      relied on that. Until we explicitly opt back into auth we keep
//      it open to match the prior behaviour.
//
//   2. Public link-in-bio plane on vibez.bio — /slug rewrites to
//      /p/slug, dashboard routes are 404'd.

function publicLinkPlane(request: NextRequest): NextResponse | null {
  const url = request.nextUrl;
  const pathname = url.pathname;

  // Click-tracking endpoint must work from public pages
  if (pathname.startsWith("/api/link-clicks")) return NextResponse.next();

  // Block the dashboard surface from leaking through the public domain
  if (
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/login") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/p/")
  ) {
    return new NextResponse("Not found", { status: 404 });
  }

  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // Canonicalise www -> apex
  if (host === "www.vibez.bio") {
    const r = new URL(request.url);
    r.host = "vibez.bio";
    return NextResponse.redirect(r, 301);
  }

  // Root: tiny placeholder until Phase 2 ships a real landing
  if (pathname === "/" || pathname === "") {
    return new NextResponse(
      `<!doctype html><html><head><title>vibez.bio</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>html,body{margin:0;height:100%;background:#0f0f1a;color:#fff;font-family:system-ui,sans-serif;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px}p{opacity:.6;font-size:14px;margin-top:6px}</style></head><body><div><h1 style="margin:0;font-size:28px;letter-spacing:-0.5px">vibez.bio</h1><p>Direct link required.</p></div></body></html>`,
      { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }
    );
  }

  // /slug -> /p/slug (rewrite, not redirect — URL stays clean)
  const slug = pathname.replace(/^\/+|\/+$/g, "");
  if (/^[a-z0-9._-]{1,40}$/.test(slug)) {
    const rewrite = url.clone();
    rewrite.pathname = `/p/${slug}`;
    return NextResponse.rewrite(rewrite);
  }

  return new NextResponse("Not found", { status: 404 });
}

export function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // Public-link plane on vibez.bio
  if (PUBLIC_LINK_HOSTS.has(host)) {
    const r = publicLinkPlane(request);
    if (r) return r;
    return NextResponse.next();
  }

  // Dashboard plane: pass-through, no auth gate.
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
