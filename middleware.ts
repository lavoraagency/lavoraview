import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { PUBLIC_LINK_HOSTS } from "@/lib/link-pages/config";

// ── Multi-host routing ────────────────────────────────────────
// The Lavora deployment serves two planes from one Next.js app:
//
//   1. Dashboard (default Vercel domain / app.lavora.de) — auth-gated.
//   2. Public link-in-bio plane on vibez.bio — no auth, /slug rewrites
//      to /p/slug, dashboard routes are 404'd.
//
// We branch at the very top by host: a public-link host skips auth
// entirely; everything else falls through to the existing auth check.

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
  if (/^[a-z0-9_-]{1,40}$/.test(slug)) {
    const rewrite = url.clone();
    rewrite.pathname = `/p/${slug}`;
    return NextResponse.rewrite(rewrite);
  }

  return new NextResponse("Not found", { status: 404 });
}

export async function middleware(request: NextRequest) {
  const host = (request.headers.get("host") || "").toLowerCase().split(":")[0];

  // Debug header so we can curl and see what middleware saw.
  // Remove after multi-host routing is confirmed working.
  const debugHeader = `host=${host} matched=${PUBLIC_LINK_HOSTS.has(host)} ts=${Date.now()}`;

  // ── Public-link plane wins first; never reaches Supabase auth ──
  if (PUBLIC_LINK_HOSTS.has(host)) {
    const r = publicLinkPlane(request);
    if (r) {
      r.headers.set("x-mw-debug", debugHeader);
      return r;
    }
    const next = NextResponse.next();
    next.headers.set("x-mw-debug", debugHeader);
    return next;
  }

  // ── Default: existing auth-gated dashboard plane ──
  let supabaseResponse = NextResponse.next({ request });
  supabaseResponse.headers.set("x-mw-debug", debugHeader);

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { data: { user } } = await supabase.auth.getUser();

  if (!user && !request.nextUrl.pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  if (user && request.nextUrl.pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
