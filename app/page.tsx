import { redirect } from "next/navigation";
import DashboardClient from "@/components/DashboardClient";
import { getSessionUser } from "@/lib/auth";

export default async function Page() {
  const session = await getSessionUser();

  if (!session) {
    redirect("/login");
  }

  return <DashboardClient userId={session.userId} />;
}
