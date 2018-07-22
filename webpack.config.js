const path = require("path");
var CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = {
    entry: "./src/index.ts",
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: "ts-loader",
                exclude: /node_modules/
            }
        ]
    },
    plugins: [new CopyWebpackPlugin([{ from: "src/html/", to: "./" }])],
    resolve: {
        extensions: [".tsx", ".ts", ".js"]
    },
    output: {
        libraryTarget: "umd",
        filename: "sentence-splitter.js",
        path: path.resolve(__dirname, "dist")
    }
};
