import { MemberHome } from "@/app/_components/member-home";
import { PublicHome } from "@/app/_components/public-home";
import { getMemberHomeData } from "@/lib/features/home/member-home-data";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const { data: authData } = await supabase.auth.getUser();

  if (!authData.user) {
    return <PublicHome />;
  }

  const memberHomeData = await getMemberHomeData(supabase, authData.user);

  return <MemberHome data={memberHomeData} />;
}
