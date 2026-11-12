/**
 * 全彩歷險漫畫 閱讀器核心程式邏輯
 * 專為雙頁跨頁掃描圖優化
 * 支援滑鼠滾輪放大縮小、放大後滑鼠拖曳平移、全螢幕、自動播放、手勢滑動、鍵盤導航、縮圖目錄、進度儲存
 */

class ComicReader {
  constructor(config) {
    this.config = config;
    this.pages = config.getPages();
    this.totalPages = this.pages.length;
    
    // 狀態設定
    this.currentPage = 1;
    this.fitMode = 'contain';
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.isPanning = false;
    this.panStartX = 0;
    this.panStartY = 0;
    this.hasPanned = false;

    this.isPlaying = false;
    this.playInterval = null;
    this.playSpeed = 4500;
    this.thumbnailsLoaded = false;
    
    // DOM 元素快取
    this.dom = {
      readerViewport: document.getElementById('readerViewport'),
      comicStage: document.getElementById('comicStage'),
      pageDisplay: document.getElementById('pageDisplay'),
      pageRange: document.getElementById('pageRange'),
      pageInput: document.getElementById('pageInput'),
      totalPageText: document.getElementById('totalPageText'),
      prevBtn: document.getElementById('prevBtn'),
      nextBtn: document.getElementById('nextBtn'),
      firstBtn: document.getElementById('firstBtn'),
      lastBtn: document.getElementById('lastBtn'),
      floatingPrevBtn: document.getElementById('floatingPrevBtn'),
      floatingNextBtn: document.getElementById('floatingNextBtn'),
      fitToggleBtn: document.getElementById('fitToggleBtn'),
      fitIcon: document.getElementById('fitIcon'),
      fitText: document.getElementById('fitText'),
      playToggleBtn: document.getElementById('playToggleBtn'),
      playIcon: document.getElementById('playIcon'),
      fullscreenBtn: document.getElementById('fullscreenBtn'),
      fullscreenIcon: document.getElementById('fullscreenIcon'),
      thumbDrawerBtn: document.getElementById('thumbDrawerBtn'),
      thumbDrawer: document.getElementById('thumbDrawer'),
      thumbGrid: document.getElementById('thumbGrid'),
      closeThumbBtn: document.getElementById('closeThumbBtn'),
      helpBtn: document.getElementById('helpBtn'),
      helpModal: document.getElementById('helpModal'),
      closeHelpBtn: document.getElementById('closeHelpBtn'),
      zoomInBtn: document.getElementById('zoomInBtn'),
      zoomOutBtn: document.getElementById('zoomOutBtn'),
      zoomResetBtn: document.getElementById('zoomResetBtn'),
      loadingIndicator: document.getElementById('loadingIndicator'),
      jumpForm: document.getElementById('jumpForm')
    };

    this.init();
  }

  init() {
    this.dom.totalPageText.textContent = `/ ${this.totalPages}`;
    this.dom.pageRange.max = this.totalPages;
    this.dom.pageInput.max = this.totalPages;

    this.loadSavedProgress();
    this.bindEvents();
    this.render();
    this.preloadSurroundingPages();
  }

  loadSavedProgress() {
    const saved = localStorage.getItem('comic_ai_kingdom_page');
    if (saved) {
      const pageNum = parseInt(saved, 10);
      if (pageNum >= 1 && pageNum <= this.totalPages) {
        this.currentPage = pageNum;
      }
    }
  }

  saveProgress() {
    localStorage.setItem('comic_ai_kingdom_page', this.currentPage.toString());
  }

  bindEvents() {
    // 翻頁按鈕
    this.dom.prevBtn?.addEventListener('click', () => this.prevPage());
    this.dom.nextBtn?.addEventListener('click', () => this.nextPage());
    this.dom.floatingPrevBtn?.addEventListener('click', () => this.prevPage());
    this.dom.floatingNextBtn?.addEventListener('click', () => this.nextPage());
    this.dom.firstBtn?.addEventListener('click', () => this.goToPage(1));
    this.dom.lastBtn?.addEventListener('click', () => this.goToPage(this.totalPages));

    // 進度條控制
    this.dom.pageRange?.addEventListener('input', (e) => {
      const targetPage = parseInt(e.target.value, 10);
      this.goToPage(targetPage);
    });

    // 跳轉表單
    this.dom.jumpForm?.addEventListener('submit', (e) => {
      e.preventDefault();
      const pageNum = parseInt(this.dom.pageInput.value, 10);
      if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= this.totalPages) {
        this.goToPage(pageNum);
      }
    });

