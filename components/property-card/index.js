import { isFavorite, toggleFavorite } from '../../utils/propertyCollection';

Component({
  externalClasses: ['wr-class'],

  options: {
    addGlobalClass: true,
  },

  properties: {
    id: {
      type: String,
      value: '',
      observer(id) {
        this.genIndependentID(id);
      },
    },
    data: {
      type: Object,
      observer(data) {
        if (!data) return;
        this.setData({ property: data, favorited: isFavorite(data._id), imgError: false });
      },
    },
    /** grid 双列卡片 | row 横向紧凑卡片 | slide 首页横滑卡片 */
    variant: {
      type: String,
      value: 'grid',
    },
    /** 是否展示收藏按钮 */
    showFavorite: {
      type: Boolean,
      value: true,
    },
    /** row 变体下右侧的附加文案，例如收藏时间 */
    extra: {
      type: String,
      value: '',
    },
    /** row 变体下右侧的快捷操作文案，传空则不显示 */
    actionText: {
      type: String,
      value: '',
    },
  },

  data: {
    independentID: '',
    property: {},
    favorited: false,
    imgError: false,
  },

  lifetimes: {
    ready() {
      const { id } = this.properties;
      this.genIndependentID(id);
    },
  },

  methods: {
    clickHandle() {
      this.triggerEvent('click', { property: this.data.property });
    },

    clickThumbHandle() {
      const { images, cover_image } = this.data.property;
      if (!images || images.length < 2) {
        this.clickHandle();
        return;
      }
      this.triggerEvent('thumb', { property: this.data.property, current: cover_image });
    },

    onFavoriteTap() {
      const property = this.data.property;
      const favorited = toggleFavorite(property);
      this.setData({ favorited });
      wx.showToast({ title: favorited ? '已收藏' : '已取消收藏', icon: 'none' });
      this.triggerEvent('favorite', { property, favorited });
    },

    onActionTap() {
      this.triggerEvent('action', { property: this.data.property });
    },

    onImgError() {
      this.setData({ imgError: true });
    },

    genIndependentID(id) {
      const independentID = id || `property-card-${Math.floor(Math.random() * 10 ** 8)}`;
      this.setData({ independentID });
    },
  },
});
