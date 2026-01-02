use std::io::Cursor;
use wasm_bindgen::prelude::*;
use rustysynth::SoundFont;

#[wasm_bindgen]
pub struct Synth {
    sound_font: SoundFont,
}

#[wasm_bindgen]
impl Synth {
    #[wasm_bindgen(constructor)]
    pub fn new(sf2_data: &[u8]) -> Result<Synth, JsError> {
        let mut cursor = Cursor::new(sf2_data);
        let sound_font = SoundFont::new(&mut cursor).map_err(|e| JsError::new(&e.to_string()))?;
        Ok(Synth { sound_font })
    }
}
