use js_sys::{Object, Reflect};
use wasm_bindgen::JsValue;

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct TerrainCodecError {
    code: &'static str,
    message: String,
}

impl TerrainCodecError {
    pub fn new(code: &'static str, message: impl Into<String>) -> Self {
        Self {
            code,
            message: message.into(),
        }
    }

    pub fn invalid_dimensions(message: impl Into<String>) -> Self {
        Self::new("terrain.invalid-dimensions", message)
    }

    pub fn invalid_input(message: impl Into<String>) -> Self {
        Self::new("terrain.invalid-input", message)
    }

    pub fn decode_failed(message: impl Into<String>) -> Self {
        Self::new("terrain.decode-failed", message)
    }

    pub fn encode_failed(message: impl Into<String>) -> Self {
        Self::new("terrain.encode-failed", message)
    }

    pub fn into_js_value(self) -> JsValue {
        let object = Object::new();
        let code_key = JsValue::from_str("code");
        let message_key = JsValue::from_str("message");
        let code_value = JsValue::from_str(self.code);
        let message_value = JsValue::from_str(&self.message);
        let _ = Reflect::set(&object, &code_key, &code_value);
        let _ = Reflect::set(&object, &message_key, &message_value);
        object.into()
    }
}

pub type TerrainCodecResult<T> = Result<T, TerrainCodecError>;
