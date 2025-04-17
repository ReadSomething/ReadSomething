/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // 使用类名切换深色模式
  theme: {
    extend: {
      colors: {
        // 背景色
        'bg-primary': 'var(--rl-bg-primary)',
        'bg-secondary': 'var(--rl-bg-secondary)',
        'bg-tertiary': 'var(--rl-bg-tertiary)',
        'bg-user': 'var(--rl-bg-user)',
        'bg-agent': 'var(--rl-bg-agent)',
        'bg-input': 'var(--rl-bg-input)',
        
        // 文本色
        'text-primary': 'var(--rl-text-primary)',
        'text-secondary': 'var(--rl-text-secondary)',
        'text-user': 'var(--rl-text-user)',
        'text-agent': 'var(--rl-text-agent)',
        'text-accent': 'var(--rl-text-accent)',
        
        // UI元素
        'border': 'var(--rl-border)',
        'accent': 'var(--rl-accent)',
        'error': 'var(--rl-error)',
        
        // 兼容旧的命名
        'readlite': {
          'bg': 'var(--readlite-background)',
          'message': 'var(--readlite-message-bg)',
          'user': 'var(--readlite-user-bubble)',
          'agent': 'var(--readlite-agent-bubble)',
          'input': 'var(--readlite-input-bg)',
          'text': 'var(--readlite-text)',
          'text-user': 'var(--readlite-text-user)',
          'text-agent': 'var(--readlite-text-agent)',
          'text-secondary': 'var(--readlite-text-secondary)',
          'accent': 'var(--readlite-accent)',
          'border': 'var(--readlite-border)',
          'error': 'var(--readlite-error)',
        }
      },
      backgroundColor: {
        'primary': 'var(--rl-bg-primary)',
        'secondary': 'var(--rl-bg-secondary)',
        'tertiary': 'var(--rl-bg-tertiary)',
      },
      textColor: {
        'primary': 'var(--rl-text-primary)',
        'secondary': 'var(--rl-text-secondary)',
        'accent': 'var(--rl-text-accent)',
      },
      borderColor: {
        'default': 'var(--rl-border)',
        'accent': 'var(--rl-accent)',
      },
      // 自定义滚动条
      scrollbar: {
        track: 'var(--rl-scrollbar-track)',
        thumb: 'var(--rl-scrollbar-thumb)',
      },
    },
  },
  plugins: [
    // 添加自定义滚动条插件
    function({ addUtilities }) {
      const newUtilities = {
        '.scrollbar-custom': {
          'scrollbar-width': 'thin',
          'scrollbar-color': 'var(--rl-scrollbar-thumb) var(--rl-scrollbar-track)',
          '&::-webkit-scrollbar': {
            width: '8px',
            height: '8px',
          },
          '&::-webkit-scrollbar-track': {
            background: 'var(--rl-scrollbar-track)',
          },
          '&::-webkit-scrollbar-thumb': {
            background: 'var(--rl-scrollbar-thumb)',
            borderRadius: '4px',
            '&:hover': {
              background: 'var(--rl-scrollbar-thumb)',
              opacity: '0.8',
            },
          },
        },
      };
      addUtilities(newUtilities, ['responsive']);
    },
  ],
} 