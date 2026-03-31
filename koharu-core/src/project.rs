use serde::{Deserialize, Serialize};
use std::io::Read;
use zstd::stream::{read::Decoder, write::Encoder};

use crate::Document;

#[derive(Serialize, Deserialize)]
pub struct ProjectFile {
    pub documents: Vec<Document>,
}

impl ProjectFile {
    pub fn new(documents: Vec<Document>) -> Self {
        Self { documents }
    }

    pub fn to_bytes(&self) -> anyhow::Result<Vec<u8>> {
        let mut compressed = Vec::new();
        let mut encoder = Encoder::new(&mut compressed, 3)?;
        rmp_serde::encode::write(&mut encoder, self)?;
        encoder.finish()?;
        Ok(compressed)
    }

    pub fn from_bytes(bytes: &[u8]) -> anyhow::Result<Self> {
        let mut decoder = Decoder::new(bytes)?;
        let mut uncompressed = Vec::new();
        decoder.read_to_end(&mut uncompressed)?;
        let project: Self = rmp_serde::from_slice(&uncompressed)?;
        Ok(project)
    }
}
