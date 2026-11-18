import { useEffect, useState } from "react";

/** Số giây còn lại tới `deadline` (ms, theo Date.now()); null khi không đếm. Tự cập nhật mỗi 250 ms. */
export function useCountdown(deadline: number | null): number | null {
  const [now, setNow] = useState(() => Date.now());
  const [prevDeadline, setPrevDeadline] = useState(deadline);

  // Mốc mới: lấy lại giờ ngay trong lần vẽ này, không dùng giờ cũ (sẽ tính dư số giây ở lần vẽ đầu).
  if (prevDeadline !== deadline) {
    setPrevDeadline(deadline);
    setNow(Date.now());
  }

  useEffect(() => {
    if (deadline === null) return;
    const timer = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadline]);

  if (deadline === null) return null;
  const remaining = Math.ceil((deadline - now) / 1000);
  return remaining > 0 ? remaining : null;
}
