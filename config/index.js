/** TDesign 使用 */
export const config = {
  /** 房源数据已切换为云开发真实数据库，不再使用前端模拟数据 */
  useMock: false,
};

/** 云开发使用 */
export const cloudbaseTemplateConfig = {
  /** false 时首页/个人中心的「体验数据」提示条不再展示 */
  useMock: false,
};

/**
 * 房源演示数据开关。true 时首页/列表/详情/收藏全部读 model/propertyMock.js，
 * 不发数据库请求；演示完改回 false 即恢复读 goods 集合
 */
export const propertyMockConfig = {
  usePropertyMock: true,
};

/** 云开发环境 ID，切换环境只需改这里 */
export const CLOUDBASE_ENV_ID = 'cloudbase-d3gfmbiwtce3589ab';

export const cdnBase = 'https://we-retail-static-1300977798.cos.ap-guangzhou.myqcloud.com/retail-mp';
