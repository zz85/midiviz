use std::io::Cursor;
use std::sync::Arc;
use wasm_bindgen::prelude::*;
use rustysynth::{SoundFont, Synthesizer, SynthesizerSettings};

#[wasm_bindgen]
pub struct Synth {
    synthesizer: Synthesizer,
}

#[wasm_bindgen]
impl Synth {
    #[wasm_bindgen(constructor)]
    pub fn new(sf2_data: &[u8], sample_rate: i32) -> Result<Synth, JsError> {
        let mut cursor = Cursor::new(sf2_data);
        let sound_font = Arc::new(SoundFont::new(&mut cursor).map_err(|e| JsError::new(&e.to_string()))?);
        let settings = SynthesizerSettings::new(sample_rate);
        let synthesizer = Synthesizer::new(&sound_font, &settings).map_err(|e| JsError::new(&e.to_string()))?;
        Ok(Synth { synthesizer })
    }

    pub fn note_on(&mut self, channel: i32, key: i32, velocity: i32) {
        self.synthesizer.note_on(channel, key, velocity);
    }

    pub fn note_off(&mut self, channel: i32, key: i32) {
        self.synthesizer.note_off(channel, key);
    }

    pub fn render(&mut self, left: &mut [f32], right: &mut [f32]) {
        self.synthesizer.render(left, right);
    }
}
