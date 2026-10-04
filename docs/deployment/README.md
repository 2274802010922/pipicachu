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
