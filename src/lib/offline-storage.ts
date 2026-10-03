// Quizorra - Offline Storage & Sync Engine
// Manages local quiz banks, offline drafts, preset banks, and background sync.

export interface OfflineQuestion {
  id?: string;
  type: string;
  content: string;
  options?: { id: string; text: string; isCorrect: boolean }[];
  answer?: string;
  points: number;
  timeLimit: number;
  hint?: string;
}

export interface OfflineQuizBank {
  id: string;
  title: string;
  description?: string;
  createdAt: string;
  questions?: OfflineQuestion[];
  _count?: { questions: number };
  isLocalOnly?: boolean;
  needsSync?: boolean;
}

const LOCAL_BANKS_KEY = "timeout_quiz_offline_banks";
const SYNC_QUEUE_KEY = "timeout_quiz_sync_queue";

// Default Preset Quiz Bank (always available offline)
export const DEFAULT_OFFLINE_BANK: OfflineQuizBank = {
  id: "bank_offline_preset_default",
  title: "Bộ Đề Mẫu Đa Chế Độ (Offline Preset)",
  description: "25 câu hỏi tổng hợp kiến thức kinh tế & đại cương có sẵn chạy mượt mà ngay cả khi không có mạng",
  createdAt: new Date().toISOString(),
  isLocalOnly: true,
  _count: { questions: 25 },
  questions: [
    {
      id: "q_off_1",
      type: "MC_SINGLE",
      content: "Trong kinh tế học vi mô, quy luật cầu chỉ ra mối quan hệ giữa giá cả và lượng cầu là gì?",
      options: [
        { id: "A", text: "Mối quan hệ đồng biến (tỷ lệ thuận)", isCorrect: false },
        { id: "B", text: "Mối quan hệ nghịch biến (tỷ lệ nghịch)", isCorrect: true },
        { id: "C", text: "Không có mối quan hệ xác định", isCorrect: false },
        { id: "D", text: "Luôn luôn bằng 0", isCorrect: false },
      ],
      points: 10,
      timeLimit: 20,
      hint: "Khi giá tăng, người tiêu dùng có xu hướng mua ít đi",
    },
    {
      id: "q_off_2",
      type: "MC_SINGLE",
      content: "Chỉ số GDP là từ viết tắt của thuật ngữ kinh tế nào sau đây?",
      options: [
        { id: "A", text: "Gross Domestic Product (Tổng sản phẩm quốc nội)", isCorrect: true },
        { id: "B", text: "General Domestic Profit", isCorrect: false },
        { id: "C", text: "Global Development Plan", isCorrect: false },
        { id: "D", text: "Gross Delivery Price", isCorrect: false },
      ],
      points: 10,
      timeLimit: 20,
      hint: "Đo lường tổng giá trị thị trường của toàn bộ hàng hóa & dịch vụ cuối cùng trong nước",
    },
    {
      id: "q_off_3",
      type: "MC_SINGLE",
      content: "Lãi suất thực tế bằng lãi suất danh nghĩa trừ đi đại lượng nào?",
      options: [
        { id: "A", text: "Tỷ lệ thất nghiệp", isCorrect: false },
        { id: "B", text: "Tỷ lệ lạm phát", isCorrect: true },
        { id: "C", text: "Thuế giá trị gia tăng", isCorrect: false },
        { id: "D", text: "Tỷ giá hối đoái", isCorrect: false },
      ],
      points: 20,
      timeLimit: 25,
      hint: "Phương trình Fisher: r = i - π",
    },
    {
      id: "q_off_4",
      type: "MC_SINGLE",
      content: "Hình thức thị trường nào chỉ có một người bán duy nhất kiểm soát toàn bộ nguồn cung hàng hóa?",
      options: [
        { id: "A", text: "Cạnh tranh hoàn hảo", isCorrect: false },
        { id: "B", text: "Độc quyền bán (Monopoly)", isCorrect: true },
        { id: "C", text: "Độc quyền tập đoàn (Oligopoly)", isCorrect: false },
        { id: "D", text: "Cạnh tranh mang tính độc quyền", isCorrect: false },
      ],
      points: 20,
      timeLimit: 25,
    },
    {
      id: "q_off_5",
      type: "MC_SINGLE",
      content: "Chính sách tiền tệ mở rộng thường được Ngân hàng Trung ương thực hiện bằng cách nào?",
      options: [
        { id: "A", text: "Tăng lãi suất chiết khấu và tăng tỷ lệ dự trữ bắt buộc", isCorrect: false },
        { id: "B", text: "Mua tín phiếu kho bạc trên thị trường mở và hạ lãi suất", isCorrect: true },
        { id: "C", text: "Tăng thuế thu nhập doanh nghiệp", isCorrect: false },
        { id: "D", text: "Cắt giảm chi tiêu công của chính phủ", isCorrect: false },
      ],
      points: 30,
      timeLimit: 30,
    },
  ],
};

