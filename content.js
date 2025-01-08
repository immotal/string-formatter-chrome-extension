// 常量配置
const CONFIG = {
    BUTTON_ID: 'text-processor-button',
    ANIMATION_DURATION: 200,
    BUTTON_OFFSET: 10,
    DEBOUNCE_DELAY: 150,
    MIN_TEXT_LENGTH: 1,
    MODAL_Z_INDEX: 2147483650,
    MODAL_WIDTH: '600px',
    MODAL_MAX_HEIGHT: '80vh',
    DRAG_THRESHOLD: 5, // 拖拽阈值，防止轻微点击被误认为是拖拽
};

// 按钮样式
const BUTTON_STYLES = {
    position: 'fixed',
    padding: '6px 12px',
    backgroundColor: '#4a90e2',
    color: '#ffffff',
    border: 'none',
    borderRadius: '4px',
    fontSize: '13px',
    cursor: 'pointer',
    boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
    zIndex: '2147483647',
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    userSelect: 'none'
};

// 工具类
class Util {
    static debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }

    static isInEditableArea(element) {
        const editableElements = ['INPUT', 'TEXTAREA'];
        const isContentEditable = element.getAttribute('contenteditable') === 'true';
        return editableElements.includes(element.tagName) || isContentEditable;
    }

    static getValidSelection() {
        const selection = window.getSelection();
        if (!selection.rangeCount) return null;

        const range = selection.getRangeAt(0);
        const selectedText = selection.toString().trim();
        
        if (selection.anchorNode && 
            Util.isInEditableArea(selection.anchorNode.parentElement)) {
            return null;
        }

        if (selectedText.length < CONFIG.MIN_TEXT_LENGTH) {
            return null;
        }

        return { selection, range, selectedText };
    }
}

class TextProcessorButton {
    constructor() {
        this.button = null;
        this.menu = null;
        this.isVisible = false;
        this.lastSelectedText = '';
        this.container = null;  // 添加容器引用
        this.isDragging = false;
        this.dragOffset = { x: 0, y: 0 };
        this.initialPosition = { x: 0, y: 0 };
        this.dragThreshold = false;
        this.setupEventListeners();
    }

    // 添加隐藏按钮的方法
    hideButton() {
        if (this.container) {
            this.container.remove();
            this.container = null;
        }
        if (this.menu) {
            this.menu.remove();
            this.menu = null;
        }
        this.isVisible = false;
    }

    createButton() {
        const button = document.createElement('button');
        button.id = CONFIG.BUTTON_ID;
        button.innerHTML = `
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
                <path d="M15 11h-6"></path>
                <path d="M15 15h-6"></path>
                <path d="M15 19h-6"></path>
            </svg>
            处理文本
        `;

        const styles = {
            ...BUTTON_STYLES,
            margin: '0',
            position: 'relative',
            transform: 'scale(0.95)',
            opacity: '0',
            transition: 'all 0.2s ease'
        };

        Object.assign(button.style, styles);
        
        // 添加拖动手柄样式
        button.style.cursor = 'move';
        
        // 添加拖拽事件监听器
        this.setupDragListeners(button);

        return button;
    }

    setupDragListeners(button) {
        const handleDragStart = (e) => {
            if (this.menu) {
                this.menu.remove();
                this.menu = null;
            }

            this.isDragging = true;
            this.dragThreshold = false;
            
            // 记录初始位置
            this.initialPosition = {
                x: e.clientX,
                y: e.clientY
            };
            
            // 计算鼠标在按钮内的偏移
            const rect = button.getBoundingClientRect();
            this.dragOffset = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
            
            // 防止文本选择
            e.preventDefault();
        };

        const handleDrag = (e) => {
            if (!this.isDragging) return;

            // 检查是否超过拖拽阈值
            if (!this.dragThreshold) {
                const dx = Math.abs(e.clientX - this.initialPosition.x);
                const dy = Math.abs(e.clientY - this.initialPosition.y);
                if (dx < CONFIG.DRAG_THRESHOLD && dy < CONFIG.DRAG_THRESHOLD) {
                    return;
                }
                this.dragThreshold = true;
            }

            // 计算新位置
            const x = e.clientX - this.dragOffset.x;
            const y = e.clientY - this.dragOffset.y;

            // 确保按钮不会超出视窗边界
            const buttonRect = button.getBoundingClientRect();
            const maxX = window.innerWidth - buttonRect.width;
            const maxY = window.innerHeight - buttonRect.height;

            // 应用新位置
            this.container.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
            this.container.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
            
            // 更新位置为固定值，不再跟随选中文本
            this.container.style.position = 'fixed';
            
            e.preventDefault();
        };

        const handleDragEnd = () => {
            if (!this.isDragging) return;
            
            this.isDragging = false;
            
            // 如果没有超过拖拽阈值，视为点击
            if (!this.dragThreshold) {
                this.createMenu(this.lastSelectedText);
            }
        };

        // 添加事件监听器
        button.addEventListener('mousedown', handleDragStart);
        document.addEventListener('mousemove', handleDrag);
        document.addEventListener('mouseup', handleDragEnd);
    }

