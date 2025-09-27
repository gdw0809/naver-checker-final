import puppeteer from "puppeteer";
import cron from "node-cron";
import axios from "axios";

// 환경 변수에서 날짜를 읽어오도록 설정
const CHECK_DATE = process.env.CHECK_DATE || "2025-09-28";
const TARGET_URL = `https://m.booking.naver.com/booking/12/bizes/843881/items/6627331?area=pll&entry=pll&isProgramBizItem=false&lang=ko&startDateTime=${CHECK_DATE}T00%3A00%A00%2B09%3A00&theme=place`;
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

    // =================================================================
    //                    [수정된 핵심 부분]
    // 'unselectable' 클래스가 없는 버튼을 활성화된 버튼으로 간주합니다.
    // =================================================================
    const isAvailable = await page.evaluate(() => {
      // 1. 'btn_time' 클래스를 가진 모든 시간 버튼을 가져옵니다.
      const timeButtons = Array.from(document.querySelectorAll('button.btn_time'));

      // 2. 이 중에서 'unselectable' 클래스가 없는 버튼이 있는지 찾습니다.
      return timeButtons.some(btn => !btn.classList.contains('unselectable'));
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