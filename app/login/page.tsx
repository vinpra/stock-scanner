import { redirect } from "next/navigation";
import LoginClient from "@/components/LoginClient";
import { getSessionUser } from "@/lib/auth";

export default async function LoginPage() {
  const session = await getSessionUser();

  if (session) {
    redirect("/");
  }

  return <LoginClient />;
}
