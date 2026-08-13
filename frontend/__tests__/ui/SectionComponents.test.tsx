import React from 'react';
import {Text} from 'react-native';
import {render, fireEvent} from '@testing-library/react-native';
import SectionCard from '../../src/common/components/sections/SectionCard';
import SectionHeader from '../../src/common/components/sections/SectionHeader';
import PrimaryButton from '../../src/common/components/buttons/PrimaryButton';

/**
 * 공용 섹션·버튼 컴포넌트의 실렌더링 검증.
 *
 * <p>이전 버전은 react-test-renderer + 문자열 mock 조합이라 {@code toJSON()} 이 null 이 나와
 * 스킵돼 있었다. 프로젝트 표준인 RTL 실렌더링으로 다시 썼고, 존재 여부만 보는 대신 실제로
 * 화면에 나오는 텍스트와 인터랙션을 검증한다.</p>
 */
describe('UI Section Components', () => {
    describe('SectionCard', () => {
        it('자식 요소를 그대로 렌더링한다', () => {
            const {getByText, getByTestId} = render(
                <SectionCard testID="card">
                    <Text>지원 정책 내용</Text>
                </SectionCard>,
            );

            expect(getByTestId('card')).toBeTruthy();
            expect(getByText('지원 정책 내용')).toBeTruthy();
        });
    });

    describe('SectionHeader', () => {
        it('제목과 액션 라벨을 보여준다', () => {
            const {getByText} = render(
                <SectionHeader
                    title="정부 지원 정책"
                    actionLabel="더보기"
                    onPressAction={jest.fn()}
                    testID="hdr"
                />,
            );

            expect(getByText('정부 지원 정책')).toBeTruthy();
            expect(getByText('더보기')).toBeTruthy();
        });

        it('액션을 누르면 onPressAction 이 불린다', () => {
            const onPress = jest.fn();
            const {getByText} = render(
                <SectionHeader title="공지사항" actionLabel="전체보기" onPressAction={onPress} />,
            );

            fireEvent.press(getByText('전체보기'));

            expect(onPress).toHaveBeenCalledTimes(1);
        });

        it('onPressAction 이 없으면 액션을 렌더링하지 않는다', () => {
            const {queryByText, getByText} = render(
                <SectionHeader title="공지사항" actionLabel="전체보기" />,
            );

            expect(getByText('공지사항')).toBeTruthy();
            expect(queryByText('전체보기')).toBeNull();
        });
    });

    describe('PrimaryButton', () => {
        it('누르면 onPress 가 한 번 불린다', () => {
            const onPress = jest.fn();
            const {getByText} = render(<PrimaryButton title="확인" onPress={onPress} testID="btn" />);

            fireEvent.press(getByText('확인'));

            expect(onPress).toHaveBeenCalledTimes(1);
        });

        // jest.setup 의 TouchableOpacity 는 pass-through mock 이라 터치 게이팅을 흉내내지 않는다.
        // 그래서 "onPress 가 안 불린다"가 아니라 disabled 를 실제로 내려보내는지를 검증한다.
        it('disabled 를 터치 컴포넌트로 전달한다', () => {
            const {getByTestId} = render(
                <PrimaryButton title="확인" onPress={jest.fn()} disabled testID="btn" />,
            );

            expect(getByTestId('btn').props.disabled).toBe(true);
        });

        it('isLoading 이면 라벨 대신 로딩만 보이고 비활성이 된다', () => {
            const {getByTestId, queryByText} = render(
                <PrimaryButton title="확인" onPress={jest.fn()} isLoading testID="btn" />,
            );

            expect(getByTestId('btn').props.disabled).toBe(true);
            expect(queryByText('확인')).toBeNull();
        });
    });
});
