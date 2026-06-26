use base64::{Engine, engine::general_purpose::URL_SAFE_NO_PAD};
use chrono::{DateTime, Utc};

#[derive(serde::Serialize, serde::Deserialize)]
pub struct Cursor {
    pub created: DateTime<Utc>,
    pub id: i32,
}

pub fn decode_cursor(s: &str) -> Option<Cursor> {
    if s.is_empty() {
        return None;
    }
    let bytes = URL_SAFE_NO_PAD.decode(s).ok()?;
    serde_json::from_slice(&bytes).ok()
}

pub fn encode_cursor(created: DateTime<Utc>, id: i32) -> String {
    let bytes = serde_json::to_vec(&Cursor { created, id }).expect("cursor serialization failed");
    URL_SAFE_NO_PAD.encode(bytes)
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::TimeZone;

    #[test]
    fn round_trip() {
        let ts = Utc.with_ymd_and_hms(2024, 6, 1, 12, 0, 0).unwrap();
        let id = 42i32;
        let encoded = encode_cursor(ts, id);
        let cur = decode_cursor(&encoded).expect("should decode");
        assert_eq!(cur.created, ts);
        assert_eq!(cur.id, id);
    }

    #[test]
    fn empty_returns_none() {
        assert!(decode_cursor("").is_none());
    }
}
