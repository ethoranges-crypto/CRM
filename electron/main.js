const { app, BrowserWindow, ipcMain, Notification } = require("electron")
const path = require("path")
const { spawn, execSync } = require("child_process")
const net = require("net")
const fs = require("fs")

// Detect environment: dev mode is when running via `electron .` in the source tree
// with a `next dev` server already running (electron:dev script)
const isDevMode =
  process.env.NODE_ENV === "development" ||
  (process.argv.includes("--dev") || process.argv.includes("."))

const PORT = 3000
let mainWindow = null
let nextProcess = null

// Ensure single instance
const gotLock = app.requestSingleInstanceLock()
if (!gotLock) {
  app.quit()
}

app.on("second-instance", () => {
  if (mainWindow) {
    if (mainWindow.isMinimized()) mainWindow.restore()
    mainWindow.focus()
  }
})

// Resolve the project root — works both in dev and packaged builds
function getAppRoot() {
  // In packaged build: electron/main.js is inside resources/app/electron/main.js
  // In dev: electron/main.js is in <project>/electron/main.js
  return path.join(__dirname, "..")
}

// Load .env.local for environment variables
function loadEnvFile() {
  const appRoot = getAppRoot()
  const envPaths = [
    path.join(appRoot, ".env.local"),
    // Packaged builds also look in resources/
    process.resourcesPath
      ? path.join(process.resourcesPath, ".env.local")
      : null,
  ].filter(Boolean)

  for (const envPath of envPaths) {
    try {
      const content = fs.readFileSync(envPath, "utf-8")
      for (const line of content.split("\n")) {
        const trimmed = line.trim()
        if (!trimmed || trimmed.startsWith("#")) continue
        const eqIndex = trimmed.indexOf("=")
        if (eqIndex === -1) continue
        const key = trimmed.slice(0, eqIndex).trim()
        const value = trimmed.slice(eqIndex + 1).trim()
        if (!process.env[key]) {
          process.env[key] = value
        }
      }
      console.log("[CRM] Loaded env from:", envPath)
      break // stop after first successful load
    } catch {
      // Try next path
    }
  }
}

// Set database path to a stable location
function setupDbPath() {
  const appRoot = getAppRoot()
  // Use the project root for the DB (next to the app files)
  const dbPath = path.join(appRoot, "crm.db")
  process.env.CRM_DB_PATH = dbPath
  console.log("[CRM] Database path:", dbPath)
}

function checkPort(port) {
  return new Promise((resolve) => {
    const socket = new net.Socket()
    socket.setTimeout(500)
    socket.on("connect", () => {
      socket.destroy()
      resolve(true)
    })
    socket.on("timeout", () => {
      socket.destroy()
      resolve(false)
    })
    socket.on("error", () => {
      resolve(false)
    })
    socket.connect(port, "127.0.0.1")
  })
}

async function waitForServer(port, maxAttempts = 60) {
  console.log(`[CRM] Waiting for server on port ${port}...`)
  for (let i = 0; i < maxAttempts; i++) {
    const ready = await checkPort(port)
    if (ready) {
      console.log(`[CRM] Server ready on port ${port}`)
      return true
    }
    await new Promise((r) => setTimeout(r, 1000))
  }
  return false
}

function findAvailablePort(startPort) {
  return new Promise((resolve) => {
    const server = net.createServer()
    server.listen(startPort, () => {
      const port = server.address().port
      server.close(() => resolve(port))
    })
    server.on("error", () => {
      resolve(findAvailablePort(startPort + 1))
    })
  })
}

