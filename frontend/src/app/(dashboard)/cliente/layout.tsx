import { redirect } from "next/navigation"
import { getServerAuthUser } from "@/lib/server-auth"
import { ClientChatWidget } from "@/components/shared/ai-chat"

export const dynamic = "force-dynamic"

export default async function ClienteLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const user = await getServerAuthUser()

  if (!user) {
    redirect("/login")
  }

  if (user.role === "Asesor") {
    redirect("/asesor")
  }

  return (
    <>
      {children}
      <ClientChatWidget />
    </>
  )
}
