import type { Meta, StoryObj } from '@storybook/react';
import { ThreeDrawCanvas } from './ThreeDrawCanvas';
import { DrawLineMode, DRAW_LINE_MODE } from '../modes/DrawLineMode';
import { SelectMode, SELECT_MODE } from '../modes/SelectMode';

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

export const LineAndSelect: Story = {
  args: {
    modes: {
      [DRAW_LINE_MODE]: new DrawLineMode(),
      [SELECT_MODE]: new SelectMode({
        handlers: {
          onSelectionChange: (event) => {
            console.log('selection-change', event);
          },
          onDragStart: (event) => {
            console.log('drag-start', event);
          },
          onDrag: (event) => {
            console.log('drag', event);
          },
          onDragEnd: (event) => {
            console.log('drag-end', event);
          },
        },
      }),
    },
    initialMode: DRAW_LINE_MODE,
  },
};
