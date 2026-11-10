import { getCloudImageTempUrlSafely } from '../../utils/cloudImageHandler';
import { propertyMockConfig } from '../../config/index';
import { genPropertyMock } from '../../model/propertyMock';

const COLLECTION_NAME = 'goods';

/** 小程序端单次查询上限 */
const DB_PAGE_SIZE = 100;
/** 全量拉取的保险上限，防止异常数据把内存打满 */
const MAX_PAGE_COUNT = 30;
/** 全量缓存有效期，下拉刷新可强制绕过 */
const LIST_CACHE_TTL = 5 * 60 * 1000;

/** 总价口径的价格单位，仅对新房/二手房有意义 */
const PRICE_UNIT = '万';
/** 租房的 price 存的是月租（元），单位、单价、均价、价格区间都要单独处理 */
const RENT_CATEGORY = 'zufang';
const RENT_PRICE_UNIT = '元/月';

export const PROPERTY_CATEGORIES = [
  { label: '新房', value: 'xinfang', icon: 'home' },
  { label: '二手房', value: 'ershoufang', icon: 'store' },
  { label: '租房', value: 'zufang', icon: 'cards' },
];

const CATEGORY_LABEL = PROPERTY_CATEGORIES.reduce((acc, item) => {
  acc[item.value] = item.label;
  return acc;
}, {});

/** 筛选面板用的固定档位，符合国内住宅常见区间；只按总价口径生效 */
export const PRICE_RANGES = [
  { label: '不限', min: 0, max: 0 },
  { label: '100万以下', min: 0, max: 100 },
  { label: '100-200万', min: 100, max: 200 },
  { label: '200-300万', min: 200, max: 300 },
  { label: '300-500万', min: 300, max: 500 },
  { label: '500-800万', min: 500, max: 800 },
  { label: '800万以上', min: 800, max: 0 },
];

export const AREA_RANGES = [
  { label: '不限', min: 0, max: 0 },
  { label: '60㎡以下', min: 0, max: 60 },
  { label: '60-90㎡', min: 60, max: 90 },
  { label: '90-120㎡', min: 90, max: 120 },
  { label: '120-150㎡', min: 120, max: 150 },
  { label: '150-200㎡', min: 150, max: 200 },
  { label: '200㎡以上', min: 200, max: 0 },
];

export const SORT_OPTIONS = [
  { label: '综合', value: 'default' },
  { label: '价格', value: 'price' },
  { label: '面积', value: 'area' },
  { label: '单价', value: 'unitPrice' },
];

let db = null;

function getDB() {
  if (!db) db = wx.cloud.database();
  return db;
}

/** 数值字段可能是 number，也可能是带单位的字符串，统一转成数字 */
function toNumber(value) {
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value !== 'string') return 0;
  const parsed = parseFloat(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
}

/** 特色标签的分隔符不统一，空格/逗号/顿号/分号都兼容 */
function toTags(feature) {
  if (Array.isArray(feature)) return feature.filter(Boolean);
  if (typeof feature !== 'string' || !feature.trim()) return [];
  return feature
    .split(/[\s,，、;；|]+/)
    .map((x) => x.trim())
    .filter(Boolean);
}

function toImageList(image) {
  if (Array.isArray(image)) return image.filter((x) => typeof x === 'string' && x);
  if (typeof image === 'string' && image) return [image];
  return [];
}

/**
 * 数据库记录 -> 前端展示模型
 * goodName -> name，image -> images/cover_image，feature -> tags，
 * 另外派生出 price/area 数值、unitPrice 单价等展示字段
 */
