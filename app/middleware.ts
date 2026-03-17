export { default } from "next-auth/middleware";

export const config = {
  // The matcher configuration specifies which routes the middleware should apply to.
  // This example protects all nested routes under `/admin`.
  matcher: ["/admin/:path*"],
};
