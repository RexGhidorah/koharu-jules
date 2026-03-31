use anyhow::Result;

use crate::{state_tx, AppResources};
use koharu_core::project::ProjectFile;

pub async fn save_project(resources: AppResources) -> Result<Vec<u8>> {
    let documents = state_tx::list_docs(&resources.state).await;
    let project = ProjectFile::new(documents);
    project.to_bytes()
}

pub async fn open_project(resources: AppResources, bytes: Vec<u8>) -> Result<usize> {
    let project = ProjectFile::from_bytes(&bytes)?;
    state_tx::replace_docs(&resources.state, project.documents).await
}
