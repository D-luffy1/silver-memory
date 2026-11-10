/**
 * 房源图片统一预览。
 * 演示数据用的是小程序包内路径，个别环境 wx.previewImage 打不开，
 * 这里给出失败提示，避免点了没反应被当成 bug。
 * @param {string[]} images 图片地址数组
 * @param {string} current 期望首先展示的地址
 */
export function previewPropertyImages(images = [], current = '') {
  if (!images.length) return false;

  wx.previewImage({
    current: current && images.indexOf(current) >= 0 ? current : images[0],
    urls: images,
    fail: () => {
      wx.showToast({ title: '该图片来源暂不支持预览', icon: 'none' });
    },
  });

  return true;
}
