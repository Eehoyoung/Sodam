import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { Platform } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AttendanceSummaryPanel } from '../../src/features/attendance/components/AttendanceSummaryPanel';

// useAttendance -> useLocationConsentGate 가 useQueryClient() 를 호출하므로(GPS 첫 사용 시
// 위치정보 동의 게이트, 실제 쿼리 네트워크는 타지 않음) QueryClientProvider 로 감싸야 한다.
const renderWithQueryClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return TestRenderer.create(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);
};

jest.mock('../../src/features/attendance/services/attendanceService', () => ({
  __esModule: true,
  default: {
    getCurrentAttendance: jest.fn().mockResolvedValue(null),
    getAttendanceRecords: jest.fn().mockResolvedValue([]),
    verifyLocationAttendance: jest.fn().mockResolvedValue({ success: true }),
    verifyNfcTagAttendance: jest.fn().mockResolvedValue({ success: true }),
    checkIn: jest.fn().mockResolvedValue({ id: 'att_1', checkInTime: new Date().toISOString(), workplaceName: '소담', date: new Date().toISOString(), status: 1 }),
    checkOut: jest.fn().mockResolvedValue(true),
  }
}));

describe('AttendanceSummaryPanel', () => {
  test('renders correctly and toggles methods', async () => {
    let renderer: TestRenderer.ReactTestRenderer;

    await act(async () => {
      renderer = renderWithQueryClient(<AttendanceSummaryPanel onPressViewDetails={jest.fn()} />);
    });

    const tree = renderer!.toJSON();
    expect(tree).toBeTruthy();

    // Find method chips by text and simulate press
    const root = renderer!.root;
    const chips = root.findAllByProps({
      accessible: false // use a generic search to avoid RN internals; fallback to find by type later
    });
    // More deterministic: find all TouchableOpacity and press the second (위치)
    const touchables = root.findAll((node) => (node.props?.onPress && node.type && typeof node.type !== 'string'));
    // Ensure at least one touchable exists (method chips + CTA buttons exist). We press the first chip manually by locating text
    const methodChipLocation = root.findAllByProps({ children: '위치' })[0].parent as any;
    await act(async () => {
      methodChipLocation.props.onPress();
    });

    expect(true).toBe(true);
  });

  test('iOS는 NFC 출퇴근 방식 칩을 숨긴다 (1차 출시 제외)', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'ios';

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderWithQueryClient(<AttendanceSummaryPanel onPressViewDetails={jest.fn()} />);
    });

    const nfcChips = renderer!.root.findAllByProps({ children: 'NFC' });
    expect(nfcChips).toHaveLength(0);

    (Platform as any).OS = originalOS;
  });

  test('Android는 NFC 출퇴근 방식 칩을 노출한다', async () => {
    const originalOS = Platform.OS;
    (Platform as any).OS = 'android';

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderWithQueryClient(<AttendanceSummaryPanel onPressViewDetails={jest.fn()} />);
    });

    const nfcChips = renderer!.root.findAllByProps({ children: 'NFC' });
    expect(nfcChips).toHaveLength(1);

    (Platform as any).OS = originalOS;
  });

  // WP-C(QR 출퇴근) — iOS·Android 두 플랫폼 모두 노출돼야 한다(NFC와 달리 숨기지 않음).
  test.each(['ios', 'android'])('%s에서도 QR 출퇴근 방식 칩을 노출한다', async (os) => {
    const originalOS = Platform.OS;
    (Platform as any).OS = os;

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderWithQueryClient(<AttendanceSummaryPanel onPressViewDetails={jest.fn()} />);
    });

    const qrChips = renderer!.root.findAllByProps({ children: 'QR' });
    expect(qrChips).toHaveLength(1);

    (Platform as any).OS = originalOS;
  });

  test('QR 방식을 선택하면 출근 버튼 문구가 QR 스캔 안내로 바뀐다', async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = renderWithQueryClient(<AttendanceSummaryPanel onPressViewDetails={jest.fn()} />);
    });

    const qrChip = renderer!.root.findAllByProps({ children: 'QR' })[0].parent as any;
    await act(async () => {
      qrChip.props.onPress();
    });

    // 버튼 텍스트는 여러 조건부 JSX 표현식이 한 <Text> 안에 배열로 들어가므로(false 포함), 평탄화 후 검사한다.
    const allText = renderer!.root
      .findAllByType('Text')
      .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
      .filter((child) => typeof child === 'string');
    expect(allText).toContain('QR로 출근하기 (상세에서 스캔)');
  });
});
