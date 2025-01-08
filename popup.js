document.getElementById('formatJson').addEventListener('click', () => {
    chrome.tabs.executeScript({
      code: 'formatSelectedJson();'
    });
  });
  