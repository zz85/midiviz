import { SoundBankLoader, BasicSoundBank } from 'https://esm.sh/spessasynth_core';

self.onmessage = async (e) => {
  const soundbank = SoundBankLoader.fromArrayBuffer(e.data);
  await BasicSoundBank.isSF3DecoderReady;
  
  const start = performance.now();
  const sf2Data = await soundbank.writeSF2({ decompress: true });
  console.log(`Decompression took ${((performance.now() - start) / 1000).toFixed(2)}s`);
  
  self.postMessage(sf2Data, [sf2Data]);
};
