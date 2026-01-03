use std::io::Cursor;
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;
use oxisynth::{MidiEvent, SoundFont, Synth, SynthDescriptor};
use tinyaudio::prelude::*;

struct SynthState {
    synth: Synth,
}

#[wasm_bindgen]
pub struct OxiSynth {
    state: Arc<Mutex<SynthState>>,
    #[allow(dead_code)]
    device: OutputDevice,
}

#[wasm_bindgen]
impl OxiSynth {
    #[wasm_bindgen(constructor)]
    pub fn new(sf2_data: &[u8], sample_rate: i32) -> Result<OxiSynth, JsError> {
        let mut cursor = Cursor::new(sf2_data);
        let sound_font = SoundFont::load(&mut cursor).map_err(|e| JsError::new(&format!("{:?}", e)))?;
        
        let desc = SynthDescriptor { sample_rate: sample_rate as f32, ..Default::default() };
        let mut synth = Synth::new(desc).map_err(|e| JsError::new(&format!("{:?}", e)))?;
        synth.add_font(sound_font, true);
        
        let state = Arc::new(Mutex::new(SynthState { synth }));
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
            state.synth.write_f32(frames, &mut left, 0, 1, &mut right, 0, 1);
            for i in 0..frames {
                data[i * 2] = left[i];
                data[i * 2 + 1] = right[i];
            }
        }).map_err(|e| JsError::new(&e.to_string()))?;
        
        Ok(OxiSynth { state, device })
    }

    pub fn note_on(&self, channel: u8, key: u8, velocity: u8) {
        let _ = self.state.lock().unwrap().synth.send_event(MidiEvent::NoteOn { channel, key, vel: velocity });
    }

    pub fn note_off(&self, channel: u8, key: u8) {
        let _ = self.state.lock().unwrap().synth.send_event(MidiEvent::NoteOff { channel, key });
    }
}
