import type {Meta, StoryObj} from '@storybook/react-native-web-vite';
import {View} from 'react-native';
import {AppButton} from './AppButton';

const meta: Meta<typeof AppButton> = {
    title: 'DS/AppButton',
    component: AppButton,
    decorators: [
        Story => (
            <View style={{padding: 16, maxWidth: 360}}>
                <Story />
            </View>
        ),
    ],
    args: {
        label: '출근하기',
        variant: 'primary',
        size: 'lg',
        disabled: false,
        loading: false,
        fullWidth: true,
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['primary', 'secondary', 'outline', 'ghost', 'destructive', 'invertedPrimary', 'kakao'],
        },
        size: {control: 'select', options: ['sm', 'md', 'lg']},
    },
};

export default meta;
type Story = StoryObj<typeof AppButton>;

/** 컨트롤 패널에서 variant/size/disabled/loading을 자유롭게 조합해볼 수 있다. */
export const Playground: Story = {};

export const Primary: Story = {args: {variant: 'primary', label: '출근하기'}};
export const Secondary: Story = {args: {variant: 'secondary', label: '자세히 보기'}};
export const Outline: Story = {args: {variant: 'outline', label: '취소'}};
export const Ghost: Story = {args: {variant: 'ghost', label: '더보기'}};
export const Destructive: Story = {args: {variant: 'destructive', label: '탈퇴하기'}};
export const Kakao: Story = {args: {variant: 'kakao', label: '카카오로 시작하기'}};
export const Disabled: Story = {args: {variant: 'primary', label: '제출', disabled: true}};
export const Loading: Story = {args: {variant: 'primary', label: '제출', loading: true, loadingLabel: '처리 중...'}};
