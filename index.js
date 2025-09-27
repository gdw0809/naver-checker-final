import puppeteer from "puppeteer";
import cron from "node-cron";
import axios from "axios";

const CHECK_DATE = process.env.CHECK_DATE || "2025-10-31";
const TARGET_URL = `https://m.booking.naver.com/booking/12/bizes/843881/items/6627331?area=pll&entry=pll&isProgramBizItem=false&lang=ko&startDateTime=${CHECK_DATE}T00%3A00%3A00%2B09%3A00&theme=place`;
const NTFY_TOPIC = "my-naver-alert-a1b2c3d4";
const CHECK_INTERVAL = "* * * * *";

async function checkReservation() {
  console.log(`[${new Date().toLocaleString()}] ${CHECK_DATE} 날짜 확인 시작...`);
  let browser = null;
  try {
    browser = await puppeteer.launch({
      headless: "new",
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });
    const page = await browser.newPage();
    await page.goto(TARGET_URL, { waitUntil: "networkidle2" });
    const isAvailable = await page.evaluate(() => {
      const allButtons = Array.from(document.querySelectorAll('button'));
      return allButtons.some(btn => {
        const hasTimeText = btn.textContent.includes('오전') || btn.textContent.includes('오후');
        const isEnabled = btn.getAttribute('aria-disabled') === 'false';
        return hasTimeText && isEnabled;
      });
    });
    if (isAvailable) {
      console.log("🎉 빈자리 발견! 푸시 알림을 보냅니다.");
      await sendNotification(`🚨 [${CHECK_DATE}] 네이버 예약에 빈자리가 생겼습니다!`);
    } else {
      console.log("😴 빈자리 없음. 다음 확인까지 대기합니다.");
    }
  } catch (error) {
    console.error("페이지 확인 중 오류 발생:", error.message);
  } finally {
    if (browser) await browser.close();
  }
}

async function sendNotification(message) {
  try {
    await axios.post(`https://ntfy.sh/${NTFY_TOPIC}`, message, {
      headers: { 'Title': 'Naver Reservation Alert', 'Priority': 'high', 'Tags': 'tada' },
    });
  } catch (err) {
    console.error("알림 전송 실패:", err.message);
  }
}

console.log("✅ 네이버 예약 빈자리 알림 서비스를 시작합니다.");
console.log(`⏰ 확인 주기: ${CHECK_INTERVAL}`);
checkReservation();
cron.schedule(CHECK_INTERVAL, checkReservation);