function normalizeProperty(record) {
  const images = toImageList(record.image);
  const price = toNumber(record.price);
  const area = toNumber(record.area);
  const isRent = record.categoryId === RENT_CATEGORY;
  // 月租除以面积得到的“每㎡单价”没有参考意义，租房不展示
  const unitPrice = !isRent && price > 0 && area > 0 ? Math.round((price * 10000) / area) : 0;

  return {
    ...record,
    id: record._id,
    name: record.goodName || '未命名房源',
    address: record.address || '',
    houseType: record.houseType || '',
    floor: record.floor || '',
    orientation: record.orientation || '',
    desc: record.desc || '',
    phone: record.phone || '',
    categoryId: record.categoryId || '',
    categoryLabel: CATEGORY_LABEL[record.categoryId] || '其他',
    price,
    priceText: price ? String(price) : '',
    priceUnit: isRent ? RENT_PRICE_UNIT : PRICE_UNIT,
    isRent,
    area,
    unitPrice,
    images,
    cover_image: images[0] || '',
    tags: toTags(record.feature),
    specs: [record.houseType, area ? `${area}㎡` : '', record.orientation, record.floor]
      .filter(Boolean)
      .join(' · '),
  };
}

/** 就地补齐封面临时链接 */
async function withCoverUrl(list) {
  const targets = [];
  list.forEach((item, index) => {
    if (item.cover_image) targets.push(index);
  });
  if (!targets.length) return list;

  const urls = await getCloudImageTempUrlSafely(targets.map((index) => list[index].cover_image));
  targets.forEach((index, i) => {
    list[index].cover_image = urls[i] || list[index].cover_image;
  });
  return list;
}

let listCache = null;
let listCacheTime = 0;
let loadingPromise = null;

/** 从云开发分页拉全量房源，单页失败不影响其余页 */
async function loadFromCloud() {
  const collection = getDB().collection(COLLECTION_NAME);
  const countResult = await collection.count();
  const total = countResult.total || 0;
  const pageCount = Math.min(Math.ceil(total / DB_PAGE_SIZE) || 1, MAX_PAGE_COUNT);

  const pages = await Promise.all(
    Array.from({ length: pageCount }, (_, i) =>
      collection.skip(i * DB_PAGE_SIZE).limit(DB_PAGE_SIZE).get().catch(() => ({ data: [] })),
    ),
  );

  return pages.reduce((acc, page) => acc.concat(page.data || []), []).map(normalizeProperty);
}

/**
 * 拉取全量房源并缓存。数据量不大时，把筛选/排序/搜索都放到客户端，
 * 切换条件可以做到了无网络请求、即时响应
 */
export async function fetchAllProperties({ force = false } = {}) {
  if (!force && listCache && Date.now() - listCacheTime < LIST_CACHE_TTL) return listCache;
  if (loadingPromise) return loadingPromise;

  loadingPromise = (async () => {
    const records = propertyMockConfig.usePropertyMock
      ? genPropertyMock().map(normalizeProperty)
      : await loadFromCloud();

    await withCoverUrl(records);

    listCache = records;
    listCacheTime = Date.now();
    return listCache;
  })();

  try {
    return await loadingPromise;
  } finally {
    loadingPromise = null;
  }
}

/** 生成排序/筛选面板需要用的统计信息 */
export async function getPropertyFacets({ force = false } = {}) {
  const all = await fetchAllProperties({ force });

  const categories = PROPERTY_CATEGORIES.map((item) => ({
    ...item,
    count: all.filter((x) => x.categoryId === item.value).length,
  }));
  const uncategorized = all.filter((x) => !CATEGORY_LABEL[x.categoryId]).length;
  if (uncategorized) {
    categories.push({ label: '其他', value: '', count: uncategorized, isFallback: true });
  }

  const houseTypeCount = {};
  all.forEach((item) => {
    if (item.houseType) houseTypeCount[item.houseType] = (houseTypeCount[item.houseType] || 0) + 1;
  });

  // 均价只统计总价口径的房源，否则月租会把数字拉偏
  const priced = all.filter((item) => item.price > 0 && !item.isRent);

  return {
    total: all.length,
    avgPrice: priced.length ? Math.round(priced.reduce((sum, item) => sum + item.price, 0) / priced.length) : 0,
    categories,
    houseTypes: Object.keys(houseTypeCount)
      .sort((a, b) => houseTypeCount[b] - houseTypeCount[a] || a.localeCompare(b))
      .map((label) => ({ label, count: houseTypeCount[label] })),
    priceRanges: PRICE_RANGES.map((item) => ({
      ...item,
      count: item.max
        ? priced.filter((x) => x.price >= item.min && x.price < item.max).length
        : priced.filter((x) => x.price >= item.min).length,
    })),
    areaRanges: AREA_RANGES.map((item) => ({
      ...item,
      count: item.max ? all.filter((x) => x.area >= item.min && x.area < item.max).length : all.filter((x) => x.area >= item.min).length,
    })),
  };
}

