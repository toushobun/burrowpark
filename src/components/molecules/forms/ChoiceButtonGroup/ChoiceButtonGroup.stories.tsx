import Box from "@mui/material/Box";
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { useState } from "react";

import { ChoiceButtonGroup } from "./ChoiceButtonGroup";

function Example({ labels, columns }: { labels: string[]; columns?: number }) {
  const [value, setValue] = useState(labels[0]);
  return (
    <Box sx={{ width: 393, maxWidth: "100%", px: 2, boxSizing: "border-box" }}>
      <ChoiceButtonGroup
        options={labels.map((label) => ({ label, value: label }))}
        value={value}
        onChange={setValue}
        columns={columns}
      />
    </Box>
  );
}

const meta = {
  component: Example,
  title: "Molecules/Forms/ChoiceButtonGroup",
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof Example>;

export default meta;
type Story = StoryObj<typeof meta>;

export const ThreeColumns: Story = {
  args: { labels: ["酒店客", "临停", "免费（装卸）"] },
};
export const FourColumns: Story = {
  args: { labels: ["1 天", "2 天", "3 天", "自定义"] },
};
export const TwoByTwo: Story = {
  args: { labels: ["酒店客", "临停", "长租", "免费（装卸）"], columns: 2 },
};
