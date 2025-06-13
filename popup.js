const BASE_URL = 'http://127.0.0.1:7001'
// 1.配置快捷键map
const ShortcutMap = {
  GetReply: 'get-ai-reply',
  OptimizeText: 'optimise-text',
  Copy: 'copy-ai-reply'
}
// 2. 获取元素
// 共享码模块
const sharedCodeValue = document.getElementById('shared-code-value');
const sharedCodeRemaining = document.getElementById('shared-code-remaining');
const useSharedCodeBtn = document.getElementById('use-shared-code');
// 使用码模块
const licenseInput = document.getElementById('license-input');
const licenseButton = document.getElementById('license-button');
const remainingCount = document.getElementById('remaining-count')
// 选择回复风格模块
const roleItems = document.querySelectorAll('.role-item');
// 个性化设置
const customPromptInput = document.getElementById('custom-prompt');
// 功能模块
const getReplyShortcut = document.getElementById('get-replay-shortcut')
const optimizeTextTextShortcut = document.getElementById('optimize-text-shortcut')
const copyReplyShortcut = document.getElementById('copy-reply-shortcut')
const autoPastSwitch = document.getElementById('auto-paste-switch');

// 3. 设置初始值
chrome.storage.sync.get(['license', 'remainingUses', 'selectedRole', 'customPrompt', 'autoPaste'], function (result) {
  if (result.license) {
    licenseInput.value = result.license;
    licenseInput.disabled = true;
    licenseButton.textContent = '更换'
  }
  if (result.remainingUses) {
    remainingCount.textContent = `剩余次数：${result.remainingUses}`;
  }
  if (result.selectedRole) {
    const roleItem = document.querySelector(`[data-role="${result.selectedRole}"]`)
    roleItem.classList.add('active');
  }
  if (result.customPrompt) {
    customPromptInput.value = result.customPrompt;
  }
  if (result.autoPast) {
    autoPastSwitch.checked = result.autoPast;
  }
})
// 共享模块设置初始值
sharedCodeValue.textContent = "gongxiangma";
sharedCodeRemaining.textContent = '总共500次'
useSharedCodeBtn.style.display = 'block'
// 功能模块设置初始值
chrome.commands.getAll((commands) => {
  const getReplyCommand = commands.find(cmd => cmd.name === ShortcutMap.GetReply)
  const getOptizeCommand = commands.find(cmd => cmd.name === ShortcutMap.OptimizeText)
  const getCopyCommand = commands.find(cmd => cmd.name === ShortcutMap.Copy)
  if (getReplyCommand?.shortcut) {
    getReplyShortcut.textContent = getReplyCommand.shortcut
  }
  if (getOptizeCommand?.shortcut) {
    optimizeTextTextShortcut.textContent = getOptizeCommand.shortcut
  }
  if (getCopyCommand?.shortcut) {
    copyReplyShortcut.textContent = getCopyCommand.shortcut
  }
})
// 配置点击事件
// 共享码模块
useSharedCodeBtn.addEventListener('click', function () {
  const code = sharedCodeValue.textContent;
  if (code === licenseInput.value) return;
  if (code && code !== '加载中...' && code !== '获取失败') {
    licenseInput.value = code;
    licenseButton.click();
  }
})
// 使用码模块
licenseButton.addEventListener('click', function () {
  if (licenseInput.disabled) {
    licenseInput.disabled = false;
    licenseInput.value = '';
    licenseButton.textContent = '确认';
    remainingCount.textContent = '';
    chrome.storage.sync.remove(['license', 'remainingUses'])
  } else {
    const license = licenseInput.value.trim();
    if (!license) {
      alert('请输入使用码')
      return;
    }
    // 判断使用码是否正确
    const validateLicense = async (license) => {
      try {
        const encodeCode = encodeURIComponent(license)
        // TODO:待会儿用真实的接口，先mock
        const response = await fetch(`${BASE_URL}/api/code/check?code=${encodeCode}`, {
          method: 'GET',
          headers: {
            "Content-Type": "application/json"
          }
        })
        const result = await response.json();
        if (!response.ok) {
          throw new Error(result.message || '验证失败')
        }
        return {
          valid: result.success,
          remainingUses: result.data.remainingCount
        }
      } catch (err) {
        return {
          valid: false,
          remainingUses: 0
        }
      }
    }
    validateLicense(license).then(result => {
      if (result.valid) {
        licenseInput.disabled = true;
        licenseButton.textContent = "更换";
        remainingCount.textContent = `剩余次数：${result.remainingUses}`;
        chrome.storage.sync.set({
          license: license,
          remainingUses: result.remainingUses
        })
      } else {
        alert("使用码无效");
      }
    })
  }
})
// 回复风格
roleItems.forEach(item => [
  item.addEventListener('click', function () {
    roleItems.forEach(i => i.classList.remove('active'));
    this.classList.add('active');
    const role = this.getAttribute('data-role');
    chrome.storage.sync.set({ selectedRole: role })
  })
])
// 个性化设置
customPromptInput.addEventListener('input', function () {
  clearTimeout(customPromptInput.saveTimeout)
  customPromptInput.saveTimeout = setTimeout(() => {
    chrome.storage.sync.set({ customPrompt: customPromptInput.value })
  }, 300);
})
// 功能模块
const btns = [getReplyShortcut,
  optimizeTextTextShortcut,
  copyReplyShortcut]
btns.forEach((btn) => {
  btn.addEventListener('click', () => {
    chrome.tabs.create({
      url: 'chrome://extensions/shortcuts'
    })
  })
})
autoPastSwitch.addEventListener('change', function () {
  chrome.storage.sync.set({ autoPaste: this.checked })
})