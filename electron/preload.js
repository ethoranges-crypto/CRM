const { contextBridge, ipcRenderer } = require("electron")

contextBridge.exposeInMainWorld("electronAPI", {
  isElectron: true,

  sendNotification: ({ title, body }) => {
    return ipcRenderer.invoke("send-notification", { title, body })
  },

  onNotificationClicked: (callback) => {
    ipcRenderer.on("notification-clicked", callback)
    return () => ipcRenderer.removeListener("notification-clicked", callback)
  },
})
