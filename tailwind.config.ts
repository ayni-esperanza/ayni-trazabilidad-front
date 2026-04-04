import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
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
  