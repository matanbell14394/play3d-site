import { LoginForm } from "@/features/auth/components/LoginForm";
import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth/auth";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await getServerSession(authOptions);
  const params = await searchParams;

  if (session) {
    redirect(params.callbackUrl || "/admin/dashboard");
  }

  return (
    <main style={{ display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center', paddingTop: 60 }}>
      <div className="grid-bg" />
      <LoginForm callbackUrl={params.callbackUrl} />
    </main>
  );
}
