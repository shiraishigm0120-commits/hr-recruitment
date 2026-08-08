import { auth } from "@/lib/auth";

export async function getUserId(): Promise<string> {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return (session.user as any).id as string;
}