    showButton(range) {
        if (!this.button) {
            this.button = this.createButton();
        }

        // 只在按钮首次显示或未被拖拽时更新位置
        if (!this.container || !this.isDragging) {
            const rect = range.getBoundingClientRect();
            const buttonRect = this.button.getBoundingClientRect();
            const viewportWidth = window.innerWidth;

            if (!this.container) {
                this.container = document.createElement('div');
                this.container.id = 'button-container';
                this.container.style.cssText = `
                    position: absolute;
                    z-index: 2147483647;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                `;
                document.body.appendChild(this.container);
            }

            // 计算最佳位置
            let top, left;
            
            if (rect.top > buttonRect.height + 10) {
                top = rect.top + window.scrollY - buttonRect.height - 5;
            } else {
                top = rect.bottom + window.scrollY + 5;
            }

            left = Math.max(0, Math.min(
                rect.left + window.scrollX + (rect.width - buttonRect.width) / 2,
                viewportWidth - buttonRect.width
            ));

            this.container.style.top = `${top}px`;
            this.container.style.left = `${left}px`;
        }
        
        this.button.style.pointerEvents = 'auto';
        this.button.style.opacity = '1';
        this.button.style.transform = 'scale(1)';
        
        if (this.button.parentElement !== this.container) {
            this.container.appendChild(this.button);
        }
        
        this.isVisible = true;
    }

    updateButtonPosition() {
        const selectionInfo = Util.getValidSelection();
        if (selectionInfo && this.isVisible) {
            this.showButton(selectionInfo.range);
        }
    }

