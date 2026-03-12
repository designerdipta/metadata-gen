module.exports = {
  packagerConfig: {
    asar: true,
    name: "Metadata Gen",
    icon: "./logo"
  },
  rebuildConfig: {},
  makers: [
    {
      name: '@electron-forge/maker-squirrel',
      config: {},
    },
  ],
  plugins: [
    {
      name: '@electron-forge/plugin-vite',
      config: {
        // `build` steps of Vite will run in parallel
        build: [
          {
            // `entry` is just an alias for `build.lib.entry` in the Vite config
            entry: 'main.js',
            config: 'vite.main.config.mjs',
          },
          {
            entry: 'preload.cjs',
            config: 'vite.preload.config.mjs',
          },
        ],
        renderer: [
          {
            name: 'main_window',
            config: 'vite.renderer.config.mjs',
          },
        ],
      },
    },
  ],
};
