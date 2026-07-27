import { SubscriptionCard } from "@/components/settings/subscription-card";

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-foreground">설정</h1>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-foreground">구독/플랜</p>
        <SubscriptionCard />
      </div>
    </div>
  );
}
