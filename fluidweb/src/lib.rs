use std::io::Cursor;
use std::sync::{Arc, Mutex};
use wasm_bindgen::prelude::*;
use tinyaudio::prelude::*;

#[cfg(feature = "oxisynth")]
mod oxi {
    use super::*;
    use oxisynth::{MidiEvent, SoundFont, SoundFontId, Synth, SynthDescriptor};

    struct SynthState {
        synth: Synth,
        font_ids: Vec<SoundFontId>,
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
        pub fn new(sample_rate: i32) -> Result<OxiSynth, JsError> {
            let desc = SynthDescriptor { sample_rate: sample_rate as f32, gain: 1.0, ..Default::default() };
            let synth = Synth::new(desc).map_err(|e| JsError::new(&format!("{:?}", e)))?;
            
            let state = Arc::new(Mutex::new(SynthState { synth, font_ids: Vec::new() }));
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

        /// Add soundfont, returns index for use with select_soundfont
        pub fn add_soundfont(&self, sf2_data: &[u8]) -> Result<u32, JsError> {
            let mut cursor = Cursor::new(sf2_data);
            let sound_font = SoundFont::load(&mut cursor).map_err(|e| JsError::new(&format!("{:?}", e)))?;
            let mut state = self.state.lock().unwrap();
            let id = state.synth.add_font(sound_font, true);
            let idx = state.font_ids.len() as u32;
            state.font_ids.push(id);
            Ok(idx)
        }

        /// Select soundfont by index for all channels
        pub fn select_soundfont(&self, font_idx: u32) -> Result<(), JsError> {
            let mut state = self.state.lock().unwrap();
            let id = *state.font_ids.get(font_idx as usize)
                .ok_or_else(|| JsError::new("Invalid font index"))?;
            for ch in 0..16u8 {
                let _ = state.synth.select_sound_font(ch, id);
            }
            Ok(())
        }

        pub fn note_on(&self, channel: u8, key: u8, velocity: u8) {
            let _ = self.state.lock().unwrap().synth.send_event(MidiEvent::NoteOn { channel, key, vel: velocity });
        }

        pub fn note_off(&self, channel: u8, key: u8) {
            let _ = self.state.lock().unwrap().synth.send_event(MidiEvent::NoteOff { channel, key });
        }

        pub fn program_change(&self, channel: u8, program_id: u8) {
            let _ = self.state.lock().unwrap().synth.send_event(MidiEvent::ProgramChange { channel, program_id });
        }
    }
}

#[cfg(feature = "rustysynth")]
mod rusty {
    use super::*;
    use rustysynth::{SoundFont, Synthesizer, SynthesizerSettings};

    struct SynthState {
        synthesizer: Synthesizer,
    }

    #[wasm_bindgen]
    pub struct RustySynth {
        state: Arc<Mutex<SynthState>>,
        #[allow(dead_code)]
        device: OutputDevice,
    }

    #[wasm_bindgen]
    impl RustySynth {
        #[wasm_bindgen(constructor)]
        pub fn new(sf2_data: &[u8], sample_rate: i32) -> Result<RustySynth, JsError> {
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
            
            Ok(RustySynth { state, device })
        }

        pub fn note_on(&self, channel: i32, key: i32, velocity: i32) {
            self.state.lock().unwrap().synthesizer.note_on(channel, key, velocity);
        }

        pub fn note_off(&self, channel: i32, key: i32) {
            self.state.lock().unwrap().synthesizer.note_off(channel, key);
        }

        pub fn program_change(&self, channel: i32, program: i32) {
            self.state.lock().unwrap().synthesizer.process_midi_message(channel, 0xC0, program, 0);
        }
    }
}
