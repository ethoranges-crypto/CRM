interface ElectronAPI {
  isElectron: boolean
  sendNotification: (opts: { title: string; body: string }) => Promise<boolean>
  onNotificationClicked: (callback: () => void) => () => void
}

interface Window {
  electronAPI?: ElectronAPI
}
