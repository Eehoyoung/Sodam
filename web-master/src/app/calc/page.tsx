"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  publicCalculators,
  PublicApiError,
  type MinimumWageResult,
  type SocialInsuranceResult,
  type WeeklyHolidayResult,
} from "@/lib/publicApi";

const won = (v: number) => v.toLocaleString("ko-KR") + "원";

/**
 * 면책 문구 블록.
 *
 * 3자 교차검증(2026-08-07)이 정한 **배포 조건**이다 — 계산 결과가 법적 자문이나 확정 금액으로
 * 오인되면 실제 임금 분쟁을 유발할 수 있다. 서버가 내려주는 문구를 그대로 보여주고
 * 화면에서 임의로 줄이지 않는다.
 */
function Disclaimer({ notices, disclaimer }: { notices?: string[]; disclaimer: string[] }) {
  return (
    <div className="mt-6 space-y-3 rounded-lg border border-muted bg-muted/40 p-4 text-sm text-muted-foreground">
      {notices && notices.length > 0 && (
        <ul className="list-disc space-y-1 pl-5">
          {notices.map((n) => (
            <li key={n}>{n}</li>
          ))}
        </ul>
      )}
      <ul className="list-disc space-y-1 pl-5">
        {disclaimer.map((d) => (
          <li key={d}>{d}</li>
        ))}
      </ul>
    </div>
  );
}

function ErrorText({ message }: { message: string | null }) {
  if (!message) return null;
  return <p className="mt-3 text-sm text-destructive">{message}</p>;
}

function useCalculator<T>() {
  const [result, setResult] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(fn: () => Promise<T>) {
    setBusy(true);
    setError(null);
    try {
      setResult(await fn());
    } catch (e) {
      setResult(null);
      setError(e instanceof PublicApiError ? e.message : "계산에 실패했어요.");
    } finally {
      setBusy(false);
    }
  }

  return { result, error, busy, run };
}

