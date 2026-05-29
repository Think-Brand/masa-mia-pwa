import { type NextRequest, NextResponse } from "next/server";
import { createServerClient, type CookieOptions } from "@supabase/ssr";

type CookieToSet = { name: string; value: string; options?: CookieOptions };

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: CookieToSet[]) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const path = request.nextUrl.pathname;

  // Proteger /staff/* excepto /staff/login
  if (path.startsWith("/staff") && !path.startsWith("/staff/login")) {
    if (!user) {
      const redirect = request.nextUrl.clone();
      redirect.pathname = "/staff/login";
      return NextResponse.redirect(redirect);
    }
  }

  // Si ya logueado y va a login, mándalo al panel
  if (path === "/staff/login" && user) {
    const redirect = request.nextUrl.clone();
    redirect.pathname = "/staff/pedidos";
    return NextResponse.redirect(redirect);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|icons|fonts|logos|mascota|productos|avatares|recomendaciones|manifest.json).*)",
  ],
};
