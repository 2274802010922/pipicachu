# Checklist kiểm thủ công sau bàn giao · v0.6

Code và kiểm tự động được hoàn tất trước; các bước dưới đây do owner thực hiện sau theo yêu cầu. Không cần thêm tính năng để làm checklist.

## 1. Sửa quyền Redis trước khi ký

**Đã hoàn tất ngày 08/10/2026:** `/api/ready` trả `ready:true`, `limiter:true`. Đã lưu đúng cặp Redis cho Vercel Production/Preview và GitHub keeper, redeploy, kiểm GET/SET/EVAL và unsigned simulation qua website. Hai lượt keeper manual chạy thành công, ghi report vào Redis; chưa có deal eligible để chứng minh payout. Xem [bằng chứng](../evidence/quality/redis-ready-2026-10-08.json).

Bạn có thể chuyển sang mục 2. Các bước dưới đây dùng khi thiết lập môi trường khác hoặc đổi token. Lỗi trước đó là token lưu trên Vercel không thực hiện được limiter, dù token được owner cung cấp trực tiếp đã qua GET/SET/EVAL. Không coi PING pass là đủ.

1. Đăng nhập [Upstash Console](https://console.upstash.com/) ở tab đã mở; chọn database đang dùng cho pipicachu.
2. Trong REST API credentials, dùng **Token** có quyền ghi, không dùng **Readonly Token**. Nếu là ACL token riêng, cần quyền EVAL/INCR/EXPIRE và GET/SET/DEL trong namespace pipicachu.
3. Vercel → pipicachu → Settings → Environment Variables: sửa `RATE_LIMIT_REDIS_TOKEN` thành token đúng; giữ REST URL của cùng database. Áp dụng Production và Preview; Secret. Không gửi token vào chat hoặc Git.
4. **Save xong tất cả biến trước, sau đó mới Redeploy Production.** Mở `/api/ready`: cần `ready:true` và `limiter:true`. Đây là probe chính script limiter, không chỉ PING.
5. Secret GitHub chỉ dành cho keeper; sửa ở GitHub không tự cập nhật Vercel. GitHub repo → Settings → Secrets and variables → Actions → New repository secret: thêm `RATE_LIMIT_REDIS_URL` và `RATE_LIMIT_REDIS_TOKEN` cùng database. Giữ `DEVNET_KEEPER_KEYPAIR` hiện có. Không thêm manager/treasury key lên server.

[Nguồn credentials của Upstash](https://upstash.com/docs/redis/features/restapi). Không gửi secret vào chat/Git; cấu hình bằng giao diện Secret hoặc CLI stdin. App dùng tên `RATE_LIMIT_REDIS_URL` và `RATE_LIMIT_REDIS_TOKEN`, tương ứng với REST URL/token từ Upstash.

## 2. Duyệt một application thử nghiệm

Sau khi gateway write đã hoạt động, vào [Manage](https://pipicachu.vercel.app/manage), kết nối ví manager `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`.

Ví cần duyệt để nghiệm thu: `2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8` (ví test riêng, không thay trọng tài chính).

Mở Policy và điền: cọc tối thiểu 1 USDC, deal tối đa 10 USDC, hạn nạp 300 giây, giao 60, kiểm tra 60, SLA 60. Bấm Duyệt cho đúng ví test, xem dialog và ký Phantom. Không bấm revoke hoặc update policy của ví chính `7Pp…K39CG`.

Manager phải ký thật; application pending không có quyền nhận deal. Agent không có key manager và không dùng initializer để duyệt tắt. [Application receipt](../evidence/v06/test-application.json). Sau approval, script `npx tsx scripts/devnet/accept-v06.ts` dùng các ví test riêng để kiểm six branches, bảo toàn tiền/cọc và pause test arbitrator. CLI không thay Phantom proof.

## 3. Keeper, browser và business

Sau khi secret đã có, agent kiểm keeper manual/schedule/report/restart và receipt riêng. Nếu Phantom yêu cầu xác nhận thao tác hoặc mở khóa, owner thực hiện; không gửi password/seed phrase. EN video chờ footage riêng. [Bộ dùng thử](../product/validation-kit.md) chờ owner mời tester; chưa có dữ liệu WTP hoặc doanh thu.

## 4. Checklist nghiệm thu ký và kết quả

- [ ] Kết nối đúng ví Phantom Devnet; từ chối một lượt ký: không tạo giao dịch và không báo hoàn tất.
- [ ] Tạo deal → buyer fund → seller deliver → buyer confirm. Principal 2 USDC: seller 1,96, trọng tài 0,02, hệ thống 0,02; phí SOL riêng.
- [ ] Mở tranh chấp trước review deadline; trọng tài chọn payout/refund. Refund phải trả đủ principal, không phí.
- [ ] Với policy 1, xử sau SLA vẫn dùng đúng trọng tài. Với policy 0, giữ cutoff cũ.
- [ ] Trong khi đang xác nhận, tải lại tab và đổi ví: không ký lại ngay hoặc tạo deal/nạp cọc lặp.
- [ ] Sau review deadline không dispute, keeper có receipt finalized; report có timestamp mới. Thử manual workflow theo đúng một deal đủ điều kiện.
- [ ] Mở Explorer, đối chiếu recipient/mint/amount và cọc unlocked; transaction failed không dùng làm receipt thành công.
- [ ] Test VI/EN trên máy có Phantom thật. CSP chỉ enforce sau khi kiểm luồng này; nếu không kiểm thì giữ report-only.

Lưu signature công khai, thời điểm, revision và kết quả pass/fail. Không gửi password, seed phrase, token Redis hoặc package bằng chứng riêng tư. Dữ liệu tester/khả năng trả phí là cổng business riêng.
