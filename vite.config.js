/** @type {import('vite').UserConfig} */

export default {
  define: {
    __APP_VERSION__: JSON.stringify(process.env.npm_package_version),
  },
};
