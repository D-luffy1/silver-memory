import {
  getFavoriteList,
  getHistoryList,
  removeFavorite,
  removeHistory,
  clearHistory,
} from '../../../utils/propertyCollection';
import { getPropertiesByIds } from '../../../services/property/property';
import { previewPropertyImages } from '../../../utils/imagePreview';

const DAY = 24 * 60 * 60 * 1000;

/** 只到“天”的相对时间，收藏/浏览这类场景不需要精确到分钟 */
function formatRelativeTime(time) {
  if (!time) return '';
  const diff = Date.now() - time;
  if (diff < DAY) return '今天';
  if (diff < 2 * DAY) return '昨天';
  if (diff < 30 * DAY) return `${Math.floor(diff / DAY)}天前`;
  const date = new Date(time);
  return `${date.getMonth() + 1}月${date.getDate()}日`;
}

Page({
  data: {
    tab: 'favorite',
    list: [],
    loading: true,
    failed: false,
    invalidCount: 0,
  },

  onLoad(options) {
    const tab = options && options.tab === 'history' ? 'history' : 'favorite';
    this.setData({ tab });
  },

  /** 详情页会写入浏览记录，返回时重新读一遍本地数据 */
  onShow() {
    this.loadList();
  },

  onPullDownRefresh() {
    this.loadList().then(() => wx.stopPullDownRefresh());
  },

  async loadList() {
    const { tab } = this.data;
    const entries = tab === 'favorite' ? getFavoriteList() : getHistoryList();
    const timeMap = entries.reduce((acc, item) => {
      acc[item.id] = formatRelativeTime(item.time);
      return acc;
    }, {});

    this.setData({ loading: true, failed: false });

    try {
      const records = await getPropertiesByIds(entries.map((item) => item.id));
      const exists = records.map((item) => item._id);
      const label = tab === 'favorite' ? '收藏于' : '浏览于';

      this.setData({
        list: records.map((item) => ({ ...item, extra: `${label} ${timeMap[item._id] || ''}`.trim() })),
        loading: false,
        invalidCount: entries.length - exists.length,
      });
    } catch (err) {
      console.error('[my-collection] 列表加载失败', err);
      this.setData({ list: [], loading: false, failed: true, invalidCount: 0 });
    }
  },

  onTabChange(e) {
    const { tab } = e.currentTarget.dataset;
    if (!tab || tab === this.data.tab) return;
    this.setData({ tab, list: [] }, () => this.loadList());
  },

  /** 收藏页取消收藏后，这条应该立刻消失 */
  onFavoriteChange(e) {
    const { favorited } = e.detail;
    if (this.data.tab === 'favorite' && !favorited) this.loadList();
  },

  /** history 形态下卡片右侧的“删除”按钮，只删本机记录 */
  onItemDelete(e) {
    const { property = {} } = e.detail;
    const { id } = property;
    if (!id) return;

    wx.showModal({
      title: '删除记录',
      content: `将从本机浏览历史中移除「${property.name || '该房源'}」。`,
      confirmText: '删除',
      confirmColor: '#fa550f',
      success: (res) => {
        if (!res.confirm) return;
        removeHistory(id);
        this.loadList();
      },
    });
  },

  onClearHistory() {
    wx.showModal({
      title: '清空浏览历史',
      content: '清空后本机将不再保留最近看过的房源。',
      confirmText: '清空',
      confirmColor: '#fa550f',
      success: (res) => {
        if (!res.confirm) return;
        clearHistory();
        this.loadList();
      },
    });
  },

  /** 下架或被删除的房源，提供一键清理，避免记录越积越多 */
  onCleanInvalid() {
    const { tab } = this.data;
    const entries = tab === 'favorite' ? getFavoriteList() : getHistoryList();
    const validIds = this.data.list.map((item) => item._id);
    const invalidIds = entries.map((item) => item.id).filter((id) => !validIds.includes(id));

    invalidIds.forEach((id) => (tab === 'favorite' ? removeFavorite(id) : removeHistory(id)));
    this.loadList();
  },

  previewImages(e) {
    const { property, current } = e.detail;
    previewPropertyImages(property && property.images, current);
  },

  gotoDetail(e) {
    const { property } = e.detail;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${property._id}` });
  },

  gotoList() {
    wx.switchTab({ url: '/pages/goods/list/index' });
  },
});
