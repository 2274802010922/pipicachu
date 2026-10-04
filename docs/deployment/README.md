# Vercel và Devnet

Vercel: Next.js, npm ci, npm run build, .next; project pipicachu riêng. Program/mint pin trong src/escrow/deployment.json, cập nhật cùng IDL/source, không env override tùy ý.

| Biến                  | Value                                               |
| --------------------- | --------------------------------------------------- |
| NEXT_PUBLIC_SITE_URL  | https://pipicachu.vercel.app                        |
| SOLANA_DEVNET_RPC_URL | https://api.devnet.solana.com hoặc RPC Devnet riêng |

Không cần AI/OpenRouter, Redis, SOLANA_MAINNET_RPC_URL, DEMO_RECEIVER_ADDRESS. Biến cũ có thể xóa; code không đọc. Không private key trên Vercel.

Anchor 1.1.2, Solana 3.1.10, Rust và Cargo.lock pin. Build `cargo build-sbf --manifest-path programs/pipicachu-escrow/Cargo.toml`. Kiểm log không Stack offset error vì CLI có thể exit 0.

Deploy chỉ key pipicachu mới trong vùng ignore, kiểm genesis Devnet. `solana program deploy target/deploy/pipicachu_escrow.so --program-id work/private/escrow-single-program.json --buffer work/private/escrow-buffer.json --keypair work/private/fixture-signer.json --url https://api.devnet.solana.com`. Initializer DwTKmg68k39b8jZWt1CHypfoPs5JuJsuP88SfKcbW3uj; mint Config immutable. Để fork: key mới, sửa initializer, declare_id/deployment/Anchor.toml, build IDL và test lại. Upgrade authority demo còn giữ.

[Circle Faucet](https://faucet.circle.com/): Solana Devnet USDC, mint 4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU. SOL trả rent/fee. Không bypass CAPTCHA.

## Keeper tự giải ngân

Workflow `.github/workflows/devnet-keeper.yml` chạy mỗi khoảng 5 phút (offset phút 3, 8, 13...). [GitHub schedule](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule) có thể bị trễ; không cam kết chuyển đúng giây hết hạn. Vercel Hobby cron chỉ một lần/ngày nên không dùng cho flow này.

Secret GitHub Actions `DEVNET_KEEPER_KEYPAIR` chứa **ví service mới, chỉ SOL Devnet**, đã cấu hình cho repo hiện tại. Không dùng ví seller/buyer/trọng tài, không đưa key vào Vercel hoặc public bundle. Wallet public và workflow URL nằm ở src/escrow/keeper-config.json. Không cần biến Vercel mới.

Keeper chỉ scan Program ID/mint đã pin trên Devnet, lọc Delivered + review deadline, đọc lại trước ký và gọi finalize. Không resolve/cancel/fund hoặc đổi địa chỉ nhận/số tiền. Contract kiểm điều kiện lại, nên tranh chấp/terminal/giải ngân lặp bị chặn. Mỗi lượt tối đa 5 deal, ưu tiên deadline cũ; cần bổ sung SOL service nếu thấp hơn 0,01 SOL. Keeper/RPC/scheduler lỗi có thể trì hoãn giải ngân, không phải bảo hiểm SLA.

Fork phải tạo ví service mới và secret riêng; workflow mặc định chặn chạy ở fork khác owner. `workflow_dispatch` dùng để kiểm vận hành. Không log key; artifact chỉ receipt/trạng thái public. Nếu không chạy service, contract vẫn permissionless finalize sau hạn nhưng không được quảng cáo tự động.

## Ví nhận phí hệ thống

Ví owner chọn: `CXjKGEBNTTotzoF26nGPfAG4AFicGgP72SMqUQKY1pJN`. Treasury lưu tại FeeConfig PDA trên Devnet; không cần thêm biến môi trường/private key. `npm run check:live` đối chiếu treasury on-chain với deployment public. Không đổi recipient bằng env. Script `scripts/devnet/fee-rollout.ts` ghi legacy trước upgrade và initialize sau upgrade, chỉ dùng key pipicachu trong vùng ignore.
