import { getFavoriteCount, getHistoryCount } from '../../utils/propertyCollection';
import { fetchAllProperties } from '../../services/property/property';
import { propertyMockConfig } from '../../config/index';

const PROFILE_KEY = 'uc_profile';

const DEFAULT_AVATAR =
  'https://cdn-we-retail.ym.tencent.com/miniapp/usercenter/icon-user-center-avatar@2x.png';

function readProfile() {
  try {
    return wx.getStorageSync(PROFILE_KEY) || {};
  } catch (err) {
    console.error('[usercenter] 读取昵称头像失败', err);
    return {};
  }
}

Page({
  data: {
    userInfo: { avatarUrl: DEFAULT_AVATAR, nickName: '同事你好' },
    defaultAvatar: DEFAULT_AVATAR,
    counts: { favorite: 0, history: 0, property: 0 },
    versionNo: '',
  },

  onLoad() {
    this.setData({ userInfo: { ...this.data.userInfo, ...readProfile() } });
    this.getVersionInfo();
  },

  onShow() {
    this.getTabBar().init();
    this.refreshCounts();
  },

  onPullDownRefresh() {
    this.refreshCounts(true);
    wx.stopPullDownRefresh();
  },

  /** 收藏与浏览是本地数据，房源总数来自云端，全部失败都不影响页面展示 */
  async refreshCounts(force = false) {
    this.setData({
      counts: {
        ...this.data.counts,
        favorite: getFavoriteCount(),
        history: getHistoryCount(),
      },
    });

    try {
      const all = await fetchAllProperties({ force });
      this.setData({ 'counts.property': all.length });
    } catch (err) {
      console.error('[usercenter] 房源总数获取失败', err);
    }
  },

  onChooseAvatar(e) {
    const avatarUrl = e.detail.avatarUrl;
    if (!avatarUrl) return;
    const userInfo = { ...this.data.userInfo, avatarUrl };
    this.setData({ userInfo });
    this.saveProfile(userInfo);
  },

  onNickChange(e) {
    const nickName = (e.detail.value || '').trim();
    if (!nickName) return;
    const userInfo = { ...this.data.userInfo, nickName };
    this.setData({ userInfo });
    this.saveProfile(userInfo);
  },

  saveProfile(profile) {
    try {
      wx.setStorageSync(PROFILE_KEY, profile);
    } catch (err) {
      console.error('[usercenter] 保存昵称头像失败', err);
    }
  },

  gotoCollection(e) {
    const { tab } = e.currentTarget.dataset;
    wx.navigateTo({ url: `/pages/usercenter/my-collection/index?tab=${tab || 'favorite'}` });
  },

  gotoList() {
    wx.switchTab({ url: '/pages/goods/list/index' });
  },

  showAbout() {
    const source = propertyMockConfig.usePropertyMock
      ? '当前展示的是本机演示数据（model/propertyMock.js），房源信息均为虚构，请勿对外传播。'
      : '数据来自云开发数据库 goods 集合，如发现房源信息有误，请联系房源维护人更新。';

    wx.showModal({
      title: '关于本平台',
      content: `面向内部同事的房源展示工具。${source}`,
      showCancel: false,
      confirmText: '知道了',
    });
  },

  clearLocalCache() {
    wx.showModal({
      title: '清空本地记录',
      content: '将清空收藏与浏览历史，云端房源数据不受影响。',
      confirmText: '清空',
      confirmColor: '#fa550f',
      success: (res) => {
        if (!res.confirm) return;
        wx.removeStorageSync('property_favorites');
        wx.removeStorageSync('property_history');
        this.refreshCounts();
        wx.showToast({ title: '已清空', icon: 'none' });
      },
    });
  },

  getVersionInfo() {
    try {
      const { miniProgram = {} } = wx.getAccountInfoSync();
      const { version, envVersion } = miniProgram;
      this.setData({
        versionNo: envVersion === 'release' ? version || '正式版' : envVersion || '开发版',
      });
    } catch (err) {
      console.error('[usercenter] 版本信息获取失败', err);
    }
  },
});
