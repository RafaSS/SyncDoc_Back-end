/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,ts}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#007bff',
          dark: '#0056b3',
        },
        secondary: '#6c757d',
        light: '#f8f9fa',
        success: '#28a745',
        danger: '#dc3545',
        background: '#f5f5f5',
        text: '#333',
        messageSelf: '#007bff',
        messageOther: '#e9e9e9',
      },
    },
  },
  plugins: [],
}
