# Các bước owner còn cần làm cho v0.6

## 1. Sửa quyền Redis trước khi ký

Production đang báo `limiterError: permissions`: đọc được nhưng lệnh EVAL của limiter bị từ chối. Không coi PING pass là đủ. Website chặn simulate/send an toàn.

1. Đăng nhập [Upstash Console](https://console.upstash.com/) ở tab đã mở; chọn database đang dùng cho pipicachu.
2. Trong REST API credentials, dùng **Token** có quyền ghi, không dùng **Readonly Token**. Nếu là ACL token riêng, cần quyền EVAL/INCR/EXPIRE và GET/SET/DEL trong namespace pipicachu.
3. Vercel → pipicachu → Settings → Environment Variables: sửa `RATE_LIMIT_REDIS_TOKEN` thành token đúng; giữ REST URL của cùng database. Áp dụng Production và Preview; Secret. Không gửi token vào chat hoặc Git.
4. Redeploy. Mở `/api/ready`: cần `ready:true` và `limiter:true`. Đây là probe chính script limiter, không chỉ PING.
5. GitHub repo → Settings → Secrets and variables → Actions → New repository secret: thêm `RATE_LIMIT_REDIS_URL` và `RATE_LIMIT_REDIS_TOKEN` cùng database. Giữ `DEVNET_KEEPER_KEYPAIR` hiện có. Không thêm manager/treasury key lên server.

[Nguồn credentials của Upstash](https://upstash.com/docs/redis/features/restapi). Báo lại “đã đăng nhập” nếu muốn agent làm tiếp cấu hình từ console, hoặc “đã thay token/redeploy” nếu tự làm. Không cần gửi secret.

## 2. Duyệt một application thử nghiệm

Sau khi gateway write đã hoạt động, vào [Manage](https://pipicachu.vercel.app/manage), kết nối ví manager `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`.

Ví cần duyệt để nghiệm thu: `2dakRFzAYG6qrWenyNUt5uCAGLhDYJMUhLBfXJn5XeC8` (ví test riêng, không thay trọng tài chính).

Mở Policy và điền: cọc tối thiểu1 USDC, deal tối đa10 USDC, hạn nạp300 giây, giao60, kiểm tra60, SLA60. Bấm Duyệt cho đúng ví test, xem dialog và ký Phantom. Không bấm revoke hoặc update policy của ví chính `7Pp…K39CG`.

Manager phải ký thật; application pending không có quyền nhận deal. Agent không có key manager và không dùng initializer để duyệt tắt. [Application receipt](../evidence/v06/test-application.json). Sau approval, script `npx tsx scripts/devnet/accept-v06.ts` dùng các ví test riêng để kiểm six branches, bảo toàn tiền/cọc và pause test arbitrator. CLI không thay Phantom proof.

## 3. Keeper, browser và business

Sau khi secret đã có, agent kiểm keeper manual/schedule/report/restart và receipt riêng. Nếu Phantom yêu cầu xác nhận thao tác hoặc mở khóa, owner thực hiện; không gửi password/seed phrase. EN video chờ footage riêng. [Bộ dùng thử](../product/validation-kit.md) chờ owner mời tester; chưa có dữ liệu WTP hoặc doanh thu.