    // 適配模式切換
    this.dom.fitToggleBtn?.addEventListener('click', () => this.toggleFitMode());

    // 自動播放
    this.dom.playToggleBtn?.addEventListener('click', () => this.toggleAutoPlay());

    // 全螢幕切換
    this.dom.fullscreenBtn?.addEventListener('click', () => this.toggleFullScreen());
    document.addEventListener('fullscreenchange', () => this.updateFullscreenIcon());

    // 縮圖抽屜
    this.dom.thumbDrawerBtn?.addEventListener('click', () => this.toggleThumbnailDrawer());
    this.dom.closeThumbBtn?.addEventListener('click', () => this.closeThumbnailDrawer());

    // 幫助彈窗
    this.dom.helpBtn?.addEventListener('click', () => this.openHelpModal());
    this.dom.closeHelpBtn?.addEventListener('click', () => this.closeHelpModal());
    this.dom.helpModal?.addEventListener('click', (e) => {
      if (e.target === this.dom.helpModal) this.closeHelpModal();
    });

    // 縮放按鈕
    this.dom.zoomInBtn?.addEventListener('click', () => this.zoom(0.25));
    this.dom.zoomOutBtn?.addEventListener('click', () => this.zoom(-0.25));
    this.dom.zoomResetBtn?.addEventListener('click', () => this.resetZoom());

    // 滑鼠滾輪縮放與平移手勢
    this.setupWheelAndPan();

