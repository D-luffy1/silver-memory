import {
  queryProperties,
  getPropertyFacets,
  fetchAllProperties,
  PROPERTY_CATEGORIES,
  PRICE_RANGES,
  AREA_RANGES,
} from '../../../services/property/property';
import { previewPropertyImages } from '../../../utils/imagePreview';

const PAGE_SIZE = 10;

/** 排序条配置，点击同一项时切换升/降序 */
const SORT_ITEMS = [
  { label: '综合', field: 'default' },
  { label: '价格', field: 'price' },
  { label: '面积', field: 'area' },
  { label: '单价', field: 'unitPrice' },
];

Page({
  data: {
    loading: true,
    failed: false,
    focusSearch: false,
    keyword: '',
    categories: [{ label: '全部', value: '', count: 0 }].concat(PROPERTY_CATEGORIES),
    activeCategory: '',
    sortItems: SORT_ITEMS,
    sortField: 'default',
    sortOrder: 'desc',
    list: [],
    total: 0,
    pageNumber: 1,
    noMore: false,
    filterVisible: false,
    houseTypeOptions: [],
    priceOptions: PRICE_RANGES,
    areaOptions: AREA_RANGES,
    // 已生效的筛选条件
    selectedHouseTypes: [],
    priceIndex: 0,
    areaIndex: 0,
    // 筛选抽屉里的草稿，点「确定」才生效
    draftHouseTypes: [],
    draftPriceIndex: 0,
    draftAreaIndex: 0,
    activeFilterCount: 0,
    appliedTags: [],
  },

  async onLoad() {
    await this.loadFacets();
    this.applyQuery(true);
  },

  onShow() {
    this.getTabBar().init();

    // 首页的分类入口 / 搜索入口通过 globalData 传参（switchTab 不支持 query）
    const query = getApp().globalData.listQuery;
    if (!query) return;

    getApp().globalData.listQuery = null;
    this.setData(
      {
        activeCategory: query.categoryId || this.data.activeCategory,
        focusSearch: !!query.focusSearch,
      },
      () => this.applyQuery(true),
    );
  },

  async onPullDownRefresh() {
    try {
      await fetchAllProperties({ force: true });
      await this.loadFacets();
      await this.applyQuery(true);
    } catch (err) {
      console.error('[list] 刷新失败', err);
      this.setData({ failed: true, loading: false });
    }
    wx.stopPullDownRefresh();
  },

  onReachBottom() {
    if (this.data.noMore || this.data.loading || this.data.failed) return;
    this.applyQuery(false);
  },

  async loadFacets() {
    try {
      const facets = await getPropertyFacets();
      this.setData({
        categories: [{ label: '全部', value: '', count: facets.total }].concat(facets.categories),
        houseTypeOptions: facets.houseTypes,
        failed: false,
      });
    } catch (err) {
      console.error('[list] 筛选项加载失败', err);
      this.setData({ failed: true, loading: false });
    }
  },

  /**
   * 全量数据已在本地缓存，这里只做一次内存过滤 + 分页切片
   * @param {boolean} reset 是否回到第一页
   */
  async applyQuery(reset = false) {
    const pageNumber = reset ? 1 : this.data.pageNumber;
    const isFirstPage = pageNumber === 1;
    this.setData({ loading: isFirstPage });

    try {
      const { records, total } = await queryProperties({
        pageNumber,
        pageSize: PAGE_SIZE,
        keyword: this.data.keyword,
        categoryId: this.data.activeCategory,
        houseTypes: this.data.selectedHouseTypes,
        priceRange: PRICE_RANGES[this.data.priceIndex] || null,
        areaRange: AREA_RANGES[this.data.areaIndex] || null,
        sort: `${this.data.sortField}:${this.data.sortOrder}`,
      });

      const list = isFirstPage ? records : this.data.list.concat(records);

      this.setData({
        list,
        total,
        loading: false,
        failed: false,
        noMore: list.length >= total,
        pageNumber: pageNumber + 1,
      });

      this.buildAppliedTags();
    } catch (err) {
      console.error('[list] 房源查询失败', err);
      this.setData({ loading: false, failed: true });
    }
  },

  /** 把当前生效的条件渲染成可删除的标签 */
  buildAppliedTags() {
    const { selectedHouseTypes, priceIndex, areaIndex, keyword } = this.data;
    const tags = [];

    if (keyword) tags.push({ type: 'keyword', label: `关键词「${keyword}」` });
    if (priceIndex > 0) tags.push({ type: 'price', label: PRICE_RANGES[priceIndex].label });
    if (areaIndex > 0) tags.push({ type: 'area', label: AREA_RANGES[areaIndex].label });
    selectedHouseTypes.forEach((value) => tags.push({ type: 'houseType', value, label: value }));

    this.setData({
      appliedTags: tags,
      activeFilterCount: tags.filter((item) => item.type !== 'keyword').length,
    });
  },

  onSearchInput(e) {
    this.setData({ keyword: e.detail.value });
    this.applyQuery(true);
  },

  onSearchClear() {
    if (!this.data.keyword) return;
    this.setData({ keyword: '' });
    this.applyQuery(true);
  },

  onSearchBlur() {
    this.setData({ focusSearch: false });
  },

  onCategoryChange(e) {
    const { value } = e.currentTarget.dataset;
    if (value === this.data.activeCategory) return;
    this.setData({ activeCategory: value });
    this.applyQuery(true);
  },

  onSortChange(e) {
    const { field } = e.currentTarget.dataset;
    if (field !== this.data.sortField) {
      this.setData({ sortField: field, sortOrder: 'desc' });
    } else if (field !== 'default') {
      this.setData({ sortOrder: this.data.sortOrder === 'desc' ? 'asc' : 'desc' });
    }
    this.applyQuery(true);
  },

  onFilterOpen() {
    this.setData({ filterVisible: true, draftPriceIndex: this.data.priceIndex, draftAreaIndex: this.data.areaIndex });
    this.markDraftHouseTypes(this.data.selectedHouseTypes.slice());
  },

  /** WXML 里不能调 indexOf，选中状态预先算好挂在选项上 */
  markDraftHouseTypes(draft) {
    this.setData({
      draftHouseTypes: draft,
      houseTypeOptions: this.data.houseTypeOptions.map((item) => ({
        ...item,
        isOn: draft.indexOf(item.label) >= 0,
      })),
    });
  },

  onFilterClose() {
    this.setData({ filterVisible: false });
  },

  onFilterHouseTypeTap(e) {
    const { value } = e.currentTarget.dataset;
    const draft = this.data.draftHouseTypes.slice();
    const index = draft.indexOf(value);
    if (index >= 0) draft.splice(index, 1);
    else draft.push(value);
    this.markDraftHouseTypes(draft);
  },

  onFilterPriceTap(e) {
    this.setData({ draftPriceIndex: Number(e.currentTarget.dataset.index) });
  },

  onFilterAreaTap(e) {
    this.setData({ draftAreaIndex: Number(e.currentTarget.dataset.index) });
  },

  onFilterReset() {
    this.setData({ draftPriceIndex: 0, draftAreaIndex: 0 });
    this.markDraftHouseTypes([]);
  },

  onFilterConfirm() {
    this.setData({
      selectedHouseTypes: this.data.draftHouseTypes,
      priceIndex: this.data.draftPriceIndex,
      areaIndex: this.data.draftAreaIndex,
      filterVisible: false,
    });
    this.applyQuery(true);
  },

  /** 删除单个已选条件 */
  onTagRemove(e) {
    const { type, value } = e.currentTarget.dataset;
    if (type === 'keyword') {
      this.setData({ keyword: '' });
    } else if (type === 'price') {
      this.setData({ priceIndex: 0 });
    } else if (type === 'area') {
      this.setData({ areaIndex: 0 });
    } else if (type === 'houseType') {
      this.setData({ selectedHouseTypes: this.data.selectedHouseTypes.filter((item) => item !== value) });
    }
    this.applyQuery(true);
  },

  onClearAll() {
    this.setData({
      keyword: '',
      activeCategory: '',
      selectedHouseTypes: [],
      priceIndex: 0,
      areaIndex: 0,
      sortField: 'default',
      sortOrder: 'desc',
    });
    this.applyQuery(true);
  },

  onRetry() {
    this.applyQuery(true);
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
    return { title: '房源列表', path: '/pages/goods/list/index' };
  },
});
