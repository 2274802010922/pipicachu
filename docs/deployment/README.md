# Triển khai Vercel

Import **2274802010922/pipicachu** làm project riêng, framework Next.js, Node 24, root repository, install `npm ci`, build `npm run build`. Không nối vào Picachu cũ.

| Key                    | Value/cách lấy                                                                                          |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| SOLANA_MAINNET_RPC_URL | `https://api.mainnet-beta.solana.com` để thử; production nên dùng endpoint có lịch sử giao dịch phù hợp |
| SOLANA_DEVNET_RPC_URL  | `https://api.devnet.solana.com`                                                                         |
| AI_ENABLED             | `true` khi đã cấu hình key và Redis, `false` để dùng template                                           |
| AI_MODEL               | `openrouter/free` ban đầu; ghi model thực tế khi nghiệm thu                                             |
| OPENROUTER_API_KEY     | Key tạo trong dashboard OpenRouter, nhập trực tiếp vào Vercel; không gửi trong chat                     |
| RATE_LIMIT_REDIS_URL   | REST URL của Redis tương thích Upstash                                                                  |
| RATE_LIMIT_REDIS_TOKEN | REST token server-only của Redis                                                                        |
| NEXT_PUBLIC_SITE_URL   | URL production do Vercel cấp cho pipicachu                                                              |
| DEMO_RECEIVER_ADDRESS  | `A1tGEfNhktM3XypMk9tVHt1Xvs8D5E1SgdBpW1ihWYtc` — ví nhận Devnet mới đã tạo                              |

Hai Redis variables bắt buộc cho production, namespace tách riêng. Health cần productionReady=true/testMode=false. aiConfigured chỉ là cấu hình, không chứng minh provider đã gọi thành công.

Sau đổi env: redeploy → health → đọc mẫu Mainnet/Devnet → đối chiếu → AI source=ai/model thực → ký demo và đọc lại signature. RPC key, AI key, Redis token không dùng NEXT_PUBLIC.

Nếu agent chưa có login/secret, build và tài liệu vẫn được bàn giao; ghi live gates pending thay vì claim đã deploy.
