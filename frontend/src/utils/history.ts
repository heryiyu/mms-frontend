// react-router 會在 history.state.idx 記錄站內導覽序號；> 0 表示有站內上一頁可回（直接開啟網址時為 0）
export const hasInAppHistory = () => ((window.history.state as { idx?: number } | null)?.idx ?? 0) > 0
