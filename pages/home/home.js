import { getPropertyFacets, pickProperties, pickFeatured } from '../../services/property/property';
import { previewPropertyImages } from '../../utils/imagePreview';
import { propertyMockConfig } from '../../config/index';

const SWIPER_LIMIT = 5;
const LATEST_LIMIT = 6;
const RECOMMEND_LIMIT = 6;

Page({
  data: {
    /** 演示数据标记，避免同事把假房源当真房源传播 */
    isDemo: !!propertyMockConfig.usePropertyMock,
    loading: true,
    failed: false,
    stats: [],
    categories: [],
    imgSrcs: [],
    swiperItems: [],
    latest: [],
    recommended: [],
    current: 0,
    autoplay: true,
    duration: 500,
    interval: 4500,
    navigation: { type: 'dots' },
  },

  loaded: false,

  onLoad() {
    this.init();
  },

  onShow() {
    this.getTabBar().init();

    // 从详情页返回时刷新卡片上的收藏角标（换成新对象引用，卡片的 observer 才会重新计算）
    if (this.loaded) {
      this.setData({
        latest: this.data.latest.map((item) => ({ ...item })),
        recommended: this.data.recommended.map((item) => ({ ...item })),
      });
    }
  },

  async onPullDownRefresh() {
    await this.init(true);
    wx.stopPullDownRefresh();
  },

  async init(force = false) {
    this.setData({ loading: !this.loaded, failed: false });

    try {
      const facets = await getPropertyFacets({ force });
      const latest = await pickProperties({ sort: 'newest', limit: LATEST_LIMIT });
      // 推荐列表排掉已展示的“最新上架”，同时给轮播供图，整页内容不重复
      const recommended = await pickFeatured(RECOMMEND_LIMIT, latest.map((item) => item._id));
      const swiperItems = recommended.filter((item) => item.cover_image).slice(0, SWIPER_LIMIT);

      const stats = [
        { label: '在售房源', value: facets.total, unit: '套' },
        { label: '户型种类', value: facets.houseTypes.length, unit: '种' },
        { label: '均价', value: facets.avgPrice, unit: '万' },
      ];

      this.loaded = true;

      this.setData({
        loading: false,
        failed: false,
        stats,
        categories: facets.categories.filter((item) => !item.isFallback),
        latest,
        recommended,
        // 轮播项与图片一一对应，点图跳转时才能取到正确的房源
        swiperItems,
        imgSrcs: swiperItems.map((item) => item.cover_image),
      });
    } catch (err) {
      console.error('[home] 首页数据加载失败', err);
      this.setData({ loading: false, failed: true });
    }
  },

  onRetry() {
    this.init(true);
  },

  goToList() {
    wx.switchTab({ url: '/pages/goods/list/index' });
  },

  goToListByCategory(e) {
    const { value } = e.currentTarget.dataset;
    getApp().globalData.listQuery = { categoryId: value };
    wx.switchTab({ url: '/pages/goods/list/index' });
  },

  goToSearch() {
    getApp().globalData.listQuery = { focusSearch: true };
    wx.switchTab({ url: '/pages/goods/list/index' });
  },

  onSwiperTap(e) {
    const { index } = e.detail || {};
    const property = this.data.swiperItems[index];
    if (!property) return;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${property._id}` });
  },

  gotoDetail(e) {
    const property = (e.detail && e.detail.property) || {};
    if (!property._id) return;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${property._id}` });
  },

  previewImages(e) {
    const { property, current } = e.detail || {};
    previewPropertyImages(property && property.images, current);
  },

  onShareAppMessage() {
    return { title: '优选房源 · 内部房源展示', path: '/pages/home/home' };
  },
});