    showResultModal(title, content) {
        const modal = document.createElement('div');
        modal.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: ${CONFIG.MODAL_Z_INDEX};
            width: ${CONFIG.MODAL_WIDTH};
            max-height: ${CONFIG.MODAL_MAX_HEIGHT};
            display: flex;
            flex-direction: column;
            gap: 15px;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 1px solid #eee;
            padding-bottom: 10px;
        `;

        const titleElement = document.createElement('h3');
        titleElement.textContent = title;
        titleElement.style.margin = '0';

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.style.cssText = `
            border: none;
            background: none;
            font-size: 20px;
            cursor: pointer;
            padding: 5px;
            color: #666;
        `;

        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            overflow-y: auto;
            font-family: monospace;
            white-space: pre-wrap;
            background: #f5f5f5;
            padding: 15px;
            border-radius: 4px;
        `;
        contentWrapper.textContent = content;

        const copyButton = document.createElement('button');
        copyButton.textContent = '复制结果';
        copyButton.style.cssText = `
            padding: 8px 16px;
            background: #4a90e2;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            align-self: flex-end;
        `;

        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0,0,0,0.5);
            z-index: ${CONFIG.MODAL_Z_INDEX - 1};
        `;

        header.appendChild(titleElement);
        header.appendChild(closeButton);
        modal.appendChild(header);
        modal.appendChild(contentWrapper);
        modal.appendChild(copyButton);

        document.body.appendChild(overlay);
        document.body.appendChild(modal);

        const closeModal = () => {
            modal.remove();
            overlay.remove();
        };

        closeButton.onclick = closeModal;
        overlay.onclick = closeModal;
        copyButton.onclick = () => {
            navigator.clipboard.writeText(content);
            this.showNotification('已复制到剪贴板');
        };
    }

    createMenu(text) {
        if (this.menu) {
            this.menu.remove();
        }

        const menu = document.createElement('div');
        menu.style.cssText = `
            position: fixed;
            background: white;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            padding: 8px 0;
            z-index: 2147483648;
            min-width: 150px;
        `;

        const actions = [
            { 
                label: '复制文本',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>`,
                action: () => {
                    navigator.clipboard.writeText(text);
                    this.showNotification('已复制到剪贴板');
                }
            },
            {
                label: '格式化 JSON',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14 2 14 8 20 8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                </svg>`,
                action: () => {
                    try {
                        const formatted = JSON.stringify(JSON.parse(text), null, 2);
                        navigator.clipboard.writeText(formatted);
                        this.showNotification('JSON 已格式化并复制到剪贴板');
                    } catch (e) {
                        this.showNotification('无效的 JSON 格式', 'error');
                    }
                }
            },
            {
                label: '转换大写',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7V4h16v3"></path>
                    <path d="M9 20h6"></path>
                    <path d="M12 4v16"></path>
                </svg>`,
                action: () => {
                    navigator.clipboard.writeText(text.toUpperCase());
                    this.showNotification('已转换为大写并复制到剪贴板');
                }
            },
            {
                label: '转换小写',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 17V20h16v-3"></path>
                    <path d="M9 4h6"></path>
                    <path d="M12 4v16"></path>
                </svg>`,
                action: () => {
                    navigator.clipboard.writeText(text.toLowerCase());
                    this.showNotification('已转换为小写并复制到剪贴板');
                }
            },
            {
                label: 'Base64 编码',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7l16 0"></path><path d="M4 17l16 0"></path><path d="M7 20l4-16"></path><path d="M13 20l4-16"></path>
                </svg>`,
                action: () => {
                    const result = btoa(unescape(encodeURIComponent(text)));
                    navigator.clipboard.writeText(result);
                    this.showResultModal('Base64 编码结果', result);
                }
            },
            {
                label: 'Base64 解码',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7l16 0"></path><path d="M4 17l16 0"></path><path d="M7 4l4 16"></path><path d="M13 4l4 16"></path>
                </svg>`,
                action: () => {
                    try {
                        const result = decodeURIComponent(escape(atob(text)));
                        navigator.clipboard.writeText(result);
                        this.showResultModal('Base64 解码结果', result);
                    } catch (e) {
                        this.showNotification('无效的 Base64 编码', 'error');
                    }
                }
            },
            {
                label: 'URL 编码',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>`,
                action: () => {
                    const result = encodeURIComponent(text);
                    navigator.clipboard.writeText(result);
                    this.showResultModal('URL 编码结果', result);
                }
            },
            {
                label: 'URL 解码',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"></path>
                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"></path>
                </svg>`,
                action: () => {
                    try {
                        const result = decodeURIComponent(text);
                        navigator.clipboard.writeText(result);
                        this.showResultModal('URL 解码结果', result);
                    } catch (e) {
                        this.showNotification('无效的 URL 编码', 'error');
                    }
                }
            },
            {
                label: 'MD5 哈希',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"></path>
                    <path d="M2 17l10 5 10-5"></path>
                    <path d="M2 12l10 5 10-5"></path>
                </svg>`,
                action: async () => {
                    const result = await crypto.subtle.digest('MD5', new TextEncoder().encode(text))
                        .then(buf => Array.from(new Uint8Array(buf))
                            .map(b => b.toString(16).padStart(2, '0'))
                            .join(''));
                    navigator.clipboard.writeText(result);
                    this.showResultModal('MD5 哈希结果', result);
                }
            },
            {
                label: 'HTML 转义',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <path d="M15 2H9a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"></path>
                </svg>`,
                action: () => {
                    const result = text
                        .replace(/&/g, '&amp;')
                        .replace(/</g, '&lt;')
                        .replace(/>/g, '&gt;')
                        .replace(/"/g, '&quot;')
                        .replace(/'/g, '&#039;');
                    navigator.clipboard.writeText(result);
                    this.showResultModal('HTML 转义结果', result);
                }
            },
            {
                label: 'HTML 反转义',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
                    <path d="M9 22h6"></path>
                    <path d="M12 16v6"></path>
                </svg>`,
                action: () => {
                    const result = text
                        .replace(/&amp;/g, '&')
                        .replace(/&lt;/g, '<')
                        .replace(/&gt;/g, '>')
                        .replace(/&quot;/g, '"')
                        .replace(/&#039;/g, "'");
                    navigator.clipboard.writeText(result);
                    this.showResultModal('HTML 反转义结果', result);
                }
            },
            {
                label: '驼峰转换',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19h16"></path>
                    <path d="M4 15h16"></path>
                    <path d="M4 11h16"></path>
                    <path d="M4 7h16"></path>
                </svg>`,
                action: () => {
                    const result = text
                        .replace(/[-_\s]+(.)?/g, (_, c) => c ? c.toUpperCase() : '');
                    navigator.clipboard.writeText(result);
                    this.showResultModal('驼峰转换结果', result);
                }
            },
            {
                label: '下划线转换',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 19h16"></path>
                    <path d="M4 15h16"></path>
                    <path d="M4 11h16"></path>
                    <path d="M4 7h16"></path>
                </svg>`,
                action: () => {
                    const result = text
                        .replace(/[A-Z]/g, letter => `_${letter.toLowerCase()}`)
                        .replace(/^_/, '');
                    navigator.clipboard.writeText(result);
                    this.showResultModal('下划线转换结果', result);
                }
            },
            {
                label: '移除空白',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M5 9h14"></path>
                    <path d="M5 15h14"></path>
                </svg>`,
                action: () => {
                    const result = text.replace(/\s+/g, '');
                    navigator.clipboard.writeText(result);
                    this.showResultModal('移除空白结果', result);
                }
            },
            {
                label: '计算字数',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 7h16"></path>
                    <path d="M4 12h16"></path>
                    <path d="M4 17h10"></path>
                </svg>`,
                action: () => {
                    const chars = text.length;
                    const words = text.trim().split(/\s+/).length;
                    const lines = text.split('\n').length;
                    const result = `字符数：${chars}\n单词数：${words}\n行数：${lines}`;
                    navigator.clipboard.writeText(result);
                    this.showResultModal('文本统计', result);
                }
            },
            {
                label: '反转文本',
                icon: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M4 15l8-8 8 8"></path>
                </svg>`,
                action: () => {
                    const result = text.split('').reverse().join('');
                    navigator.clipboard.writeText(result);
                    this.showResultModal('反转文本结果', result);
                }
            }
        ];

        actions.forEach(({ label, icon, action }) => {
            const item = document.createElement('div');
            item.style.cssText = `
                padding: 8px 16px;
                cursor: pointer;
                display: flex;
                align-items: center;
                gap: 8px;
                color: #333;
                font-size: 14px;
                white-space: nowrap;
            `;
            item.innerHTML = icon + label;
            
            item.addEventListener('mouseover', () => {
                item.style.backgroundColor = '#f5f5f5';
            });
            
            item.addEventListener('mouseout', () => {
                item.style.backgroundColor = 'transparent';
            });
            
            item.addEventListener('click', () => {
                action();
                this.menu.remove();
                this.menu = null;
            });
            
            menu.appendChild(item);
        });

        const buttonRect = this.button.getBoundingClientRect();
        menu.style.top = `${buttonRect.bottom + 5}px`;
        menu.style.left = `${buttonRect.left}px`;

        this.menu = menu;
        document.body.appendChild(menu);
    }

    showNotification(message, type = 'success') {
        const notification = document.createElement('div');
        notification.style.cssText = `
            position: fixed;
            bottom: 20px;
            left: 50%;
            transform: translateX(-50%);
            padding: 12px 24px;
            background: ${type === 'success' ? '#4caf50' : '#f44336'};
            color: white;
            border-radius: 4px;
            font-size: 14px;
            box-shadow: 0 2px 5px rgba(0,0,0,0.2);
            z-index: 2147483649;
            opacity: 0;
            transition: opacity 0.3s ease;
        `;
        notification.textContent = message;
        
        document.body.appendChild(notification);
        
        requestAnimationFrame(() => {
            notification.style.opacity = '1';
        });
        
        setTimeout(() => {
            notification.style.opacity = '0';
            setTimeout(() => {
                notification.remove();
            }, 300);
        }, 3000);
    }

    setupEventListeners() {
        // 修改选择文本处理
        const handleSelection = Util.debounce(() => {
            const selectionInfo = Util.getValidSelection();
            if (selectionInfo && selectionInfo.selectedText) {
                this.lastSelectedText = selectionInfo.selectedText;
                this.showButton(selectionInfo.range);
            } else {
                // 如果没有选中文本，隐藏按钮
                this.hideButton();
            }
        }, CONFIG.DEBOUNCE_DELAY);

        // 监听选择变化
        document.addEventListener('selectionchange', handleSelection);
        document.addEventListener('mouseup', handleSelection);

        // 点击处理
        document.addEventListener('click', (e) => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();

            if (this.button && e.target === this.button) {
                this.createMenu(this.lastSelectedText);
            } else if (this.menu && !this.menu.contains(e.target) && !this.button.contains(e.target)) {
                this.menu.remove();
                this.menu = null;
            }

            // 如果点击时没有选中文本，隐藏按钮
            if (!selectedText) {
                this.hideButton();
            }
        });

        // 滚动处理
        document.addEventListener('scroll', Util.debounce(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && this.isVisible) {
                this.updateButtonPosition();
            } else {
                this.hideButton();
            }
        }, CONFIG.DEBOUNCE_DELAY), { passive: true });

        // 窗口大小改变处理
        window.addEventListener('resize', Util.debounce(() => {
            const selection = window.getSelection();
            const selectedText = selection.toString().trim();
            
            if (selectedText && this.isVisible) {
                this.updateButtonPosition();
            } else {
                this.hideButton();
            }
        }, CONFIG.DEBOUNCE_DELAY));
    }
}

// 初始化
new TextProcessorButton();