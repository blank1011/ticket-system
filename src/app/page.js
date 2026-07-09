import { redirect } from "next/navigation";
import LoginForm from "@/components/LoginForm";
import { getSessionFromCookieStore } from "@/lib/auth";

export default async function Home() {
  const session = await getSessionFromCookieStore();

  if (session) {
    redirect("/dashboard");
  }

  return (
    <main>
      <LoginForm />
    </main>
  );
}