    // 鍵盤導航
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));

    // 觸控手勢滑動 (Swipe)
    this.setupTouchGestures();
  }

  // 設定滑鼠滾輪放大縮小畫面與拖曳平移
  setupWheelAndPan() {
    const viewport = this.dom.readerViewport;
    if (!viewport) return;

    // 滑鼠滾輪事件：支援滾輪向上放大、向下縮小
    viewport.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = e.deltaY < 0 ? 0.18 : -0.18;
      this.zoom(zoomFactor);
    }, { passive: false });

    // 雙擊畫面重設或放大
    this.dom.comicStage.addEventListener('dblclick', (e) => {
      if (e.target.closest('.floating-nav-btn')) return;
      if (this.zoomLevel > 1.05) {
        this.resetZoom();
      } else {
        this.zoom(1.0); // 放大至 2.0x
      }
    });

    // 放大後的滑鼠拖曳平移 (Pan)
    this.dom.comicStage.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // 僅響應左鍵
      if (this.zoomLevel <= 1.0) return; // 1.0 倍時不需要平移
      if (e.target.closest('.floating-nav-btn')) return;

      this.isPanning = true;
      this.hasPanned = false;
      this.panStartX = e.clientX - this.panX;
      this.panStartY = e.clientY - this.panY;
      this.dom.comicStage.classList.add('is-panning');
      e.preventDefault();
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isPanning) return;
      this.panX = e.clientX - this.panStartX;
      this.panY = e.clientY - this.panStartY;
      this.hasPanned = true;
      this.applyTransform();
    });

    window.addEventListener('mouseup', () => {
      if (!this.isPanning) return;
      this.isPanning = false;
      this.dom.comicStage.classList.remove('is-panning');
    });
  }

  // 應用縮放與平移變換
  applyTransform() {
    const stage = this.dom.comicStage;
    if (!stage) return;
    stage.style.transform = `translate(${this.panX}px, ${this.panY}px) scale(${this.zoomLevel})`;

    if (this.zoomLevel > 1.05) {
      stage.classList.add('zoomed');
    } else {
      stage.classList.remove('zoomed');
    }
  }

  zoom(delta) {
    const newZoom = Math.max(0.6, Math.min(5.0, this.zoomLevel + delta));
    this.zoomLevel = Math.round(newZoom * 100) / 100;

    // 若縮回原大小附近，平移自動歸零
    if (this.zoomLevel <= 1.0) {
      this.panX = 0;
      this.panY = 0;
    }
    this.applyTransform();
  }

  resetZoom() {
    this.zoomLevel = 1.0;
    this.panX = 0;
    this.panY = 0;
    this.applyTransform();
  }

  setupTouchGestures() {
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    let touchEndY = 0;

    const target = this.dom.comicStage;
    if (!target) return;

    target.addEventListener('touchstart', (e) => {
      if (e.touches.length === 1) {
        touchStartX = e.changedTouches[0].screenX;
        touchStartY = e.changedTouches[0].screenY;
      }
    }, { passive: true });

    target.addEventListener('touchend', (e) => {
      if (this.zoomLevel > 1.05) return; // 放大模式下不觸發翻頁滑動
      if (e.changedTouches.length === 1) {
        touchEndX = e.changedTouches[0].screenX;
        touchEndY = e.changedTouches[0].screenY;
        this.handleSwipe(touchStartX, touchStartY, touchEndX, touchEndY);
      }
    }, { passive: true });
  }

  handleSwipe(startX, startY, endX, endY) {
    const diffX = endX - startX;
    const diffY = endY - startY;
    const absDiffX = Math.abs(diffX);
    const absDiffY = Math.abs(diffY);

    if (absDiffX > absDiffY && absDiffX > 45) {
      if (diffX < 0) {
        this.nextPage();
      } else {
        this.prevPage();
      }
    }
  }

  handleKeyDown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    switch (e.key) {
      case 'ArrowRight':
      case 'PageDown':
      case ' ':
        e.preventDefault();
        this.nextPage();
        break;
      case 'ArrowLeft':
      case 'PageUp':
        e.preventDefault();
        this.prevPage();
        break;
      case 'Home':
        e.preventDefault();
        this.goToPage(1);
        break;
      case 'End':
        e.preventDefault();
        this.goToPage(this.totalPages);
        break;
      case 'f':
      case 'F':
        e.preventDefault();
        this.toggleFullScreen();
        break;
      case 'w':
      case 'W':
        e.preventDefault();
        this.toggleFitMode();
        break;
      case 't':
      case 'T':
        e.preventDefault();
        this.toggleThumbnailDrawer();
        break;
      case '+':
      case '=':
        e.preventDefault();
        this.zoom(0.25);
        break;
      case '-':
      case '_':
        e.preventDefault();
        this.zoom(-0.25);
        break;
      case '0':
        e.preventDefault();
        this.resetZoom();
        break;
      case 'Escape':
        this.closeThumbnailDrawer();
        this.closeHelpModal();
        break;
    }
  }

  prevPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  nextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    } else if (this.isPlaying) {
      this.stopAutoPlay();
    }
  }

  goToPage(pageNum) {
    const target = Math.max(1, Math.min(pageNum, this.totalPages));

    if (this.currentPage !== target) {
      this.currentPage = target;
      this.resetZoom();
      this.render();
      this.saveProgress();
      this.preloadSurroundingPages();
      this.highlightThumbnail();
    }
  }

  toggleFitMode() {
    if (this.fitMode === 'contain') {
      this.fitMode = 'width';
      if (this.dom.fitIcon) this.dom.fitIcon.className = "fa-solid fa-arrows-left-right";
      if (this.dom.fitText) this.dom.fitText.textContent = "適合寬度";
      this.dom.comicStage.classList.add('fit-width');
    } else {
      this.fitMode = 'contain';
      if (this.dom.fitIcon) this.dom.fitIcon.className = "fa-solid fa-up-down-left-right";
      if (this.dom.fitText) this.dom.fitText.textContent = "適合螢幕";
      this.dom.comicStage.classList.remove('fit-width');
    }
    this.resetZoom();
  }

  toggleAutoPlay() {
    if (this.isPlaying) {
      this.stopAutoPlay();
    } else {
      this.startAutoPlay();
    }
  }

  startAutoPlay() {
    this.isPlaying = true;
    this.dom.playIcon.className = "fa-solid fa-pause";
    this.dom.playToggleBtn.classList.add('active');
    this.playInterval = setInterval(() => {
      if (this.currentPage >= this.totalPages) {
        this.stopAutoPlay();
      } else {
        this.nextPage();
      }
    }, this.playSpeed);
  }

  stopAutoPlay() {
    this.isPlaying = false;
    this.dom.playIcon.className = "fa-solid fa-play";
    this.dom.playToggleBtn.classList.remove('active');
    if (this.playInterval) {
      clearInterval(this.playInterval);
      this.playInterval = null;
    }
  }

  toggleFullScreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(err => {
        console.warn(`全螢幕請求失敗: ${err.message}`);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  updateFullscreenIcon() {
    if (document.fullscreenElement) {
      this.dom.fullscreenIcon.className = "fa-solid fa-compress";
    } else {
      this.dom.fullscreenIcon.className = "fa-solid fa-expand";
    }
  }

  render() {
    this.showLoading();
    this.dom.comicStage.innerHTML = '';

    const pageElement = this.createPageElement(this.currentPage);
    this.dom.comicStage.appendChild(pageElement);
    this.dom.pageDisplay.textContent = `${this.currentPage}`;

    this.dom.pageRange.value = this.currentPage;
    this.dom.pageInput.value = this.currentPage;

    this.dom.firstBtn.disabled = this.currentPage <= 1;
    this.dom.prevBtn.disabled = this.currentPage <= 1;
    this.dom.floatingPrevBtn.disabled = this.currentPage <= 1;

    const isEnd = this.currentPage >= this.totalPages;
    this.dom.lastBtn.disabled = isEnd;
    this.dom.nextBtn.disabled = isEnd;
    this.dom.floatingNextBtn.disabled = isEnd;
  }

  createPageElement(pageNumber) {
    const pageData = this.pages[pageNumber - 1];
    const pageContainer = document.createElement('div');
    pageContainer.className = 'page-frame';

    const img = document.createElement('img');
    img.alt = `決戰AI太陽王國 - 第 ${pageNumber} 跨頁`;
    img.className = 'comic-img';
    img.loading = 'eager';
    img.src = pageData.src;

    img.onload = () => {
      img.classList.add('loaded');
      this.hideLoading();
    };

    img.onerror = () => {
      this.hideLoading();
      pageContainer.innerHTML = `
        <div class="page-error" style="color: #ff5252; text-align: center; padding: 20px;">
          <i class="fa-solid fa-triangle-exclamation" style="font-size: 2rem; margin-bottom: 8px;"></i>
          <p>第 ${pageNumber} 頁圖片載入失敗</p>
        </div>
      `;
    };

    pageContainer.appendChild(img);
    return pageContainer;
  }

  showLoading() {
    if (this.dom.loadingIndicator) {
      this.dom.loadingIndicator.classList.add('active');
    }
  }

  hideLoading() {
    if (this.dom.loadingIndicator) {
      this.dom.loadingIndicator.classList.remove('active');
    }
  }

  preloadSurroundingPages() {
    const range = 2;
    const start = Math.max(1, this.currentPage - range);
    const end = Math.min(this.totalPages, this.currentPage + range);

    for (let i = start; i <= end; i++) {
      if (i !== this.currentPage) {
        const preloadImg = new Image();
        preloadImg.src = this.pages[i - 1].src;
      }
    }
  }

  toggleThumbnailDrawer() {
    const isOpen = this.dom.thumbDrawer.classList.toggle('open');
    if (isOpen && !this.thumbnailsLoaded) {
      this.renderThumbnails();
    }
    if (isOpen) {
      this.scrollThumbnailIntoView();
    }
  }

  closeThumbnailDrawer() {
    this.dom.thumbDrawer.classList.remove('open');
  }

  renderThumbnails() {
    this.dom.thumbGrid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    this.pages.forEach((page) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = `thumb-item ${page.pageNumber === this.currentPage ? 'active' : ''}`;
      item.dataset.page = page.pageNumber;

      item.innerHTML = `
        <div class="thumb-img-wrap">
          <img src="${page.src}" alt="第 ${page.pageNumber} 跨頁縮圖" loading="lazy">
        </div>
        <span class="thumb-label"><i class="fa-solid fa-hashtag"></i> 第 ${page.pageNumber} 跨頁</span>
      `;

      item.addEventListener('click', () => {
        this.goToPage(page.pageNumber);
        this.closeThumbnailDrawer();
      });

      fragment.appendChild(item);
    });

    this.dom.thumbGrid.appendChild(fragment);
    this.thumbnailsLoaded = true;
  }

  highlightThumbnail() {
    if (!this.thumbnailsLoaded) return;
    const items = this.dom.thumbGrid.querySelectorAll('.thumb-item');
    items.forEach(item => {
      const page = parseInt(item.dataset.page, 10);
      item.classList.toggle('active', page === this.currentPage);
    });
  }

  scrollThumbnailIntoView() {
    setTimeout(() => {
      const activeItem = this.dom.thumbGrid.querySelector(`.thumb-item[data-page="${this.currentPage}"]`);
      if (activeItem) {
        activeItem.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 100);
  }

  openHelpModal() {
    this.dom.helpModal.classList.add('open');
  }

  closeHelpModal() {
    this.dom.helpModal.classList.remove('open');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (window.COMIC_CONFIG) {
    window.comicReader = new ComicReader(window.COMIC_CONFIG);
  }
});
