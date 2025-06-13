// 存储当前的AI回复
let currentAIReply = null;
let currentStreamPopup = null;
let isProcessing = false; // 添加处理状态标志
// let lastRequest = null;

// 处理流式响应数据
function handleStreamResponse (chunk) {
  if (!currentStreamPopup) {
    // 移除加载中弹窗
    removeLoadingPopup();
    // 创建流式响应弹窗
    currentStreamPopup = createStreamPopup();
  }
  if (chunk.includes('remianCountIs')) {
    const remianCount = chunk.split(':')[1];
    chrome.storage.sync.set({ remainingUses: remianCount });
    return;
  }

  // 追加新的内容
  const content = currentStreamPopup.shadowRoot.querySelector('.content');
  if (content) {
    currentAIReply = (currentAIReply || '') + chunk;
    content.textContent = currentAIReply;
    // 自动滚动到底部
    content.scrollTop = content.scrollHeight;
  }
}

// 处理流式响应完成
function handleStreamComplete () {
  // 重置处理状态
  isProcessing = false;

  if (currentStreamPopup) {
    const hint = currentStreamPopup.shadowRoot.querySelector('.hint');
    if (hint) {
      hint.style.display = 'block';
    }
  }
}
// 创建流式响应弹窗
function createStreamPopup () {
  // 移除已存在的弹窗
  const existingPopup = document.getElementById('ai-reply-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // 创建新弹窗
  const popup = document.createElement('div');
  popup.id = 'ai-reply-popup';
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 300px;
    z-index: 2147483647;
    pointer-events: auto;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  `;

  // 创建Shadow DOM
  const shadow = popup.attachShadow({ mode: 'open' });

  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    .popup-container {
      padding: 15px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
      max-height: 80vh;
      overflow-y: auto;
    }
    .close-button {
      position: absolute;
      right: 10px;
      top: 5px;
      border: none;
      background: none;
      font-size: 20px;
      cursor: pointer;
      padding: 5px;
      line-height: 1;
      z-index: 1;
    }
    .content {
      margin-top: 20px;
      word-break: break-word;
      white-space: pre-wrap;
      line-height: 1.5;
      color: black;
      min-height: 50px;
    }
    .hint {
      display: none;
      margin-top: 10px;
      font-size: 12px;
      color: #666;
      border-top: 1px solid #eee;
      padding-top: 10px;
    }
  `;

  // 创建弹窗内容
  const container = document.createElement('div');
  container.className = 'popup-container';

  const closeButton = document.createElement('button');
  closeButton.className = 'close-button';
  closeButton.textContent = '×';
  closeButton.onclick = () => {
    popup.remove();
    currentStreamPopup = null;

  };

  const content = document.createElement('div');
  content.className = 'content';

  const hint = document.createElement('div');
  hint.className = 'hint';
  hint.textContent = '提示：按下快捷键可复制回复并填入输入框';

  container.appendChild(closeButton);
  container.appendChild(content);
  container.appendChild(hint);
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(popup);

  return popup;
}

// 处理文本优化
function handleOptimizeText () {
  // 获取当前焦点元素
  const activeElement = document.activeElement;

  // 检查是否是输入框或文本区域
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  )) {
    // 获取输入框的内容
    let text = '';
    if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
      text = activeElement.value;
    } else if (activeElement.isContentEditable) {
      text = activeElement.textContent;
    }

    if (text.trim()) {
      isProcessing = true; // 设置处理状态
      currentAIReply = null;
      currentStreamPopup = null;

      // 显示加载中弹窗
      showLoadingPopup();
      const context = getDouyinMessageContext();
      // lastRequest = {
      //   text,
      //   context,
      //   type: 'optimize'
      // };
      // 发送文本到后台进行优化
      chrome.runtime.sendMessage({
        action: 'optimizeText',
        text: text,
        context
      });
    } else {
      showToast('请先输入一些文本再优化');
    }
  } else {
    showToast('请先选择一个输入框');
  }
}

