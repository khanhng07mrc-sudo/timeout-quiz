import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

export const metadata = {
  title: "Chính Sách Bảo Mật Quyền Riêng Tư | Quizorra",
  description: "Quy định toàn diện về bảo vệ dữ liệu cá nhân, quyền riêng tư và cam kết bảo mật của nền tảng Quizorra theo Nghị định 13/2023/NĐ-CP và tiêu chuẩn quốc tế.",
};

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-300 font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Header Navigation */}
      <header className="border-b border-slate-800/80 bg-[#0b0e1b]/80 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/" className="hover:opacity-90 transition-opacity flex items-center gap-3">
            <BrandLogo variant="compact" size="sm" />
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 border-l border-slate-700 pl-3 hidden sm:inline-block">
              Trung Tâm Pháp Lý
            </span>
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/terms" className="text-slate-400 hover:text-white transition-colors">
              Điều Khoản Dịch Vụ
            </Link>
            <Link
              href="/"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 transition"
            >
              Về Trang Chủ
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-[#101426] to-[#070913] py-12 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-300 text-xs font-bold tracking-wider uppercase mb-3">
            Bảo Vệ Dữ Liệu Cá Nhân
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Chính Sách Bảo Mật Quyền Riêng Tư
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Văn bản này công bố chi tiết cách thức Quizorra thu thập, lưu trữ, sử dụng và bảo vệ dữ liệu cá nhân của người dùng, tuân thủ các nguyên tắc minh bạch, bảo mật và quyền kiểm soát tối cao của chủ thể dữ liệu.
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-xs text-slate-500 font-medium">
            <span>Phiên bản: 2.4</span>
            <span>•</span>
            <span>Hiệu lực: Tháng 10/2026</span>
            <span>•</span>
            <span>Phạm vi: Toàn hệ thống</span>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-12">
        <div className="space-y-10 text-sm sm:text-base leading-relaxed text-slate-300">
          {/* Chương 1 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                01
              </span>
              Nguyên Tắc Chung &amp; Đối Tượng Áp Dụng
            </h2>
            <p>
              Chính sách bảo mật này áp dụng cho toàn bộ người dùng tương tác với nền tảng Quizorra (bao gồm phiên bản Web trực tuyến, ứng dụng máy tính và các API kết nối). Chúng tôi cam kết tuân thủ các quy định hiện hành về bảo vệ dữ liệu cá nhân theo pháp luật Việt Nam (Nghị định số 13/2023/NĐ-CP) và các thông lệ bảo mật dữ liệu quốc tế (như Quy định chung về bảo vệ dữ liệu - GDPR).
            </p>
            <p>
              Bằng việc truy cập, tạo tài khoản quản trị hoặc tham gia vào các phòng thi trực tiếp, bạn xác nhận đã đọc, hiểu và đồng ý với các nguyên tắc xử lý dữ liệu được quy định tại văn bản này.
            </p>
          </section>

          {/* Chương 2 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                02
              </span>
              Danh Mục Dữ Liệu Thu Thập
            </h2>
            <p>
              Quizorra chỉ thu thập lượng dữ liệu tối thiểu cần thiết để phục vụ công tác tổ chức, quản lý câu hỏi và vận hành các phiên thi đấu trực tiếp:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60">
                <h3 className="font-bold text-cyan-300 text-sm mb-1.5">1. Thông tin Đăng ký &amp; Tài khoản</h3>
                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                  <li>Họ và tên hiển thị do người dùng chỉ định.</li>
                  <li>Địa chỉ thư điện tử (Email) dùng để đăng nhập và khôi phục tài khoản.</li>
                  <li>Mật khẩu đã được mã hóa một chiều qua thuật toán bcrypt (hệ thống không thể đọc được mật khẩu gốc).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60">
                <h3 className="font-bold text-cyan-300 text-sm mb-1.5">2. Dữ liệu qua Google / Facebook OAuth</h3>
                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                  <li>Mã định danh duy nhất của bên thứ ba (Google ID / Facebook ID).</li>
                  <li>Tên hồ sơ công khai và địa chỉ email đã được xác thực từ Google/Meta.</li>
                  <li>Đường dẫn ảnh đại diện công khai (Avatar URL).</li>
                  <li>Hệ thống <strong>tuyệt đối không</strong> truy cập danh bạ, tin nhắn hay tài liệu cá nhân của bạn.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60">
                <h3 className="font-bold text-cyan-300 text-sm mb-1.5">3. Dữ liệu Ngân hàng Đề &amp; Nội dung</h3>
                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                  <li>Danh sách câu hỏi, phương án trả lời, đáp án chính xác và hình ảnh/âm thanh đính kèm do bạn chủ động tạo lập.</li>
                  <li>Cấu hình thiết lập phòng thi (thời gian làm bài, điểm số, chế độ phân nhóm).</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60">
                <h3 className="font-bold text-cyan-300 text-sm mb-1.5">4. Dữ liệu Phiên thi Đấu Thời Gian Thực</h3>
                <ul className="text-xs text-slate-400 space-y-1 list-disc pl-4">
                  <li>Tên thí sinh tham gia theo từng phòng thi.</li>
                  <li>Phương án đã chọn, mốc thời gian phản hồi (timestamp) và số điểm tích lũy.</li>
                  <li>Nhật ký kỹ thuật của socket kết nối nhằm bảo đảm sự công bằng giữa các người chơi.</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Chương 3 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                03
              </span>
              Mục Đích &amp; Cơ Sở Sử Dụng Dữ Liệu
            </h2>
            <p>Dữ liệu thu thập được sử dụng riêng biệt cho các mục đích sau:</p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400">
              <li>
                <strong className="text-slate-200">Xác thực và duy trì phiên làm việc:</strong> Nhận diện danh tính người quản trị, duy trì trạng thái đăng nhập an toàn giữa các thiết bị.
              </li>
              <li>
                <strong className="text-slate-200">Vận hành đồng bộ thời gian thực:</strong> Truyền tải câu hỏi, ghi nhận câu trả lời và tính toán bảng xếp hạng trực tiếp trên màn hình chiếu hội trường và thiết bị thí sinh.
              </li>
              <li>
                <strong className="text-slate-200">Lưu trữ và đồng bộ hóa:</strong> Bảo toàn ngân hàng câu hỏi của cá nhân, cho phép tái sử dụng trong các đợt thi đấu tiếp theo.
              </li>
              <li>
                <strong className="text-slate-200">Phát hiện gian lận và tối ưu kỹ thuật:</strong> Ngăn chặn việc gửi yêu cầu giả mạo, can thiệp kết quả hoặc làm nghẽn đường truyền máy chủ.
              </li>
            </ul>
          </section>

          {/* Chương 4 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                04
              </span>
              Cam Kết Không Thương Mại Hóa &amp; Không Chia Sẻ Dữ Liệu
            </h2>
            <div className="p-4 rounded-xl bg-cyan-950/20 border border-cyan-500/30 text-cyan-200 text-xs sm:text-sm">
              Quizorra cam kết nguyên tắc đạo đức công nghệ: <strong>Chúng tôi KHÔNG BAO GIỜ bán, cho thuê, thương mại hóa hoặc trao đổi dữ liệu cá nhân hay nội dung câu hỏi của bạn cho bất kỳ đơn vị quảng cáo hoặc bên thứ ba nào vì mục đích tiếp thị.</strong>
            </div>
            <p className="text-xs text-slate-400">
              Dữ liệu chỉ được chia sẻ trong trường hợp duy nhất là phục vụ hạ tầng đám mây tin cậy (như dịch vụ cơ sở dữ liệu PostgreSQL có chứng chỉ bảo mật quốc tế SOC 2/ISO 27001) hoặc khi có yêu cầu bắt buộc bằng văn bản từ cơ quan pháp luật có thẩm quyền theo quy định pháp lý hiện hành.
            </p>
          </section>

          {/* Chương 5 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                05
              </span>
              Tiêu Chuẩn Bảo Mật Kỹ Thuật
            </h2>
            <p>Hệ thống Quizorra áp dụng các tiêu chuẩn an toàn thông tin chuyên sâu:</p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs sm:text-sm">
              <li>Mã hóa truyền tải toàn diện qua giao thức TLS/SSL (HTTPS và WSS an toàn).</li>
              <li>Mật khẩu lưu trữ được băm (hash) nhiều lớp bằng thuật toán Bcrypt với Salt phức tạp.</li>
              <li>Phiên làm việc được ký điện tử bằng chữ ký số HMAC-SHA256, vô hiệu hóa nguy cơ giả mạo token.</li>
              <li>Hệ thống Cookie với thuộc tính <code className="text-cyan-300">HttpOnly</code>, <code className="text-cyan-300">SameSite=Lax</code> bảo vệ triệt để khỏi tấn công XSS và CSRF.</li>
            </ul>
          </section>

          {/* Chương 6 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                06
              </span>
              Quyền Hạn Toàn Diện Của Chủ Thể Dữ Liệu
            </h2>
            <p>Theo quy định của pháp luật và cam kết của Quizorra, bạn sở hữu toàn bộ các quyền sau:</p>
            <div className="space-y-2 text-xs sm:text-sm text-slate-400">
              <p><strong className="text-slate-200">1. Quyền xem &amp; trích xuất:</strong> Bạn có quyền truy cập toàn bộ ngân hàng câu hỏi, phòng thi và dữ liệu hồ sơ cá nhân trong khu vực Quản trị.</p>
              <p><strong className="text-slate-200">2. Quyền chỉnh sửa:</strong> Bạn có thể cập nhật tên hiển thị, mật khẩu và nội dung câu hỏi bất cứ lúc nào.</p>
              <p><strong className="text-slate-200">3. Quyền xóa dữ liệu (Right to Erasure):</strong> Bạn có quyền xóa từng câu hỏi, xóa phòng thi hoặc yêu cầu xóa vĩnh viễn toàn bộ tài khoản cùng mọi dữ liệu liên quan khỏi cơ sở dữ liệu hệ thống.</p>
              <p><strong className="text-slate-200">4. Quyền rút lại sự đồng ý:</strong> Bạn có quyền hủy liên kết đăng nhập tài khoản Google OAuth bất kỳ lúc nào từ trung tâm quản lý bảo mật của Google.</p>
            </div>
          </section>

          {/* Chương 7 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                07
              </span>
              Lưu Trữ &amp; Thời Hạn Dữ Liệu
            </h2>
            <p>
              Dữ liệu của bạn được lưu trữ an toàn trong suốt thời gian tài khoản hoạt động. Khi một phòng thi kết thúc, dữ liệu điểm số chi tiết của lượt đấu sẽ được chuyển sang trạng thái lưu trữ tĩnh để làm báo cáo cho người tổ chức. Nếu một tài khoản không phát sinh hoạt động trong vòng 24 tháng liên tục, hệ thống có thể gửi thông báo xác nhận trước khi đưa dữ liệu vào diện lưu trữ đóng băng.
            </p>
          </section>

          {/* Chương 8 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 text-xs font-black flex items-center justify-center shrink-0">
                08
              </span>
              Đầu Mối Liên Hệ &amp; Tiếp Nhận Yêu Cầu
            </h2>
            <p>
              Mọi câu hỏi, phản ánh về việc bảo vệ quyền riêng tư hoặc yêu cầu xử lý dữ liệu cá nhân, xin vui lòng gửi về bộ phận phụ trách bảo mật thông tin của Quizorra:
            </p>
            <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60 text-xs sm:text-sm text-slate-300 space-y-1">
              <p>• <strong>Đơn vị vận hành:</strong> Ban Điều Hành Nền Tảng Đấu Trường Trí Tuệ Quizorra</p>
              <p>• <strong>Hộp thư hỗ trợ bảo mật:</strong> <span className="text-cyan-400 font-mono">privacy@quizorra.com</span></p>
              <p>• <strong>Hộp thư điều phối kỹ thuật:</strong> <span className="text-cyan-400 font-mono">support@quizorra.com</span></p>
              <p>• <strong>Thời gian phản hồi:</strong> Tối đa 48 giờ làm việc kể từ thời điểm tiếp nhận văn bản yêu cầu.</p>
            </div>
          </section>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-[#070913] py-8 text-center text-xs text-slate-500">
        <p>© 2026 Quizorra Intellectual Arena. Toàn bộ quyền được bảo lưu.</p>
        <div className="mt-2 flex items-center justify-center gap-4 text-xs font-medium">
          <Link href="/" className="hover:text-slate-400 transition-colors">Trang chủ</Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">Điều khoản dịch vụ</Link>
          <span>•</span>
          <Link href="/privacy" className="text-cyan-400 font-bold">Chính sách bảo mật</Link>
        </div>
      </footer>
    </div>
  );
}
