import type { Meta, StoryObj } from '@storybook/react';
import { ThreeDrawCanvas } from './ThreeDrawCanvas';
import { DrawLineMode, DRAW_LINE_MODE } from '../modes/DrawLineMode';

const meta = {
  title: 'Components/ThreeDrawCanvas',
  component: ThreeDrawCanvas,
} satisfies Meta<typeof ThreeDrawCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
  },
};

// Story that demonstrates the line drawing mode
export const LineDrawing: Story = {
  args: {
    modes: { [DRAW_LINE_MODE]: new DrawLineMode() },
    initialMode: DRAW_LINE_MODE,
  },
};
