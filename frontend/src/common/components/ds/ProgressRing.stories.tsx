import type {Meta, StoryObj} from '@storybook/react-native-web-vite';
import {View} from 'react-native';
import {ProgressRing} from './ProgressRing';
import {AppText} from './AppText';

const meta: Meta<typeof ProgressRing> = {
    title: 'DS/ProgressRing',
    component: ProgressRing,
    decorators: [
        Story => (
            <View style={{padding: 24, alignItems: 'center', backgroundColor: '#F7F7F4'}}>
                <Story />
            </View>
        ),
    ],
    args: {
        progress: 0.6,
        size: 148,
        strokeWidth: 10,
    },
    argTypes: {
        progress: {control: {type: 'range', min: 0, max: 1, step: 0.01}},
    },
};

export default meta;
type Story = StoryObj<typeof ProgressRing>;

const withLabel = (progress: number) => (
    <ProgressRing progress={progress}>
        <AppText variant="headingLg" weight="700">{Math.round(progress * 100)}%</AppText>
    </ProgressRing>
);

/** 컨트롤 패널의 progress 슬라이더로 코랄→틸 그라디언트가 채워지는 걸 실시간으로 볼 수 있다. */
export const Playground: Story = {
    render: args => (
        <ProgressRing {...args}>
            <AppText variant="headingLg" weight="700">{Math.round(args.progress * 100)}%</AppText>
        </ProgressRing>
    ),
};

export const Empty: Story = {render: () => withLabel(0)};
export const Quarter: Story = {render: () => withLabel(0.25)};
export const Half: Story = {render: () => withLabel(0.5)};
export const ThreeQuarters: Story = {render: () => withLabel(0.75)};
export const Full: Story = {render: () => withLabel(1)};
