import next from 'eslint-config-next';

export default [
  ...next,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'off', // ปิดเฉพาะกฎที่ติด
      // 'prefer-const': 'warn', // ลดความแรงเป็นเตือน
    },
  },
];
