import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/**/*.{html,ts}',
  ],
  theme: {
    extend: {
      colors: {
        'custom-cyan': '#00979C',
      },
    },
  },
} satisfies Config;
