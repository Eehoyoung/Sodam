"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useStoreContext } from "@/lib/store-context";
import { fetchStoreEmployees } from "@/lib/stores";

const GRADE_LABEL: Record<string, string> = {
  MASTER: "사장",
  EMPLOYEE: "직원",
  MANAGER: "매니저",
};

export default function EmployeesPage() {
  const { selectedStore, isLoading: storeLoading } = useStoreContext();

  const { data: employees, isLoading } = useQuery({
    queryKey: ["store", selectedStore?.id, "employees"],
    queryFn: () => fetchStoreEmployees(selectedStore!.id),
    enabled: !!selectedStore,
  });

  if (storeLoading || isLoading) {
    return <Skeleton className="h-64 w-full" />;
  }

  if (!selectedStore) {
    return <p className="text-sm text-muted-foreground">먼저 매장을 선택해 주세요.</p>;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">직원관리</h1>
        <p className="text-sm text-muted-foreground">
          {selectedStore.storeName} · 직원 {employees?.length ?? 0}명
        </p>
      </div>

      {!employees || employees.length === 0 ? (
        <p className="text-sm text-muted-foreground">소속된 직원이 없습니다.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>이름</TableHead>
              <TableHead>역할</TableHead>
              <TableHead>이메일</TableHead>
              <TableHead>연락처</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/employees/${emp.id}`}
                    className="flex items-center gap-2 font-medium text-foreground hover:text-[var(--brand-coral)]"
                  >
                    <Users className="size-3.5 text-muted-foreground" />
                    {emp.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {emp.userGrade ? (GRADE_LABEL[emp.userGrade] ?? emp.userGrade) : "-"}
                  </Badge>
                </TableCell>
                <TableCell className="text-muted-foreground">{emp.email ?? "-"}</TableCell>
                <TableCell className="text-muted-foreground">{emp.phone ?? "-"}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
