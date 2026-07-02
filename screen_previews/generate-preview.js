const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const frontend = path.join(root, 'frontend');
const screensRoot = path.join(frontend, 'src', 'features');
const outDir = __dirname;

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, {withFileTypes: true})) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, acc);
    else if (/Screen\.tsx$/.test(entry.name)) acc.push(full);
  }
  return acc;
}

function read(file) {
  return fs.readFileSync(file, 'utf8');
}

function rel(file) {
  return path.relative(root, file).replace(/\\/g, '/');
}

function titleFrom(source, fallback) {
  const titleMap = {
    AccountSettingsScreen: '계정 설정',
    AppUpdateScreen: '앱 업데이트',
    AttendanceCalendarScreen: '근무 기록',
    AttendanceCorrectionRequestScreen: '정정 요청',
    AttendanceScreen: '출퇴근 관리',
    EmployeeAttendanceHome: '직원 출퇴근',
    EmployeeDetailScreen: '직원 상세',
    EmployeeMyPageRNScreen: '직원 홈',
    HomeScreen: '오늘의 소담',
    HybridMainScreen: '개발용 placeholder',
    InfoListScreen: '노무 정보',
    JoinStoreByCodeScreen: '매장 가입',
    KakaoLoginScreen: '카카오 로그인',
    LaborInfoDetailScreen: '노동 정보 상세',
    LegalWebviewScreen: '약관',
    LoginScreen: '로그인',
    MaintenanceScreen: '점검 안내',
    ManagerMyPageScreen: '매니저 홈',
    MasterMyPageScreen: '사장 홈',
    MissingAttendanceCenterScreen: '출퇴근 이상',
    NotificationCenterScreen: '알림',
    NotificationSettingsScreen: '알림 설정',
    OnboardingCarouselScreen: '온보딩',
    OwnerDashboardScreen: '사장 대시보드',
    PasswordResetScreen: '비밀번호 찾기',
    PaymentFailedScreen: '결제 실패',
    PaymentSuccessScreen: '결제 성공',
    PdfPreviewScreen: 'PDF 미리보기',
    PayrollRunScreen: '급여 정산',
    PermissionDeniedScreen: '권한 안내',
    PersonalUserScreen: '개인 기록장',
    PolicyDetailScreen: '정책 상세',
    ProfileScreen: '프로필',
    QnAScreen: 'Q&A',
    ReferralScreen: '친구 추천',
    RequestStatusScreen: '내 요청',
    SalaryArchiveScreen: '지난 급여명세',
    SalaryDetailScreen: '급여 상세',
    SalaryListScreen: '급여',
    SessionExpiredScreen: '세션 만료',
    SettingsScreen: '설정',
    SignupScreen: '회원가입',
    SplashScreen: '스플래시',
    StoreDetailScreen: '매장 운영',
    StoreEditScreen: '매장 정보 수정',
    StoreRegistraionScreen: '첫 매장 등록',
    SubscribeScreen: '구독',
    SubscriptionGateScreen: '구독 안내',
    TaxInfoDetailScreen: '세무 정보 상세',
    TimeOffRequestScreen: '휴가 신청',
    TipsDetailScreen: '팁 상세',
    UsageSelectionScreen: '사용 목적 선택',
    WageSettingsScreen: '시급 정책',
    WelcomeMainScreen: '웰컴',
    WorkplaceDetailScreen: '근무지 상세',
    WorkplaceListScreen: '근무지',
  };
  if (titleMap[fallback]) return titleMap[fallback];
  const patterns = [
    /<AppHeader[^>]*title=["'`]([^"'`{]+)["'`]/,
    /options=\{\{[^}]*title:\s*['"`]([^'"`]+)['"`]/,
    /<Text[^>]*>\s*([^<]{2,24})\s*<\/Text>/,
  ];
  for (const p of patterns) {
    const m = source.match(p);
    if (m && m[1] && !/[?�]/.test(m[1])) return m[1].trim();
  }
  return fallback.replace(/Screen$/, '').replace(/([a-z])([A-Z])/g, '$1 $2');
}

function featureOf(file) {
  const parts = rel(file).split('/');
  const i = parts.indexOf('features');
  return i >= 0 ? parts[i + 1] : 'misc';
}

function classify(source, feature, name) {
  if (/LinearGradient|Brandmark|gradient\.darkScreen/.test(source) || feature === 'welcome') return 'hero';
  if (/AppInput|TextInput|KeyboardAvoidingView/.test(source)) return 'form';
  if (/FlatList|SectionList/.test(source)) return 'list';
  if (/EmptyState|ErrorState|SuccessState|PermissionState/.test(source) || feature === 'system') return 'state';
  if (/Dashboard|MyPage|Home/.test(name) || feature === 'home') return 'dashboard';
  if (/Detail/.test(name)) return 'detail';
  return 'standard';
}

function flags(source) {
  const result = [];
  if (/ScreenContainer/.test(source)) result.push('ScreenContainer');
  if (/SafeAreaView/.test(source)) result.push('SafeArea');
  if (/scroll|ScrollView|FlatList/.test(source)) result.push('Scrollable');
  if (/KeyboardAvoidingView|keyboardAvoiding/.test(source)) result.push('Keyboard');
  if (/Dimensions\.get/.test(source)) result.push('Dimensions.get');
  if (/position:\s*['"]absolute['"]/.test(source)) result.push('absolute');
  if (/COLORS\./.test(source)) result.push('legacy COLORS');
  return result;
}

function risk(source) {
  let score = 0;
  if (!/ScreenContainer|ScrollView|FlatList/.test(source)) score += 2;
  if (/TextInput|AppInput/.test(source) && !/KeyboardAvoidingView|keyboardAvoiding|ScreenContainer/.test(source)) score += 2;
  if (/Dimensions\.get/.test(source)) score += 2;
  if (/position:\s*['"]absolute['"]/.test(source)) score += 1;
  if (/width:\s*[0-9]{2,}|height:\s*[0-9]{2,}|fontSize:\s*[5-9][0-9]/.test(source)) score += 1;
  if (/COLORS\./.test(source)) score += 1;
  if (score >= 5) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}

function phoneMock(screen) {
  const safe = (s) => String(s).replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const chip = screen.risk === 'high' ? '위험' : screen.risk === 'medium' ? '주의' : '양호';
  const rows = {
    hero: `
      <div class="heroMark"></div><div class="heroTitle"></div><div class="heroLine short"></div>
      <div class="spacer"></div><div class="button primary"></div><div class="button secondary"></div>`,
    form: `
      <div class="headerLine"></div><div class="card warm"></div>
      <div class="input"></div><div class="input"></div><div class="input"></div>
      <div class="checkbox"></div><div class="checkbox short"></div><div class="spacer"></div><div class="button primary"></div>`,
    list: `
      <div class="headerLine"></div><div class="tabs"></div>
      <div class="listRow"></div><div class="listRow"></div><div class="listRow"></div><div class="listRow"></div><div class="listRow faded"></div>`,
    dashboard: `
      <div class="headerLine"></div><div class="kpi"></div>
      <div class="grid"><span></span><span></span></div><div class="listRow"></div><div class="listRow short"></div>`,
    state: `
      <div class="stateIcon"></div><div class="heroTitle"></div><div class="heroLine"></div><div class="heroLine short"></div><div class="button primary"></div>`,
    detail: `
      <div class="headerLine"></div><div class="articleTitle"></div><div class="paragraph"></div><div class="paragraph"></div><div class="card"></div>`,
    standard: `
      <div class="headerLine"></div><div class="card"></div><div class="card short"></div><div class="listRow"></div><div class="button primary"></div>`,
  }[screen.kind];
  return `
    <article class="screenCard ${screen.risk}">
      <div class="screenMeta">
        <div>
          <div class="screenName">${safe(screen.title)}</div>
          <div class="screenPath">${safe(screen.file)}</div>
        </div>
        <span class="risk">${chip}</span>
      </div>
      <div class="phone ${screen.kind}">
        <div class="status"></div>
        <div class="appHeader">${safe(screen.title).slice(0, 18)}</div>
        <div class="mockBody">${rows}</div>
      </div>
      <div class="flags">${screen.flags.map(f => `<span>${safe(f)}</span>`).join('')}</div>
    </article>`;
}

const screens = walk(screensRoot).map(file => {
  const source = read(file);
  const name = path.basename(file, '.tsx');
  const feature = featureOf(file);
  return {
    name,
    title: titleFrom(source, name),
    feature,
    file: rel(file),
    kind: classify(source, feature, name),
    risk: risk(source),
    flags: flags(source),
    lines: source.split(/\r?\n/).length,
  };
}).sort((a, b) => a.feature.localeCompare(b.feature) || a.name.localeCompare(b.name));

const counts = screens.reduce((acc, s) => {
  acc.total++;
  acc[s.risk]++;
  acc.features[s.feature] = (acc.features[s.feature] || 0) + 1;
  return acc;
}, {total: 0, high: 0, medium: 0, low: 0, features: {}});

fs.writeFileSync(path.join(outDir, 'inventory.json'), JSON.stringify({generatedAt: new Date().toISOString(), counts, screens}, null, 2));

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>Sodam Screen Preview Gallery</title>
<style>
  :root{--orange:#ff6b35;--navy:#243b4a;--paper:#fffaf3;--canvas:#f4efe8;--text:#201a17;--muted:#766b62;--line:#e8ded5;--ok:#12a87b;--warn:#f59e0b;--bad:#e5484d}
  *{box-sizing:border-box} body{margin:0;background:var(--canvas);font-family:Arial,'Malgun Gothic',sans-serif;color:var(--text)}
  .top{padding:28px 32px 20px;background:#fff;border-bottom:1px solid var(--line);position:sticky;top:0;z-index:2}
  h1{margin:0 0 8px;font-size:28px}.note{margin:0;color:var(--muted);line-height:1.5}.stats{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}
  .stat{background:var(--paper);border:1px solid var(--line);padding:10px 12px;border-radius:12px;font-weight:700}.stat b{color:var(--orange)}
  .wrap{padding:24px 28px 56px}.feature{margin:0 0 28px}.featureTitle{font-size:18px;margin:0 0 12px;text-transform:uppercase;color:var(--navy)}
  .gridCards{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:18px;align-items:start}
  .screenCard{background:#fff;border:1px solid var(--line);border-radius:18px;padding:14px;box-shadow:0 8px 24px rgba(36,59,74,.08)}
  .screenCard.high{border-color:rgba(229,72,77,.5)}.screenCard.medium{border-color:rgba(245,158,11,.45)}
  .screenMeta{display:flex;justify-content:space-between;gap:10px;margin-bottom:12px}.screenName{font-weight:800;font-size:15px}.screenPath{font-size:11px;color:var(--muted);margin-top:3px;word-break:break-all}
  .risk{height:24px;min-width:42px;text-align:center;border-radius:999px;padding:5px 8px;font-size:11px;font-weight:800;background:#eaf7f2;color:var(--ok)}
  .medium .risk{background:#fff6df;color:#b26a00}.high .risk{background:#ffe8e8;color:var(--bad)}
  .phone{width:210px;height:430px;margin:0 auto 12px;border:8px solid #1f2933;border-radius:30px;background:#fff;overflow:hidden;box-shadow:0 10px 26px rgba(0,0,0,.18)}
  .phone.hero{background:linear-gradient(140deg,#263f4f,#172932,#2b2019)}.status{height:18px}.appHeader{height:40px;padding:11px 14px;text-align:center;font-weight:800;font-size:12px;border-bottom:1px solid rgba(0,0,0,.08);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.hero .appHeader{color:#fff;border-color:rgba(255,255,255,.08)}
  .mockBody{height:372px;padding:15px;display:flex;flex-direction:column;gap:10px}.hero .mockBody{align-items:center;color:#fff}.heroMark{width:58px;height:58px;border-radius:18px;background:var(--orange);box-shadow:0 8px 18px rgba(255,107,53,.35);margin-top:28px}
  .heroTitle{width:72%;height:18px;border-radius:9px;background:currentColor;opacity:.9}.heroLine{width:78%;height:10px;border-radius:8px;background:currentColor;opacity:.35}.short{width:54%!important}.spacer{flex:1}
  .button{height:42px;border-radius:14px;width:100%}.primary{background:var(--orange)}.secondary{background:#fff;border:1px solid var(--line)}
  .headerLine{height:44px;border-radius:14px;background:#fff;border:1px solid var(--line)}.card{height:86px;border-radius:16px;background:#fff3e8;border:1px solid #ffe1cf}.card.warm{height:66px}.input{height:46px;border-radius:12px;background:#fff;border:1px solid var(--line)}.checkbox{height:22px;border-radius:9px;background:#eee6df}.tabs{height:36px;border-radius:12px;background:#f0e9e1}.listRow{height:58px;border-radius:14px;background:#fff;border:1px solid var(--line)}.listRow.faded{opacity:.5}.kpi{height:110px;border-radius:18px;background:linear-gradient(135deg,#fffbf5,#fff0e8);border:1px solid #ffe1cf}.grid{display:grid;grid-template-columns:1fr 1fr;gap:8px}.grid span{height:70px;border-radius:14px;background:#fff;border:1px solid var(--line)}.stateIcon{width:72px;height:72px;border-radius:36px;background:#fff0e8;margin:60px auto 8px}.articleTitle{height:28px;border-radius:12px;background:#30241f}.paragraph{height:72px;border-radius:14px;background:#f4efe8}
  .flags{display:flex;flex-wrap:wrap;gap:6px}.flags span{font-size:10px;background:#f6f1eb;color:#675b52;border-radius:999px;padding:5px 7px}
</style>
</head>
<body>
  <header class="top">
    <h1>Sodam Screen Preview Gallery</h1>
    <p class="note">소스 파일을 기준으로 생성한 정적 모바일 프레임 미리보기입니다. 실제 RN 런타임 스크린샷은 아니며, 디바이스 연결 없이 현재 개발된 스크린의 구조와 반응형 위험도를 빠르게 보기 위한 산출물입니다.</p>
    <div class="stats">
      <div class="stat">전체 <b>${counts.total}</b></div>
      <div class="stat">고위험 <b>${counts.high}</b></div>
      <div class="stat">주의 <b>${counts.medium}</b></div>
      <div class="stat">양호 <b>${counts.low}</b></div>
    </div>
  </header>
  <main class="wrap">
    ${Object.keys(counts.features).sort().map(feature => `
      <section class="feature">
        <h2 class="featureTitle">${feature} (${counts.features[feature]})</h2>
        <div class="gridCards">
          ${screens.filter(s => s.feature === feature).map(phoneMock).join('')}
        </div>
      </section>`).join('')}
  </main>
</body>
</html>`;

fs.writeFileSync(path.join(outDir, 'index.html'), html);
console.log(`Generated ${screens.length} screen previews at ${path.join(outDir, 'index.html')}`);
