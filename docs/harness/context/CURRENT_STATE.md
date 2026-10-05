# v0.5 trọng tài được duyệt — đang rollout

User duyệt flow nạp cọc trước, standing consent và UI4 bước; nút connect/primary/secondary nổi bật, bỏ checkbox lặp, complaint mở khi cần, auto-open sau tạo. Registry approved/accepting/minDeposit/maxDeal/time policy enforce on-chain. Chỉ initializer approve, pause/revoke không chặn settlement funded; quỹ không rút khi accepting hoặc còn locked. Không slashing/bảo hiểm.

Contract cùng Program ID/layout876; workflow_version append1byte vào padding (legacy0). Fund/Bond bổ sung seed-bound optional registry, client cũ cần reload. Registry account123 riêng. Treasury và fee1+1 giữ nguyên. New legacy create cũng cần registry approved nhưng giữ manual consent; deal cũ vẫn workflow0.

Đã kiểm native Rust compatibility, SBF không Stack offset,39 legacy checks +13 organization checks local,55 unit21 browser/build. SBF upgrade Devnet đã thành công, code prefix khớp dump và reserved padding toàn0. Setup Demo A min1USDC/max10USDC/policy30m/30m/5m/30m, initializer approval + arb standing consent đã ký thật,39 account cũ giữ fee/workflow. 13 CLI live organization tests đã pass, tổ chức Demo A đang accepting trở lại, không còn reserve của test. Browser/Vercel/CI đang nghiệm thu; chưa nhận hoàn tất.

Không đổi Picachu cũ, không video trong scope. Key test pipicachu riêng work/private; không secret Vercel/Git. Không env mới.
