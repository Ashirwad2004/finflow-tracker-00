import os
import asyncio
import urllib.parse
import time
import subprocess
from playwright.async_api import async_playwright
from src.core.config import settings

SESSION_DIR = os.getenv(
    "WHATSAPP_SESSION_DIR",
    os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", ".whatsapp_session")),
)

class WhatsAppPlaywrightClient:
    _instance = None

    @classmethod
    def get_instance(cls):
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    def __init__(self):
        self.playwright = None
        self.browser_context = None
        self.page = None
        self.lock = asyncio.Lock()
        self.start_lock = asyncio.Lock()
        self.started = False
        self._cached_auth_status = None
        self._last_auth_check_time = 0

    def _kill_orphaned_chromium(self):
        """Kill any leftover Chromium processes launched by Playwright to prevent profile conflicts."""
        if os.name == "nt":  # Windows
            try:
                cmd = 'powershell -Command "Get-Process | Where-Object { $_.Path -like \'*ms-playwright*\' } | Stop-Process -Force"'
                subprocess.run(cmd, shell=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                print("Cleaned up orphaned Playwright Chromium processes.")
            except Exception as e:
                print(f"Failed to kill orphaned Chromium: {e}")
        else:  # Linux / POSIX (inside Docker container)
            try:
                # Iterate /proc to find and kill chrome/playwright processes in pure Python without pkill dependency
                cleaned = False
                for pid_dir in os.listdir("/proc"):
                    if pid_dir.isdigit():
                        pid = int(pid_dir)
                        # Don't kill our own process
                        if pid == os.getpid():
                            continue
                        try:
                            with open(f"/proc/{pid}/cmdline", "r") as f:
                                cmdline = f.read()
                            if any(x in cmdline.lower() for x in ["chrome", "chromium", "playwright"]):
                                os.kill(pid, 9)
                                cleaned = True
                        except (FileNotFoundError, ProcessLookupError, PermissionError):
                            pass
                if cleaned:
                    print("Cleaned up orphaned Playwright Chromium processes on Linux.")
            except Exception as e:
                print(f"Failed to kill orphaned Chromium on Linux: {e}")

    def _cleanup_locks(self):
        """Delete any lock files in the session directory to prevent Chromium from ignoring the profile."""
        try:
            lock_files = [
                os.path.join(SESSION_DIR, "SingletonLock"),
                os.path.join(SESSION_DIR, "SingletonSocket"),
                os.path.join(SESSION_DIR, "SingletonCookie"),
                os.path.join(SESSION_DIR, "lock"),
                os.path.join(SESSION_DIR, "Default", "lock"),
                os.path.join(SESSION_DIR, "Default", "SingletonLock"),
            ]
            for lf in lock_files:
                if os.path.exists(lf):
                    try:
                        os.remove(lf)
                        print(f"Removed Chromium lock file: {lf}")
                    except Exception as re:
                        print(f"Could not remove lock file {lf}: {re}")
        except Exception as e:
            print(f"Error cleaning up Chromium locks: {e}")

    async def start(self):
        async with self.start_lock:
            if self.started:
                if self.playwright and self.browser_context and self.page and not self.page.is_closed():
                    return
                await self.stop()
            
            # Kill orphaned browsers and cleanup locks to avoid multi-instance conflicts
            self._kill_orphaned_chromium()
            os.makedirs(SESSION_DIR, exist_ok=True)
            self._cleanup_locks()
            
            self.playwright = await async_playwright().start()
            
            # Dynamically fetch default user agent and remove "HeadlessChrome" to match actual browser version & platform
            try:
                temp_browser = await self.playwright.chromium.launch(headless=True)
                temp_page = await temp_browser.new_page()
                default_ua = await temp_page.evaluate("navigator.userAgent")
                await temp_browser.close()
                ua = default_ua.replace("HeadlessChrome", "Chrome")
                print(f"Detected dynamic User-Agent: {ua}")
            except Exception as ua_err:
                print(f"Failed to get dynamic User-Agent, using standard fallback: {ua_err}")
                ua = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

            # Launch persistent context with the clean user agent and viewport to preserve login state and prevent headless detection
            self.browser_context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=SESSION_DIR,
                headless=True,
                user_agent=ua,
                viewport={"width": 1280, "height": 800},
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-blink-features=AutomationControlled",
                    "--password-store=basic",
                    "--use-mock-keychain",
                    "--window-size=1280,800"
                ]
            )
            
            # Open WhatsApp Web in the background
            self.page = await self.browser_context.new_page()
            
            # Hide automation/webdriver flags and mimic standard desktop browser fingerprint to prevent detection and logout
            stealth_script = """
            (() => {
                // Disable webdriver flag
                try {
                    Object.defineProperty(Navigator.prototype, 'webdriver', {
                        get: () => undefined
                    });
                } catch (e) {}

                // Align navigator.platform and userAgentData with the actual User-Agent
                const ua = navigator.userAgent;
                let platform = 'Win32';
                let uaPlatform = 'Windows';
                if (ua.includes('Linux')) {
                    platform = 'Linux x86_64';
                    uaPlatform = 'Linux';
                } else if (ua.includes('Macintosh')) {
                    platform = 'MacIntel';
                    uaPlatform = 'macOS';
                }

                try {
                    Object.defineProperty(Navigator.prototype, 'platform', {
                        get: () => platform
                    });
                } catch (e) {}

                if (navigator.userAgentData) {
                    try {
                        Object.defineProperty(navigator.userAgentData, 'platform', {
                            get: () => uaPlatform
                        });
                        
                        const originalGetHighEntropyValues = NavigatorUAData.prototype.getHighEntropyValues;
                        NavigatorUAData.prototype.getHighEntropyValues = function(hints) {
                            return originalGetHighEntropyValues.call(this, hints).then(res => {
                                if (hints.includes('platform')) {
                                    res.platform = uaPlatform;
                                }
                                return res;
                            });
                        };
                    } catch (e) {}
                }

                // Mock WebGL vendor/renderer to hide Headless/Software renderer indicators
                try {
                    const getParameter = WebGLRenderingContext.prototype.getParameter;
                    WebGLRenderingContext.prototype.getParameter = function(parameter) {
                        if (parameter === 37445) return 'Intel Inc.'; // UNMASKED_VENDOR_WEBGL
                        if (parameter === 37446) return 'Intel(R) Iris(TM) Plus Graphics 640'; // UNMASKED_RENDERER_WEBGL
                        return getParameter.apply(this, arguments);
                    };
                } catch (e) {}

                // Mock window outer sizes
                try {
                    Object.defineProperty(window, 'outerWidth', {
                        get: () => window.innerWidth || 1280
                    });
                    Object.defineProperty(window, 'outerHeight', {
                        get: () => window.innerHeight || 800
                    });
                } catch (e) {}

                // Mock languages
                try {
                    Object.defineProperty(Navigator.prototype, 'languages', {
                        get: () => ['en-US', 'en']
                    });
                } catch (e) {}

                // Mock chrome object
                window.chrome = {
                    runtime: {},
                    loadTimes: function() {},
                    csi: function() {},
                    app: {}
                };
                
                // Mock device memory and hardware concurrency
                try {
                    Object.defineProperty(Navigator.prototype, 'deviceMemory', {
                        get: () => 8
                    });
                    Object.defineProperty(Navigator.prototype, 'hardwareConcurrency', {
                        get: () => 8
                    });
                } catch (e) {}
            })();
            """
            await self.page.add_init_script(stealth_script)
            await self.page.goto("https://web.whatsapp.com/")
            self.started = True

    async def is_authenticated(self) -> bool:
        """Check if we are logged in or still on the QR Code screen."""
        now = time.time()
        # Return cached status if it's less than 5 seconds old
        if self._cached_auth_status is not None and (now - self._last_auth_check_time) < 5.0:
            return self._cached_auth_status

        async with self.lock:
            # Re-check in case another concurrent request updated it while waiting for the lock
            now = time.time()
            if self._cached_auth_status is not None and (now - self._last_auth_check_time) < 5.0:
                return self._cached_auth_status

            try:
                await self.start()

                # Check if chat pane or QR canvas is present (retry for up to 6 seconds to clear splash screens)
                chat_pane_selector = "#pane-side, span[data-icon='chat'], div[contenteditable='true'], [data-testid='chat-list']"
                qr_canvas_selector = "canvas"
                
                for _ in range(30): # Up to 6 seconds (30 * 0.2s)
                    try:
                        # If the URL contains post_logout, we have been explicitly logged out
                        if "post_logout" in self.page.url:
                            self._cached_auth_status = False
                            self._last_auth_check_time = time.time()
                            return False

                        # If the page is on a send URL, we are authenticated (otherwise we'd be redirected to the main login/QR screen)
                        if "send?" in self.page.url or "send/" in self.page.url:
                            self._cached_auth_status = True
                            self._last_auth_check_time = time.time()
                            return True

                        chats_found = len(await self.page.query_selector_all(chat_pane_selector)) > 0
                        if chats_found:
                            self._cached_auth_status = True
                            self._last_auth_check_time = time.time()
                            return True

                        canvas_found = len(await self.page.query_selector_all(qr_canvas_selector)) > 0
                        if canvas_found:
                            self._cached_auth_status = False
                            self._last_auth_check_time = time.time()
                            return False
                    except Exception:
                        # Ignore navigation/context destruction errors during page load and retry
                        pass
                        
                    await asyncio.sleep(0.2)
                    
                self._cached_auth_status = False
                self._last_auth_check_time = time.time()
                return False
            except Exception as e:
                print(f"Error checking WhatsApp auth status: {e}")
                return False

    async def get_qr_screenshot(self) -> bytes:
        """Capture and return the QR Code screenshot for the user to scan."""
        async with self.lock:
            await self.start()
            
            try:
                qr_selector = "canvas"
                
                # Wait up to 30 seconds for the QR code canvas to appear, retrying on context destruction/timeout errors
                success_wait = False
                for _ in range(60): # 30 seconds total (60 * 0.5s)
                    try:
                        await self.page.wait_for_selector(qr_selector, timeout=500)
                        success_wait = True
                        break
                    except Exception:
                        pass
                    await asyncio.sleep(0.5)

                if not success_wait:
                    print("Timeout waiting for QR code canvas to appear.")
                    return None
                
                # Check if the reload overlay button is present (meaning QR code has expired)
                reload_button = await self.page.query_selector('div[data-ref] button, div[data-ref] [role="button"]')
                if reload_button:
                    print("QR code expired. Clicking reload button...")
                    try:
                        await reload_button.click()
                        # Wait for a new QR code to draw
                        await asyncio.sleep(2)
                    except Exception as e:
                        print(f"Failed to click reload button, reloading page: {e}")
                        await self.page.reload()
                        await self.page.wait_for_selector(qr_selector, timeout=20000)
                
                # Wait for data-ref container and canvas to fully render the QR code
                qr_container = await self.page.query_selector("div[data-ref]")
                if qr_container:
                    # Give it a brief moment to finish rendering the QR code on the canvas
                    await asyncio.sleep(1.0)
                    self._cached_auth_status = False
                    self._last_auth_check_time = time.time()
                    return await qr_container.screenshot()
                
                canvas = await self.page.query_selector(qr_selector)
                if canvas:
                    await asyncio.sleep(1.0)
                    self._cached_auth_status = False
                    self._last_auth_check_time = time.time()
                    return await canvas.screenshot()
            except Exception as e:
                print(f"Failed to capture QR code: {e}")
                # Reload the page once after failure so it is clean for the next attempt
                try:
                    print("Reloading WhatsApp page after QR fetch failure...")
                    await self.page.reload()
                except Exception:
                    pass
                
            return None

    async def send_message(self, phone: str, text: str) -> bool:
        """Send a message to a phone number using the active WhatsApp Web session."""
        async with self.lock:
            # Format phone (keep digits only)
            clean_phone = "".join(filter(str.isdigit, phone))
            if not clean_phone:
                return False
                
            # URL encode text
            encoded_text = urllib.parse.quote(text)
            url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"
            
            for attempt in range(2):
                try:
                    await self.start()
                    
                    if self.page is None or self.page.is_closed():
                        self.started = False
                        await self.start()

                    print(f"WhatsApp sending message to {clean_phone} (attempt {attempt + 1})...")
                    # Navigate the main page directly instead of opening a new tab
                    await self.page.goto(url)
                    
                    # Check for either the send button or invalid number alert
                    send_btn_selector = 'button[aria-label="Send"], [data-testid="send"], button:has(span[data-icon="send"]), span[data-icon="send"], button[data-testid="compose-btn-send"]'
                    invalid_number_selector = 'div:has-text("Phone number shared via url is invalid"), button:has-text("OK")'
                    
                    success = False
                    for _ in range(60): # 30 seconds timeout
                        # Check if send button is ready
                        send_btn = await self.page.query_selector(send_btn_selector)
                        if send_btn:
                            await send_btn.click()
                            # Wait 0.5 seconds to ensure browser sends websocket packet
                            await asyncio.sleep(0.5)
                            success = True
                            break
                            
                        # Check if invalid number dialog appeared
                        invalid_dialog = await self.page.query_selector(invalid_number_selector)
                        if invalid_dialog:
                            print(f"WhatsApp number {clean_phone} is invalid.")
                            break
                            
                        await asyncio.sleep(0.5)
                    
                    if success:
                        self._cached_auth_status = True
                        self._last_auth_check_time = time.time()
                        return True
                    else:
                        return False
                        
                except Exception as e:
                    print(f"Error in playwright send flow (attempt {attempt + 1}): {e}")
                    await self.stop()
                    if attempt == 1:
                        return False
            return False

    async def stop(self):
        try:
            if self.browser_context:
                await self.browser_context.close()
        except Exception:
            pass
        try:
            if self.playwright:
                await self.playwright.stop()
        except Exception:
            pass
        self.started = False
        self.playwright = None
        self.browser_context = None
        self.page = None