chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
      id: "jsonFormat",
      title: "Format JSON",
      contexts: ["selection"]
    });
  });
  
  chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "jsonFormat") {
      chrome.scripting.executeScript({
        target: {tabId: tab.id},
        function: formatSelectedJson
      });
    }
  });
  
  function formatSelectedJson() {
    const selection = window.getSelection().toString();
    try {
      const formatted = JSON.stringify(JSON.parse(selection), null, 2);
      console.log(formatted);
      alert(formatted);
    } catch (e) {
      alert("Invalid JSON");
    }
  }
  