const AIRequestType = {
  REPLY: 'reply',
  OPTIMIZE: 'optimize'
}
const BASE_URL = 'http://127.0.0.1:7001';
let config = {
  license: '',
  remainingUses: 0,
  selectedRole: '',
  customPrompt: ''
}
chrome.storage.sync.get(['license', 'remainingUses', 'selectedRole', 'customPrompt'], function (result) {
  config = {
    license: result.license || '',
    remainingUses: result.remainingUses || 0,
    selectedRole: result.selectedRole || '',
    customPrompt: result.customPrompt || ''
  }
})
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'sync') {
    if (changes.license) {
      config.license = changes.license.newValue;
    }
    if (changes.remainingUses) {
      config.remainingUses = changes.remainingUses.newValue;
    }
    if (changes.selectedRole) {
      config.selectedRole = changes.selectedRole.newValue;
    }
    if (changes.customPrompt) {
      config.customPrompt = changes.customPrompt.newValue;
    }
  }
})
chrome.runtime.onMessage.addListener((request, sender, sendReponse) => {
  const sourceTabId = sender.tab.id;
  // 
  if (request.action === 'processText') {
    sendReponse({
      status: 'processing'
    })
    processWithAI({
      text: request.text,
      type: AIRequestType.REPLY,
      context: request.context,
      sourceTabId
    })
    return false
  } else if (request.action === 'optimizeText') {
    sendReponse({
      status: 'processing'
    })
    processWithAI({
      text: request.text,
      type: AIRequestType.OPTIMIZE,
      context: request.context,
      sourceTabId
    })
    return false
  }
})
async function processWithAI ({ text, type, context = '', sourceTabId }) {
  const payload = {
    license: config.license,
    selectedRole: config.selectedRole,
    type: type,
    content: text,
    context,
    customPrompt: config.customPrompt
  }
  const response = await fetch(`${BASE_URL}/api/ai/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': "text/event-stream"
    },
    body: JSON.stringify(payload)
  })
  if (!response.ok) {
    throw new Error('请求失败')
  }
  const reader = response.body.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = new TextDecoder().decode(value);
    chrome.tabs.sendMessage(sourceTabId, {
      action: 'streamResponse',
      chunk
    })
  }
  chrome.tabs.sendMessage(sourceTabId, {
    action: 'streamComplete'
  })
}
chrome.commands.onCommand.addListener((command) => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { command })
    }
  })
})