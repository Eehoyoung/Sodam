import {unwrapData} from '../../../src/common/api/unwrap';
import type {ApiEnvelope} from '../../../src/common/api/types';

describe('unwrapData', () => {
  it('envelope({success, data, ...}) 형태면 data 필드를 꺼낸다', () => {
    const envelope: ApiEnvelope<{id: number}> = {
      success: true,
      data: {id: 1},
      message: 'ok',
      errorCode: undefined,
      timestamp: '2026-07-19T00:00:00Z',
    };
    expect(unwrapData(envelope)).toEqual({id: 1});
  });

  it('envelope가 아닌 순수 payload는 그대로 반환한다', () => {
    const payload = {id: 1, name: '홍길동'};
    expect(unwrapData(payload)).toEqual(payload);
  });

  it('순수 payload가 배열이어도 그대로 반환한다(success/data 키 오탐 방지)', () => {
    const payload = [{id: 1}, {id: 2}];
    expect(unwrapData(payload)).toEqual(payload);
  });

  it('data 필드의 값이 falsy(0, "", false)여도 envelope로 인식해 그대로 꺼낸다', () => {
    expect(unwrapData({success: true, data: 0})).toBe(0);
    expect(unwrapData({success: true, data: ''})).toBe('');
    expect(unwrapData({success: true, data: false})).toBe(false);
  });

  it('null/undefined는 그대로 반환한다', () => {
    expect(unwrapData(null as any)).toBeNull();
    expect(unwrapData(undefined as any)).toBeUndefined();
  });
});
