import puppeteer from "puppeteer";
import cron from "node-cron";
import axios from "axios";

// 환경 변수에서 날짜를 읽어오도록 설정
const CHECK_DATE = process.env.CHECK_DATE || "2025-09-28";
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
    await page.goto(TARGET_URL, { waitUntil: "domcontentloaded", timeout: 60000 });

    const isAvailable = await page.evaluate(() => {
      // 'btn_time' 클래스를 가진 모든 시간 버튼을 가져옵니다.
      const timeButtons = Array.from(document.querySelectorAll('button.btn_time'));

      // 아래 두 가지 조건을 '모두' 만족하는 버튼이 있는지 찾습니다.
      return timeButtons.some(btn => {
        // 조건 1: 버튼 텍스트에 '오전' 또는 '오후'가 포함되어 있는가?
        const hasTimeText = btn.textContent.includes('오전') || btn.textContent.includes('오후');
        
        // 조건 2: 버튼 클래스에 'unselectable'이 포함되어 있지 않은가?
        const isSelectable = !btn.classList.contains('unselectable');
        
        return hasTimeText && isSelectable; // 두 조건이 모두 참이어야 함
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