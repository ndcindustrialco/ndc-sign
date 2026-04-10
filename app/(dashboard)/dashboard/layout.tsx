import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import DashboardShell from "@/components/dashboard-shell"

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await auth()
  if (!session?.user?.id) redirect("/login")

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  })

  return (
    <DashboardShell
      userName={session.user.name}
      userEmail={session.user.email}
      userImage={session.user.image}
      userRole={user?.role ?? "USER"}
    >
      {children}
    </DashboardShell>
  )
}
