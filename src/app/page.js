import HomePage from "@/components/HomePage";
import { isAdminAuthenticated } from "@/lib/admin-session";

export default async function Page() {
  const initialIsLoggedIn = await isAdminAuthenticated();

  return <HomePage initialIsLoggedIn={initialIsLoggedIn} />;
}
