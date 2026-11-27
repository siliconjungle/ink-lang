use serde::{Deserialize, Serialize};

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Frame {
    pub textures: Vec<Texture>,
    pub passes: Vec<Pass>,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub fallback: Option<Box<Frame>>,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Texture {
    pub name: String,
    pub scale: u32,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub height_scale: Option<u32>,
    pub format: TextureFormat,
}

impl Texture {
    pub fn scales(&self) -> [u32; 2] {
        [self.scale, self.height_scale.unwrap_or(self.scale)]
    }
}

#[derive(Clone, Copy, Deserialize, Serialize)]
pub enum TextureFormat {
    Rgba8Unorm,
    Rgba16Float,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Pass {
    pub vertex: String,
    pub fragment: String,
    pub topology: Topology,
    pub blend: bool,
    pub attachments: Vec<Attachment>,
    pub bindings: Vec<Binding>,
    pub draw: Draw,
    #[serde(default, skip_serializing_if = "Option::is_none")]
    pub viewport: Option<Viewport>,
}

/// Integer multiples of the output width and height.
#[derive(Clone, Copy, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Viewport {
    pub x: u32,
    pub y: u32,
    pub width: u32,
    pub height: u32,
}

#[derive(Deserialize, Serialize)]
pub enum Topology {
    Triangles,
    TriangleStrip,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Attachment {
    pub target: String,
    pub rgba: u32,
    pub clear_parameter: Option<String>,
    pub load: bool,
}

#[derive(PartialEq, Eq, Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Binding {
    pub slot: u32,
    pub source: String,
    pub resource: Resource,
    pub vertex: bool,
    pub fragment: bool,
}

#[derive(Clone, Copy, PartialEq, Eq, Deserialize, Serialize)]
pub enum Resource {
    Uniform,
    ReadOnlyStorage,
    FloatTexture,
}

#[derive(Deserialize, Serialize)]
#[serde(deny_unknown_fields)]
pub struct Draw {
    pub vertices: u32,
    pub instances: u32,
    pub packed_count: Option<String>,
}
