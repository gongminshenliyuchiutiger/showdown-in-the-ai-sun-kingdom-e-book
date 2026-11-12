// 全彩歷險漫畫 阿宅聯盟：決戰AI太陽王國 - 頁面資料設定
const COMIC_CONFIG = {
  title: "全彩歷險漫畫 阿宅聯盟：決戰AI太陽王國",
  totalPages: 122,
  copyright: "Copyright © Liyuchiutiger Gongminshen",
  mascotPath: "image/LiyuChillGuy.svg",
  // 產生 122 頁的圖片檔名清單
  getPages: function() {
    const pages = [];
    for (let i = 1; i <= this.totalPages; i++) {
      pages.push({
        pageNumber: i,
        title: `第 ${i} 頁`,
        src: `決戰AI太陽王國(${i}).jpg`
      });
    }
    return pages;
  }
};

window.COMIC_CONFIG = COMIC_CONFIG;
