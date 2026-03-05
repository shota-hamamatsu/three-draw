import type { Meta, StoryObj } from '@storybook/react';
import { ThreeDrawCanvas } from './ThreeDrawCanvas';

const meta = {
  title: 'Components/ThreeDrawCanvas',
  component: ThreeDrawCanvas,
  parameters: {
    layout: 'centered',
  },
  tags: ['autodocs'],
  argTypes: {
    width: {
      control: { type: 'number' },
      description: 'Canvas width in pixels',
    },
    height: {
      control: { type: 'number' },
      description: 'Canvas height in pixels',
    },
    backgroundColor: {
      control: { type: 'color' },
      description: 'Background color of the canvas',
    },
  },
} satisfies Meta<typeof ThreeDrawCanvas>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    width: 800,
    height: 600,
    backgroundColor: '#1a1a1a',
  },
};

export const Small: Story = {
  args: {
    width: 400,
    height: 300,
    backgroundColor: '#1a1a1a',
  },
};

export const LightBackground: Story = {
  args: {
    width: 800,
    height: 600,
    backgroundColor: '#f0f0f0',
  },
};

export const CustomSize: Story = {
  args: {
    width: 1024,
    height: 768,
    backgroundColor: '#2a2a2a',
  },
};
