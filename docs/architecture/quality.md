# Đợt hoàn thiện chất lượng · 08/10/2026

Phạm vi là tối ưu sản phẩm hiện có. Không thêm AI, marketplace, trọng tài dự phòng hoặc thay mô hình phí. Tiền và quyền thao tác vẫn được kiểm trong chương trình Solana.

## Ranh giới mã nguồn

| Lớp           | Trách nhiệm                                                | Nguồn chính                                                                          |
| ------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| Giao diện     | Nội dung, nút theo vai, thông báo, dialog và chi tiết      | `src/frontend/features/`, `components/`                                              |
| Controller    | Điều phối ký, tải lại deal và tạo bằng chứng tại máy       | `src/frontend/hooks/use-deal-controller.ts`                                          |
| Wallet        | Kết nối Phantom, operation hiện tại, khôi phục trong tab   | `src/frontend/wallet.tsx`                                                            |
| Operation     | Simulation, kiểm message/signature, broadcast và finality  | `src/escrow/operation.ts`, `recovery.ts`                                             |
| Client Solana | Địa chỉ, lượng nguyên, codec, truy vấn và instruction      | `src/escrow/addresses.ts`, `amounts.ts`, `codec.ts`, `queries.ts`, `instructions.ts` |
| Program       | State machine, quyền tiền, account constraints, settlement | `programs/pipicachu-escrow/src/`                                                     |
| Backend       | Proxy giới hạn, quota và readiness của dịch vụ             | `src/backend/`                                                                       |

`src/escrow/client.ts` giữ API qua re-export để script/harness không phải đổi import đồng loạt. IDL là nguồn discriminator, account order, signer và writable. Rust tách state, contexts, registry, settlement, math và error; handler vẫn ở entrypoint để dễ lần theo instruction. Không tách thành microservice hoặc thêm abstraction chỉ để giảm số dòng.

## Những thay đổi có thể kiểm chứng

- Đọc deal rồi batch trọng tài, tổ chức và Clock: hai RPC cho một snapshot đầy đủ, finalized. Coalesce chỉ trong lúc request đang chạy; không giữ cache cũ để mở thao tác tiền.
- Lịch sử đọc sau core state, tối đa một lần mỗi 30 giây nếu trạng thái/hash không đổi. Tab ẩn ngừng polling. Danh sách trọng tài batch tối đa 100 account mỗi request.
- Codec kiểm discriminator, kích thước, mint/authority, reserve, version, phí và UTF-8. Metadata thiếu không trở thành số 0 hoặc trạng thái có thể thao tác.
- Khi kiểm expiry thấy history finalized/failed, operation chốt đúng kết quả ngay. Recovery chỉ nhận metadata có chữ ký hợp lệ và còn hạn; loại trường riêng tư ngoài schema.
- Readiness kiểm account shape, owner, mint, decimals, treasury và manager; limiter phải chạy được chính Lua script. Simulate/send vẫn đóng an toàn khi Redis lỗi.
- CI pin Action SHA, kiểm checksum Agave, đối chiếu IDL sinh từ Rust, chặn lint warning và pattern secret. Ngoại lệ dependency gắn advisory cụ thể và hết hạn sau ngày 14/10.

[Benchmark đọc thật](../evidence/quality/snapshot-benchmark.json) dùng sáu cặp đo xen kẽ thứ tự: 4 request account riêng so với 2 request batch. Đây là workload snapshot đầy đủ; không khẳng định mọi màn hình cũ đều cần 4 request. Median 216,5 ms và 180 ms trong lần đo này; provider và đường truyền có thể thay đổi kết quả.

## Giữ tương thích

Account Deal vẫn 876 byte. Account order, discriminator, enum/error order và policy 0/1 giữ nguyên. Có kiểm tương thích điều khoản tiếng Việt 512 byte, SBF executable, alias treasury, capacity race và mở cọc đúng một lần. Source-derived IDL được so sánh cả types và PDA seeds; không chỉ kiểm tên instruction.

## CSP và giới hạn nghiệm thu

Mặc định nonce CSP vẫn report-only. `CSP_ENFORCE=1` là tùy chọn rollout sau khi owner kiểm Phantom thật; không bật sẵn khi chưa có bằng chứng extension. Hash bằng chứng không chứng minh chất lượng hàng. Cọc không phải bảo hiểm. Upgrade authority còn giữ trên Devnet.

[Trạng thái hiện tại](../evidence/quality/README.md) và [checklist thủ công](../deployment/OWNER_CHECKS.md) phân biệt code/test tự động với cấu hình dịch vụ, chữ ký owner, dữ liệu tester và kiểm thương mại.
