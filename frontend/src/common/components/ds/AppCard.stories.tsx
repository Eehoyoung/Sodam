import type {Meta, StoryObj} from '@storybook/react-native-web-vite';
import {View} from 'react-native';
import {AppCard} from './AppCard';
import {AppText} from './AppText';

const meta: Meta<typeof AppCard> = {
    title: 'DS/AppCard',
    component: AppCard,
    decorators: [
        Story => (
            <View style={{padding: 16, maxWidth: 360, backgroundColor: '#F7F7F4'}}>
                <Story />
            </View>
        ),
    ],
    args: {
        variant: 'flat',
        hero: false,
        selected: false,
    },
    argTypes: {
        variant: {
            control: 'select',
            options: ['flat', 'elevated', 'outlined', 'warm', 'navy', 'danger', 'plain', 'hero', 'spot'],
        },
    },
};

export default meta;
type Story = StoryObj<typeof AppCard>;

const CardBody = () => (
    <View>
        <AppText variant="headingSm" weight="700">이번 주 근무 요약</AppText>
        <AppText variant="bodyMd" tone="secondary" style={{marginTop: 4}}>
            5일 근무 · 32시간 12분
        </AppText>
    </View>
);

/** 컨트롤 패널에서 variant/selected를 자유롭게 조합해볼 수 있다. */
export const Playground: Story = {
    render: args => (
        <AppCard {...args}>
            <CardBody />
        </AppCard>
    ),
};

export const Plain: Story = {
    args: {variant: 'plain'},
    render: args => <AppCard {...args}><CardBody /></AppCard>,
};

export const Spot: Story = {
    args: {variant: 'spot'},
    render: args => <AppCard {...args}><CardBody /></AppCard>,
};

export const Warm: Story = {
    args: {variant: 'warm'},
    render: args => <AppCard {...args}><CardBody /></AppCard>,
};

export const Elevated: Story = {
    args: {variant: 'elevated'},
    render: args => <AppCard {...args}><CardBody /></AppCard>,
};

export const Selected: Story = {
    args: {variant: 'plain', selected: true},
    render: args => <AppCard {...args}><CardBody /></AppCard>,
};
