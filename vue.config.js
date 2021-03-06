const path = require('path');

function resolve (dir) {
  return path.join(__dirname, dir)
}

// vue.config.js
module.exports = {
  publicPath: '/',
  outputDir: 'dist',
  configureWebpack: {
    externals: {
      'AMap': 'AMap',
      'AMapUI': 'AMapUI'
    }
  },
  devServer: {
    port: 8999, // 端口号
    host: '127.0.0.1',
    disableHostCheck: true,
    // https: true, // https:{type:Boolean}
    open: true, //配置自动启动浏览器
    // proxy: 'http://localhost:4000' // 配置跨域处理,只有一个代理
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:9000',
        pathRewrite: {
          '^/api': ''
        },
        ws: true,
        changeOrigin: true
      }
    }
  },
  // 是否为生产环境构建生成 source map？
  productionSourceMap: false,
  // alias 配置svg
  chainWebpack: (config) => {
    config.resolve.alias
      .set('@', resolve('src'))
    config.module.rules.delete("svg");
    config.module
      .rule('svg-smart')
      .test(/\.svg$/)
      .include
      .add(resolve('src/icons/svg'))
      .end()
      .use('svg-sprite-loader')
      .loader('svg-sprite-loader')
      .options({
        symbolId: 'icon-[name]'
      })
  }
}