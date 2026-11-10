import updateManager from './common/updateManager';
import { init } from '@cloudbase/wx-cloud-client-sdk';
import { CLOUDBASE_ENV_ID } from './config/index';

wx.cloud.init({
  env: CLOUDBASE_ENV_ID, // 云开发环境 ID，统一在 config/index.js 维护
});

const client = init(wx.cloud);
const models = client.models;
globalThis.dataModel = models;
// 接下来就可以调用 models 上的数据模型增删改查等方法了

App({
  globalData: {
    /**
     * 页面间跳转参数。tabBar 页面的 switchTab 不支持带 query，
     * 首页的分类入口、搜索入口先写到这里，列表页 onShow 时读取并清空
     */
    listQuery: null,
  },

  onLaunch: function () {},

  onShow: function () {
    updateManager();
  },
});
