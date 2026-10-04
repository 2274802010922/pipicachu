<div align="center">

<img src="public/brand/picachu-logo.jpg" width="100" alt="Logo pipicachu" />

# pipicachu

**Hiểu giao dịch Solana bằng tiếng Việt.**

Dán link → đọc dữ kiện → đối chiếu khoản nhận.

[English](README.en.md) · [Demo](docs/demo/README.md) · [Kiến trúc](docs/architecture/README.md) · [Triển khai](docs/deployment/README.md)

![Quality](https://github.com/2274802010922/pipicachu/actions/workflows/quality.yml/badge.svg)
![License](https://img.shields.io/badge/code-MIT-blue)
![Solana](https://img.shields.io/badge/Solana-Mainnet%20read%20%2B%20Devnet%20demo-9945FF)

</div>

## Dành cho ai?

Người Việt mới dùng ví Solana và được gửi một link giao dịch nhưng chưa biết tiền đi đâu, token nào đã nhận, hay giao dịch đã hoàn tất chưa. Tool giải thích bằng VI/EN, kèm dữ kiện và link để kiểm tra lại.

## Hai việc chính

- **Hiểu giao dịch:** trạng thái, chuyển SOL/USDC, thay đổi tài sản, phí mạng và hoạt động Jupiter có nguồn; thao tác chưa giải mã được ghi rõ.
- **Đối chiếu khoản nhận:** kiểm mạng, ví nhận, token theo mint, số tiền và finality. Số liệu do code xử lý bằng số nguyên; AI chỉ chú giải.

Tra cứu không cần kết nối ví hoặc đăng nhập. Không lưu lịch sử người dùng. Phòng demo riêng dùng Phantom ký chuyển 0,001 SOL Devnet; Mainnet chỉ đọc.

## Chạy local

```bash
npm ci
npm run dev -- --port 3104
```

Mở `http://localhost:3104`. Cấu hình theo [.env.example](.env.example). Local dùng limiter bộ nhớ; production cần Redis. Không chép `.env` hoặc key từ dự án khác.

```bash
npm run check
npm run verify
npm run check:live
npm run demo:fixtures
```

Fixture script tạo ví Devnet mới trong `work/private` bị ignore. Script báo địa chỉ công khai nếu faucet không cấp được SOL. Không gửi key vào chat hoặc Git.

## Cấu trúc

| Thư mục                   | Nội dung                                                  |
| ------------------------- | --------------------------------------------------------- |
| `src/core`                | Chuẩn hóa dữ kiện, số nguyên, đối chiếu                   |
| `src/solana`              | RPC, kiểm mạng, xây giao dịch demo                        |
| `src/backend`             | AI, cache, giới hạn và điều phối                          |
| `src/frontend`, `src/app` | UI VI/EN, route và API                                    |
| `tests`                   | Unit, integration, browser và fixture có nhãn             |
| `docs`                    | Sản phẩm, kiến trúc, thiết kế, demo, bằng chứng, bàn giao |
| `scripts`                 | Kiểm tra, Devnet, slide và video                          |

## Giới hạn cần hiểu

Kết quả khớp chỉ nói giao dịch khớp thông tin đã nhập. Không xác minh danh tính, hóa đơn, ghi có của sàn, nguồn tiền hợp pháp hay việc link đã được dùng lại. Giao dịch partial/unknown/failed không được báo thanh toán thành công. Jupiter intent được suy luận có nhãn, không gọi toàn bộ số dư SOL giảm là số tiền swap.

## Bằng chứng và trạng thái

[Trạng thái hiện tại](docs/harness/context/CURRENT_STATE.md) · [Kiểm thử](docs/testing/README.md) · [Bằng chứng](docs/evidence/README.md) · [Hồ sơ giám khảo](docs/judging/README.md)

Test kỹ thuật và fixture không phải số liệu khách hàng, độ chính xác trên mọi giao dịch hay traction. Phần chưa nghiệm thu live được ghi rõ trong trạng thái.

## License và nguồn

Mã mới: [MIT](LICENSE). [Nguồn kế thừa](THIRD_PARTY_NOTICES.md). Logo do owner cung cấp, không nằm trong MIT của mã nguồn. Không sao chép nghiệp vụ vay, key, deployment hoặc media của Picachu.
