# Kiến trúc escrow v0.3

```text
Browser + Phantom → Devnet RPC proxy → Anchor program
                                    ├─ Config immutable mint
                                    ├─ Arbitrator + BondVault
                                    └─ Deal + DealVault
```

Config chỉ initializer pin trong chương trình tạo một lần; không instruction sửa mint hoặc admin rút principal. Upgrade authority còn có thể thay code để sửa demo: không gọi hoàn toàn trustless.

PDA seeds: config; arb+authority; bond+arb; deal+seller+nonce(u64 LE); vault+deal. SPL Token cổ điển, 6 decimals; không Token-2022 fee/hooks. Kiểm account owner, mint, authority. Checked arithmetic, refund đúng principal, fee chỉ seller payout, cọc tách deal principal.

Create chưa khóa cọc. Trọng tài accept; funding atomically kiểm cọc khả dụng và khóa một bond. Settlement chuyển tiền + unlock một lần. Bất kỳ actor chỉ finalize/refund khi đủ điều kiện; destination bị ràng buộc buyer/seller/arb.

Client Borsh/discriminator đối chứng IDL sinh bằng anchor idl build. Local validator thực thi .so, kiểm balances/state. UI policy chỉ mirror, chương trình quyết định.

Proxy whitelist method, genesis Devnet, same-origin, payload cap, signed-program whitelist. Client simulate, kiểm message không đổi sau ký, poll finalized bằng HTTP. Memory limiter best-effort per instance, không global/distributed. Không server signing key.

Mint theo [Circle](https://developers.circle.com/stablecoins/usdc-contract-addresses); issuer/freeze authority là yếu tố tin cậy. Local synthetic mint cùng address không phải Circle issuance. CPI/PDA tham khảo [Anchor](https://www.anchor-lang.com/docs/tokens/basics/transfer-tokens).

Wallet ký: khai báo compute budget trước simulate/sign (300.000 CU, priority price 0 trên Devnet), tránh Phantom tự thêm fee instruction khi chưa có budget. [Phantom mô tả hành vi này](https://github.com/orgs/phantom/discussions/203). Không chấp nhận signed message tùy ý khác bản chuẩn bị: wallet address, full message và signature đều kiểm trước broadcast. Regression dùng Phantom-like provider, không thay cho kiểm extension thực.

## Phí hệ thống v1

Deal mới chốt 1% trọng tài + 1% hệ thống; buyer nạp nguyên số tiền, seller nhận số tiền trừ hai phí. Hoàn buyer nguyên principal, không phí. Chia tiền và mở cọc trong cùng transaction. Platform ATA phải thuộc treasury FeeConfig immutable: `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`. Chỉ initializer pin được tạo FeeConfig một lần, không có lệnh sửa treasury. Upgrade authority vẫn tồn tại trong demo Devnet.

Deal giữ discriminator/PDA/allocation 876 bytes. Bổ sung u64 platform_fee và u8 fee_version sau terms vào padding cũ tối thiểu 28 bytes. Legacy đọc fee_version=0/platform_fee=0, không thu phí hồi tố. Create/settle bổ sung FeeConfig/platform ATA; client cũ cần reload. Mỗi phí 1% làm tròn xuống đơn vị nguyên USDC, phần dư thuộc seller.
