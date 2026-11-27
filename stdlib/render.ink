module Ink.Render;

enum TextureFormat { Rgba8Unorm, Rgba16Float, }
enum Topology { Triangles, TriangleStrip, }
enum Resource { Uniform, ReadOnlyStorage, FloatTexture, }

record Texture { name: String, scale: u32, format: TextureFormat, }
record Binding { slot: u32, source: String, resource: Resource, vertex: Bool, fragment: Bool, }
record Attachment { target: String, rgba: u32, clear_parameter: Option<String>, load: Bool, }
record Draw { vertices: u32, instances: u32, packed_count: Option<String>, }
record Pass {
    vertex: String, fragment: String, topology: Topology, blend: Bool,
    attachments: List<Attachment>, bindings: List<Binding>, draw: Draw,
}
record Frame { textures: List<Texture>, passes: List<Pass>, }
record ViewportTexture { name: String, scale: u32, height_scale: u32, format: TextureFormat, }
record Viewport { x: u32, y: u32, width: u32, height: u32, }
record ViewportPass {
    vertex: String, fragment: String, topology: Topology, blend: Bool,
    attachments: List<Attachment>, bindings: List<Binding>, draw: Draw,
    viewport: Option<Viewport>,
}
record ViewportFrame { textures: List<ViewportTexture>, passes: List<ViewportPass>, }
record ViewportFrameWithFallback { primary: ViewportFrame, fallback: Frame, }

fn with_viewport(pass: Pass, viewport: Option<Viewport>) -> ViewportPass {
    return ViewportPass {
        vertex: pass.vertex, fragment: pass.fragment, topology: pass.topology, blend: pass.blend,
        attachments: pass.attachments, bindings: pass.bindings, draw: pass.draw, viewport: viewport,
    };
}

fn clear(target: String, rgba: u32) -> Attachment {
    return Attachment { target: target, rgba: rgba, clear_parameter: None, load: false };
}

fn clear_with(target: String, parameter: String) -> Attachment {
    return Attachment { target: target, rgba: 0, clear_parameter: Some(parameter), load: false };
}

fn load(target: String) -> Attachment {
    return Attachment { target: target, rgba: 0, clear_parameter: None, load: true };
}

fn direct(vertices: u32, instances: u32) -> Draw {
    return Draw { vertices: vertices, instances: instances, packed_count: None };
}

fn packed(vertices: u32, source: String) -> Draw {
    return Draw { vertices: vertices, instances: 0, packed_count: Some(source) };
}
