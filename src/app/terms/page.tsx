import React from "react";
import Link from "next/link";
import BrandLogo from "@/components/ui/BrandLogo";

export const metadata = {
  title: "Điều khoản sử dụng dịch vụ | Quizorra",
  description: "Thỏa thuận người dùng, quy chuẩn hành vi, bảo hộ quyền sở hữu trí tuệ và cam kết sử dụng dịch vụ trên nền tảng Quizorra.",
};

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-[#070913] text-slate-300 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
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
            <Link href="/privacy" className="text-slate-400 hover:text-white transition-colors">
              Chính Sách Bảo Mật
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
      <section className="border-b border-slate-800/60 bg-gradient-to-b from-[#131128] to-[#070913] py-12 px-4 sm:px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <span className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-400/30 text-indigo-300 text-xs font-bold tracking-wider uppercase mb-3">
            Thỏa thuận sử dụng
          </span>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight mb-4">
            Điều khoản sử dụng dịch vụ
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-2xl mx-auto">
            Văn bản này quy định các quyền, nghĩa vụ và trách nhiệm pháp lý ràng buộc giữa người dùng và Nền tảng Đấu trường Trí tuệ Quizorra khi truy cập và khai thác các dịch vụ trắc nghiệm tương tác trực tuyến.
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
          {/* Điều 1 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                01
              </span>
              Định nghĩa thuật ngữ &amp; hiệu lực chấp thuận
            </h2>
            <p>
              Bằng việc đăng ký tài khoản, đăng nhập qua bên thứ ba (Google/Facebook) hoặc tham gia phòng thi thông qua mã số PIN, bạn xác nhận rằng bạn đã đủ năng lực hành vi dân sự theo quy định pháp luật và đồng ý chịu sự ràng buộc vô điều kiện bởi các điều khoản trong văn bản này.
            </p>
            <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60 text-xs sm:text-sm space-y-2 text-slate-400">
              <p>• <strong>"Quizorra" (hoặc "Nền tảng"):</strong> Bao gồm toàn bộ hệ sinh thái mã nguồn, trang web, ứng dụng máy tính và dịch vụ kết nối socket thời gian thực do nhóm phát triển vận hành.</p>
              <p>• <strong>"Người quản trị" (Host / Admin):</strong> Người dùng đã tạo tài khoản để thiết lập ngân hàng đề thi, mở phòng và điều hành các kỳ thi trí tuệ.</p>
              <p>• <strong>"Thí sinh" (Player):</strong> Cá nhân tham gia phòng thi để tương tác, trả lời câu hỏi và hiển thị điểm số.</p>
            </div>
          </section>

          {/* Điều 2 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                02
              </span>
              Tạo lập tài khoản &amp; nghĩa vụ bảo mật
            </h2>
            <p>
              Khi đăng ký tài khoản quản trị trên Quizorra, bạn cam kết cung cấp thông tin chính xác, trung thực và thuộc quyền sử dụng hợp pháp của mình.
            </p>
            <ul className="list-disc pl-5 space-y-2 text-slate-400 text-xs sm:text-sm">
              <li>Bạn có trách nhiệm bảo mật tuyệt đối thông tin đăng nhập và mật khẩu cá nhân. Mọi hành vi thực hiện dưới tài khoản của bạn được coi là do bạn thực hiện.</li>
              <li>Bạn phải thông báo ngay cho ban quản trị Quizorra khi phát hiện bất kỳ dấu hiệu truy cập trái phép hoặc lỗ hổng bảo mật nào liên quan đến tài khoản của mình.</li>
              <li>Nghiêm cấm hành vi chuyển nhượng, cho thuê hoặc chia sẻ tài khoản quản trị cho các bên thứ ba sử dụng trái phép vì mục đích vụ lợi.</li>
            </ul>
          </section>

          {/* Điều 3 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                03
              </span>
              Quy chuẩn hành vi người dùng &amp; chống gian lận
            </h2>
            <div className="p-4 rounded-xl bg-rose-950/20 border border-rose-500/30 text-rose-200 text-xs sm:text-sm">
              Quizorra xây dựng môi trường thi đấu trí tuệ công bằng và văn minh. Chúng tôi kiên quyết xử lý và ngăn chặn mọi hành vi vi phạm chuẩn mực đạo đức hoặc kỹ thuật.
            </div>
            <p className="text-xs sm:text-sm text-slate-400">
              Người dùng cam kết tuyệt đối <strong>KHÔNG</strong> thực hiện các hành vi sau:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs sm:text-sm">
              <li>Sử dụng các công cụ can thiệp kỹ thuật tự động (như script, bot, macro hoặc phần mềm gian lận) nhằm giả mạo câu trả lời hoặc can thiệp tốc độ phản hồi.</li>
              <li>Thực hiện các cuộc tấn công từ chối dịch vụ (DoS/DDoS), quét cổng, khai thác lỗ hổng hoặc cố tình làm quá tải hạ tầng máy chủ WebSocket.</li>
              <li>Khởi tạo hoặc tải lên các câu hỏi chứa nội dung vi phạm pháp luật Việt Nam, kích động bạo lực, xúc phạm danh dự cá nhân, nội dung đồi trụy hoặc phân biệt đối xử.</li>
              <li>Giả mạo ban tổ chức hoặc người chơi khác để gây hiểu lầm hoặc trục lợi bất chính.</li>
            </ul>
          </section>

          {/* Điều 4 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                04
              </span>
              Quyền sở hữu trí tuệ
            </h2>
            <div className="space-y-3 text-xs sm:text-sm text-slate-400">
              <p>
                <strong className="text-slate-200">1. Tài sản thuộc quyền sở hữu của Quizorra:</strong> Toàn bộ giao diện đồ họa, biểu tượng, logo thương hiệu, thiết kế 3D, âm thanh trường quay và kiến trúc mã nguồn đều thuộc quyền sở hữu trí tuệ độc quyền của ban phát triển Quizorra. Mọi hành vi sao chép, dịch ngược mã nguồn (reverse engineering) hoặc sao chép thương hiệu mà không có sự cho phép bằng văn bản đều là vi phạm pháp luật.
              </p>
              <p>
                <strong className="text-slate-200">2. Quyền sở hữu đối với nội dung câu hỏi:</strong> Bạn giữ toàn bộ quyền sở hữu trí tuệ đối với các câu hỏi, ngân hàng đề và tư liệu do chính bạn soạn thảo và đưa lên nền tảng. Bằng việc nhập liệu, bạn cấp cho Quizorra quyền sử dụng kỹ thuật có giới hạn để hiển thị, đồng bộ và trình chiếu các nội dung này trong khuôn khổ các phòng thi do bạn tổ chức.
              </p>
            </div>
          </section>

          {/* Điều 5 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                05
              </span>
              Tình trạng khả dụng &amp; giới hạn trách nhiệm dịch vụ
            </h2>
            <p>
              Quizorra nỗ lực tối đa để duy trì hạ tầng vận hành ổn định 24/7 với độ trễ thấp nhất. Tuy nhiên, dịch vụ được cung cấp trên cơ sở nguyên trạng ("as is") và "như hiện có" ("as available").
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-slate-400 text-xs sm:text-sm">
              <li>Chúng tôi không chịu trách nhiệm đối với các sự cố gián đoạn phát sinh từ lỗi đường truyền Internet của thí sinh, sự cố mạng viễn thông cục bộ hoặc thiên tai bất khả kháng.</li>
              <li>Hệ thống có thể thực hiện bảo trì định kỳ có báo trước để nâng cấp tính năng và củng cố bảo mật máy chủ.</li>
              <li>Quizorra không chịu trách nhiệm đối với các tổn thất gián tiếp hoặc tổn thất phi vật chất phát sinh từ việc sử dụng hoặc không thể sử dụng nền tảng.</li>
            </ul>
          </section>

          {/* Điều 6 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                06
              </span>
              Đình chỉ, tạm khóa &amp; hủy quyền truy cập
            </h2>
            <p>
              Ban quản trị Quizorra có toàn quyền đình chỉ tạm thời hoặc chấm dứt vĩnh viễn quyền truy cập tài khoản của người dùng mà không cần bồi thường trong các trường hợp:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-slate-400 text-xs sm:text-sm">
              <li>Vi phạm bất kỳ điều khoản nào được quy định tại văn bản này.</li>
              <li>Cố ý phá hoại dữ liệu, gửi câu hỏi độc hại hoặc quấy rối phiên thi đấu của người khác.</li>
              <li>Theo yêu cầu bằng văn bản từ cơ quan chức năng hoặc tòa án có thẩm quyền.</li>
            </ul>
          </section>

          {/* Điều 7 */}
          <section className="bg-[#0e1222] border border-slate-800 p-6 sm:p-8 rounded-2xl space-y-4">
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                07
              </span>
              Luật áp dụng &amp; cơ chế giải quyết tranh chấp
            </h2>
            <p>
              Các điều khoản này được diễn giải và điều chỉnh hoàn toàn theo pháp luật nước Cộng hòa Xã hội Chủ nghĩa Việt Nam. Mọi tranh chấp phát sinh liên quan đến việc sử dụng dịch vụ trước hết sẽ được ưu tiên thương lượng hòa giải trên tinh thần tôn trọng và thiện chí giữa các bên.
            </p>
            <div className="p-4 rounded-xl bg-[#14192f] border border-slate-700/60 text-xs sm:text-sm text-slate-300 space-y-1">
              <p>• <strong>Kênh tiếp nhận khiếu nại:</strong> <span className="text-indigo-400 font-mono">legal@quizorra.com</span></p>
              <p>• <strong>Hỗ trợ kỹ thuật người dùng:</strong> <span className="text-indigo-400 font-mono">support@quizorra.com</span></p>
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
          <Link href="/terms" className="text-indigo-400 font-bold">Điều khoản dịch vụ</Link>
          <span>•</span>
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Chính sách bảo mật</Link>
        </div>
      </footer>
    </div>
  );
}
