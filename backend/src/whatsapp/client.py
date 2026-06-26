import os
import asyncio
import urllib.parse
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

    async def start(self):
        async with self.start_lock:
            if self.started:
                return
            
            os.makedirs(SESSION_DIR, exist_ok=True)
            
            self.playwright = await async_playwright().start()
            # Launch persistent context with a global user agent to preserve login state and prevent headless detection
            self.browser_context = await self.playwright.chromium.launch_persistent_context(
                user_data_dir=SESSION_DIR,
                headless=True,
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu"
                ]
            )
            
            # Open WhatsApp Web in the background
            self.page = await self.browser_context.new_page()
            await self.page.goto("https://web.whatsapp.com/")
            self.started = True

    async def is_authenticated(self) -> bool:
        """Check if we are logged in or still on the QR Code screen."""
        try:
            await self.start()
            
            # Save a screenshot for debugging what uvicorn actually sees
            try:
                import os
                scratch_dir = r"C:\Users\ashir\.gemini\antigravity-ide\brain\d1cdc011-c584-4015-8ed8-12581286f463\scratch"
                os.makedirs(scratch_dir, exist_ok=True)
                await self.page.screenshot(path=os.path.join(scratch_dir, "whatsapp_current_uvicorn.png"))
                print(f"Saved uvicorn page screenshot to scratch folder.")
            except Exception as se:
                print(f"Failed to take uvicorn page screenshot: {se}")

            # Wait up to 30 seconds to see if the main chat pane loaded (headless loading can be slow)
            chat_pane_selector = "#pane-side, span[data-icon='chat']"
            qr_canvas_selector = "canvas"
            
            # Wait for either to resolve
            qr_seen_count = 0
            for _ in range(60):
                chats_found = len(await self.page.query_selector_all(chat_pane_selector)) > 0
                canvas_found = len(await self.page.query_selector_all(qr_canvas_selector)) > 0
                
                if chats_found:
                    print("Uvicorn authenticated check: Chat pane found!")
                    return True
                if canvas_found:
                    qr_seen_count += 1
                    # Only return False if we see the QR canvas consistently for 5 seconds (10 iterations)
                    if qr_seen_count >= 10:
                        print("Uvicorn authenticated check: Consistently found QR canvas. Returning False.")
                        return False
                else:
                    qr_seen_count = 0
                await asyncio.sleep(0.5)
                
            print("Uvicorn authenticated check: Timeout reached without finding chat pane or QR canvas.")
            return False
        except Exception as e:
            print(f"Error checking WhatsApp auth status: {e}")
            import traceback
            traceback.print_exc()
            return False

    async def get_qr_screenshot(self) -> bytes:
        """Capture and return the QR Code screenshot for the user to scan."""
        async with self.lock:
            await self.start()
            
            try:
                qr_selector = "canvas"
                # Check if QR code canvas is already present or wait for it briefly
                try:
                    await self.page.wait_for_selector(qr_selector, timeout=8000)
                except Exception:
                    # If it times out (e.g. page was stale or not loading), reload the page and wait
                    print("QR canvas not found, reloading WhatsApp Web...")
                    await self.page.reload()
                    await self.page.wait_for_selector(qr_selector, timeout=15000)
                
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
                        await self.page.wait_for_selector(qr_selector, timeout=15000)
                
                # Wait for data-ref container and canvas to fully render the QR code
                qr_container = await self.page.query_selector("div[data-ref]")
                if qr_container:
                    # Give it a brief moment to finish rendering the QR code on the canvas
                    await asyncio.sleep(1)
                    return await qr_container.screenshot()
                
                canvas = await self.page.query_selector(qr_selector)
                if canvas:
                    await asyncio.sleep(1)
                    return await canvas.screenshot()
            except Exception as e:
                print(f"Failed to capture QR code: {e}")
                
            return None

    async def send_message(self, phone: str, text: str) -> bool:
        """Send a message to a phone number using the active WhatsApp Web session."""
        async with self.lock:
            await self.start()
            
            # Format phone (keep digits only)
            clean_phone = "".join(filter(str.isdigit, phone))
            if not clean_phone:
                return False
                
            # URL encode text
            encoded_text = urllib.parse.quote(text)
            url = f"https://web.whatsapp.com/send?phone={clean_phone}&text={encoded_text}"
            
            # Open send flow in a new page/tab
            page = await self.browser_context.new_page()
            try:
                await page.goto(url)
                
                # Check for either the send button or invalid number alert
                # Invalid number modal button selector is usually button:has-text("OK") or div[role="button"]
                send_btn_selector = 'button[aria-label="Send"], [data-testid="send"], button:has(span[data-icon="send"]), span[data-icon="send"], button[data-testid="compose-btn-send"]'
                invalid_number_selector = 'div:has-text("Phone number shared via url is invalid"), button:has-text("OK")'
                
                # Wait for page load and elements
                success = False
                for _ in range(60): # 30 seconds timeout
                    # Check if send button is ready
                    send_btn = await page.query_selector(send_btn_selector)
                    if send_btn:
                        # Click the send button
                        await send_btn.click()
                        # Wait 5 seconds to ensure browser sends websocket packet
                        await asyncio.sleep(5)
                        success = True
                        break
                        
                    # Check if invalid number dialog appeared
                    invalid_dialog = await page.query_selector(invalid_number_selector)
                    if invalid_dialog:
                        print(f"WhatsApp number {clean_phone} is invalid.")
                        break
                        
                    await asyncio.sleep(0.5)
                
                if not success:
                    try:
                        await page.screenshot(path="/app/whatsapp_send_failed.png")
                        print("Saved screenshot of failed send to /app/whatsapp_send_failed.png")
                    except Exception as se:
                        print(f"Failed to capture send failure screenshot: {se}")

                await page.close()
                return success
            except Exception as e:
                print(f"Error in playwright send flow: {e}")
                try:
                    await page.close()
                except Exception:
                    pass
                return False

    async def stop(self):
        if self.playwright:
            try:
                await self.browser_context.close()
                await self.playwright.stop()
            except Exception:
                pass
            self.started = False
            self.playwright = None
            self.browser_context = None
            self.page = None
