import { redirect } from "next/navigation";
import DashboardApp from "@/components/DashboardApp";
import { getSessionFromCookieStore } from "@/lib/auth";

export default async function DashboardPage() {
  const session = await getSessionFromCookieStore();

  if (!session) {
    redirect("/");
  }

  return <DashboardApp username={session.username} />;
}
