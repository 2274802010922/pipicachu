export function errorMessage(error: unknown, vi: boolean) {
  const text = error instanceof Error ? error.message : String(error);
  const labels: Record<string, [string, string]> = {
    WALLET_MISSING: [
      "Kết nối ví Phantom trước khi thực hiện.",
      "Connect Phantom before continuing.",
    ],
    WALLET_SIGNING_FAILED: [
      "Ví chưa ký được giao dịch. Kiểm tra ví và thử lại; chưa gửi tiền.",
      "The wallet could not sign. Check the wallet and retry; nothing was sent.",
    ],
    TRANSACTION_EXPIRED: [
      "Giao dịch hết hạn trước khi được mạng ghi nhận. Kiểm tra trạng thái rồi thử lại.",
      "Transaction expired before it was recorded. Check state before retrying.",
    ],
    RATE_LIMITED: [
      "Bạn thao tác quá nhanh. Chờ một lúc rồi thử lại.",
      "Too many requests. Wait briefly and retry.",
    ],
    RATE_LIMIT_UNAVAILABLE: [
      "Bộ giới hạn dịch vụ chưa sẵn sàng. Chưa gửi giao dịch; thử lại sau.",
      "Service limiting is unavailable. Nothing was submitted; retry later.",
    ],
    CLIENT_OUTDATED: [
      "Bản giao diện đã cũ. Tải lại trang trước khi tạo giao dịch mới.",
      "This client is outdated. Reload before creating a new deal.",
    ],
    WALLET_REJECTED: [
      "Bạn đã hủy thao tác. Chưa gửi giao dịch.",
      "Signing cancelled. No transaction was sent.",
    ],
    WALLET_CHANGED: [
      "Ví đang kết nối đã thay đổi trong lúc ký. Kết nối lại đúng ví rồi thử lại.",
      "The connected wallet changed while signing. Reconnect the correct wallet and retry.",
    ],
    TRANSACTION_CHANGED: [
      "Ví trả về nội dung giao dịch khác bản đã chuẩn bị. Ứng dụng đã chặn gửi; giữ phí mặc định trong ví, tải lại trang và thử lại.",
      "The wallet returned a different transaction message. Broadcast was blocked; keep the wallet’s default fee, reload and retry.",
    ],
    INVALID_WALLET_SIGNATURE: [
      "Chữ ký ví chưa hợp lệ. Giao dịch chưa được gửi; kết nối lại ví và thử lại.",
      "The wallet signature is invalid. Nothing was broadcast; reconnect and retry.",
    ],
    INVALID_AMOUNT: [
      "Nhập số tiền dương, tối đa 6 chữ số thập phân.",
      "Enter a positive amount with up to 6 decimal places.",
    ],
    DEAL_NOT_FOUND: [
      "Chưa tìm thấy deal trên Devnet. Kiểm tra link hoặc thử tải lại.",
      "Deal not found on Devnet. Check the link or reload.",
    ],
    INVALID_ACCOUNT: [
      "Tài khoản này không phải deal pipicachu hợp lệ.",
      "This is not a valid pipicachu deal.",
    ],
    EVIDENCE_TOO_LARGE: [
      "Bằng chứng vượt giới hạn 20 file/50 MiB hoặc JSON 64 KiB.",
      "Evidence exceeds 20 files/50 MiB or 64 KiB JSON.",
    ],
    EVIDENCE_DUPLICATE_NAME: [
      "File có tên trùng nhau. Đổi tên để đối chiếu chính xác.",
      "Duplicate file names. Rename them for precise comparison.",
    ],
    INVALID_EVIDENCE: [
      "Gói bằng chứng không hợp lệ.",
      "Invalid evidence package.",
    ],
    INSUFFICIENT_USDC: [
      "Ví chưa đủ USDC Devnet cho thao tác này. Kiểm tra đúng mint và số dư.",
      "Insufficient Devnet USDC. Check the mint and wallet balance.",
    ],
    TOKEN_FROZEN: [
      "Tài khoản token đang bị đóng băng. Không thể chuyển; liên hệ nhà phát hành.",
      "The token account is frozen. Transfers are blocked; contact the issuer.",
    ],
    APPLICATION_CHANGED: [
      "Yêu cầu đã được xử lý hoặc thay đổi. Tải lại trạng thái.",
      "The application was already reviewed or changed. Refresh state.",
    ],
    RECIPIENT_ALIAS_UNSUPPORTED: [
      "Recipient trùng trên phiên bản chưa hỗ trợ. Không nạp thêm tiền; liên hệ chủ dự án và tải lại.",
      "Recipient alias is unsupported by this version. Do not add funds; contact the owner and reload.",
    ],
    SIMULATION_FAILED: [
      "Chưa thể thực hiện. Kiểm tra số dư SOL/USDC, quyền thao tác, cọc khả dụng và thời hạn; tải lại trạng thái trước khi thử lại.",
      "Cannot execute. Check SOL/USDC balances, permissions, available bond and deadlines; refresh before retrying.",
    ],
    ORGANIZATION_POLICY_CHANGED: [
      "Điều kiện trọng tài đã đổi. Xem lại thời hạn rồi tạo lại; chưa ký giao dịch.",
      "The arbitrator policy changed. Review the deadlines before retrying; no transaction was signed.",
    ],
    ORGANIZATION_UNAVAILABLE: [
      "Trọng tài chưa được duyệt, tạm ngừng hoặc không đủ cọc. Tải lại để chọn trọng tài khác.",
      "Arbitrator unapproved, paused or underfunded. Refresh and select another arbitrator.",
    ],
    ARBITRATOR_NOT_REGISTERED: [
      "Ví trọng tài chưa đăng ký trên phiên bản hiện tại. Chủ ví cần vào trang Trọng tài và bấm Đăng ký trọng tài Devnet; sau đó quay lại ví người bán để tạo deal. Chưa cần nạp cọc ở bước tạo.",
      "This arbitrator wallet is not registered on the current version. Its owner must open Arbitrator and register on Devnet, then return to the seller wallet to create the deal. Bond is not required at creation.",
    ],
    PROGRAM_NOT_READY: [
      "Cấu hình chương trình chưa sẵn sàng. Chủ dự án cần kiểm tra triển khai Devnet.",
      "Program configuration is not ready. The project owner must check the Devnet deployment.",
    ],
    INSUFFICIENT_SOL: [
      "Ví đang ký chưa đủ SOL Devnet để trả phí mạng và tạo tài khoản on-chain. Bổ sung SOL Devnet rồi thử lại; USDC không thay cho SOL trả phí.",
      "The signing wallet needs more Devnet SOL for network fees and account rent. Add Devnet SOL and retry; USDC cannot pay SOL fees.",
    ],
    INSUFFICIENT_BOND: [
      "Cọc khả dụng của trọng tài chưa đủ. Chủ ví trọng tài cần nạp thêm cọc trước khi người mua nạp tiền vào deal.",
      "The arbitrator’s available bond is insufficient. The arbitrator must deposit more bond before the buyer funds the deal.",
    ],
    BOND_LOCKED: [
      "Khoản cọc này đang khóa cho deal chưa kết thúc; chỉ rút được phần cọc khả dụng.",
      "This bond is reserved for an active deal; only available bond can be withdrawn.",
    ],
    ACTION_UNAUTHORIZED: [
      "Ví đang kết nối không có quyền thực hiện thao tác này. Kiểm tra vai trò và kết nối đúng ví.",
      "The connected wallet cannot perform this action. Check the role and connect the correct wallet.",
    ],
    ACTION_EXPIRED_OR_CHANGED: [
      "Trạng thái hoặc thời hạn đã thay đổi. Tải lại deal và chọn thao tác hiện có.",
      "The state or deadline changed. Refresh the deal and choose an available action.",
    ],
    RPC_NETWORK_MISMATCH: [
      "RPC không phải Devnet. Đã chặn thao tác.",
      "RPC is not Devnet. Action blocked.",
    ],
    TRANSACTION_FAILED: [
      "Giao dịch thất bại trên mạng. Tải lại trạng thái.",
      "Transaction failed on-chain. Refresh state.",
    ],
    INVALID_TERMS: [
      "Kiểm tra địa chỉ, người tham gia khác nhau và điều khoản tối đa 512 byte.",
      "Check addresses, distinct participants and terms up to 512 bytes.",
    ],
  };
  const code = labels[text]
    ? text
    : Object.keys(labels).find((candidate) =>
        new RegExp(`\\b${candidate}\\b`).test(text),
      );
  return (
    (code ? labels[code]?.[vi ? 0 : 1] : undefined) ||
    (vi
      ? "Chưa đọc hoặc gửi được giao dịch. Kiểm tra mạng, cấu hình Devnet và thử lại."
      : "Unable to read or submit. Check the network and Devnet configuration, then retry.")
  );
}
