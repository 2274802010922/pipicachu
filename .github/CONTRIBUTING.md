# Đóng góp cho pipicachu

Đọc [phạm vi sản phẩm](../docs/product/README.md), [AGENTS](../AGENTS.md) và [trạng thái hiện tại](../docs/harness/context/CURRENT_STATE.md) trước khi sửa. MVP chỉ USDC Devnet, một trọng tài và luồng escrow; giữ thay đổi gọn, có lý do rõ.

1. Fork/branch riêng, cài Node.js 24 và `npm ci`.
2. Mô tả vấn đề, hành vi mong đợi và phạm vi ảnh hưởng trong issue/PR. Với lỗi tiền hoặc quyền ký, dùng [kênh bảo mật](SECURITY.md).
3. Chạy `npm run verify`. Sửa protocol/client instruction phải chạy executable program tests và ghi rõ fixture synthetic hay giao dịch Devnet thật.
4. Giữ VI/EN nhất quán, BigInt và quyền tiền trong Rust. Không thêm key, seed phrase, mật khẩu hoặc bằng chứng riêng tư vào Git/log.
5. Cập nhật tài liệu/bằng chứng liên quan. Commit mới viết bằng tiếng Việt; prefix Conventional Commits có thể giữ.

Code do bạn chủ động đóng góp sử dụng Apache-2.0 theo [LICENSE](../LICENSE). Giữ nguyên notice upstream của source/asset bên thứ ba; xem [THIRD_PARTY_NOTICES](../THIRD_PARTY_NOTICES.md). Không ghi “đã kiểm Phantom” nếu chỉ chạy injected provider.

PR nên cho reviewer biết: điều gì thay đổi, vì sao, kiểm bằng cách nào và giới hạn còn lại. Không dùng tài sản Mainnet để tái hiện lỗi.