async function startNextServer(port) {
  const appRoot = getAppRoot()
  const env = { ...process.env, PORT: String(port) }

  // Find the next JS entry point
  const nextJsPath = path.join(appRoot, "node_modules", "next", "dist", "bin", "next")

  if (!fs.existsSync(nextJsPath)) {
    console.error("[CRM] Could not find next binary at:", nextJsPath)
    return false
  }

  // Find the system node.exe (not Electron's executable)
  let nodePath = "node"
  try {
    // On Windows, `where node` returns the full path
    const result = execSync("where node", { encoding: "utf-8" }).trim().split("\n")[0].trim()
    if (result && fs.existsSync(result)) {
      nodePath = result
    }
  } catch {
    // Fall back to just "node" and hope it's on PATH
  }

  console.log("[CRM] Node path:", nodePath)
  console.log("[CRM] Next.js path:", nextJsPath)
  console.log("[CRM] App root:", appRoot)

  return new Promise((resolve) => {
    // Use shell: false with absolute paths to avoid spaces-in-path issues
    nextProcess = spawn(nodePath, [nextJsPath, "start", "-p", String(port)], {
      cwd: appRoot,
      env,
      stdio: "pipe",
      shell: false,
      windowsHide: true,
    })

    let resolved = false

    nextProcess.stdout.on("data", (data) => {
      const output = data.toString()
      console.log("[Next.js]", output.trim())
      if (!resolved && (output.includes("Ready") || output.includes("started server") || output.includes("localhost"))) {
        resolved = true
        resolve(true)
      }
    })

    nextProcess.stderr.on("data", (data) => {
      console.error("[Next.js]", data.toString().trim())
    })

    nextProcess.on("error", (err) => {
      console.error("[CRM] Failed to start Next.js:", err.message)
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    })

    nextProcess.on("exit", (code) => {
      console.log("[CRM] Next.js process exited with code:", code)
      if (!resolved) {
        resolved = true
        resolve(false)
      }
    })

    // Fallback: resolve after timeout and rely on port check
    setTimeout(() => {
      if (!resolved) {
        resolved = true
        resolve(true) // let port check handle it
      }
    }, 10000)
  })
}

function createWindow(port) {
  const preloadPath = path.join(__dirname, "preload.js")

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 900,
    minHeight: 600,
    title: "CRM",
    icon: path.join(__dirname, "icon.ico"),
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  })

  const url = `http://localhost:${port}`
  console.log("[CRM] Loading:", url)
  mainWindow.loadURL(url)

  mainWindow.once("ready-to-show", () => {
    mainWindow.show()
  })

  // Remove default menu bar
  mainWindow.setMenuBarVisibility(false)

  // Retry loading if the page fails (server might still be starting)
  mainWindow.webContents.on("did-fail-load", (_event, _code, _desc) => {
    console.log("[CRM] Page failed to load, retrying in 2s...")
    setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.loadURL(url)
      }
    }, 2000)
  })

  mainWindow.on("closed", () => {
    mainWindow = null
  })
}

// IPC: Native notifications
ipcMain.handle("send-notification", (_event, { title, body }) => {
  if (Notification.isSupported()) {
    const notification = new Notification({
      title: title || "CRM",
      body: body || "",
      icon: path.join(__dirname, "icon.ico"),
    })
    notification.show()

    notification.on("click", () => {
      if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore()
        mainWindow.focus()
        mainWindow.webContents.send("notification-clicked")
      }
    })

    return true
  }
  return false
})

// App lifecycle
app.whenReady().then(async () => {
  loadEnvFile()
  setupDbPath()

  let port = PORT

  // Check if a dev server is already running
  const devServerRunning = await checkPort(PORT)

  if (devServerRunning) {
    console.log("[CRM] Dev server already running on port", PORT)
    port = PORT
  } else {
    // Find an available port and start the Next.js production server
    port = await findAvailablePort(PORT)
    console.log("[CRM] Using port:", port)

    const started = await startNextServer(port)
    if (!started) {
      console.error("[CRM] Failed to start Next.js server")
    }

    // Wait for the server to be accessible
    const serverReady = await waitForServer(port, 30)
    if (!serverReady) {
      console.error("[CRM] Server did not become ready in time")
      // Still try to show the window — it has retry logic
    }
  }

  createWindow(port)
})

app.on("window-all-closed", () => {
  if (nextProcess) {
    nextProcess.kill()
    nextProcess = null
  }
  app.quit()
})

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow(PORT)
  }
})

app.on("before-quit", () => {
  if (nextProcess) {
    nextProcess.kill()
    nextProcess = null
  }
})
