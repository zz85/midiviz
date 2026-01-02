use std::io::Cursor;
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;
use rustysynth::{SoundFont, Synthesizer, SynthesizerSettings};
use tinyaudio::prelude::*;

struct SynthState {
    synthesizer: Synthesizer,
}

#[wasm_bindgen]
pub struct Synth {
    state: Arc<Mutex<SynthState>>,
    #[allow(dead_code)]
    device: OutputDevice,
}

#[wasm_bindgen]
impl Synth {
    #[wasm_bindgen(constructor)]
    pub fn new(sf2_data: &[u8], sample_rate: i32) -> Result<Synth, JsError> {
        let mut cursor = Cursor::new(sf2_data);
        let sound_font = Arc::new(SoundFont::new(&mut cursor).map_err(|e| JsError::new(&e.to_string()))?);
        let settings = SynthesizerSettings::new(sample_rate);
        let synthesizer = Synthesizer::new(&sound_font, &settings).map_err(|e| JsError::new(&e.to_string()))?;
        
        let state = Arc::new(Mutex::new(SynthState { synthesizer }));
        let state_clone = state.clone();
        
        let params = OutputDeviceParameters {
            channels_count: 2,
            sample_rate: sample_rate as usize,
            channel_sample_count: 1024,
        };
        
        let device = run_output_device(params, move |data| {
            let mut state = state_clone.lock().unwrap();
            let frames = data.len() / 2;
            let mut left = vec![0f32; frames];
            let mut right = vec![0f32; frames];
            state.synthesizer.render(&mut left, &mut right);
            for i in 0..frames {
                data[i * 2] = left[i];
                data[i * 2 + 1] = right[i];
            }
        }).map_err(|e| JsError::new(&e.to_string()))?;
        
        Ok(Synth { state, device })
    }

    pub fn note_on(&self, channel: i32, key: i32, velocity: i32) {
        self.state.lock().unwrap().synthesizer.note_on(channel, key, velocity);
    }

    pub fn note_off(&self, channel: i32, key: i32) {
        self.state.lock().unwrap().synthesizer.note_off(channel, key);
    }
}

// Manual rendering version for ScriptProcessorNode (iOS compatible)
#[wasm_bindgen]
pub struct SynthManual {
    synthesizer: Synthesizer,
}

#[wasm_bindgen]
impl SynthManual {
    #[wasm_bindgen(constructor)]
    pub fn new(sf2_data: &[u8], sample_rate: i32) -> Result<SynthManual, JsError> {
        let mut cursor = Cursor::new(sf2_data);
        let sound_font = Arc::new(SoundFont::new(&mut cursor).map_err(|e| JsError::new(&e.to_string()))?);
        let settings = SynthesizerSettings::new(sample_rate);
        let synthesizer = Synthesizer::new(&sound_font, &settings).map_err(|e| JsError::new(&e.to_string()))?;
        Ok(SynthManual { synthesizer })
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