function WeeklyHolidayCalculator() {
  const [weeklyHours, setWeeklyHours] = useState("20");
  const [hourlyWage, setHourlyWage] = useState("10030");
  const { result, error, busy, run } = useCalculator<WeeklyHolidayResult>();

  return (
    <div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="wh-hours">1주 소정근로시간</Label>
          <Input
            id="wh-hours"
            type="number"
            inputMode="decimal"
            value={weeklyHours}
            onChange={(e) => setWeeklyHours(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="wh-wage">시급(원)</Label>
          <Input
            id="wh-wage"
            type="number"
            inputMode="numeric"
            value={hourlyWage}
            onChange={(e) => setHourlyWage(e.target.value)}
          />
        </div>
      </div>

      <Button
        className="mt-4"
        disabled={busy}
        onClick={() =>
          run(() => publicCalculators.weeklyHoliday(Number(weeklyHours), Number(hourlyWage)))
        }
      >
        {busy ? "계산 중…" : "주휴수당 계산"}
      </Button>
      <ErrorText message={error} />

      {result && (
        <div className="mt-6">
          {result.eligible ? (
            <>
              <p className="text-3xl font-semibold">{won(result.weeklyAllowance)}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                주휴수당 산정 시간 {result.allowanceHours}시간 기준
              </p>
            </>
          ) : (
            <>
              <p className="text-2xl font-semibold">주휴수당이 발생하지 않아요</p>
              <p className="mt-1 text-sm text-muted-foreground">
                1주 소정근로시간이 15시간 미만이에요.
              </p>
            </>
          )}
          <Disclaimer notices={result.notices} disclaimer={result.disclaimer} />
        </div>
      )}
    </div>
  );
}

function MinimumWageCalculator() {
  const [hourlyWage, setHourlyWage] = useState("10030");
  const { result, error, busy, run } = useCalculator<MinimumWageResult>();

  return (
    <div>
      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="mw-wage">시급(원)</Label>
        <Input
          id="mw-wage"
          type="number"
          inputMode="numeric"
          value={hourlyWage}
          onChange={(e) => setHourlyWage(e.target.value)}
        />
      </div>

      <Button
        className="mt-4"
        disabled={busy}
        onClick={() => run(() => publicCalculators.minimumWage(Number(hourlyWage)))}
      >
        {busy ? "확인 중…" : "최저임금 확인"}
      </Button>
      <ErrorText message={error} />

      {result && (
        <div className="mt-6">
          <p className="text-2xl font-semibold">
            {result.meetsMinimum ? "최저임금 이상이에요" : "최저임금에 미달해요"}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            {result.year}년 최저시급 {won(result.minimumWage)}
            {!result.meetsMinimum && ` · ${won(result.shortfall)} 부족`}
          </p>
          <Disclaimer disclaimer={result.disclaimer} />
        </div>
      )}
    </div>
  );
}

function SocialInsuranceCalculator() {
  const [monthlyWage, setMonthlyWage] = useState("3000000");
  const { result, error, busy, run } = useCalculator<SocialInsuranceResult>();

  const rows = result
    ? [
        ["국민연금", result.nationalPension],
        ["건강보험", result.healthInsurance],
        ["장기요양", result.longTermCare],
        ["고용보험", result.employmentIns],
      ]
    : [];

  return (
    <div>
      <div className="space-y-2 sm:max-w-xs">
        <Label htmlFor="si-wage">월 급여(세전, 원)</Label>
        <Input
          id="si-wage"
          type="number"
          inputMode="numeric"
          value={monthlyWage}
          onChange={(e) => setMonthlyWage(e.target.value)}
        />
      </div>

      <Button
        className="mt-4"
        disabled={busy}
        onClick={() => run(() => publicCalculators.socialInsurance(Number(monthlyWage)))}
      >
        {busy ? "계산 중…" : "4대보험 계산"}
      </Button>
      <ErrorText message={error} />

      {result && (
        <div className="mt-6">
          <p className="text-3xl font-semibold">{won(result.total)}</p>
          <p className="mt-1 text-sm text-muted-foreground">근로자 부담 합계</p>

          <dl className="mt-4 grid gap-2 sm:max-w-sm">
            {rows.map(([label, value]) => (
              <div key={label as string} className="flex justify-between text-sm">
                <dt className="text-muted-foreground">{label}</dt>
                <dd className="tabular-nums">{won(value as number)}</dd>
              </div>
            ))}
            <div className="flex justify-between border-t pt-2 text-sm font-medium">
              <dt>4대보험만 뺀 추정 실수령</dt>
              <dd className="tabular-nums">{won(result.netEstimate)}</dd>
            </div>
          </dl>

          <Disclaimer notices={result.notices} disclaimer={result.disclaimer} />
        </div>
      )}
    </div>
  );
}

/**
 * 비로그인 공개 계산기 (WP-A).
 *
 * <p>소상공인이 검색으로 가장 많이 찾는 것이 "주휴수당 계산"이라, 이미 있는 급여 코어를 노출해
 * 유입 경로를 만든다. 계산은 전부 서버가 하고 이 화면은 입력·표시만 한다 — 요율을 화면에
 * 복제하면 개정 시 앱과 다른 답을 내놓는다.</p>
 *
 * <p>⛔ <b>세무사·노무사 연결 CTA 를 붙이지 않는다</b> — 계산 결과에서 곧바로 전문가 알선으로
 * 이어지면 세무사법이 우려하는 "소개·알선"에 근접한다(2026-08-07 세무 검토).
 * 가입 유도는 사실 기반 문구만 쓴다("가입해야 정확한 금액이 나온다" 같은 표현은
 * 비회원 결과의 신뢰도를 인위적으로 폄하하는 것이라 표시광고법상 오인 유발 소지가 있다).</p>
 */
export default function PublicCalculatorPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-10 sm:py-16">
      <header className="mb-8">
        <p className="text-sm font-medium text-muted-foreground">소담 무료 계산기</p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          주휴수당, 얼마나 줘야 할까요
        </h1>
        <p className="mt-3 text-muted-foreground">
          로그인 없이 바로 계산해 보세요. 소담이 실제 급여 정산에 쓰는 계산 기준을 그대로 사용합니다.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>계산기</CardTitle>
          <CardDescription>값을 입력하면 서버에서 계산해 결과를 보여줍니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="weekly-holiday">
            <TabsList className="mb-6">
              <TabsTrigger value="weekly-holiday">주휴수당</TabsTrigger>
              <TabsTrigger value="minimum-wage">최저임금</TabsTrigger>
              <TabsTrigger value="social-insurance">4대보험</TabsTrigger>
            </TabsList>

            <TabsContent value="weekly-holiday">
              <WeeklyHolidayCalculator />
            </TabsContent>
            <TabsContent value="minimum-wage">
              <MinimumWageCalculator />
            </TabsContent>
            <TabsContent value="social-insurance">
              <SocialInsuranceCalculator />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <section className="mt-8 rounded-lg border p-6">
        <h2 className="text-lg font-semibold">우리 매장 데이터로 자동 계산하려면</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          소담에 매장을 등록하면 직원별 출퇴근 기록으로 주휴수당·4대보험을 자동 계산하고
          급여명세서까지 발급할 수 있어요.
        </p>
        <Link
          href="/login"
          className="mt-4 inline-flex h-9 items-center justify-center rounded-md border border-input bg-background px-4 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          소담 시작하기
        </Link>
      </section>
    </main>
  );
}