export const offlineStorage = {
  isBrowser(): boolean {
    return typeof window !== "undefined";
  },

  isOnline(): boolean {
    return typeof navigator !== "undefined" ? navigator.onLine : true;
  },

  getLocalBanks(): OfflineQuizBank[] {
    if (!this.isBrowser()) return [DEFAULT_OFFLINE_BANK];
    try {
      const data = localStorage.getItem(LOCAL_BANKS_KEY);
      if (!data) {
        this.saveLocalBank(DEFAULT_OFFLINE_BANK);
        return [DEFAULT_OFFLINE_BANK];
      }
      const list: OfflineQuizBank[] = JSON.parse(data);
      if (!list.some((b) => b.id === DEFAULT_OFFLINE_BANK.id)) {
        list.unshift(DEFAULT_OFFLINE_BANK);
      }
      return list;
    } catch {
      return [DEFAULT_OFFLINE_BANK];
    }
  },

  getLocalBankById(id: string): OfflineQuizBank | null {
    const list = this.getLocalBanks();
    return list.find((b) => b.id === id) || null;
  },

  saveLocalBank(bank: OfflineQuizBank): void {
    if (!this.isBrowser()) return;
    try {
      const list = this.getLocalBanks().filter((b) => b.id !== bank.id);
      const updated: OfflineQuizBank = {
        ...bank,
        _count: { questions: bank.questions?.length ?? bank._count?.questions ?? 0 },
        isLocalOnly: bank.isLocalOnly ?? true,
        needsSync: true,
      };
      list.unshift(updated);
      localStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
    } catch (e) {
      console.error("[offlineStorage] saveLocalBank failed:", e);
    }
  },

  deleteLocalBank(id: string): void {
    if (!this.isBrowser() || id === DEFAULT_OFFLINE_BANK.id) return;
    try {
      const list = this.getLocalBanks().filter((b) => b.id !== id);
      localStorage.setItem(LOCAL_BANKS_KEY, JSON.stringify(list));
    } catch {}
  },

  // Export a quiz bank to a JSON file for backup / offline sharing
  exportToJson(bank: OfflineQuizBank): void {
    if (!this.isBrowser()) return;
    const jsonStr = JSON.stringify(bank, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${bank.title.replace(/[^a-zA-Z0-9_\-\u00C0-\u024F\u1E00-\u1EFF]/g, "_")}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  },

  // Import a quiz bank from JSON
  async importFromJson(file: File): Promise<OfflineQuizBank> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const parsed = JSON.parse(e.target?.result as string);
          if (!parsed.title || !Array.isArray(parsed.questions)) {
            throw new Error("File JSON không hợp lệ: thiếu trường title hoặc danh sách questions");
          }
          const importedBank: OfflineQuizBank = {
            id: `bank_local_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
            title: parsed.title,
            description: parsed.description || "Nhập từ file JSON",
            createdAt: new Date().toISOString(),
            questions: parsed.questions,
            _count: { questions: parsed.questions.length },
            isLocalOnly: true,
            needsSync: true,
          };
          this.saveLocalBank(importedBank);
          resolve(importedBank);
        } catch (err: any) {
          reject(err);
        }
      };
      reader.onerror = () => reject(new Error("Không thể đọc file"));
      reader.readAsText(file);
    });
  },

  // Synchronize unsynced local banks to server when online
  async syncPendingWithServer(): Promise<{ synced: number; failed: number }> {
    if (!this.isOnline() || !this.isBrowser()) {
      return { synced: 0, failed: 0 };
    }

    const banks = this.getLocalBanks().filter((b) => b.needsSync && b.id !== DEFAULT_OFFLINE_BANK.id);
    let synced = 0;
    let failed = 0;

    for (const bank of banks) {
      try {
        const res = await fetch("/api/quiz-bank", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: bank.title,
            description: bank.description,
            isPublic: false,
          }),
        });

        if (res.ok) {
          const created = await res.json();
          // Upload questions
          if (bank.questions && bank.questions.length > 0) {
            for (const q of bank.questions) {
              await fetch(`/api/quiz-bank/${created.id}/questions`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(q),
              }).catch(() => {});
            }
          }
          // Mark as synced
          bank.needsSync = false;
          bank.isLocalOnly = false;
          this.saveLocalBank(bank);
          synced++;
        } else {
          failed++;
        }
      } catch {
        failed++;
      }
    }

    return { synced, failed };
  },
};

