import React from 'react';
import {ScrollView, Text, View, Pressable, StyleSheet} from 'react-native';

const C = {
  orange: '#FF6B35',
  orangeSoft: '#FFF0E8',
  navy: '#243B4A',
  bg: '#F7F4EF',
  card: '#FFFFFF',
  text: '#201A17',
  sub: '#625B55',
  line: '#E8E0D8',
  green: '#12A87B',
  amber: '#F59E0B',
  blue: '#3B82F6',
};

export default function SodamLaunchMock() {
  return (
    <ScrollView style={s.root} contentContainerStyle={s.wrap}>
      <View style={s.phone}>
        <View style={s.hero}>
          <View style={s.logo}><Text style={s.logoText}>소</Text></View>
          <Text style={s.kicker}>소상공인 운영 비서</Text>
          <Text style={s.h1}>오늘 가게 운영,{'\n'}여기서 끝내세요</Text>
          <Text style={s.copy}>출퇴근부터 급여명세까지 사장님과 직원이 같은 기록을 봅니다.</Text>
        </View>
        <RoleCard title="사장님" desc="미출근, 급여, 직원 초대를 한 화면에서" active />
        <RoleCard title="직원" desc="출근, 퇴근, 급여명세를 5초 안에" />
        <RoleCard title="개인 기록" desc="회사 승인 없이 내 알바 시간을 직접 기록" />
        <Pressable style={s.primary}><Text style={s.primaryText}>사장님으로 시작하기</Text></Pressable>
        <Text style={s.link}>이미 계정이 있어요</Text>
      </View>

      <View style={s.phone}>
        <Header title="카페 소담" />
        <View style={s.alertCard}>
          <Text style={s.alertTitle}>오늘 처리할 일 3개</Text>
          <Text style={s.alertCopy}>미출근 1명 · 누락 기록 2건 · 정산 준비율 83%</Text>
          <Pressable style={s.smallBtn}><Text style={s.smallBtnText}>이상 출퇴근 확인</Text></Pressable>
        </View>
        <View style={s.metrics}>
          <Metric label="출근" value="4/5" tone={C.green} />
          <Metric label="예상급여" value="241만" tone={C.orange} />
          <Metric label="남은일" value="6일" tone={C.blue} />
        </View>
        <Text style={s.section}>지금 확인할 직원</Text>
        <Row name="민지" meta="미출근" badge="알림" danger />
        <Row name="도윤" meta="근무중 03:12" badge="정상" />
        <Row name="지아" meta="출근 완료" badge="완료" />
        <View style={s.payrollCard}>
          <Text style={s.section}>이번 달 급여</Text>
          <Text style={s.money}>2,418,000원</Text>
          <View style={s.progress}><View style={s.progressFill} /></View>
          <Text style={s.caption}>정산 준비율 83%</Text>
        </View>
      </View>

      <View style={s.phone}>
        <Header title="민지님" />
        <View style={s.center}>
          <Text style={s.date}>2026년 5월 25일 월요일</Text>
          <Pressable style={s.punch}>
            <Text style={s.punchMain}>출근하기</Text>
            <Text style={s.punchSub}>GPS 정상 · NFC 대기</Text>
          </Pressable>
          <Text style={s.store}>카페 소담 · 시급 10,500원</Text>
        </View>
        <View style={s.summary}>
          <Text style={s.section}>이번 달</Text>
          <Text style={s.moneySmall}>42.5h · 446,250원</Text>
        </View>
        <View style={s.quickGrid}>
          <Quick label="급여명세" />
          <Quick label="근무기록" />
          <Quick label="매장 코드" />
        </View>
      </View>
    </ScrollView>
  );
}

function Header({title}: {title: string}) {
  return <View style={s.header}><Text style={s.headerTitle}>{title}</Text><Text style={s.bell}>알림</Text></View>;
}

function RoleCard({title, desc, active}: {title: string; desc: string; active?: boolean}) {
  return <View style={[s.role, active && s.roleActive]}><Text style={s.roleTitle}>{title}</Text><Text style={s.roleDesc}>{desc}</Text></View>;
}

function Metric({label, value, tone}: {label: string; value: string; tone: string}) {
  return <View style={s.metric}><Text style={s.metricLabel}>{label}</Text><Text style={[s.metricValue, {color: tone}]}>{value}</Text></View>;
}

function Row({name, meta, badge, danger}: {name: string; meta: string; badge: string; danger?: boolean}) {
  return <View style={s.row}><View><Text style={s.rowName}>{name}</Text><Text style={s.rowMeta}>{meta}</Text></View><Text style={[s.badge, danger && s.badgeDanger]}>{badge}</Text></View>;
}

