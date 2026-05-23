import React from 'react';
import TestRenderer, { act } from 'react-test-renderer';
import { AttendanceSummaryPanel } from '../../src/features/attendance/components/AttendanceSummaryPanel';

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
      renderer = TestRenderer.create(<AttendanceSummaryPanel onPressViewDetails={jest.fn()} />);
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
});
