import React from 'react';
import TestRenderer, {act} from 'react-test-renderer';
import QRScannerModal from '../../src/features/attendance/components/QRScannerModal';

// react-native-vision-camera는 jest.setup.js에서 hasPermission:true + mock back camera로 mock돼 있다.
// 여기서는 개별 테스트마다 필요 시 재정의(권한 없음/기기 없음 시나리오)한다.
import {useCameraDevice, useCameraPermission} from 'react-native-vision-camera';

describe('QRScannerModal — WP-C QR 출퇴근 스캐너(D-2 해소)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useCameraDevice as jest.Mock).mockReturnValue({id: 'mock-back-camera', position: 'back'});
    (useCameraPermission as jest.Mock).mockReturnValue({
      hasPermission: true,
      requestPermission: jest.fn(() => Promise.resolve(true)),
    });
  });

  test('카메라 권한이 있으면 Camera 프리뷰와 취소 버튼을 렌더한다', async () => {
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <QRScannerModal visible onScanned={jest.fn()} onClose={jest.fn()} />,
      );
    });

    const cameras = renderer!.root.findAllByType('Camera' as any);
    expect(cameras).toHaveLength(1);

    const cancelLabel = renderer!.root.findAllByProps({children: '취소'});
    expect(cancelLabel.length).toBeGreaterThan(0);
  });

  test('취소 버튼을 누르면 onClose가 호출된다', async () => {
    const onClose = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <QRScannerModal visible onScanned={jest.fn()} onClose={onClose} />,
      );
    });

    const cancelBtn = renderer!.root.findAllByProps({accessibilityLabel: 'QR 스캔 취소'})[0];
    await act(async () => {
      cancelBtn.props.onPress();
    });

    expect(onClose).toHaveBeenCalled();
  });

  test('카메라 권한이 없으면 권한 안내를 보여주고 Camera를 렌더하지 않는다', async () => {
    (useCameraPermission as jest.Mock).mockReturnValue({
      hasPermission: false,
      requestPermission: jest.fn(() => Promise.resolve(false)),
    });

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <QRScannerModal visible onScanned={jest.fn()} onClose={jest.fn()} />,
      );
    });

    expect(renderer!.root.findAllByType('Camera' as any)).toHaveLength(0);
    const texts = renderer!.root
      .findAllByType('Text')
      .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
      .filter((child) => typeof child === 'string');
    expect(texts).toContain('카메라 권한이 필요해요');
  });

  test('카메라 기기가 없으면 대체 안내를 보여준다', async () => {
    (useCameraDevice as jest.Mock).mockReturnValue(undefined);

    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <QRScannerModal visible onScanned={jest.fn()} onClose={jest.fn()} />,
      );
    });

    expect(renderer!.root.findAllByType('Camera' as any)).toHaveLength(0);
    const texts = renderer!.root
      .findAllByType('Text')
      .flatMap((t) => (Array.isArray(t.props.children) ? t.props.children : [t.props.children]))
      .filter((child) => typeof child === 'string');
    expect(texts).toContain('이 기기에서 카메라를 찾을 수 없어요');
  });

  // H-5 — 같은 QR 이 프레임에 남아 있으면 onCodeScanned 가 프레임마다 계속 불린다.
  // 잠금이 없으면 출퇴근 요청이 반복 발사된다.
  test('같은 QR이 여러 프레임에 걸쳐 읽혀도 onScanned는 1번만 호출된다', async () => {
    const onScanned = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <QRScannerModal visible onScanned={onScanned} onClose={jest.fn()} />,
      );
    });

    // useCodeScanner mock 은 옵션 객체를 그대로 반환하므로 Camera prop 에서 콜백을 꺼낼 수 있다.
    const camera = renderer!.root.findAllByType('Camera' as any)[0];
    const {onCodeScanned} = camera.props.codeScanner;

    await act(async () => {
      onCodeScanned([{value: 'QR_TOKEN_1'}]);
      onCodeScanned([{value: 'QR_TOKEN_1'}]);
      onCodeScanned([{value: 'QR_TOKEN_1'}]);
    });

    expect(onScanned).toHaveBeenCalledTimes(1);
    expect(onScanned).toHaveBeenCalledWith('QR_TOKEN_1');
  });

  test('모달을 다시 열면 잠금이 풀려 새 스캔을 받을 수 있다', async () => {
    const onScanned = jest.fn();
    let renderer: TestRenderer.ReactTestRenderer;
    await act(async () => {
      renderer = TestRenderer.create(
        <QRScannerModal visible onScanned={onScanned} onClose={jest.fn()} />,
      );
    });

    const scan = (token: string) => {
      const camera = renderer!.root.findAllByType('Camera' as any)[0];
      camera.props.codeScanner.onCodeScanned([{value: token}]);
    };

    await act(async () => { scan('QR_TOKEN_1'); });
    await act(async () => {
      renderer!.update(<QRScannerModal visible={false} onScanned={onScanned} onClose={jest.fn()} />);
    });
    await act(async () => {
      renderer!.update(<QRScannerModal visible onScanned={onScanned} onClose={jest.fn()} />);
    });
    await act(async () => { scan('QR_TOKEN_2'); });

    expect(onScanned).toHaveBeenCalledTimes(2);
    expect(onScanned).toHaveBeenLastCalledWith('QR_TOKEN_2');
  });

});