function Quick({label}: {label: string}) {
  return <Pressable style={s.quick}><Text style={s.quickText}>{label}</Text></Pressable>;
}

const s = StyleSheet.create({
  root: {flex: 1, backgroundColor: C.bg},
  wrap: {padding: 20, gap: 20},
  phone: {width: 360, alignSelf: 'center', backgroundColor: C.bg, borderRadius: 28, padding: 16, borderWidth: 1, borderColor: C.line},
  hero: {backgroundColor: C.navy, borderRadius: 24, padding: 22, marginBottom: 14},
  logo: {width: 48, height: 48, borderRadius: 16, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', marginBottom: 18},
  logoText: {color: '#fff', fontSize: 22, fontWeight: '800'},
  kicker: {color: '#FFD8C7', fontSize: 12, fontWeight: '700'},
  h1: {color: '#fff', fontSize: 28, lineHeight: 35, fontWeight: '800', marginTop: 8},
  copy: {color: '#F6EDE7', fontSize: 14, lineHeight: 22, marginTop: 10},
  role: {backgroundColor: C.card, borderRadius: 16, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: C.line},
  roleActive: {borderColor: C.orange, backgroundColor: C.orangeSoft},
  roleTitle: {fontSize: 17, fontWeight: '800', color: C.text},
  roleDesc: {fontSize: 13, color: C.sub, marginTop: 4},
  primary: {height: 56, borderRadius: 16, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center', marginTop: 8},
  primaryText: {color: '#fff', fontSize: 16, fontWeight: '800'},
  link: {textAlign: 'center', color: C.sub, marginTop: 14, fontWeight: '700'},
  header: {height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  headerTitle: {fontSize: 20, fontWeight: '800', color: C.text},
  bell: {fontSize: 13, color: C.orange, fontWeight: '800'},
  alertCard: {backgroundColor: C.navy, borderRadius: 22, padding: 18},
  alertTitle: {color: '#fff', fontSize: 20, fontWeight: '800'},
  alertCopy: {color: '#EADFD7', fontSize: 13, marginTop: 6},
  smallBtn: {alignSelf: 'flex-start', backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 14, borderRadius: 12, marginTop: 14},
  smallBtnText: {color: C.navy, fontWeight: '800'},
  metrics: {flexDirection: 'row', gap: 8, marginVertical: 12},
  metric: {flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 12},
  metricLabel: {fontSize: 12, color: C.sub},
  metricValue: {fontSize: 20, fontWeight: '900', marginTop: 4},
  section: {fontSize: 16, fontWeight: '800', color: C.text, marginBottom: 8},
  row: {backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between'},
  rowName: {fontSize: 15, fontWeight: '800', color: C.text},
  rowMeta: {fontSize: 12, color: C.sub, marginTop: 3},
  badge: {backgroundColor: '#E7F8F1', color: C.green, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 99, fontSize: 12, fontWeight: '800'},
  badgeDanger: {backgroundColor: '#FFF3D6', color: C.amber},
  payrollCard: {backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 4},
  money: {fontSize: 30, fontWeight: '900', color: C.orange},
  moneySmall: {fontSize: 24, fontWeight: '900', color: C.orange},
  progress: {height: 8, backgroundColor: '#EFE7DF', borderRadius: 99, overflow: 'hidden', marginTop: 10},
  progressFill: {width: '83%', height: '100%', backgroundColor: C.orange},
  caption: {fontSize: 12, color: C.sub, marginTop: 8},
  center: {alignItems: 'center', paddingVertical: 12},
  date: {fontSize: 13, color: C.sub, marginBottom: 18},
  punch: {width: 220, height: 220, borderRadius: 110, backgroundColor: C.orange, alignItems: 'center', justifyContent: 'center'},
  punchMain: {color: '#fff', fontSize: 28, fontWeight: '900'},
  punchSub: {color: '#FFE1D4', fontSize: 13, fontWeight: '700', marginTop: 8},
  store: {marginTop: 18, color: C.sub, fontWeight: '700'},
  summary: {backgroundColor: C.card, borderRadius: 18, padding: 16, marginTop: 10},
  quickGrid: {flexDirection: 'row', gap: 8, marginTop: 12},
  quick: {flex: 1, backgroundColor: C.card, borderRadius: 14, paddingVertical: 14, alignItems: 'center'},
  quickText: {fontSize: 13, fontWeight: '800', color: C.text},
});
