import { redirect } from "next/navigation"
import { getServerAuthUser } from "@/lib/server-auth"

export const dynamic = "force-dynamic"

export default async function AsesorLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerAuthUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role !== "Asesor") {
    redirect("/cliente")
  }

  return <>{children}</>
}
