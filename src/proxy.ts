import { NextResponse, type NextRequest } from "next/server";

/**
 * Only forwards the request path so server layouts can build /login?next=<path>.
 * No auth decisions happen here: role checks live in server layouts and route handlers.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set("x-pathname", request.nextUrl.pathname + request.nextUrl.search);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|stills|favicon.ico|socket.io).*)"],
};
