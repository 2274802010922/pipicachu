use super::*;
#[test]
fn legacy_maximum_terms_decode_without_platform_fee() {
    let mut legacy = Vec::new();
    legacy.extend_from_slice(Deal::DISCRIMINATOR);
    for _ in 0..4 {
        legacy.extend_from_slice(Pubkey::default().as_ref());
    }
    for value in [42u64, 100_000_000, 10_000_000, 1_000_000] {
        legacy.extend_from_slice(&value.to_le_bytes());
    }
    for value in [1i64, 600, 300, 120, 120, 0, 0, 0] {
        legacy.extend_from_slice(&value.to_le_bytes());
    }
    legacy.extend_from_slice(&[0, 0, 255, 0]);
    legacy.extend_from_slice(&[0u8; 96]);
    legacy.extend_from_slice(&512u32.to_le_bytes());
    legacy.extend_from_slice(&[b'x'; 512]);
    assert_eq!(legacy.len(), 848);
    legacy.resize(876, 0);
    let account = Deal::try_deserialize(&mut &legacy[..]).unwrap();
    assert_eq!(account.platform_fee, 0);
    assert_eq!(account.fee_version, 0);
    assert_eq!(account.workflow_version, 0);
    assert_eq!(account.resolution_policy_version, 0);
    assert_eq!(account.terms.len(), 512);
    assert_eq!(account.amount - account.fee, 99_000_000);
}

#[test]
fn maximum_multibyte_terms_and_policy_fit_original_allocation() {
    let terms = "ề".repeat(170) + "ab";
    assert_eq!(terms.as_bytes().len(), 512);
    let mut bytes = Vec::new();
    bytes.extend_from_slice(Deal::DISCRIMINATOR);
    bytes.resize(332, 0);
    bytes.extend_from_slice(&512u32.to_le_bytes());
    bytes.extend_from_slice(terms.as_bytes());
    bytes.resize(876, 0);
    let mut deal = Deal::try_deserialize(&mut &bytes[..]).unwrap();
    deal.resolution_policy_version = 1;
    let mut encoded = Vec::new();
    deal.try_serialize(&mut encoded).unwrap();
    assert!(encoded.len() <= 876);
    encoded.resize(876, 0);
    let decoded = Deal::try_deserialize(&mut &encoded[..]).unwrap();
    assert_eq!(decoded.terms, terms);
    assert_eq!(decoded.resolution_policy_version, 1);
}