function matchKeyword(item, keyword) {
  return [item.name, item.address, item.houseType, item.orientation, item.floor, item.desc, (item.tags || []).join(' ')]
    .join('\n')
    .toLowerCase()
    .includes(keyword);
}

function inRange(value, range) {
  if (!range || (range.min === 0 && range.max === 0)) return true;
  if (!value) return false;
  if (range.min && value < range.min) return false;
  if (range.max && value >= range.max) return false;
  return true;
}

const SORTERS = {
  default: (a, b) => String(b._id).localeCompare(String(a._id)),
  newest: (a, b) => String(b._id).localeCompare(String(a._id)),
  priceAsc: (a, b) => a.price - b.price,
  priceDesc: (a, b) => b.price - a.price,
  areaAsc: (a, b) => a.area - b.area,
  areaDesc: (a, b) => b.area - a.area,
  unitPriceAsc: (a, b) => a.unitPrice - b.unitPrice,
  unitPriceDesc: (a, b) => b.unitPrice - a.unitPrice,
};

/**
 * 在缓存的全量数据上做筛选、排序、分页
 * @param {{ pageNumber?, pageSize?, keyword?, categoryId?, houseTypes?, priceRange?, areaRange?, sort? }} options
 *   priceRange / areaRange 传 PRICE_RANGES / AREA_RANGES 里的档位对象；sort 传 `字段:asc|desc`
 * @returns {Promise<{ records: object[], total: number, all: object[] }>} records 为当页数据，total 为命中总数
 */
export async function queryProperties(options = {}) {
  const {
    pageNumber = 1,
    pageSize = 10,
    keyword = '',
    categoryId = '',
    houseTypes = [],
    priceRange = null,
    areaRange = null,
    sort = 'default',
  } = options;

  const all = await fetchAllProperties();

  const lowerKeyword = String(keyword || '').trim().toLowerCase();
  const activeHouseTypes = (houseTypes || []).filter(Boolean);
  // 价格档位是总价口径，选了具体档位时排除按月租存储的租房，避免 5800 元被当成“100万以下”
  const priceRangeOn = !!priceRange && !(priceRange.min === 0 && priceRange.max === 0);

  const filtered = all.filter((item) => {
    if (categoryId && item.categoryId !== categoryId) return false;
    if (activeHouseTypes.length && !activeHouseTypes.includes(item.houseType)) return false;
    if (priceRangeOn && item.isRent) return false;
    if (!inRange(item.price, priceRange)) return false;
    if (!inRange(item.area, areaRange)) return false;
    if (lowerKeyword && !matchKeyword(item, lowerKeyword)) return false;
    return true;
  });

  const [field, order] = String(sort).split(':');
  const isAsc = order === 'asc';
  const sorter = SORTERS[`${field}${isAsc ? 'Asc' : 'Desc'}`] || SORTERS.default;
  filtered.sort(sorter);

  const start = Math.max(0, (pageNumber - 1) * pageSize);
  return { records: filtered.slice(start, start + pageSize), total: filtered.length, all: filtered };
}

