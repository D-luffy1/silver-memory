export async function getCloudImageTempUrl(images) {
  const handledIndexToOriginIndex = new Map();
  const shouldBeHandledImages = [];
  images.forEach((x, index) => {
    if (!x.startsWith('cloud')) return;

    const handleIndex = shouldBeHandledImages.length;
    shouldBeHandledImages.push(x);
    handledIndexToOriginIndex.set(handleIndex, index);
  });

  const handledImages = (
    await wx.cloud.getTempFileURL({
      fileList: shouldBeHandledImages,
    })
  ).fileList.map((x) => x.tempFileURL);

  const ret = [...images];
  handledImages.forEach((image, handleIndex) => (ret[handledIndexToOriginIndex.get(handleIndex)] = image));

  return ret;
}

export async function getSingleCloudImageTempUrl(image) {
  if (!image.startsWith('cloud')) return image;
  return (
    await wx.cloud.getTempFileURL({
      fileList: [image],
    })
  ).fileList[0].tempFileURL;
}

/**
 * 批量换取云存储临时链接，供房源列表/详情使用。
 * 与上面两个函数的区别：
 *   1. 无需转换的链接（http 等）直接透传，不会因此报错
 *   2. 待转换的文件按 CHUNK_SIZE 分片并发请求，避免单次 fileList 超限
 *   3. 结果按文件 ID 缓存，翻页/切分类时不再重复请求
 *   4. 换取失败只影响单张图片，不会让整个页面的数据加载失败
 * @param {string[]} fileIds 图片链接数组，可混合 cloud:// 与 http(s)://
 * @returns {Promise<string[]>} 与入参等长的图片链接数组
 */
const CHUNK_SIZE = 50;
const CACHE_TTL = 30 * 60 * 1000;
const tempUrlCache = new Map();

export async function getCloudImageTempUrlSafely(fileIds = []) {
  const now = Date.now();
  const results = Array.from(fileIds);
  const pendingIdx = [];

  fileIds.forEach((id, index) => {
    if (typeof id !== 'string' || !id.startsWith('cloud')) return;
    const hit = tempUrlCache.get(id);
    if (hit && now - hit.time < CACHE_TTL) {
      results[index] = hit.url;
      return;
    }
    pendingIdx.push(index);
  });

  if (!pendingIdx.length) return results;

  // 同一批次内可能有重复文件 ID，先去重再请求
  const uniqIds = [...new Set(pendingIdx.map((i) => fileIds[i]))];
  const chunks = [];
  for (let i = 0; i < uniqIds.length; i += CHUNK_SIZE) {
    chunks.push(uniqIds.slice(i, i + CHUNK_SIZE));
  }

  const responses = await Promise.all(
    chunks.map((chunk) =>
      wx.cloud
        .getTempFileURL({ fileList: chunk })
        .catch(() => ({ fileList: [] })),
    ),
  );

  const urlMap = new Map();
  responses.forEach((res) => {
    (res && res.fileList ? res.fileList : []).forEach((item) => {
      if (item && item.fileID && item.tempFileURL) {
        urlMap.set(item.fileID, item.tempFileURL);
        tempUrlCache.set(item.fileID, { url: item.tempFileURL, time: Date.now() });
      }
    });
  });

  pendingIdx.forEach((index) => {
    results[index] = urlMap.get(fileIds[index]) || fileIds[index];
  });

  return results;
}
