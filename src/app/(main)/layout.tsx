import { AuthGuard } from "@/components/providers/auth-guard";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
