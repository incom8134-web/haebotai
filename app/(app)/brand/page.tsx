import { BusinessProfileForm } from "@/components/business-profile-form";
import { getBusinessProfile } from "@/lib/profile";

export default async function BrandPage() {
  const profile = await getBusinessProfile();
  return <BusinessProfileForm initial={profile} />;
}
