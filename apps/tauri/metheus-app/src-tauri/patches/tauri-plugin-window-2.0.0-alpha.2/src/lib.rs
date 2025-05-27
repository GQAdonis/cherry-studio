// Copyright 2019-2023 Tauri Programme within The Commons Conservancy
// SPDX-License-Identifier: Apache-2.0
// SPDX-License-Identifier: MIT

#![cfg_attr(docsrs, feature(doc_cfg))]

use tauri::{
    plugin::{Builder, TauriPlugin},
    Runtime,
};

/// Initialize the plugin.
pub fn init<R: Runtime>() -> TauriPlugin<R> {
    Builder::new("window")
        .build()
}
