# Kiến trúc pipicachu

```text
Browser + Phantom → fixed Devnet RPC proxy → Anchor program
                                            ├─ Config / FeeConfig
                                            ├─ ManagerConfig / Application
                                            ├─ Arbitrator / Organization / BondVault
                                            └─ Deal / DealVault
Redis ← shared quotas, per-deal keeper retry, live operational reports
```

[Chi tiết v0.6, ABI và trust boundary](v06.md) là tài liệu hiện tại. Client/view-model chỉ UX; Rust kiểm quyền tiền. Manager duyệt registry, arbitrate chọn kết quả, initializer bootstrap một lần; program upgrade authority Devnet là quyền riêng còn giữ. Treasury immutable FeeConfig không suy ra manager quyền.

Deal876byte tương thích legacy. Policy byte trong padding không đổi điều kiện cũ. Payout98/1/1 hoặc refund100 nguyên tử, alias treasury gộp theo token-account, bond unlock một lần. [Receipt hotfix](../evidence/hotfix-alias-recovery.json). Keeper permissionless chỉ finalize Delivered quá review, không resolve dispute.

RPC schema/body/response caps và shared Redis quotas; failure mode read degraded/write closed. Operation recovery theo signature/expiry; không ký lại khi kết quả chưa rõ. Evidence local canonicalJSON+salt, không upload nội dung. [Deployment](../deployment/README.md) · [Acceptance gates](../testing/v06-gates.md).

Classic SPL Token USDC6decimals, không Token2022 hooks/fees. Mint đối chiếu [Circle](https://developers.circle.com/stablecoins/usdc-contract-addresses); issuer/freeze authority vẫn là yếu tố tin cậy. Token local synthetic không phải Circle issuance. CPI/PDA tham khảo [Anchor](https://www.anchor-lang.com/docs/tokens/basics/transfer-tokens). Chưa audit độc lập/Mainnet, CSP report-only tới khi Phantom thật được kiểm.
