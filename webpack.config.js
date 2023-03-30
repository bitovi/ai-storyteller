const path = require("path");
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = { 
  entry: "./src/index.js",
  experiments: {
    topLevelAwait: true
  },
  output: {
    filename: "app.js",
    path: path.resolve(__dirname, "build"), 
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: path.join(__dirname, "public", "index.html"),
    }),
    // new CopyPlugin({
    //   patterns: [{ //probably load on server side instead
    //     from: path.join(__dirname, "prompts"),
    //     to: path.join(__dirname, "build", "prompts")
    //   }],
    // }),
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, "build"),
    },
    port: process.env.APP_PORT || 3000,
  },
  module: {
    // exclude node_modules
    rules: [
      {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: ["babel-loader"],
      },
      {
        test: /\.less$/i,
        use: [
          // compiles Less to CSS
          "style-loader",
          "css-loader",
          "less-loader",
        ],
      },
    ],
  },
  // pass all js files through Babel
  resolve: {
    extensions: ["*", ".js", ".jsx"],
  },
}