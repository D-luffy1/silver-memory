import { getProperty, getSimilarProperties } from '../../../services/property/property';
import { isFavorite, toggleFavorite, pushHistory } from '../../../utils/propertyCollection';
import { previewPropertyImages } from '../../../utils/imagePreview';
import { propertyMockConfig } from '../../../config/index';

/**
 * 查看房东电话的口令。
 * 说明：这是内部展示工具的临时做法，口令明文存在于前端包体，
 * 一旦小程序对外发布或手机号需要正式保护，必须改为云函数校验后按权限下发。
 */
const VIEW_PASSWORD = 'Kk123456';

/**
 * 未解锁时的号码占位，按 3-4-4 分组全遮。
 * 不能写死星号串，否则换个号码位数对不上，看着就像假数据；
 * 分隔用普通空格即可，WXML 不解析 &nbsp; 会直接当文字渲染出来。
 */
function maskPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  if (!digits) return '';
  if (digits.length < 8) return '*'.repeat(digits.length);

  const groups = [digits.slice(0, 3), digits.slice(3, 7), digits.slice(7)];

  return groups.map((group) => '*'.repeat(group.length)).join(' ');
}

Page({
  data: {
    /** 当前读的是 model/propertyMock.js 时，页面要明说 */
    isDemo: !!propertyMockConfig.usePropertyMock,
    property: null,
    similar: [],
    loading: true,
    failed: false,
    favorited: false,
    current: 0,
    duration: 500,
    interval: 4500,
    navigation: { type: 'fraction' },
    descExpanded: false,
    phoneVisible: false,
    phoneMask: '',
    phonePassword: '',
    showPasswordDialog: false,
  },

  propertyId: '',

  async onLoad(query) {
    this.propertyId = query.spuId || '';
    await this.loadProperty();
  },

  async loadProperty() {
    this.setData({ loading: true, failed: false });

    try {
      const property = await getProperty(this.propertyId);

      if (!property) {
        this.setData({ loading: false, failed: true, property: null });
        return;
      }

      wx.setNavigationBarTitle({ title: property.name || '房源详情' });
      pushHistory(property);

      this.setData({
        loading: false,
        failed: false,
        property,
        favorited: isFavorite(property._id),
        phoneVisible: false,
        phoneMask: maskPhone(property.phone),
      });

      this.loadSimilar(property);
    } catch (err) {
      console.error('[detail] 房源详情加载失败', err);
      this.setData({ loading: false, failed: true });
    }
  },

  async loadSimilar(property) {
    try {
      const all = await getSimilarProperties(property, 8);
      // 相似房源只需要封面，避免和主图区抢视觉
      this.setData({
        similar: all.map((item) => ({
          ...item,
          tags: item.tags.slice(0, 2),
        })),
      });
    } catch (err) {
      console.error('[detail] 相似房源加载失败', err);
    }
  },

  onRetry() {
    this.loadProperty();
  },

  onSwiperChange(e) {
    this.setData({ current: e.detail.current });
  },

  /** 点轮播图直接看大图，比多一个按钮顺手 */
  onSwiperTap(e) {
    const { index } = e.detail || {};
    this.previewImages(index);
  },

  previewImages(index) {
    const images = this.data.property && this.data.property.images;
    if (!images || !images.length) return;
    const at = typeof index === 'number' && images[index] ? index : this.data.current;
    this.setData({ current: at });
    previewPropertyImages(images, images[at]);
  },

  /** 弹窗内部阻止冒用遮罩的关闭事件，需要一个空处理函数 */
  noop() {},

  onFavoriteTap() {
    const property = this.data.property;
    if (!property) return;
    const favorited = toggleFavorite(property);
    this.setData({ favorited });
    wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' });
  },

  onDescToggle() {
    this.setData({ descExpanded: !this.data.descExpanded });
  },

  copyAddress() {
    const address = this.data.property?.address;
    if (!address) return;
    wx.setClipboardData({
      data: address,
      success: () => wx.showToast({ title: '地址已复制', icon: 'none' }),
    });
  },

  /** 底部「咨询」按钮：未解锁时先走口令，已解锁直接拨打 */
  onContactTap() {
    if (this.data.phoneVisible) {
      this.callPhone();
      return;
    }
    if (this.data.property?.phone) {
      this.setData({ showPasswordDialog: true, phonePassword: '' });
      return;
    }
    wx.showToast({ title: '该房源暂未提供联系电话', icon: 'none' });
  },

  onPhoneTap() {
    if (this.data.phoneVisible) return;
    this.setData({ showPasswordDialog: true, phonePassword: '' });
  },

  onPhoneInput(e) {
    this.setData({ phonePassword: e.detail.value });
  },

  onPhoneConfirm() {
    if (this.data.phonePassword !== VIEW_PASSWORD) {
      wx.showToast({ title: '密码错误', icon: 'none' });
      return;
    }
    this.setData({ phoneVisible: true, showPasswordDialog: false, phonePassword: '' });
  },

  onPhoneCancel() {
    this.setData({ showPasswordDialog: false, phonePassword: '' });
  },

  callPhone() {
    const phone = this.data.property?.phone;
    if (!phone) return;
    wx.makePhoneCall({ phoneNumber: phone });
  },

  gotoSimilarDetail(e) {
    const property = (e.detail && e.detail.property) || {};
    if (!property._id || property._id === this.propertyId) return;
    wx.navigateTo({ url: `/pages/goods/details/index?spuId=${property._id}` });
  },

  goToList() {
    wx.switchTab({ url: '/pages/goods/list/index' });
  },

  onShareAppMessage() {
    const property = this.data.property;
    return {
      title: property ? `${property.name}｜${property.priceText}${property.priceUnit}` : '房源详情',
      path: `/pages/goods/details/index?spuId=${this.propertyId}`,
      imageUrl: property?.cover_image || '',
    };
  },

  onShareTimeline() {
    const property = this.data.property;
    return {
      title: property ? `${property.name}｜${property.priceText}${property.priceUnit}` : '房源详情',
      query: `spuId=${this.propertyId}`,
    };
  },
});
