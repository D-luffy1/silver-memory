/**
 * 房源演示数据，字段名与云开发 goods 集合保持一致，
 * 由 services/property/property.js 的 normalizeProperty 统一加工。
 *
 * 开关在 config/index.js 的 usePropertyMock：
 *   true  = 全部页面读这份本地数据（数据库没数据 / 图片链接批量失效时用来演示）
 *   false = 读云开发 goods 集合
 *
 * 图片字段支持三种写法，getCloudImageTempUrlSafely 只对 cloud 前缀换临时链接，
 * 其余一律原样透传，所以三种都能直接用：
 *   1. 云存储 File ID：cloud://xxxx.xxxx-环境id-应用id/1712000000/house-1.jpg（正式数据推荐用这种）
 *   2. 项目内图片：/assets/demo/house-1.jpg（当前采用，不依赖网络也能演示）
 *   3. 公网直链：https://...（需在开发者工具勾选「不校验合法域名」）
 *
 * 换图不用改代码：把 assets/demo/house-1.jpg ~ house-5.jpg 覆盖成真实房源图即可。
 * 但注意开发者工具「代码质量 - 图片和音频资源」是按包内图片总量卡 200 K 的，
 * 单张不超标也会报未通过。直接往包里塞图，建议控制在 620px 宽 / 40KB 以内（五张共约 100KB）；
 * 想要高清图就走上面第 1 种，图放云存储，包里不留图片。
 *
 * 数据分布是刻意排的：新房 4 / 二手房 5 / 租房 3，价格覆盖全部 6 个档位、
 * 面积覆盖全部 6 个档位，这样筛选面板每一档都有数字；_id 补零，
 * 保证「最新上架」（按 _id 倒序）取走前 6 条后，「优选推荐」还剩 6 条可排。
 */

/** 五张演示图，循环复用 */
const IMG = [
  '/assets/demo/house-1.jpg',
  '/assets/demo/house-2.jpg',
  '/assets/demo/house-3.jpg',
  '/assets/demo/house-4.jpg',
  '/assets/demo/house-5.jpg',
];

const DEMO_PHONE = '13800001234';

