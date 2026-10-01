import { BusinessProfileForm } from "@/components/business-profile-form";
import { getBusinessProfile } from "@/lib/profile";
import { createClient } from "@/lib/supabase/server";

export default async function BrandPage() {
  const profile = await getBusinessProfile();
  let logoUrl: string | null = null;
  if (profile?.logo_asset_id) {
    const supabase = await createClient();
    const { data } = await supabase.storage.from("logos").createSignedUrl(profile.logo_asset_id, 60 * 60);
    logoUrl = data?.signedUrl ?? null;
  }
  return <BusinessProfileForm initial={profile} logoUrl={logoUrl} />;
}
