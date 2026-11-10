/**
 * 自定义 tabBar 菜单。图标名来自 style/iconfont.wxss（prefix="wr"），
 * 首页与房源必须用不同图标，否则选中态看不出切换
 */
export default [
  {
    icon: 'home',
    text: '首页',
    url: 'pages/home/home',
  },
  {
    icon: 'list',
    text: '房源',
    url: 'pages/goods/list/index',
  },
  {
    icon: 'person',
    text: '我的',
    url: 'pages/usercenter/index',
  },
];