export function genPropertyMock() {
  return [
    {
      _id: 'mock-001',
      goodName: '滨江壹号 3房',
      categoryId: 'xinfang',
      address: '杭州市滨江区江南大道 1188 号',
      houseType: '3室2厅',
      area: 118,
      floor: '中层 / 共18层',
      orientation: '南北通透',
      price: 428,
      feature: ['近地铁', '精装交付', '南北通透', '带中央空调'],
      image: [IMG[0], IMG[1], IMG[2], IMG[3]],
      desc:
        '一线江景新房，2026 年 6 月交付，户型方正无浪费面积。客厅 4.2 米开间直连观江阳台，主卧带独立卫浴与衣帽间。小区人车分流，地下车位配比 1:1.2，步行 8 分钟到地铁 1 号线。目前还剩少量房源，可预约样板间看房。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-002',
      goodName: '云栖里 2房',
      categoryId: 'ershoufang',
      address: '杭州市西湖区云栖巷 26 号',
      houseType: '2室1厅',
      area: 76,
      floor: '高层 / 共11层',
      orientation: '南',
      price: 236,
      feature: ['采光好', '近学区', '拎包入住'],
      image: [IMG[1], IMG[4]],
      desc:
        '满五年唯一，业主置换急售，价格可小议。南向双卧，客厅带飘窗，厨房已整体翻新。楼下即是幼儿园与小学学区，菜场、社区医院步行 5 分钟内。房屋无抵押，产权清晰，可配合当天看房。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-003',
      goodName: '江畔花园 大平层',
      categoryId: 'ershoufang',
      address: '杭州市上城区钱江路 555 号',
      houseType: '4室2厅',
      area: 156,
      floor: '低层 / 共6层',
      orientation: '南北',
      price: 690,
      feature: ['大平层', '双阳台', '带车位', '满五唯一', '品牌物业'],
      image: [IMG[2], IMG[3], IMG[0]],
      desc:
        '改善型大平层，四开间朝南，客餐厅一体约 48 ㎡，南北双阳台通透。附赠一个地下车位与储藏间。小区 2015 年交付，品牌物业，绿化率高，居住氛围安静。学区对口重点中学，适合长期自住。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-004',
      goodName: '梧桐里公寓 1房',
      categoryId: 'zufang',
      address: '杭州市拱墅区莫干山路 96 号',
      houseType: '1室1厅',
      area: 42,
      floor: '中层 / 共9层',
      orientation: '东南',
      price: 5800,
      feature: ['可短租', '押一付一', '家电齐全', '近地铁'],
      image: [IMG[3]],
      desc:
        '整租一居室，东南向采光充足，家具家电齐全可拎包入住。民水民电，物业费含在租金内。支持押一付一与短租，随时可看房，适合在武林、城西一带通勤的同事。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-005',
      goodName: '山语澜庭 3房',
      categoryId: 'xinfang',
      address: '杭州市余杭区良睦路 168 号',
      houseType: '3室1厅',
      area: 98,
      floor: '高层 / 共26层',
      orientation: '南',
      price: 352,
      feature: ['新盘首开', '山景', '双卫', '低总价'],
      image: [IMG[4], IMG[0], IMG[2]],
      desc:
        '未来科技城板块新盘首开，98 ㎡做三房双卫，得房率约 78%。高层南向可观山景，楼间距开阔。周边产业园密集，通勤便利，规划中的地铁线路在 1 公里内。目前认筹享优先选房。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-006',
      goodName: '柳营巷老洋房 2房',
      categoryId: 'ershoufang',
      address: '杭州市上城区柳营巷 12 号',
      houseType: '2室1厅',
      area: 52,
      floor: '低层 / 共5层',
      orientation: '南',
      price: 168,
      feature: ['地段成熟', '总价低', '已翻新'],
      image: [IMG[1], IMG[3]],
      desc:
        '老城厢小户型，1998 年建成但已完成水电与户型改造，层高 3.1 米不压抑。步行到地铁 5 号线 4 分钟，周边生活配套密集。面积虽小但格局可用，适合首套过渡或出租持有。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-007',
      goodName: '天越雅苑 1房',
      categoryId: 'xinfang',
      address: '杭州市萧山区市心北路 300 号',
      houseType: '1室1厅',
      area: 58,
      floor: '中层 / 共22层',
      orientation: '西',
      price: 88,
      feature: ['小户型', '通燃气', '近机场'],
      image: [IMG[0], IMG[4]],
      desc:
        '钱江世纪城边缘小户型，总价低、月供压力小，整栋已通燃气可长期自住。楼下规划商业体，距机场快线站点约 1 公里。适合在滨江、钱江新城上班的单身同事作为首套。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-008',
      goodName: '桂语东方 4房',
      categoryId: 'ershoufang',
      address: '杭州市西湖区古墩路 1288 号',
      houseType: '4室2厅',
      area: 139,
      floor: '高层 / 共24层',
      orientation: '南北',
      price: 468,
      feature: ['品牌开发商', '南北通透', '双卫', '带车位', '改善首选'],
      image: [IMG[2], IMG[0], IMG[1], IMG[4]],
      desc:
        '2019 年品牌次新房，四房两厅两卫，主卧带套房与独立阳台。客餐厅分离，家庭人口多也够用。小区自带幼儿园与泳池，地库直连电梯。产权满二年，交易税费相对清晰。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-009',
      goodName: '江与城 独栋别墅',
      categoryId: 'xinfang',
      address: '杭州市余杭区良渚文化村 玉鸟路 8 号',
      houseType: '5室2厅',
      area: 238,
      floor: '地上2层 / 地下1层',
      orientation: '南',
      price: 1280,
      feature: ['独栋', '带花园', '地下室', '双车位', '低密社区', '环境安静'],
      image: [IMG[3], IMG[4], IMG[0], IMG[1]],
      desc:
        '低密独栋，实际使用面积约 320 ㎡，南向花园约 120 ㎡。地上两层五房，地下一层可做影音室与储藏。双车位入库，社区容积率 0.6，配套文化村商业与学校。目前少量现房在售。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-010',
      goodName: '文澜学区房 2房',
      categoryId: 'ershoufang',
      address: '杭州市拱墅区文澜路 66 号',
      houseType: '2室1厅',
      area: 66,
      floor: '中层 / 共7层',
      orientation: '南',
      price: 285,
      feature: ['学区房', '满五唯一', '采光好', '近公园'],
      image: [IMG[4], IMG[2], IMG[3]],
      desc:
        '对口文澜系学校，学籍未被占用，落户即可入学。南向双卧，客厅方正，房屋保养好可直接入住。小区紧邻运河公园，日常散步方便。房龄偏老但结构无问题，学区需求优先。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-011',
      goodName: '城西公寓 2房',
      categoryId: 'zufang',
      address: '杭州市西湖区文一西路 969 号',
      houseType: '2室1厅',
      area: 88,
      floor: '高层 / 共15层',
      orientation: '南北',
      price: 7600,
      feature: ['整租', '南北通透', '家电齐全', '近地铁'],
      image: [IMG[1], IMG[0]],
      desc:
        '整租两房，南北通透，适合合租或家庭居住。楼下即地铁 19 号线，通勤未来科技城约 15 分钟。家电家具齐全，民水民电，可办理居住证。长租价格可再议。',
      phone: DEMO_PHONE,
    },
    {
      _id: 'mock-012',
      goodName: '钱江新城 LOFT',
      categoryId: 'zufang',
      address: '杭州市上城区富春路 701 号',
      houseType: '1室1厅',
      area: 45,
      floor: '中层 / 共18层',
      orientation: '东南',
      price: 4200,
      feature: ['LOFT', '商水商电', '拎包入住'],
      image: [IMG[2]],
      desc:
        'LOFT 复式，挑高 4.7 米，下层起居上层卧室，实际使用面积约 65 ㎡。商圈核心位置，购物餐饮步行可达。商水商电成本略高，适合作息规律、看重地段的同事。',
      phone: DEMO_PHONE,
    },
  ];
}