/** 不分页取数据，供首页推荐、横向列表等场景使用 */
export async function pickProperties(options = {}) {
  const { records } = await queryProperties({ ...options, pageNumber: 1, pageSize: options.limit || 100 });
  return records.slice(0, options.limit || records.length);
}

/** 信息完整度打分，用于「优选推荐」：有图、有标签、有价格的房源排前面 */
function completenessScore(item) {
  return (
    (item.cover_image ? 3 : 0) +
    Math.min((item.tags || []).length, 3) +
    (item.price > 0 ? 2 : 0) +
    (item.unitPrice > 0 ? 1 : 0) +
    (item.desc ? 1 : 0) +
    Math.min((item.images || []).length, 5)
  );
}

/**
 * 取优选房源，默认排除已经出现在「最新上架」里的 ID，两块内容不重复
 * @param {number} limit
 * @param {string[]} excludeIds
 */
export async function pickFeatured(limit = 6, excludeIds = []) {
  const all = await fetchAllProperties();
  const excluded = new Set(excludeIds);

  // slice 后再 sort，避免就地排序打乱全量缓存的顺序
  const ranked = all
    .slice()
    .sort(
      (a, b) =>
        completenessScore(b) - completenessScore(a) || String(b._id).localeCompare(String(a._id)),
    );

  const picked = ranked.filter((item) => !excluded.has(item._id)).slice(0, limit);

  // 房源总数本来就少时，排掉「最新上架」会把推荐清空，这里按完整度回填凑满
  if (picked.length < limit) {
    const taken = new Set(picked.map((item) => item._id));
    ranked.forEach((item) => {
      if (taken.size >= limit || taken.has(item._id)) return;
      picked.push(item);
      taken.add(item._id);
    });
  }

  return picked;
}

/** 按 ID 批量取，供收藏页、浏览历史页使用 */
export async function getPropertiesByIds(ids = []) {
  if (!ids.length) return [];
  const all = await fetchAllProperties();
  const dict = new Map(all.map((item) => [item._id, item]));
  return ids.map((id) => dict.get(id)).filter(Boolean);
}

/**
 * 取单个房源详情。优先命中全量缓存，避免再发一次 doc 查询
 * @param {string} propertyId
 */
export async function getProperty(propertyId) {
  if (!propertyId) return null;

  const cached = listCache ? listCache.find((item) => item._id === propertyId) : null;
  let property = cached ? { ...cached } : null;

  if (!property) {
    try {
      const res = await getDB().collection(COLLECTION_NAME).doc(propertyId).get();
      property = res.data ? normalizeProperty(res.data) : null;
    } catch (err) {
      console.error('[property] 详情查询失败', propertyId, err);
      property = null;
    }
  }

  if (!property) return null;

  if (property.images.length) {
    property.images = await getCloudImageTempUrlSafely(property.images);
    property.cover_image = property.images[0] || property.cover_image;
  }

  return property;
}

/** 同类房源推荐，用于详情页底部 */
export async function getSimilarProperties(property = {}, limit = 6) {
  const all = await fetchAllProperties();
  const rest = all.filter((item) => item._id !== property._id);

  const sameCategory = property.categoryId ? rest.filter((item) => item.categoryId === property.categoryId) : [];
  const sameHouseType = property.houseType ? rest.filter((item) => item.houseType === property.houseType) : [];

  const picked = [];
  const push = (item) => {
    if (picked.length >= limit) return;
    if (!picked.some((x) => x._id === item._id)) picked.push(item);
  };

  sameCategory.forEach(push);
  sameHouseType.forEach(push);
  rest.forEach(push);

  return picked;
}

/** 兼容旧调用方式：服务端分页查询 */
export async function listProperty({ pageSize = 10, pageNumber = 1, search, categoryId } = {}) {
  return queryProperties({
    pageSize,
    pageNumber,
    keyword: search,
    categoryId: categoryId || '',
  });
}
