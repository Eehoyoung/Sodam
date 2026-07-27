"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useStoreContext } from "@/lib/store-context";
import { JobPostingCard } from "@/components/recruiting/job-posting-card";
import { JobApplicantList } from "@/components/recruiting/job-applicant-list";

export default function RecruitingPage() {
  const { selectedStore } = useStoreContext();

  if (!selectedStore) {
    return <p className="text-sm text-muted-foreground">먼저 매장을 선택해 주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">구인채용</h1>
        <p className="text-sm text-muted-foreground">{selectedStore.storeName}</p>
      </div>

      <Tabs defaultValue="posting">
        <TabsList>
          <TabsTrigger value="posting">공고 관리</TabsTrigger>
          <TabsTrigger value="applicants">지원자</TabsTrigger>
        </TabsList>

        <TabsContent value="posting" className="pt-4">
          <JobPostingCard storeId={selectedStore.id} />
        </TabsContent>

        <TabsContent value="applicants" className="pt-4">
          <JobApplicantList storeId={selectedStore.id} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
