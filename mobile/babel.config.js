module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            // @shared/types → ../../shared/types (one level up from /mobile)
            "@shared": "./src/shared",
          },
        },
      ],
    ],
  };
};
