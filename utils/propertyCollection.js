/**
 * 房源收藏与浏览历史，存储在本地 Storage。
 * 内部展示工具没有账号体系，按设备维度保存即可；
 * 若后续要多人共享，需要改成云开发数据库按 openid 存储。
 */

const FAVORITE_KEY = 'property_favorites';
const HISTORY_KEY = 'property_history';
const HISTORY_LIMIT = 30;

function readList(key) {
  try {
    const value = wx.getStorageSync(key);
    return Array.isArray(value) ? value : [];
  } catch (err) {
    console.error(`[collection] 读取 ${key} 失败`, err);
    return [];
  }
}

function writeList(key, list) {
  try {
    wx.setStorageSync(key, list);
  } catch (err) {
    console.error(`[collection] 写入 ${key} 失败`, err);
  }
}

/** 收藏的房源 ID，按收藏时间倒序 */
export function getFavoriteIds() {
  return readList(FAVORITE_KEY).map((item) => item.id);
}

/** 收藏记录原样返回，收藏页需要展示收藏时间 */
export function getFavoriteList() {
  return readList(FAVORITE_KEY);
}

/** 移除一条收藏，供收藏页左滑删除使用 */
export function removeFavorite(id) {
  writeList(
    FAVORITE_KEY,
    readList(FAVORITE_KEY).filter((item) => item.id !== id),
  );
}

export function isFavorite(id) {
  if (!id) return false;
  return readList(FAVORITE_KEY).some((item) => item.id === id);
}

/**
 * 切换收藏状态
 * @returns {boolean} 切换后是否为已收藏
 */
export function toggleFavorite(property = {}) {
  if (!property._id) return false;
  const list = readList(FAVORITE_KEY);
  const index = list.findIndex((item) => item.id === property._id);

  if (index >= 0) {
    list.splice(index, 1);
    writeList(FAVORITE_KEY, list);
    return false;
  }

  list.unshift({
    id: property._id,
    time: Date.now(),
    name: property.name || '',
    cover_image: property.cover_image || '',
    price: property.price || 0,
  });
  writeList(FAVORITE_KEY, list);
  return true;
}

/** 浏览过的房源，最新看到的排在最前 */
export function getHistoryList() {
  return readList(HISTORY_KEY);
}

export function getHistoryIds() {
  return readList(HISTORY_KEY).map((item) => item.id);
}

export function pushHistory(property = {}) {
  if (!property._id) return;
  const list = readList(HISTORY_KEY).filter((item) => item.id !== property._id);

  list.unshift({
    id: property._id,
    time: Date.now(),
    name: property.name || '',
    cover_image: property.cover_image || '',
    price: property.price || 0,
  });

  writeList(HISTORY_KEY, list.slice(0, HISTORY_LIMIT));
}

export function removeHistory(id) {
  writeList(
    HISTORY_KEY,
    readList(HISTORY_KEY).filter((item) => item.id !== id),
  );
}

export function clearHistory() {
  writeList(HISTORY_KEY, []);
}

export function getFavoriteCount() {
  return readList(FAVORITE_KEY).length;
}

export function getHistoryCount() {
  return readList(HISTORY_KEY).length;
}
