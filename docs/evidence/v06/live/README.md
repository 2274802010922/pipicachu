# Nghiệm thu Devnet thật · 08/10/2026

Đây là các giao dịch test bằng ví CLI do pipicachu chuẩn bị, không phải mua bán hàng thật hoặc Phantom transfer-flow proof. Manager approval/policy có chữ ký owner riêng.

- [Sáu nhánh finalized](acceptance.json): confirm, hết hạn giao hàng, trọng tài payout/refund, xử muộn và hai bên hoàn tiền. Principal1USDC, payout98/1/1 hoặc refund100%; vault0, reserve đúng các obligation còn hoạt động.
- [Keeper thực](keeper-payout.json): workflow dispatch sau Clock/review deadline, signer serviceCHSYC; 0,98 seller +0,01 trọng tài +0,01 hệ thống, vault0 và unlock0,1 USDC. Normal restart không có eligible/new signature. Không dùng dispatch làm bằng chứng lịch cron đúng5phút.
- [Journal phục hồi](progress.json): cùng nonce, giữ receipts; đã tiếp tục sau publicRPC429 và lỗi đọc status. Không tạo/nạp lặp. Một forced recheck keeper gặp lỗi lưu report; đã ghi trong proof, không tính pass.

Policy thực tế là 1800/1800/300/60 giây; đã chờ deadline thật, không sửa điều kiện đã ký hoặc giả Clock. Target2dak là ví test riêng; sau nghiệm thu ngừng nhận, locked0, pool1USDC còn thuộc chính ví test. Trọng tài chính7Pp không thay.

File evidence có ghi note synthetic, salt và commitment để kiểm bằng verifier; không chứa file khách hàng, secret hoặc privatekey. Phần còn thiếu: Phantom extension toàn luồng, độ ổn định lịch keeper, dữ liệu tester và WTP.