// 显示加载中弹窗
function showLoadingPopup () {
  // 移除已存在的弹窗
  const existingPopup = document.getElementById('ai-reply-popup');
  if (existingPopup) {
    existingPopup.remove();
  }

  // 移除已存在的加载弹窗
  const existingLoadingPopup = document.getElementById('ai-loading-popup');
  if (existingLoadingPopup) {
    existingLoadingPopup.remove();
  }

  // 创建新弹窗
  const popup = document.createElement('div');
  popup.id = 'ai-loading-popup';
  popup.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 200px;
    z-index: 2147483647;
    pointer-events: auto;
    transform: translateZ(0);
    backface-visibility: hidden;
    -webkit-font-smoothing: antialiased;
  `;

  // 创建Shadow DOM
  const shadow = popup.attachShadow({ mode: 'open' });

  // 创建样式
  const style = document.createElement('style');
  style.textContent = `
    .loading-container {
      padding: 15px;
      background: white;
      border: 1px solid #ccc;
      border-radius: 8px;
      box-shadow: 0 2px 10px rgba(0,0,0,0.1);
      font-family: Arial, sans-serif;
      text-align: center;
    }
    .spinner {
      width: 30px;
      height: 30px;
      margin: 0 auto 10px;
      border: 3px solid #f3f3f3;
      border-top: 3px solid #3498db;
      border-radius: 50%;
      animation: spin 1s linear infinite;
    }
    @keyframes spin {
      0% { transform: rotate(0deg); }
      100% { transform: rotate(360deg); }
    }
    .loading-text {
      margin-top: 10px;
      color: #666;
    }
  `;

  // 创建加载内容
  const container = document.createElement('div');
  container.className = 'loading-container';

  const spinner = document.createElement('div');
  spinner.className = 'spinner';

  const text = document.createElement('div');
  text.className = 'loading-text';
  text.textContent = 'AI正在处理中...';

  container.appendChild(spinner);
  container.appendChild(text);
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(popup);
}

// 移除加载中弹窗
function removeLoadingPopup () {
  const popup = document.getElementById('ai-loading-popup');
  if (popup) {
    popup.remove();
  }
}

// 处理复制和粘贴
function handleCopyAndPaste (reply) {
  // 复制到剪贴板
  navigator.clipboard.writeText(reply).then(() => {
    // 获取当前焦点元素
    const activeElement = document.activeElement;

    // 检查是否是输入框或文本区域
    if (activeElement && (
      activeElement.tagName === 'INPUT' ||
      activeElement.tagName === 'TEXTAREA' ||
      activeElement.isContentEditable
    )) {
      // 读取自动粘贴设置
      chrome.storage.sync.get('autoPaste', function (result) {
        const autoPaste = result.autoPaste !== undefined ? result.autoPaste : true;

        if (autoPaste) {
          // 如果是输入框，直接填入内容
          if (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA') {
            activeElement.value = reply;
            // 触发input事件，确保其他监听器能够捕获到变化
            activeElement.dispatchEvent(new Event('input', { bubbles: true }));
          } else if (activeElement.isContentEditable) {
            // 如果是可编辑区域，显示提示信息
            showToast('已经复制，当前输入框不支持自动粘贴，请手动粘贴');
          }
        } else {
          showToast('已复制到剪贴板，请手动粘贴');
        }
      });
    }

    // 关闭弹窗
    const popup = document.getElementById('ai-reply-popup');
    if (popup) {
      popup.remove();
    }
  });
}

// 显示提示信息
function showToast (message) {
  // 创建提示元素
  const toast = document.createElement('div');
  toast.style.cssText = `
    position: fixed;
    top: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: white;
    padding: 10px 20px;
    border-radius: 4px;
    z-index: 2147483647;
    font-size: 14px;
  `;
  toast.textContent = message;

  // 添加到页面
  document.body.appendChild(toast);

  // 3秒后自动移除
  setTimeout(() => {
    toast.remove();
  }, 3000);
}
// 获取抖音私信会话上下文
function getDouyinMessageContext () {
  if (window.location.href.includes('douyin.com') && !window.location.href.includes('modal_id') && document.querySelector('#messageContent')) {
    const messageContainer = document.querySelector('#messageContent');
    if (messageContainer) {
      // 获取最近的消息项
      const messageItems = messageContainer.querySelectorAll('[data-e2e="msg-item-content"]');
      if (!messageItems || messageItems.length === 0) {
        showToast('没有找到聊天记录');
        return;
      }

      // 获取最近20条消息（或全部，如果少于20条）
      const recentMessages = [];
      const maxMessages = Math.min(messageItems.length, 20);
      for (let i = 0; i < maxMessages; i++) {
        const item = messageItems[i];
        const parentContainer = item.parentElement.parentElement;
        const isMyMessage = parentContainer && parentContainer.style && parentContainer.style.justifyContent === 'right';
        // 尝试获取pre标签下的内容，如果没有则获取整个元素的文本内容
        const preElement = item.querySelector('pre');
        const messageText = preElement ? preElement.textContent.trim() : '';
        if (messageText) {
          recentMessages.unshift({
            role: isMyMessage ? 'me' : 'other',
            content: messageText
          });
        }
      }

      // 格式化对话记录
      const conversationHistory = recentMessages.map(msg =>
        `${msg.role === 'me' ? '我' : '对方'}: ${msg.content}`
      ).join('\n');
      return conversationHistory;
    }
  }
  return '';
}
// 监听快捷键命令和流式响应
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'get-ai-reply') {
    // 如果正在处理中，显示提示并返回
    if (isProcessing) {
      showToast('请等待当前响应完成');
      return;
    }

    const selectedText = window.getSelection().toString().trim();
    const context = getDouyinMessageContext();
    if (selectedText || context) {
      isProcessing = true; // 设置处理状态
      currentAIReply = null;
      currentStreamPopup = null;
      // 显示加载中弹窗
      showLoadingPopup();

      // lastRequest = {
      //   text: selectedText,
      //   context,
      //   type: 'reply'
      // };
      // 发送选中的文本到后台进行处理
      chrome.runtime.sendMessage({
        action: 'processText',
        text: selectedText,
        context
      });
    }
  } else if (request.command === 'copy-ai-reply' && currentAIReply) {
    // 如果正在处理中，显示提示并返回
    if (isProcessing) {
      showToast('请等待当前响应完成');
      return;
    }
    handleCopyAndPaste(currentAIReply);
  } else if (request.command === 'optimize-text') {
    // 如果正在处理中，显示提示并返回
    if (isProcessing) {
      showToast('请等待当前响应完成');
      return;
    }
    handleOptimizeText();
  } else if (request.action === 'streamResponse') {
    // 处理流式响应数据
    handleStreamResponse(request.chunk);
  } else if (request.action === 'streamComplete') {
    // 处理流式响应完成
    handleStreamComplete();
  }
});
