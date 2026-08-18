import type { Preview } from "@storybook/react-vite";
import "../src/index.css";

const preview: Preview = {
  tags: ["autodocs"],
  parameters: {
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    layout: "centered",
    viewport: {
      viewports: {
        narrow: { name: "Narrow phone", styles: { width: "320px", height: "568px" } },
        phone: { name: "Phone", styles: { width: "390px", height: "844px" } },
        tablet: { name: "Tablet", styles: { width: "768px", height: "1024px" } },
        desktop: { name: "Desktop", styles: { width: "1024px", height: "768px" } },
      },
    },
  },
};

export default preview;
