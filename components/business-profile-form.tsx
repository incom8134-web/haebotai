"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FieldSeparator } from "@/components/ui/field";
import { TagList } from "@/components/tool-form";
import { upsertBusinessProfile } from "@/lib/profile";
import { useT } from "@/lib/i18n/context";
import type { DictKey } from "@/lib/i18n/dictionaries";
import type { BusinessProfile } from "@/lib/tools/types";

// HAEBOT_A_TOOLS_SPEC.md §3.3 — set once, read by every tool form.

const EMPTY_PROFILE: BusinessProfile = {
  brand_name: "",
  industry: "",
  business_stage: "idea",
  target_customer: "",
  tone: [],
  voice_examples: [],
  brand_colors: [],
};

const STAGE_OPTIONS: {
  value: BusinessProfile["business_stage"];
  labelKey: DictKey;
}[] = [
  { value: "idea", labelKey: "profile_stage_idea" },
  { value: "pre_launch", labelKey: "profile_stage_pre_launch" },
  { value: "under_1y", labelKey: "profile_stage_under_1y" },
  { value: "1_3y", labelKey: "profile_stage_1_3y" },
  { value: "over_3y", labelKey: "profile_stage_over_3y" },
];

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-medium break-keep text-fg">{label}</label>
      {children}
    </div>
  );
}

function BusinessProfileForm({ initial }: { initial: BusinessProfile | null }) {
  const [profile, setProfile] = useState<BusinessProfile>(
    initial ?? EMPTY_PROFILE,
  );
  const [pending, startTransition] = useTransition();
  const t = useT();

  function set<K extends keyof BusinessProfile>(
    key: K,
    value: BusinessProfile[K],
  ) {
    setProfile((p) => ({ ...p, [key]: value }));
  }

  function handleSave() {
    startTransition(async () => {
      const result = await upsertBusinessProfile(profile);
      if (result.ok) toast.success(t("saved"));
      else toast.error(result.error);
    });
  }

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-10 md:px-8 md:pt-10">
      <h1 className="font-display text-[clamp(2rem,4vw,3rem)] leading-[1.05] font-bold tracking-[-0.02em] break-keep text-fg">
        {t("profile_title")}
      </h1>
      <p className="mt-3 text-base leading-relaxed break-keep text-fg-muted">{t("profile_desc")}</p>

      <div className="mt-6 flex flex-col gap-4">
        <Field label={t("profile_brand_name")}>
          <Input
            value={profile.brand_name}
            onChange={(e) => set("brand_name", e.target.value)}
          />
        </Field>

        <Field label={t("profile_industry")}>
          <Input
            value={profile.industry}
            onChange={(e) => set("industry", e.target.value)}
          />
        </Field>

        <Field label={t("profile_stage")}>
          <Select
            value={profile.business_stage}
            onValueChange={(v) =>
              set("business_stage", v as BusinessProfile["business_stage"])
            }
          >
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STAGE_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {t(o.labelKey)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>

        <FieldSeparator>{t("profile_group_audience")}</FieldSeparator>

        <Field label={t("profile_target_customer")}>
          <Input
            value={profile.target_customer}
            onChange={(e) => set("target_customer", e.target.value)}
          />
        </Field>

        <Field label={t("profile_tone")}>
          <TagList
            values={profile.tone}
            max={3}
            onChange={(v) => set("tone", v)}
            placeholder={t("enter_then_tab")}
          />
        </Field>

        <Field label={t("profile_voice_examples")}>
          <TagList
            values={profile.voice_examples}
            onChange={(v) => set("voice_examples", v)}
            placeholder={t("enter_then_tab")}
          />
        </Field>

        <Field label={t("profile_brand_colors")}>
          <TagList
            values={profile.brand_colors}
            onChange={(v) => set("brand_colors", v)}
            placeholder="#2563EB"
          />
        </Field>

        <FieldSeparator>{t("profile_group_ops")}</FieldSeparator>

        <Field label={t("profile_region")}>
          <Input
            value={profile.region ?? ""}
            onChange={(e) => set("region", e.target.value)}
          />
        </Field>

        <Field label={t("profile_weekly_hours")}>
          <Input
            type="number"
            value={profile.weekly_hours ?? ""}
            onChange={(e) => set("weekly_hours", e.target.valueAsNumber)}
          />
        </Field>

        <Field label={t("profile_budget_band")}>
          <Input
            value={profile.budget_band ?? ""}
            onChange={(e) => set("budget_band", e.target.value)}
          />
        </Field>

        <Button className="mt-2" onClick={handleSave} loading={pending}>
          {t("save")}
        </Button>
      </div>
    </div>
  );
}

export { BusinessProfileForm };
